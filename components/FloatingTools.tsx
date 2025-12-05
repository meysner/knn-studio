import React, { useState } from 'react';
import { ClassLabel, PointType } from '../types';

interface FloatingToolsProps {
  interactionMode: 'view' | 'add_train' | 'add_test';
  setInteractionMode: (mode: 'view' | 'add_train' | 'add_test') => void;
  currentDrawLabel: ClassLabel;
  setCurrentDrawLabel: (l: ClassLabel) => void;
  onManualAdd: (x: number, y: number, type: PointType, label: ClassLabel) => void;
  theme: 'dark' | 'light';
  featureNames: { x: string; y: string };
  classNames: Record<string, string>;
  activeClasses: ClassLabel[];
  hiddenClasses: string[];
  onToggleClass: (label: string) => void;
}

const FloatingTools: React.FC<FloatingToolsProps> = ({
  interactionMode,
  setInteractionMode,
  currentDrawLabel,
  setCurrentDrawLabel,
  onManualAdd,
  theme,
  classNames,
  activeClasses,
  hiddenClasses,
  onToggleClass
}) => {
  const [manualX, setManualX] = useState('0');
  const [manualY, setManualY] = useState('0');
  const [showManual, setShowManual] = useState(false);

  const isDark = theme === 'dark';
  const bgClass = isDark ? "bg-gray-900/90 border-gray-700 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const activeClass = "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105";
  const inactiveClass = isDark ? "hover:bg-gray-800 border-transparent text-gray-400" : "hover:bg-gray-100 border-transparent text-gray-600";

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseFloat(manualX);
    const y = parseFloat(manualY);
    if (!isNaN(x) && !isNaN(y)) {
       onManualAdd(x, y, 'test', ClassLabel.A);
       setShowManual(false);
    }
  };

  return (
    <div className="absolute bottom-6 left-6 flex flex-col gap-3 z-20">
      
      <div className="flex flex-wrap gap-x-4 gap-y-2 max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-300 mb-1 px-1">
         {activeClasses.map(label => {
             const isHidden = hiddenClasses.includes(label);
             return (
                <button
                    key={label}
                    onClick={() => onToggleClass(label)}
                    className={`flex items-center gap-1.5 transition-all duration-200 group outline-none ${isHidden ? 'opacity-40 grayscale' : 'opacity-100 hover:scale-105'}`}
                    title={isHidden ? `Показать ${classNames[label] || label}` : `Скрыть ${classNames[label] || label}`}
                >
                    <div 
                        className={`w-2.5 h-2.5 rounded-full shadow-sm ring-1 transition-all ${isHidden ? 'ring-transparent scale-75' : 'ring-white/20'}`} 
                        style={{ backgroundColor: getClassColor(label) }}
                    ></div>
                    <span 
                        className={`text-xs font-bold tracking-tight drop-shadow-sm transition-colors ${isDark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'} ${isHidden ? 'line-through decoration-gray-500' : ''}`}
                    >
                        {classNames[label] || label}
                    </span>
                </button>
             );
         })}
      </div>

      <div className="flex items-end gap-3">
          <div className={`flex p-1 rounded-2xl border backdrop-blur-md shadow-xl ${bgClass}`}>
            <button
              onClick={() => setInteractionMode('view')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                interactionMode === 'view' ? activeClass : inactiveClass
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              Просмотр
            </button>

            <div className="w-px bg-gray-500/20 mx-1 my-1"></div>

            <button
              onClick={() => setInteractionMode('add_train')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                interactionMode === 'add_train' ? activeClass : inactiveClass
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              Точка обучения
            </button>

            <div className="w-px bg-gray-500/20 mx-1 my-1"></div>

            <div className="relative">
              <button
                onClick={() => {
                    setInteractionMode('add_test');
                    setShowManual(!showManual);
                }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                  interactionMode === 'add_test' ? activeClass : inactiveClass
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Точка теста
              </button>
              
              {showManual && interactionMode === 'add_test' && (
                 <div className={`absolute bottom-full left-0 mb-3 p-3 rounded-xl border shadow-xl w-48 ${bgClass}`}>
                    <h4 className="text-[10px] uppercase font-bold tracking-wider mb-2 opacity-70">Координаты вручную</h4>
                    <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
                       <div className="flex gap-2">
                           <input 
                             type="number" 
                             value={manualX} 
                             onChange={e => setManualX(e.target.value)} 
                             placeholder="X"
                             className={`w-full px-2 py-1 text-xs rounded border ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`} 
                           />
                           <input 
                             type="number" 
                             value={manualY} 
                             onChange={e => setManualY(e.target.value)} 
                             placeholder="Y"
                             className={`w-full px-2 py-1 text-xs rounded border ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'}`} 
                           />
                       </div>
                       <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 rounded">Добавить</button>
                    </form>
                 </div>
              )}
            </div>
          </div>

          {interactionMode === 'add_train' && (
            <div className={`flex p-1 rounded-2xl border backdrop-blur-md shadow-xl animate-in slide-in-from-left-4 fade-in duration-300 ${bgClass}`}>
                {activeClasses.map(label => (
                    <button
                        key={label}
                        onClick={() => setCurrentDrawLabel(label)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform ${
                            currentDrawLabel === label ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: getClassColor(label) }}
                        title={classNames[label] || label} 
                    />
                ))}
            </div>
          )}
      </div>

    </div>
  );
};

function getClassColor(label: string) {
    switch(label) {
        case 'Class A': return '#ef4444';
        case 'Class B': return '#3b82f6';
        case 'Class C': return '#22c55e';
        case 'Class D': return '#eab308';
        default: return '#fff';
    }
}

export default FloatingTools;