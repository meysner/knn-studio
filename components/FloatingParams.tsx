import React, { useState } from 'react';
import { KNNConfig, MetricType, WeightingType } from '../types';

interface FloatingParamsProps {
  config: KNNConfig;
  onConfigChange: (c: KNNConfig) => void;
  theme: 'dark' | 'light';
}

const FloatingParams: React.FC<FloatingParamsProps> = ({ config, onConfigChange, theme }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const isDark = theme === 'dark';
  const bgClass = isDark ? "bg-gray-900/90 border-gray-700 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const inputBgClass = isDark ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-300";

  return (
    <div className={`w-64 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 ${bgClass} ${isCollapsed ? 'p-3' : 'p-4'}`}>
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
            <h2 className="text-xs font-bold uppercase tracking-wider opacity-60">Параметры</h2>
            <button className={`p-1 rounded hover:bg-gray-500/10 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
               <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
        </div>
        
        {!isCollapsed && (
            <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span>Соседи (K)</span>
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
                    <label className="block text-xs mb-1 opacity-80">Метрика расстояния</label>
                    <select
                        value={config.metric}
                        onChange={(e) => onConfigChange({ ...config, metric: e.target.value as MetricType })}
                        className={`w-full text-xs p-1.5 rounded border outline-none focus:border-blue-500 ${inputBgClass}`}
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
                            <span>Значение P</span>
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
                    <label className="block text-xs mb-1 opacity-80">Взвешивание</label>
                    <div className={`flex rounded p-1 border ${inputBgClass}`}>
                        <button
                            onClick={() => onConfigChange({ ...config, weighting: 'uniform' })}
                            className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                                config.weighting === 'uniform' ? 'bg-blue-600 text-white' : 'hover:bg-gray-500/10'
                            }`}
                        >
                            Равномерное
                        </button>
                        <button
                            onClick={() => onConfigChange({ ...config, weighting: 'distance' })}
                            className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                                config.weighting === 'distance' ? 'bg-blue-600 text-white' : 'hover:bg-gray-500/10'
                            }`}
                        >
                            По расстоянию
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default FloatingParams;