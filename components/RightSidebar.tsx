
import React, { useState, useRef, useEffect } from 'react';
import { DatasetMetadata, DataPoint, KNNConfig, MetricType, ClassLabel, CLASS_COLORS } from '../types';

interface RightSidebarProps {
  metadata: DatasetMetadata;
  onMetadataChange: (meta: DatasetMetadata) => void;
  points: DataPoint[];
  totalRawCount?: number;
  config: KNNConfig;
  onConfigChange: (config: KNNConfig) => void;
  theme: 'dark' | 'light';
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  metadata,
  onMetadataChange,
  points,
  totalRawCount,
  config,
  onConfigChange,
  theme
}) => {
  const [sections, setSections] = useState({
    metadata: true,
    stats: true,
    params: true
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isDark = theme === 'dark';
  const bgClass = isDark ? "bg-gray-950 border-gray-800 text-gray-100" : "bg-white border-gray-200 text-gray-900";
  const headerClass = isDark ? "hover:bg-gray-900" : "hover:bg-gray-50";
  const borderClass = isDark ? "border-gray-800" : "border-gray-200";
  const inputBgClass = isDark ? "bg-gray-900 border-gray-700 text-white focus:border-blue-500" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500";
  const labelClass = isDark ? "text-gray-400" : "text-gray-500";
  const textMuted = isDark ? "text-gray-500" : "text-gray-400";

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const metaInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditingMeta && metaInputRef.current) {
      metaInputRef.current.focus();
    }
  }, [isEditingMeta]);

  const handleMetaChange = (field: keyof DatasetMetadata, value: string) => {
    onMetadataChange({ ...metadata, [field]: value });
  };

  const trainPoints = points.filter(p => p.type === 'train');
  const testPoints = points.filter(p => p.type === 'test');
  const visibleDatasetCount = points.filter(p => !p.isUserCreated).length;
  
  let percentageStr = '100';
  if (totalRawCount && totalRawCount > 0) {
      percentageStr = ((visibleDatasetCount / totalRawCount) * 100).toFixed(1);
  }
  if (percentageStr.endsWith('.0')) percentageStr = percentageStr.slice(0, -2);

  const counts = trainPoints.reduce((acc, p) => {
    acc[p.label] = (acc[p.label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalTrain = trainPoints.length;

  const classifiedTests = testPoints.filter(p => 
      p.predictedLabel && 
      p.predictedLabel !== 'Uncertain' && 
      !p.isUserCreated
  );
  const correctCount = classifiedTests.filter(p => p.isCorrect).length;
  const incorrectCount = classifiedTests.length - correctCount;
  const hasValidationPoints = classifiedTests.length > 0;
  const accuracy = hasValidationPoints 
    ? ((correctCount / classifiedTests.length) * 100).toFixed(1) 
    : 'N/A';

  const SectionHeader = ({ title, isOpen, onClick, actions }: { title: string, isOpen: boolean, onClick: () => void, actions?: React.ReactNode }) => (
    <div className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors ${headerClass} border-b ${borderClass}`} onClick={onClick}>
        <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">{title}</h3>
        </div>
        {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
    </div>
  );

  return (
    <div className={`w-80 flex-shrink-0 border-l flex flex-col h-full overflow-y-auto z-10 shadow-lg ${bgClass}`}>
        
        <SectionHeader
            title="Информация о наборе данных"
            isOpen={sections.metadata} 
            onClick={() => toggleSection('metadata')}
            actions={
                <button 
                    onClick={() => setIsEditingMeta(!isEditingMeta)}
                    className={`p-1 rounded hover:bg-gray-500/20 transition-colors ${isEditingMeta ? 'text-green-500' : textMuted}`}
                    title="Редактировать метаданные"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
            }
        />
        {sections.metadata && (
            <div className={`p-4 border-b ${borderClass} animate-in slide-in-from-top-1 duration-200`}>
                {isEditingMeta ? (
                    <div className="space-y-3">
                        <div>
                            <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Название</label>
                            <input 
                                ref={metaInputRef}
                                type="text" 
                                value={metadata.name}
                                onChange={(e) => handleMetaChange('name', e.target.value)}
                                className={`w-full text-xs px-2 py-1.5 rounded border outline-none transition-colors ${inputBgClass}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Описание</label>
                            <textarea 
                                value={metadata.description}
                                onChange={(e) => handleMetaChange('description', e.target.value)}
                                className={`w-full text-xs px-2 py-1.5 rounded border outline-none transition-colors resize-none h-20 ${inputBgClass}`}
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="font-bold text-sm mb-1 text-blue-500">{metadata.name || "Проект без названия"}</h2>
                        <p className={`text-xs leading-relaxed whitespace-pre-wrap ${textMuted}`}>
                            {metadata.description || "Описание не предоставлено."}
                        </p>
                    </div>
                )}
            </div>
        )}

        <SectionHeader
            title="Статистика"
            isOpen={sections.stats} 
            onClick={() => toggleSection('stats')} 
        />
        {sections.stats && (
            <div className={`p-4 border-b ${borderClass} animate-in slide-in-from-top-1 duration-200`}>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={`p-2 rounded border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div className={`text-[10px] uppercase ${textMuted}`}>Обучение</div>
                        <div className="font-mono font-bold text-sm">{trainPoints.length}</div>
                    </div>
                    <div className={`p-2 rounded border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div className={`text-[10px] uppercase ${textMuted}`}>Тест</div>
                        <div className="font-mono font-bold text-sm text-blue-500">{classifiedTests.length}</div>
                    </div>
                    <div className={`p-2 rounded border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div className={`text-[10px] uppercase ${textMuted}`}>Видимые</div>
                        <div className={`font-mono font-bold text-sm ${percentageStr === '100' ? 'text-green-500' : 'text-amber-500'}`}>{percentageStr}%</div>
                    </div>
                </div>

                <div className={`flex items-center justify-between px-3 py-2 rounded border mb-3 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                     <div>
                        <span className={`text-[10px] uppercase font-bold block ${textMuted}`}>Точность</span>
                        <span className={`font-mono font-bold text-lg ${
                            !hasValidationPoints ? textMuted :
                            parseFloat(accuracy) > 80 ? 'text-green-500' : 
                            parseFloat(accuracy) > 50 ? 'text-yellow-500' : 
                            'text-red-500'
                        }`}>
                            {hasValidationPoints ? `${accuracy}%` : '--'}
                        </span>
                     </div>
                     <div className="text-right text-xs">
                         <div className="text-green-500 font-mono">+{correctCount} Верно</div>
                         <div className="text-red-500 font-mono">-{incorrectCount} Неверно</div>
                     </div>
                </div>

                <div>
                     <div className={`flex justify-between text-[10px] mb-1 uppercase font-bold ${textMuted}`}>
                         <span>Распределение классов</span>
                     </div>
                     <div className="w-full h-2 rounded-full flex overflow-hidden bg-gray-500/20 mb-2">
                        {totalTrain > 0 ? Object.values(ClassLabel).map(label => {
                            const count = counts[label] || 0;
                            if (count === 0) return null;
                            const pct = (count / totalTrain) * 100;
                            return (
                                <div 
                                    key={label}
                                    style={{ width: `${pct}%`, backgroundColor: CLASS_COLORS[label] }}
                                    title={`${label}: ${count}`}
                                />
                            )
                        }) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                         {Object.values(ClassLabel).map(label => (
                             <div key={label} className="flex items-center gap-1.5">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CLASS_COLORS[label] }}></div>
                                 <span className={`text-[10px] font-mono ${textMuted}`}>{counts[label] || 0}</span>
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        )}

        <SectionHeader
            title="Параметры"
            isOpen={sections.params} 
            onClick={() => toggleSection('params')} 
        />
        {sections.params && (
            <div className={`p-4 animate-in slide-in-from-top-1 duration-200`}>
                 <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Соседи (K)</span>
                            <span className="text-blue-500 font-bold font-mono">{config.k}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={config.k}
                            onChange={(e) => onConfigChange({ ...config, k: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div>
                        <label className={`block text-xs mb-1 ${labelClass}`}>Метрика расстояния</label>
                        <select
                            value={config.metric}
                            onChange={(e) => onConfigChange({ ...config, metric: e.target.value as MetricType })}
                            className={`w-full text-xs p-2 rounded border outline-none ${inputBgClass}`}
                        >
                            <option value="euclidean">Евклидово (L2)</option>
                            <option value="manhattan">Манхэттенское (L1)</option>
                            <option value="minkowski">Минковского (Lp)</option>
                            <option value="cosine">Косинусное сходство</option>
                        </select>
                    </div>

                    {config.metric === 'minkowski' && (
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Значение P</span>
                                <span className="text-green-500 font-bold font-mono">{config.minkowskiP}</span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="10"
                                step="0.1"
                                value={config.minkowskiP}
                                onChange={(e) => onConfigChange({ ...config, minkowskiP: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-green-500"
                            />
                        </div>
                    )}

                    <div>
                        <label className={`block text-xs mb-1 ${labelClass}`}>Функция взвешивания</label>
                        <div className={`flex rounded p-1 border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <button
                                onClick={() => onConfigChange({ ...config, weighting: 'uniform' })}
                                className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                                    config.weighting === 'uniform' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-500/10 ' + textMuted
                                }`}
                            >
                                Равномерное
                            </button>
                            <button
                                onClick={() => onConfigChange({ ...config, weighting: 'distance' })}
                                className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                                    config.weighting === 'distance' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-500/10 ' + textMuted
                                }`}
                            >
                                Обратное расстояние
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default RightSidebar;
