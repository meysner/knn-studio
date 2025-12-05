import React, { useState, useEffect } from 'react';
import { ClassLabel } from '../types';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  data: any[];
  onSubmit: (config: CSVConfig) => void;
  theme: 'dark' | 'light';
}

export interface CSVConfig {
  xColumn: string;
  yColumn: string;
  labelColumn: string;
  splitRatio: number;
  mappedClasses: Record<string, ClassLabel>;
}

const CSVImportModal: React.FC<CSVImportModalProps> = ({ 
  isOpen, 
  onClose, 
  headers, 
  data, 
  onSubmit,
  theme 
}) => {
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [labelCol, setLabelCol] = useState('');
  const [split, setSplit] = useState(100);
  const [uniqueLabels, setUniqueLabels] = useState<string[]>([]);

  useEffect(() => {
    if (headers.length >= 2) {
        setXCol(headers[0]);
        setYCol(headers[1]);
    }
    if (headers.length >= 3) {
        setLabelCol(headers[headers.length - 1]);
    } else if (headers.length > 0) {
        setLabelCol(headers[headers.length - 1]);
    }
  }, [headers]);

  useEffect(() => {
      if (!labelCol || !data.length) return;
      const u = Array.from(new Set(data.map(row => row[labelCol]?.toString().trim()))).filter(Boolean);
      setUniqueLabels(u.slice(0, 4)); // Ограничение до 4 для этого приложения
  }, [labelCol, data]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const classEnumValues = Object.values(ClassLabel);
    const mapping: Record<string, ClassLabel> = {};
    uniqueLabels.forEach((l, idx) => {
        if (idx < classEnumValues.length) {
            mapping[l] = classEnumValues[idx];
        }
    });

    onSubmit({
        xColumn: xCol,
        yColumn: yCol,
        labelColumn: labelCol,
        splitRatio: split,
        mappedClasses: mapping
    });
  };

  const isDark = theme === 'dark';
  const bgClass = isDark ? "bg-gray-900 text-gray-100 border-gray-700" : "bg-white text-gray-900 border-gray-200";
  const inputClass = isDark ? "bg-gray-800 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-96 p-6 rounded-xl shadow-2xl border ${bgClass}`}>
        <h2 className="text-xl font-bold mb-4">Импорт CSV набора данных</h2>
        
        <div className="space-y-4">
            <div>
                <label className="block text-xs uppercase font-bold mb-1 opacity-70">Признак X (Ось 1)</label>
                <select value={xCol} onChange={e => setXCol(e.target.value)} className={`w-full p-2 rounded text-sm border outline-none focus:border-blue-500 ${inputClass}`}>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-xs uppercase font-bold mb-1 opacity-70">Признак Y (Ось 2)</label>
                <select value={yCol} onChange={e => setYCol(e.target.value)} className={`w-full p-2 rounded text-sm border outline-none focus:border-blue-500 ${inputClass}`}>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-xs uppercase font-bold mb-1 opacity-70">Столбец с метками классов</label>
                <select value={labelCol} onChange={e => setLabelCol(e.target.value)} className={`w-full p-2 rounded text-sm border outline-none focus:border-blue-500 ${inputClass}`}>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
            </div>

            <div className={`p-3 rounded text-xs border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                <p className="font-bold mb-2">Предпросмотр сопоставления классов:</p>
                {uniqueLabels.length === 0 ? <span className="opacity-50">Выберите действительный столбец меток</span> : (
                    <ul className="space-y-1">
                        {uniqueLabels.map((l, idx) => (
                            <li key={l} className="flex justify-between">
                                <span>{l}</span>
                                <span className="text-blue-500">→ {Object.values(ClassLabel)[idx] || 'Игнорируется'}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold">Разделение Обучение / Тест</span>
                    <span className="text-blue-500 font-mono">{split}% / {100 - split}%</span>
                </div>
                <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5" 
                    value={split} 
                    onChange={e => setSplit(parseInt(e.target.value))} 
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded hover:bg-gray-700 transition-colors">Отмена</button>
            <button onClick={handleSubmit} className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg transition-transform active:scale-95">
                Обработать импорт
            </button>
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;