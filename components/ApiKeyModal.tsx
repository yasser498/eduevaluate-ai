import React, { useState, useEffect } from 'react';
import { Key, Lock, ExternalLink, Check, AlertTriangle } from 'lucide-react';
import { API_KEY_STORAGE_KEY } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) setApiKey(storedKey);
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('الرجاء إدخال مفتاح API صحيح');
      return;
    }
    
    if (!apiKey.startsWith('AIza')) {
      setError('يبدو أن تنسيق المفتاح غير صحيح (يجب أن يبدأ بـ AIza)');
      return;
    }

    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    setError('');
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-indigo-600 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">إعداد مفتاح الذكاء الاصطناعي</h2>
          <p className="text-indigo-100 text-sm mt-2">لتشغيل النظام، نحتاج لربطه بمحرك Gemini</p>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-amber-50 border border-amber-100 rounded-lg p-4 text-xs text-amber-800 flex gap-2 items-start">
             <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
             <p>
               يتم حفظ المفتاح في <strong>متصفحك فقط</strong> (Local Storage) ولا يتم إرساله لأي خادم خارجي سوى Google API مباشرة. أنت تتحكم ببياناتك بالكامل.
             </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">مفتاح API الخاص بك (Gemini API Key)</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono text-sm"
                dir="ltr"
              />
              {error && <p className="text-red-500 text-xs mt-1 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {error}</p>}
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              حفظ وتابع
            </button>

            <div className="text-center pt-2">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                ليس لديك مفتاح؟ احصل عليه مجاناً من هنا
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};