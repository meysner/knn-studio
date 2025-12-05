import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TopBar from './components/TopBar';
import FloatingTools from './components/FloatingTools';
import Sidebar from './components/Sidebar';
import KNNCanvas from './components/KNNCanvas';
import CSVImportModal, { CSVConfig } from './components/CSVImportModal';
import { KNNConfig, DataPoint, ClassLabel, PointType, VisualSettings, DatasetState, DatasetMetadata, FilterState } from './types';
import { classifyPoint, generateRandomPoints } from './services/knnLogic';

const App: React.FC = () => {
  const [points, setPoints] = useState<DataPoint[]>([]);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [fitViewTrigger, setFitViewTrigger] = useState<number>(0);
  
  const [config, setConfig] = useState<KNNConfig>({
    k: 5,
    metric: 'euclidean',
    minkowskiP: 3,
    weighting: 'uniform',
    weights: { x: 1, y: 1 },
    visualizeWeights: false
  });

  const [filters, setFilters] = useState<FilterState>({
      x: { min: undefined, max: undefined },
      y: { min: undefined, max: undefined }
  });

  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata>({
    name: 'New Project',
    description: 'A blank canvas for KNN visualization.'
  });

  const [interactionMode, setInteractionMode] = useState<'view' | 'add_train' | 'add_test'>('view');
  const [currentDrawLabel, setCurrentDrawLabel] = useState<ClassLabel>(ClassLabel.A);
  const [hiddenClasses, setHiddenClasses] = useState<string[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [splitRatio, setSplitRatio] = useState<number>(100);
  
  const [pointCount, setPointCount] = useState<number>(50);
  const [activePreset, setActivePreset] = useState<'random' | 'clusters' | 'circles' | null>(null);

  const [datasetState, setDatasetState] = useState<DatasetState | null>(null);

  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
      pointRadius: 4,
      lineWidth: 1.5,
      showLines: true
  });

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [rawCsvData, setRawCsvData] = useState<{ headers: string[], data: any[] } | null>(null);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const featureNames = useMemo(() => {
      if (datasetState) {
          return { x: datasetState.xCol, y: datasetState.yCol };
      }
      return { x: 'X Axis', y: 'Y Axis' };
  }, [datasetState]);

  const classNames = useMemo(() => {
      const map: Record<string, string> = {};
      Object.values(ClassLabel).forEach(l => map[l] = l); 
      
      if (datasetState?.classMapping) {
          Object.entries(datasetState.classMapping).forEach(([rawName, enumVal]) => {
              map[enumVal as ClassLabel] = rawName;
          });
      }
      return map;
  }, [datasetState]);

  const activeClasses = useMemo(() => {
      if (datasetState?.classMapping) {
          const order = Object.values(ClassLabel);
          const present = new Set(Object.values(datasetState.classMapping));
          return order.filter(l => present.has(l));
      }
      return Object.values(ClassLabel);
  }, [datasetState]);
  
  const logicPoints = useMemo(() => {
      if (config.visualizeWeights) {
          return points.map(p => ({
              ...p,
              x: p.x * config.weights.x,
              y: p.y * config.weights.y
          }));
      }
      return points;
  }, [points, config.weights, config.visualizeWeights]);

  const classifiedPoints = useMemo(() => {
      const train = logicPoints.filter(p => p.type === 'train');
      const test = logicPoints.filter(p => p.type === 'test');

      if (test.length === 0) return logicPoints;

      const weightsForLogic = config.visualizeWeights ? { x: 1, y: 1 } : config.weights;

      const newTest = test.map(tp => {
           const result = classifyPoint(
               tp, 
               train, 
               config.k, 
               config.metric, 
               config.minkowskiP, 
               config.weighting,
               weightsForLogic
            );
           const isCorrect = result.predictedLabel === tp.label;
           return { ...tp, ...result, isCorrect };
      });

      return [...train, ...newTest];
  }, [logicPoints, config]);

  const applyDatasetState = useCallback((state: DatasetState, currentFilters: FilterState, fitView: boolean = true) => {
      const { rawRows, xCol, yCol, labelCol, classMapping } = state;

      const newPoints: DataPoint[] = [];
      const seen = new Set<string>();

      rawRows.forEach(r => {
          const xVal = parseFloat(r[xCol]);
          const yVal = parseFloat(r[yCol]);

          if (!isNaN(xVal) && !isNaN(yVal)) {
              const finalY = -yVal;

              if (currentFilters.x.min !== undefined && xVal <= currentFilters.x.min) return;
              if (currentFilters.x.max !== undefined && xVal > currentFilters.x.max) return;
              if (currentFilters.y.min !== undefined && yVal <= currentFilters.y.min) return;
              if (currentFilters.y.max !== undefined && yVal > currentFilters.y.max) return;

              const type = r._type || 'train';
              
              const rawLabel = r[labelCol]?.toString().trim();
              const label = classMapping[rawLabel] || ClassLabel.D;

              const key = `${xVal.toFixed(6)}_${finalY.toFixed(6)}`;
              if (seen.has(key)) return;
              seen.add(key);

              newPoints.push({
                  id: r._id,
                  x: xVal,
                  y: finalY, 
                  label,
                  type,
                  isUserCreated: false
              });
          }
      });

      setPoints(prevPoints => {
          const userPoints = prevPoints.filter(p => p.isUserCreated);
          return [...newPoints, ...userPoints];
      });
      
      if(newPoints.length > 0 && fitView) setFitViewTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
      if (datasetState) {
          applyDatasetState(datasetState, filters, false);
      }
  }, [datasetState, filters, applyDatasetState]);

  const handleInteractStart = (visualX: number, visualY: number) => {
      if (interactionMode === 'view') return;

      const rawX = config.visualizeWeights ? visualX / config.weights.x : visualX;
      const rawY = config.visualizeWeights ? visualY / config.weights.y : visualY;

      const id = Math.random().toString(36).substr(2, 9);
      const newPoint: DataPoint = {
          id,
          x: rawX,
          y: rawY,
          type: interactionMode === 'add_train' ? 'train' : 'test',
          label: interactionMode === 'add_train' ? currentDrawLabel : ClassLabel.A,
          isUserCreated: true, 
      };

      setActivePointId(id);
      setPoints(prev => [...prev, newPoint]);
  };

  const handlePointSelectWrapper = (id: string) => {
      setActivePointId(id);
      setSelectedPointId(id);
  };

  const handleInteractMove = (visualX: number, visualY: number) => {
      if (!activePointId) return;

      const rawX = config.visualizeWeights ? visualX / config.weights.x : visualX;
      const rawY = config.visualizeWeights ? visualY / config.weights.y : visualY;

      setPoints(prev => prev.map(p => {
          if (p.id === activePointId) {
              return { ...p, x: rawX, y: rawY };
          }
          return p;
      }));
  };

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const handleInteractEndWrapper = () => {
      setActivePointId(null);
  };

  const handleSelectionClear = () => {
      setSelectedPointId(null);
  };

  const handlePointDelete = (id: string) => {
      setPoints(prev => prev.filter(p => p.id !== id));
      if (selectedPointId === id) setSelectedPointId(null);
  };

  const createPointsFromPreset = (type: 'random' | 'clusters' | 'circles', count: number, ratio: number) => {
      const rawPoints = generateRandomPoints(count, 600, 400, type);
      const newPoints = rawPoints.map(p => ({ ...p, y: -p.y }));

      const splitIndex = Math.floor(newPoints.length * (ratio / 100));
      const processedPoints = newPoints.map((p, idx) => ({
          ...p,
          type: (idx < splitIndex ? 'train' : 'test') as PointType
      }));
      return processedPoints;
  };

  const handleGenerateRandom = (type: 'random' | 'clusters' | 'circles') => {
      setDatasetState(null); 
      setFilters({ x: {}, y: {} });
      setActivePreset(type);
      setDatasetMetadata({
          name: `Generated ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          description: `Randomly generated ${type} distribution.`
      });
      
      const processedPoints = createPointsFromPreset(type, pointCount, splitRatio);

      setPoints(processedPoints);
      setFitViewTrigger(prev => prev + 1);
      setSelectedPointId(null);
  };

  const handlePointCountChange = (newCount: number) => {
      setPointCount(newCount);
      
      const typeToUse = activePreset || 'random';
      
      if (datasetState) {
          setDatasetState(null);
          setFilters({ x: {}, y: {} });
          setActivePreset(typeToUse);
          setDatasetMetadata({
              name: 'Generated Random',
              description: 'Switched to random generator.'
          });
      } else if (!activePreset) {
          setActivePreset('random');
          setDatasetMetadata({
              name: 'Generated Random',
              description: 'Randomly generated.'
          });
      }

      const processedPoints = createPointsFromPreset(typeToUse, newCount, splitRatio);
      setPoints(processedPoints);
  };

  const handleManualAdd = (x: number, y: number, type: PointType, label: ClassLabel) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newPoint: DataPoint = { 
          id, x, y: -y, type, label,
          isUserCreated: true
      };
      setPoints(prev => [...prev, newPoint]);
      setSelectedPointId(id);
  };

  const handleImportDataset = (importedData: any) => {
      setDatasetState(null);
      setActivePreset(null);
      setFilters({ x: {}, y: {} }); 
      
      let importedPoints: any[] = [];
      let newMetadata = { name: 'Imported Dataset', description: 'Loaded from file.' };

      if (Array.isArray(importedData)) {
          importedPoints = importedData;
      } else if (importedData && (Array.isArray(importedData.points) || importedData.datasetState)) {
          importedPoints = importedData.points || [];
          if (importedData.metadata) {
              newMetadata = {
                  name: importedData.metadata.name || 'Imported Dataset',
                  description: importedData.metadata.description || ''
              };
          }
      } else {
          alert("Invalid data format.");
          return;
      }
      
      setDatasetMetadata(newMetadata);

      if (importedData.config) setConfig(prev => ({ ...prev, ...importedData.config }));
      if (importedData.filters) setFilters(importedData.filters);
      if (importedData.visualSettings) setVisualSettings(prev => ({ ...prev, ...importedData.visualSettings }));
      if (typeof importedData.splitRatio === 'number') setSplitRatio(importedData.splitRatio);
      if (Array.isArray(importedData.hiddenClasses)) setHiddenClasses(importedData.hiddenClasses);

      if (importedData.datasetState) {
          setDatasetState(importedData.datasetState);
      }

      const validPoints: DataPoint[] = [];
      const seen = new Set<string>();

      importedPoints.forEach((p: any) => {
          if (typeof p.x === 'number' && typeof p.y === 'number' && p.label) {
              const finalY = -p.y;
              const key = `${p.x.toFixed(6)}_${finalY.toFixed(6)}`;
              if (seen.has(key)) return;
              seen.add(key);

              validPoints.push({
                  id: p.id || Math.random().toString(36).substr(2, 9),
                  x: p.x,
                  y: finalY, 
                  type: p.type === 'test' ? 'test' : 'train',
                  label: p.label,
                  isUserCreated: p.isUserCreated ?? false,
                  predictedLabel: p.predictedLabel,
                  isCorrect: p.isCorrect
              });
          }
      });

      if (validPoints.length === 0 && !importedData.datasetState) {
          alert("No valid points found in file.");
          setPoints([]);
          return;
      }
      
      setPoints(validPoints);
      setFitViewTrigger(prev => prev + 1);
      setSelectedPointId(null);
  };

  const handleCSVUpload = (headers: string[], data: any[]) => {
      setRawCsvData({ headers, data });
      setCsvModalOpen(true);
      setDatasetMetadata({
          name: 'CSV Import',
          description: `Imported from CSV with headers: ${headers.slice(0,3).join(', ')}...`
      });
  };

  const handleCSVSubmit = (csvConfig: CSVConfig) => {
      if (!rawCsvData) return;
      const { xColumn, yColumn, labelColumn, splitRatio: csvSplit, mappedClasses } = csvConfig;
      const { data, headers } = rawCsvData;
      
      setSplitRatio(csvSplit);
      setActivePreset(null);

      const shuffledData = [...data];
      for (let i = shuffledData.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledData[i], shuffledData[j]] = [shuffledData[j], shuffledData[i]];
      }

      const splitIndex = Math.floor(shuffledData.length * (csvSplit / 100));
      const enrichedData = shuffledData.map((row, idx) => ({
          ...row,
          _id: Math.random().toString(36).substr(2, 9),
          _type: idx < splitIndex ? 'train' : 'test'
      }));

      const newState: DatasetState = {
          rawRows: enrichedData,
          headers,
          xCol: xColumn,
          yCol: yColumn,
          labelCol: labelColumn,
          classMapping: mappedClasses
      };

      setDatasetState(newState);
      setFilters({ x: {}, y: {} });
      applyDatasetState(newState, { x: {}, y: {} }, true);
      setCsvModalOpen(false);
      setSelectedPointId(null);
  };

  const handleSplitRatioChange = (newRatio: number) => {
      setSplitRatio(newRatio);
      
      if (datasetState) {
          const splitIndex = Math.floor(datasetState.rawRows.length * (newRatio / 100));
          const newRows = datasetState.rawRows.map((row, idx) => ({
              ...row,
              _type: (idx < splitIndex ? 'train' : 'test') as PointType
          }));
          
          const newState = { ...datasetState, rawRows: newRows };
          setDatasetState(newState);
          applyDatasetState(newState, filters, false); 
      } else {
          const datasetPoints = points.filter(p => !p.isUserCreated);
          const userPoints = points.filter(p => p.isUserCreated);
          
          if (datasetPoints.length === 0) return;
          
          const splitIndex = Math.floor(datasetPoints.length * (newRatio / 100));
          const reassignedPoints = datasetPoints.map((p, idx) => ({
              ...p,
              type: (idx < splitIndex ? 'train' : 'test') as PointType
          }));
          
          setPoints([...reassignedPoints, ...userPoints]);
      }
  };

  const handleResplit = () => {
      if (datasetState) {
          const shuffledRows = [...datasetState.rawRows];
          for (let i = shuffledRows.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledRows[i], shuffledRows[j]] = [shuffledRows[j], shuffledRows[i]];
          }
          
          const splitIndex = Math.floor(shuffledRows.length * (splitRatio / 100));
          const newRows = shuffledRows.map((row, idx) => ({
              ...row,
              _type: (idx < splitIndex ? 'train' : 'test') as PointType
          }));

          const newState = { ...datasetState, rawRows: newRows };
          setDatasetState(newState);
          applyDatasetState(newState, filters, false);

      } else {
          const datasetPoints = points.filter(p => !p.isUserCreated);
          const userPoints = points.filter(p => p.isUserCreated);

          if (datasetPoints.length === 0) return;

          const shuffled = [...datasetPoints];
          for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }

          const splitIndex = Math.floor(shuffled.length * (splitRatio / 100));
          const reassignedPoints = shuffled.map((p, idx) => ({
              ...p,
              type: (idx < splitIndex ? 'train' : 'test') as PointType
          }));
          
          setPoints([...reassignedPoints, ...userPoints]);
      }
  };

  const handleAxisChange = (xAxis: string, yAxis: string) => {
      if (!datasetState) return;
      const newState = { ...datasetState, xCol: xAxis, yCol: yAxis };
      setDatasetState(newState);
      setFilters({ x: {}, y: {} });
      applyDatasetState(newState, { x: {}, y: {} }, true);
  };

  const handleLabelChange = (newLabelCol: string) => {
      if (!datasetState) return;
      const uniqueLabels = Array.from(new Set(datasetState.rawRows.map(r => r[newLabelCol]?.toString().trim()))).filter(Boolean);
      const classEnum = Object.values(ClassLabel);
      const newMapping: Record<string, ClassLabel> = {};
      
      uniqueLabels.forEach((val, index) => {
          if (index < classEnum.length) {
              newMapping[val] = classEnum[index] as ClassLabel;
          }
      });

      const newState = { ...datasetState, labelCol: newLabelCol, classMapping: newMapping };
      setDatasetState(newState);
      applyDatasetState(newState, filters, false);
  };

  const handleClear = () => {
      setPoints([]);
      setDatasetState(null);
      setActivePreset(null);
      setFilters({ x: {}, y: {} });
      setDatasetMetadata({ name: 'New Project', description: 'Empty project.' });
      setFitViewTrigger(prev => prev + 1);
      setHiddenClasses([]);
      setSelectedPointId(null);
  };

  const handleToggleClass = (label: string) => {
    setHiddenClasses(prev => {
        if (prev.includes(label)) {
            return prev.filter(l => l !== label);
        }
        return [...prev, label];
    });
  };

  const totalRawCount = datasetState ? datasetState.rawRows.length : points.filter(p => !p.isUserCreated).length;

  return (
    <div className={`relative w-full h-screen font-sans overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      <TopBar 
          points={classifiedPoints}
          onGenerateRandom={handleGenerateRandom}
          onImport={handleImportDataset}
          onCSVUpload={handleCSVUpload}
          onClear={handleClear}
          theme={theme}
          toggleTheme={toggleTheme}
          visualSettings={visualSettings}
          setVisualSettings={setVisualSettings}
          splitRatio={splitRatio}
          setSplitRatio={handleSplitRatioChange} 
          onResplit={handleResplit}
          datasetState={datasetState}
          onAxisChange={handleAxisChange}
          onLabelChange={handleLabelChange}
          datasetMetadata={datasetMetadata}
          config={config}
          filters={filters}
          hiddenClasses={hiddenClasses}
          pointCount={pointCount}
          onPointCountChange={handlePointCountChange}
          activePreset={activePreset}
      />

      <div className="flex h-full pt-14 overflow-hidden">
        
        <Sidebar 
            metadata={datasetMetadata}
            onMetadataChange={setDatasetMetadata}
            points={classifiedPoints}
            totalRawCount={totalRawCount}
            config={config}
            onConfigChange={setConfig}
            filters={filters}
            onFiltersChange={setFilters}
            theme={theme}
            activePointId={selectedPointId} 
        />

        <div className="flex-1 relative h-full">
            <KNNCanvas 
                points={classifiedPoints}
                onInteractStart={handleInteractStart}
                onInteractMove={handleInteractMove}
                onInteractEnd={handleInteractEndWrapper}
                onPointSelect={handlePointSelectWrapper}
                onPointDelete={handlePointDelete}
                interactionMode={interactionMode}
                theme={theme}
                visualSettings={visualSettings}
                fitViewTrigger={fitViewTrigger}
                hiddenClasses={hiddenClasses}
                selectedPointId={selectedPointId}
                onSelectionClear={handleSelectionClear}
            />

            <FloatingTools 
                interactionMode={interactionMode}
                setInteractionMode={setInteractionMode}
                currentDrawLabel={currentDrawLabel}
                setCurrentDrawLabel={setCurrentDrawLabel}
                onManualAdd={handleManualAdd}
                theme={theme}
                featureNames={featureNames}
                classNames={classNames}
                activeClasses={activeClasses}
                hiddenClasses={hiddenClasses}
                onToggleClass={handleToggleClass}
            />
        </div>
      </div>

      <CSVImportModal 
          isOpen={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          headers={rawCsvData?.headers || []}
          data={rawCsvData?.data || []}
          onSubmit={handleCSVSubmit}
          theme={theme}
      />
    </div>
  );
};

export default App;
