
import React, { useState, useRef, useEffect } from 'react';
import { DataPoint, VisualSettings, DatasetState, DatasetMetadata, KNNConfig, FilterState } from '../types';

import { UNCERTAINTY_DATA, PENGUIN_SPECIES_DATA, PENGUIN_ISLAND_DATA } from '../services/exampleData';

interface TopBarProps {
  points: DataPoint[];
  onGenerateRandom: (type: 'random' | 'clusters' | 'circles') => void;
  onImport: (data: any) => void;
  onCSVUpload: (headers: string[], data: any[]) => void;
  onClear: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  visualSettings: VisualSettings;
  setVisualSettings: (s: VisualSettings) => void;
  splitRatio: number;
  setSplitRatio: (ratio: number) => void;
  onResplit: () => void;
  datasetState: DatasetState | null;
  onAxisChange: (xAxis: string, yAxis: string) => void;
  onLabelChange: (labelCol: string) => void;
  datasetMetadata: DatasetMetadata;
  config: KNNConfig;
  filters: FilterState;
  hiddenClasses: string[];
  pointCount: number;
  onPointCountChange: (n: number) => void;
  activePreset: 'random' | 'clusters' | 'circles' | null;
}

const TopBar: React.FC<TopBarProps> = ({
  points,
  onGenerateRandom,
  onImport,
  onCSVUpload,
  onClear,
  theme,
  toggleTheme,
  visualSettings,
  setVisualSettings,
  splitRatio,
  setSplitRatio,
  onResplit,
  datasetState,
  onAxisChange,
  onLabelChange,
  datasetMetadata,
  config,
  filters,
  hiddenClasses,
  pointCount,
  onPointCountChange,
  activePreset
}) => {
  const [isDatasetMenuOpen, setIsDatasetMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const datasetDropdownRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datasetDropdownRef.current && !datasetDropdownRef.current.contains(event.target as Node)) {
        setIsDatasetMenuOpen(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  const handleExport = () => {
      const cleanData = points.map((p) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { neighbors, ...rest } = p;
          return { ...rest, y: -p.y };
      });

      const exportObject = {
          metadata: datasetMetadata,
          points: cleanData,
          config,
          filters,
          visualSettings,
          splitRatio,
          datasetState,
          hiddenClasses
      };
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${datasetMetadata.name.replace(/\s+/g, '_').toLowerCase()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      setIsDatasetMenuOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const result = event.target?.result;
              if (typeof result === 'string') {
                  if (file.name.endsWith('.csv')) {
                      const lines = result.split('\n').filter(l => l.trim().length > 0);
                      if (lines.length > 0) {
                          const headers = lines[0].split(',').map(h => h.trim());
                          const data = lines.slice(1).map(line => {
                              const vals = line.split(',').map(v => v.trim());
                              const obj: any = {};
                              headers.forEach((h, i) => obj[h] = vals[i]);
                              return obj;
                          });
                          onCSVUpload(headers, data);
                      }
                  } else {
                      const importedData = JSON.parse(result);
                      if (Array.isArray(importedData) || (importedData && (Array.isArray(importedData.points) || importedData.datasetState))) {
                          onImport(importedData);
                      } else {
                          alert("Неверный формат JSON.");
                      }
                  }
              }
          } catch (err) {
              alert("Ошибка при разборе файла.");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; 
  };

  const isDark = theme === 'dark';
  const barClass = isDark ? "bg-gray-900/90 border-gray-700 text-gray-100" : "bg-white/90 border-gray-200 text-gray-900";
  const dropdownClass = isDark ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900";
  const hoverClass = isDark ? "hover:bg-gray-700" : "hover:bg-gray-100";
  const labelClass = "text-[10px] uppercase font-bold opacity-60 tracking-wider mb-1";

  const showAxisControls = datasetState && datasetState.headers.length > 0;
  const showPointCountSlider = activePreset !== null;

  return (
    <div className={`absolute top-0 left-0 w-full h-14 flex items-center justify-between px-6 border-b z-20 backdrop-blur-md shadow-sm ${barClass}`}>
      
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-wide mr-4">knn.<span className="text-blue-500">meysner.ru</span></h1>

        <div className="relative" ref={datasetDropdownRef}>
            <button 
                onClick={() => setIsDatasetMenuOpen(!isDatasetMenuOpen)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${
                    isDark ? 'bg-gray-800 border-gray-600 hover:border-gray-500' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                } ${isDatasetMenuOpen ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}`}
            >
                <span className="text-sm font-medium">Набор данных</span>
                <svg className={`w-3 h-3 transition-transform ${isDatasetMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            {isDatasetMenuOpen && (
                <div className={`absolute top-full left-0 mt-2 w-64 rounded-xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${dropdownClass}`}>
                    <button onClick={() => { onClear(); setIsDatasetMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} ${hoverClass}`}>
                        <div className="p-1.5 bg-blue-500/20 rounded-md text-blue-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <span className="font-semibold text-sm">Новый проект (пустой)</span>
                    </button>

                    <div className={`px-4 py-2 text-[10px] uppercase font-bold tracking-wider opacity-50`}>Предустановки</div>
                    <button onClick={() => { onGenerateRandom('random'); setIsDatasetMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${hoverClass}`}>Случайный шум</button>
                    <button onClick={() => { onGenerateRandom('clusters'); setIsDatasetMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${hoverClass}`}>Три кластера</button>
                    <button onClick={() => { onGenerateRandom('circles'); setIsDatasetMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${hoverClass}`}>Концентрические круги</button>

                    <div className={`px-4 py-2 text-[10px] uppercase font-bold tracking-wider opacity-50 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} mt-1 pt-2`}>Примеры</div>
                    <button onClick={() => { onImport(PENGUIN_SPECIES_DATA); setIsDatasetMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${hoverClass}`}>Пингвины (виды)</button>
                    <button onClick={() => { onImport(PENGUIN_ISLAND_DATA); setIsDatasetMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${hoverClass}`}>Пингвины (смещение по островам)</button>
                    <button onClick={() => { onImport(UNCERTAINTY_DATA); setIsDatasetMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${hoverClass}`}>Неопределенность (ничьи)</button>

                    <hr className={isDark ? 'border-gray-700 my-1' : 'border-gray-100 my-1'} />
                    <button onClick={handleExport} className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm ${hoverClass} text-green-500`}>Экспорт JSON</button>
                    <button onClick={() => { fileInputRef.current?.click(); setIsDatasetMenuOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm ${hoverClass} text-blue-500`}>Импорт JSON / CSV</button>
                </div>
            )}
        </div>

        {showAxisControls && datasetState && (
             <div className="flex items-center gap-3">
                <div className={`w-px h-8 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                
                <div className="flex flex-col">
                     <label className="text-[9px] font-bold opacity-50 leading-none mb-0.5 uppercase tracking-wider">Ось X</label>
                     <div className="relative">
                        <select 
                            value={datasetState.xCol} 
                            onChange={(e) => onAxisChange(e.target.value, datasetState.yCol)} 
                            className={`text-xs py-0.5 pr-4 pl-1.5 rounded border outline-none cursor-pointer font-medium transition-colors appearance-none ${isDark ? 'bg-gray-800 border-gray-600 hover:border-gray-500 text-white' : 'bg-gray-50 border-gray-300 hover:border-gray-400 text-gray-900'}`}
                            style={{ minWidth: '80px', maxWidth: '120px' }}
                        >
                            {datasetState.headers.map(h => <option key={h} value={h} className={isDark ? 'bg-gray-900' : 'bg-white'}>{h}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-500">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                     </div>
                </div>

                <div className="flex flex-col">
                     <label className="text-[9px] font-bold opacity-50 leading-none mb-0.5 uppercase tracking-wider">Ось Y</label>
                     <div className="relative">
                         <select 
                            value={datasetState.yCol} 
                            onChange={(e) => onAxisChange(datasetState.xCol, e.target.value)} 
                            className={`text-xs py-0.5 pr-4 pl-1.5 rounded border outline-none cursor-pointer font-medium transition-colors appearance-none ${isDark ? 'bg-gray-800 border-gray-600 hover:border-gray-500 text-white' : 'bg-gray-50 border-gray-300 hover:border-gray-400 text-gray-900'}`}
                            style={{ minWidth: '80px', maxWidth: '120px' }}
                         >
                            {datasetState.headers.map(h => <option key={h} value={h} className={isDark ? 'bg-gray-900' : 'bg-white'}>{h}</option>)}
                         </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-500">
                           <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                         </div>
                     </div>
                </div>

                <div className="flex flex-col">
                     <label className="text-[9px] font-bold opacity-50 leading-none mb-0.5 uppercase tracking-wider">Класс</label>
                     <div className="relative">
                         <select 
                            value={datasetState.labelCol} 
                            onChange={(e) => onLabelChange(e.target.value)} 
                            className={`text-xs py-0.5 pr-4 pl-1.5 rounded border outline-none cursor-pointer font-medium transition-colors appearance-none ${isDark ? 'bg-gray-800 border-gray-600 hover:border-gray-500 text-white' : 'bg-gray-50 border-gray-300 hover:border-gray-400 text-gray-900'}`}
                            style={{ minWidth: '80px', maxWidth: '120px' }}
                         >
                            {datasetState.headers.map(h => <option key={h} value={h} className={isDark ? 'bg-gray-900' : 'bg-white'}>{h}</option>)}
                         </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-500">
                           <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                         </div>
                     </div>
                </div>
                
                <div className={`w-px h-8 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
             </div>
        )}

        <div className="flex items-center gap-4 px-2">
            {!showAxisControls && <div className={`w-px h-8 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div>}
            
            {showPointCountSlider && (
                <div className="flex flex-col w-24 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex justify-between text-[9px] font-bold opacity-50 uppercase tracking-wider mb-0.5">
                        <span>Количество</span>
                        <span className="text-blue-500 font-mono">{pointCount}</span>
                    </div>
                    <input 
                        type="range" min="10" max="500" step="10"
                        value={pointCount}
                        onChange={(e) => onPointCountChange(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        title="Количество точек для генерации"
                    />
                </div>
            )}

            <div className="flex flex-col w-32">
                <div className="flex justify-between text-[9px] font-bold opacity-50 uppercase tracking-wider mb-0.5">
                    <span>Соотношение разделения</span>
                    <span className="text-blue-500">{splitRatio}%</span>
                </div>
                <input 
                    type="range" min="10" max="100" step="5"
                    value={splitRatio}
                    onChange={(e) => setSplitRatio(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>
            
            <button 
                onClick={onResplit}
                className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-black'}`}
                title="Перемешать разделение"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
        </div>

      </div>

      <div className="relative" ref={settingsDropdownRef}>
        <button 
            onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} ${isSettingsMenuOpen ? 'text-blue-500 bg-blue-500/10' : ''}`}
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
        </button>
        {isSettingsMenuOpen && (
             <div className={`absolute top-full right-0 mt-2 w-64 p-4 rounded-xl border shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${dropdownClass}`}>
                <h3 className={labelClass}>Настройки отображения</h3>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Темный режим</span>
                    <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}>
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Показать линии</span>
                    <button onClick={() => setVisualSettings({ ...visualSettings, showLines: !visualSettings.showLines })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${visualSettings.showLines ? 'bg-blue-600' : isDark ? 'bg-gray-700' : 'bg-gray-300'}`}>
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${visualSettings.showLines ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <hr className={`border-t mb-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
                <div className="space-y-5">
                    <div>
                        <div className="flex justify-between text-xs mb-1"><span>Радиус точки</span><span className="font-mono text-blue-500">{visualSettings.pointRadius}px</span></div>
                        <input type="range" min="2" max="15" step="0.5" value={visualSettings.pointRadius} onChange={(e) => setVisualSettings({ ...visualSettings, pointRadius: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1"><span>Толщина линии</span><span className="font-mono text-blue-500">{visualSettings.lineWidth}px</span></div>
                        <input type="range" min="0.5" max="5" step="0.5" value={visualSettings.lineWidth} onChange={(e) => setVisualSettings({ ...visualSettings, lineWidth: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                </div>
            </div>
        )}
      </div>
      
      <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv" onChange={handleFileChange} />
    </div>
  );
};

export default TopBar;
