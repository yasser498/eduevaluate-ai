import React, { useRef, useState } from 'react';
import { Upload, Folder, AlertCircle, Zap, Search } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: FileList) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    alert("يرجى استخدام زر 'اختيار مجلد المعلمين' للتأكد من قراءة هيكل المجلدات بشكل صحيح من المتصفح.");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ${
        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-2 shadow-inner relative">
          <Folder className="w-10 h-10" />
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1.5 shadow-sm border-2 border-white">
            <Search className="w-4 h-4" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-slate-800">ربط مجلد المعلمين</h3>
        <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
          قم باختيار <strong className="text-slate-800">المجلد الرئيسي</strong> الذي يحتوي على مجلدات جميع المعلمين.
          <br/>
          <span className="text-xs text-indigo-600 font-bold mt-1 block bg-indigo-50 py-1 rounded-md">
             ✨ ميزة جديدة: يتم الآن قراءة محتوى الملفات (PDF/صور) لتقييم الجودة بدقة
          </span>
        </p>
        
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-w-sm mx-auto my-2 text-right" dir="ltr">
           <p className="text-xs text-slate-500 mb-1 font-semibold uppercase text-right w-full">الهيكلة المطلوبة:</p>
           <div className="font-mono text-xs text-slate-700 space-y-1 text-right">
             <div>📂 School_Teachers</div>
             <div className="pr-4">├── 📂 Ahmed (Teacher)</div>
             <div className="pr-4">├── 📂 Sarah (Teacher)</div>
             <div className="pr-4">└── ...</div>
           </div>
        </div>

        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as any)}
            multiple
            onChange={handleChange}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-3 mx-auto hover:scale-105 active:scale-95"
          >
            <Upload className="w-6 h-6" />
            اختيار المجلد الرئيسي
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-4 py-2 rounded-full mt-6">
          <AlertCircle className="w-4 h-4" />
          <span>ملاحظة: النظام يستخدم "نظام العينات الذكي" لقراءة أهم الملفات فقط لتسريع الأداء.</span>
        </div>
      </div>
    </div>
  );
};