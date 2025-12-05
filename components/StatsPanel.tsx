import React, { useState } from 'react';
import { DataPoint, ClassLabel } from '../types';

interface StatsPanelProps {
  points: DataPoint[];
  theme: 'dark' | 'light';
  totalRawCount?: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ points, theme, totalRawCount }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const bgClass = theme === 'dark' ? 'bg-gray-900/90 border-gray-700 text-gray-300' : 'bg-white/90 border-gray-200 text-gray-700';
  const textMutedClass = theme === 'dark' ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={`w-56 rounded-lg border backdrop-blur-md shadow-sm transition-all duration-300 ${bgClass} ${isCollapsed ? 'p-2' : 'p-3'}`}>
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
          <h3 className={`font-bold text-[10px] uppercase tracking-wider opacity-70`}>Статистика</h3>
          <button className={`p-0.5 rounded hover:bg-gray-500/10 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
               <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
      </div>

      {!isCollapsed && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200 mt-2 space-y-2">
            
            <div className="grid grid-cols-3 gap-1 text-[10px] leading-tight text-center">
                <div className={`p-1 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={textMutedClass}>Обучение</div>
                    <div className="font-mono font-bold">{trainPoints.length}</div>
                </div>
                <div className={`p-1 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={textMutedClass}>Тест</div>
                    <div className="font-mono font-bold text-blue-500">{classifiedTests.length}</div>
                </div>
                <div className={`p-1 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={textMutedClass}>Видимые</div>
                    <div className={`font-mono font-bold ${percentageStr === '100' ? 'text-green-500' : 'text-yellow-500'}`}>{percentageStr}%</div>
                </div>
            </div>

            <div className={`flex items-center justify-between px-2 py-1.5 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                 <div className="flex flex-col">
                    <span className={`text-[9px] uppercase font-bold ${textMutedClass}`}>Точность</span>
                    <span className={`font-mono font-bold text-sm ${
                        !hasValidationPoints ? textMutedClass :
                        parseFloat(accuracy) > 80 ? 'text-green-500' : 
                        parseFloat(accuracy) > 50 ? 'text-yellow-500' : 
                        'text-red-500'
                    }`}>
                        {hasValidationPoints ? `${accuracy}%` : '--'}
                    </span>
                 </div>
                 <div className="text-[10px] text-right space-y-0.5">
                     <div className="flex gap-2">
                        <span className="text-green-500 font-mono" title="Верно">+{correctCount}</span>
                        <span className="text-red-500 font-mono" title="Неверно">-{incorrectCount}</span>
                     </div>
                 </div>
            </div>

            <div className="pt-1">
                <div className="w-full h-1.5 rounded-full flex overflow-hidden bg-gray-500/20">
                    {totalTrain > 0 ? Object.values(ClassLabel).map(label => {
                        const count = counts[label] || 0;
                        if (count === 0) return null;
                        const pct = (count / totalTrain) * 100;
                        return (
                            <div 
                                key={label}
                                style={{ width: `${pct}%`, backgroundColor: getComputedColor(label) }}
                                title={`${label}: ${count} (${pct.toFixed(1)}%)`}
                            />
                        )
                    }) : null}
                </div>
                <div className="flex justify-between mt-1 px-0.5">
                     {Object.values(ClassLabel).map(label => (
                         <div key={label} className="flex items-center gap-1" title={label}>
                             <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: getComputedColor(label) }}></div>
                             <span className={`text-[9px] ${textMutedClass}`}>{counts[label] || 0}</span>
                         </div>
                     ))}
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

function getComputedColor(label: string) {
    switch(label) {
        case 'Class A': return '#ef4444';
        case 'Class B': return '#3b82f6';
        case 'Class C': return '#22c55e';
        case 'Class D': return '#eab308';
        default: return '#fff';
    }
}

export default StatsPanel;