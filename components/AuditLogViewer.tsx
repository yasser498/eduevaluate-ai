
import React, { useEffect, useState } from 'react';
import { AuditLogEntry } from '../types';
import { getLogs, clearLogs } from '../services/auditService';
import { X, Trash2, Clock, Activity } from 'lucide-react';

interface AuditLogViewerProps {
  onClose: () => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    setLogs(getLogs());
  }, []);

  const handleClear = () => {
    if (confirm('هل أنت متأكد من رغبتك في مسح سجل العمليات؟')) {
      clearLogs();
      setLogs([]);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ar-SA');
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'UPLOAD': return 'bg-blue-100 text-blue-700';
      case 'ANALYSIS': return 'bg-purple-100 text-purple-700';
      case 'REPORT': return 'bg-amber-100 text-amber-700';
      case 'EXPORT': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'UPLOAD': return 'رفع ملفات';
      case 'ANALYSIS': return 'تحليل ذكي';
      case 'REPORT': return 'عرض/طباعة';
      case 'EXPORT': return 'تصدير';
      default: return 'نظام';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            سجل عمليات النظام
          </h2>
          <div className="flex gap-2">
            {logs.length > 0 && (
              <button 
                onClick={handleClear}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="مسح السجل"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>لا توجد عمليات مسجلة حتى الآن</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex items-start gap-3">
                <div className={`text-xs font-bold px-2 py-1 rounded-md min-w-[80px] text-center ${getActionColor(log.action)}`}>
                  {getActionLabel(log.action)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800 font-medium">{log.details}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span dir="ltr" className="text-right">{formatTime(log.timestamp)}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
