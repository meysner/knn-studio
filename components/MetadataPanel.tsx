import React, { useState, useRef, useEffect } from 'react';
import { DatasetMetadata } from '../types';

interface MetadataPanelProps {
  metadata: DatasetMetadata;
  onMetadataChange: (meta: DatasetMetadata) => void;
  theme: 'dark' | 'light';
}

const MetadataPanel: React.FC<MetadataPanelProps> = ({ metadata, onMetadataChange, theme }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const isDark = theme === 'dark';
  const bgClass = isDark ? "bg-gray-900/90 border-gray-700 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const inputBgClass = isDark ? "bg-gray-800 border-gray-600 text-white focus:border-blue-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500";
  const labelClass = isDark ? "text-gray-400" : "text-gray-500";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";

  const handleChange = (field: keyof DatasetMetadata, value: string) => {
    onMetadataChange({ ...metadata, [field]: value });
  };

  const toggleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(!isEditing);
      if (isCollapsed && !isEditing) setIsCollapsed(false);
  };

  return (
    <div className={`w-64 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 ${bgClass} ${isCollapsed ? 'p-3' : 'p-4'}`}>
        <div
          className="flex justify-between items-start cursor-pointer group"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
            <div className="flex-1 min-w-0 mr-2">
                 {isEditing ? (
                     <h2 className="text-xs font-bold uppercase tracking-wider opacity-60 pt-1">Редактирование метаданных</h2>
                 ) : (
                     <div>
                         <h2 className={`font-bold text-sm leading-tight truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`} title={metadata.name}>
                             {metadata.name || "Без названия"}
                         </h2>
                         {isCollapsed && (
                             <p className={`text-[10px] mt-0.5 truncate opacity-60`}>{metadata.description}</p>
                         )}
                     </div>
                 )}
            </div>

            <div className="flex gap-1 items-center">
                <button 
                    onClick={toggleEdit}
                    className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-black'}`}
                    title={isEditing ? "Завершить редактирование" : "Редактировать метаданные"}
                >
                   {isEditing ? (
                       <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                   ) : (
                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                   )}
                </button>
                <button 
                    className={`p-1 rounded transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''} ${isDark ? 'text-gray-500 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-gray-600'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
            </div>
        </div>

        {!isCollapsed && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {isEditing ? (
                    <div className="space-y-3 pt-1">
                        <div>
                            <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Название</label>
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={metadata.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className={`w-full text-xs px-2 py-1.5 rounded border outline-none transition-colors ${inputBgClass}`}
                                placeholder="Название набора данных"
                            />
                        </div>
                        <div>
                            <label className={`block text-[10px] uppercase font-bold mb-1 ${labelClass}`}>Описание</label>
                            <textarea 
                                value={metadata.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className={`w-full text-xs px-2 py-1.5 rounded border outline-none transition-colors resize-none h-20 ${inputBgClass}`}
                                placeholder="Описание набора данных..."
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                         <p className={`text-xs whitespace-pre-wrap leading-relaxed ${textMuted}`}>
                             {metadata.description || <span className="italic opacity-50">Описание не предоставлено.</span>}
                         </p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default MetadataPanel;