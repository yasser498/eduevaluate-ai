
import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { Dashboard } from './components/Dashboard';
import { TeacherReport } from './components/TeacherReport';
import { AuditLogViewer } from './components/AuditLogViewer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Teacher, EvaluationCriteria } from './types';
import { EVALUATION_CRITERIA } from './constants';
import { analyzeTeacherPortfolio, API_KEY_STORAGE_KEY } from './services/geminiService';
import { logAction } from './services/auditService';
import { LayoutDashboard, Users, FileText, CheckCircle2, Loader2, Sparkles, FolderOpen, Search, History, Printer, Settings } from 'lucide-react';

export default function App() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'teachers'>('dashboard');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isPrintingAll, setIsPrintingAll] = useState(false);

  // Check for API Key on mount
  useEffect(() => {
    const key = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (!key) {
      setShowApiKeyModal(true);
    }
  }, []);

  // Helper to convert File to Base64 for Gemini
  const fileToGenerativePart = async (file: File) => {
    return new Promise<{ inlineData: { mimeType: string; data: string } }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType: file.type
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = useCallback(async (fileList: FileList) => {
    // Check key before starting
    if (!localStorage.getItem(API_KEY_STORAGE_KEY)) {
      setShowApiKeyModal(true);
      return;
    }

    setIsProcessing(true);
    setProcessedCount(0);
    const filesArray = Array.from(fileList);
    
    logAction('UPLOAD', `بدء معالجة مجلد جديد يحتوي على ${filesArray.length} ملف`);

    // Smart detection of folder structure + Keeping File Objects
    const teacherMap = new Map<string, { paths: string[], files: File[] }>();
    
    if (filesArray.length > 0) {
      const rootFolderName = filesArray[0].webkitRelativePath.split('/')[0];
      const allShareRoot = filesArray.every(f => f.webkitRelativePath.startsWith(rootFolderName + '/'));

      if (allShareRoot) {
        // Structure: Root -> TeacherName -> Files
        filesArray.forEach(file => {
          const parts = file.webkitRelativePath.split('/');
          if (parts.length > 2) {
            const teacherName = parts[1];
            const relativePath = parts.slice(2).join('/');
            
            if (!teacherMap.has(teacherName)) {
              teacherMap.set(teacherName, { paths: [], files: [] });
            }
            teacherMap.get(teacherName)?.paths.push(relativePath);
            teacherMap.get(teacherName)?.files.push(file);
          }
        });
      } else {
        // Flat Structure
        filesArray.forEach(file => {
          const parts = file.webkitRelativePath.split('/');
          if (parts.length > 1) {
             const teacherName = parts[0];
             const relativePath = parts.slice(1).join('/');
             
             if (!teacherMap.has(teacherName)) {
               teacherMap.set(teacherName, { paths: [], files: [] });
             }
             teacherMap.get(teacherName)?.paths.push(relativePath);
             teacherMap.get(teacherName)?.files.push(file);
          }
        });
      }
    }

    // Fallback for single folder upload
    if (teacherMap.size === 0 && filesArray.length > 0) {
       const rootName = filesArray[0].webkitRelativePath.split('/')[0];
       const paths: string[] = [];
       const fileObjs: File[] = [];

       filesArray.forEach(f => {
         const parts = f.webkitRelativePath.split('/');
         paths.push(parts.slice(1).join('/'));
         fileObjs.push(f);
       });
       teacherMap.set(rootName, { paths, files: fileObjs });
    }

    const initialTeachers: Teacher[] = Array.from(teacherMap.entries()).map(([name, data], index) => ({
      id: `t-${Date.now()}-${index}`,
      name,
      folderPath: name, 
      files: data.paths,
      fileObjects: data.files,
      status: 'pending'
    }));

    setTeachers(initialTeachers);
    logAction('SYSTEM', `تم التعرف على ${initialTeachers.length} معلم من هيكل المجلدات`);

    // BATCH PROCESSING QUEUE
    const CONCURRENCY_LIMIT = 2; // Reduced slightly for content upload stability
    const queue = [...initialTeachers];
    const activePromises: Promise<void>[] = [];
    
    logAction('ANALYSIS', `بدء التحليل الذكي لـ ${initialTeachers.length} معلم`);

    const processTeacher = async (teacher: Teacher) => {
      // Update status to analyzing
      setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, status: 'analyzing' } : t));
      
      // --- SMART SAMPLING LOGIC ---
      // We cannot upload 1GB of data. We select top 3 "High Value" files to read content from.
      // Priority: PDFs, Images. Keywords: Report, Plan, Analysis.
      
      const keywords = [
        'report', 'plan', 'analysis', 'test', 'result', 'log', 'form', 'card', 'evidence',
        'تقرير', 'خطة', 'تحليل', 'نتائج', 'اختبار', 'سجل', 'كشف', 'استمارة', 'بطاقة', 'شواهد', 'إنجاز'
      ];
      
      const candidateFiles = teacher.fileObjects.filter(f => 
        (f.type === 'application/pdf' || f.type.startsWith('image/')) && f.size < 4 * 1024 * 1024 // Limit 4MB per file
      );

      // Score files based on keyword matches
      const scoredFiles = candidateFiles.map(f => {
        let score = 0;
        const lowerName = f.name.toLowerCase();
        keywords.forEach(k => {
          if (lowerName.includes(k)) score += 10;
        });
        if (f.type === 'application/pdf') score += 5; // Prefer PDFs over images
        return { file: f, score };
      });

      // Sort by score and take top 3
      scoredFiles.sort((a, b) => b.score - a.score);
      const topFiles = scoredFiles.slice(0, 3).map(item => item.file);

      // Read content of top files
      let evidenceParts: any[] = [];
      try {
         evidenceParts = await Promise.all(topFiles.map(fileToGenerativePart));
      } catch (e) {
        console.error("Error reading file content", e);
      }

      // Call Gemini with Metadata AND Content
      try {
        const result = await analyzeTeacherPortfolio(teacher.name, teacher.files, evidenceParts);
        
        // Calculate Weighted Score
        const totalScore = result.scores.reduce((sum, s) => {
          const criteria = EVALUATION_CRITERIA.find(c => c.id === s.criteriaId);
          const weight = criteria ? criteria.weight : 0;
          const weightedScore = (s.score / 10) * weight;
          return sum + weightedScore;
        }, 0);

        // Update with results
        setTeachers(prev => prev.map(t => t.id === teacher.id ? {
          ...t,
          scores: result.scores,
          aiAnalysis: result.summary,
          totalScore: Math.round(totalScore),
          status: 'completed'
        } : t));
      } catch (error: any) {
        if (error.message === 'API_KEY_INVALID') {
          // Pause queue and show modal
          setIsProcessing(false);
          setShowApiKeyModal(true);
          // Reset status to pending to allow retry
          setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, status: 'pending' } : t));
          throw error; // Stop this branch
        } else {
           // Handle generic error
           setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, status: 'error' } : t));
        }
      }

      setProcessedCount(prev => prev + 1);
    };

    // Queue Loop
    try {
      while (queue.length > 0 || activePromises.length > 0) {
        while (queue.length > 0 && activePromises.length < CONCURRENCY_LIMIT) {
          const teacher = queue.shift()!;
          const p = processTeacher(teacher).then(() => {
            activePromises.splice(activePromises.indexOf(p), 1);
          }).catch(() => {
             // If error occurs (like API key invalid), we stop loop logic if needed, 
             // but here we just remove from active
             activePromises.splice(activePromises.indexOf(p), 1);
          });
          activePromises.push(p as Promise<void>);
        }
        
        if (activePromises.length > 0) {
          await Promise.race(activePromises);
        } else {
          break;
        }
      }
    } catch (e) {
      console.log("Queue stopped");
    }

    logAction('ANALYSIS', 'اكتملت عملية التحليل لجميع المعلمين');
    setIsProcessing(false);
  }, []);

  const handlePrintAll = () => {
    const completed = teachers.filter(t => t.status === 'completed');
    if (completed.length === 0) return;
    
    logAction('REPORT', `طباعة مجمعة لجميع التقارير (${completed.length} معلم)`);
    setIsPrintingAll(true);
    
    // Increased delay to allow full rendering of images/tables before print dialog
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  React.useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintingAll(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* --- BULK PRINT VIEW (Visible ONLY when printing all) --- */}
      {isPrintingAll && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-auto print:static print:block">
           {teachers.filter(t => t.status === 'completed').map((teacher) => (
              <TeacherReport key={teacher.id} teacher={teacher} isBatchPrint={true} />
           ))}
        </div>
      )}

      {/* --- MAIN APP LAYOUT (Hidden when printing all) --- */}
      <div className={`flex w-full ${isPrintingAll ? 'hidden print:hidden' : ''}`}>
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col print:hidden">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-xl">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <span>EduEvaluate</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">منصة الإشراف الذكي</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              لوحة المعلومات
            </button>
            
            <button 
              onClick={() => setActiveTab('teachers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'teachers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800'
              }`}
            >
              <Users className="w-5 h-5" />
              المعلمون
              {teachers.length > 0 && (
                <span className="mr-auto bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-400">
                  {teachers.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setShowAuditLog(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-slate-800"
            >
              <History className="w-5 h-5" />
              سجل العمليات
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800">
             <button 
                onClick={() => setShowApiKeyModal(true)}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-slate-800 text-slate-400 hover:text-white text-sm"
              >
                <Settings className="w-4 h-4" />
                إعدادات مفتاح API
              </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
          
          {/* Top Mobile Header */}
          <header className="bg-white border-b border-slate-200 p-4 md:hidden flex items-center justify-between print:hidden">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              EduEvaluate
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowApiKeyModal(true)} className="p-2 text-slate-600">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={() => setShowAuditLog(true)} className="p-2 text-slate-600">
                <History className="w-5 h-5" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-8 relative print:p-0">
            
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header Area */}
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 print:hidden">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                    {activeTab === 'dashboard' ? 'لوحة المعلومات العامة' : 'أداء المعلمين'}
                  </h1>
                  <p className="text-slate-500">
                    {activeTab === 'dashboard' 
                      ? 'نظرة شاملة على مؤشرات الأداء المدرسي.' 
                      : 'إدارة ملفات المعلمين وعرض تقييمات الذكاء الاصطناعي.'}
                  </p>
                </div>
                
                {teachers.length > 0 && !isProcessing && (
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 font-bold flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    اختيار مجلد آخر
                  </button>
                )}
              </div>

              {/* Content Switcher */}
              {teachers.length === 0 && !isProcessing ? (
                <div className="max-w-2xl mx-auto mt-12">
                  <FileUploader onFilesSelected={processFiles} />
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center justify-center h-96">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">جاري تحليل المحتوى والبيانات...</h3>
                  <p className="text-slate-500 mb-6 text-center max-w-md">
                    يقوم الذكاء الاصطناعي الآن بقراءة هيكل المجلدات وفحص <span className="text-indigo-600 font-bold">محتوى العينات</span> (PDF/صور) لتقييم الجودة.
                    <br/>
                    <span className="text-xs text-slate-400 mt-2 block">تمت المعالجة: {processedCount} من {teachers.length}</span>
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="w-80 max-w-md" dir="ltr">
                    <div className="flex justify-between text-xs text-slate-500 mb-2 px-1">
                        <span>{processedCount} / {teachers.length}</span>
                        <span>التقدم</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                          style={{ width: `${(processedCount / teachers.length) * 100}%` }}
                        ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Dashboard Tab */}
                  {activeTab === 'dashboard' && <Dashboard teachers={teachers} onPrintAll={handlePrintAll} />}

                  {/* Teachers Tab */}
                  {activeTab === 'teachers' && (
                    <div className="space-y-6">
                      <div className="flex justify-end print:hidden">
                        <button 
                          onClick={handlePrintAll}
                          disabled={teachers.filter(t => t.status === 'completed').length === 0}
                          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                        >
                          <Printer className="w-5 h-5" />
                          طباعة جميع التقارير ({teachers.filter(t => t.status === 'completed').length})
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teachers.map(teacher => (
                          <div 
                            key={teacher.id} 
                            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group"
                            onClick={() => setSelectedTeacher(teacher)}
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner">
                                  {teacher.name.substring(0,2).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <span className={`px-3 py-1 text-sm font-bold rounded-full block mb-1 ${
                                    (teacher.totalScore || 0) >= 90 ? 'bg-emerald-100 text-emerald-700' : 
                                    (teacher.totalScore || 0) >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {teacher.totalScore}%
                                  </span>
                                </div>
                              </div>
                              <h3 className="text-lg font-bold text-slate-900 truncate mb-1" title={teacher.name}>
                                {teacher.name}
                              </h3>
                              <p className="text-xs text-slate-400 mb-4 font-mono dir-ltr text-right" dir="ltr">ID: {teacher.id.split('-')[1]}</p>
                              
                              <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-4 h-4" /> 
                                  {teacher.files.length} ملف
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-sm">
                                <span className="text-slate-500 text-xs">تقييم الذكاء الاصطناعي</span>
                                <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase tracking-wide">
                                  <CheckCircle2 className="w-4 h-4" /> مكتمل
                                </span>
                              </div>
                            </div>
                            <div className="bg-indigo-50 p-3 text-center text-indigo-700 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              عرض بطاقة التقييم
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      {selectedTeacher && !isPrintingAll && (
        <TeacherReport 
          teacher={selectedTeacher} 
          onClose={() => setSelectedTeacher(null)} 
        />
      )}

      {showAuditLog && !isPrintingAll && (
        <AuditLogViewer onClose={() => setShowAuditLog(false)} />
      )}

      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)}
        onSave={() => window.location.reload()} // Reload to refresh services if needed
      />

    </div>
  );
}
