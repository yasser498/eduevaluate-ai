
import React, { useEffect } from 'react';
import { Teacher } from '../types';
import { EVALUATION_CRITERIA } from '../constants';
import { logAction } from '../services/auditService';
import { X, Printer, FileText } from 'lucide-react';

interface TeacherReportProps {
  teacher: Teacher;
  onClose?: () => void;
  isBatchPrint?: boolean;
}

export const TeacherReport: React.FC<TeacherReportProps> = ({ teacher, onClose, isBatchPrint = false }) => {
  const totalScore = teacher.totalScore || 0;
  
  useEffect(() => {
    if (!isBatchPrint) {
      logAction('REPORT', `استعراض التقرير التفصيلي للمعلم: ${teacher.name}`);
    }
  }, [teacher.name, isBatchPrint]);

  let gradeText = 'جيد';
  let gradeColor = 'text-blue-600';
  
  if (totalScore >= 90) { gradeText = 'ممتاز'; gradeColor = 'text-emerald-700'; }
  else if (totalScore >= 80) { gradeText = 'جيد جداً'; gradeColor = 'text-emerald-600'; }
  else if (totalScore >= 70) { gradeText = 'جيد'; gradeColor = 'text-amber-600'; }
  else { gradeText = 'يحتاج تحسين'; gradeColor = 'text-red-600'; }

  const handlePrint = () => {
    logAction('REPORT', `طباعة التقرير التفصيلي للمعلم: ${teacher.name}`);
    window.print();
  };

  // Logic to determine container classes based on mode
  const containerClasses = isBatchPrint 
    ? "bg-white p-8 w-full print:break-after-page mb-8 block print:w-[210mm] print:mx-auto" // Batch Mode A4 sized
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:flex-none print:block"; // Modal Mode

  const wrapperClasses = isBatchPrint
    ? ""
    : "bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:w-full print:rounded-none";

  return (
    <div className={containerClasses}>
      <div className={wrapperClasses}>
        
        {/* أزرار التحكم - تظهر فقط في الوضع العادي وتختفي عند الطباعة أو وضع الدفعات */}
        {!isBatchPrint && (
          <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center z-10 print:hidden">
            <div className="flex gap-2">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
              >
                <Printer className="w-4 h-4" />
                طباعة التقرير
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-slate-800">بطاقة تقييم الأداء</h2>
          </div>
        )}

        {/* محتوى التقرير الرسمي */}
        <div className={isBatchPrint ? "" : "p-8 print:p-0 print:m-4"}>
          
          {/* الترويسة الرسمية (الكليشة) */}
          <div className="border-b-2 border-slate-800 pb-6 mb-8 print:border-black">
            <div className="flex justify-between items-center">
              <div className="text-center w-1/3">
                <p className="font-bold text-lg mb-1 text-black">المملكة العربية السعودية</p>
                <p className="font-bold text-lg mb-1 text-black">وزارة التعليم</p>
                <p className="text-slate-600 print:text-black">إدارة التعليم ....................</p>
                <p className="text-slate-600 print:text-black">مدرسة ....................</p>
              </div>
              
              <div className="text-center w-1/3 flex justify-center">
                 <img 
                   src="https://www.raed.net/img?id=1473685" 
                   alt="شعار الوزارة" 
                   className="h-28 object-contain" 
                 />
              </div>

              <div className="text-center w-1/3">
                 <div className="border border-slate-400 print:border-black rounded-lg p-3 inline-block bg-slate-50 print:bg-transparent min-w-[150px]">
                    <p className="text-sm text-slate-500 print:text-black mb-1">التاريخ</p>
                    <p className="font-bold font-mono text-lg text-black">{new Date().toLocaleDateString('ar-SA')}</p>
                 </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-8 bg-slate-100 print:bg-slate-100 py-3 border-y border-slate-300 print:border-black text-black">
            بطاقة تقويم الأداء الوظيفي لشاغلي الوظائف التعليمية
          </h1>

          {/* بيانات المعلم */}
          <div className="bg-white border border-slate-300 print:border-black rounded-lg p-6 mb-8 grid grid-cols-2 gap-y-4 gap-x-8">
             <div className="flex items-center gap-3">
               <span className="text-slate-500 print:text-black font-bold min-w-[80px]">اسم المعلم:</span>
               <span className="text-lg font-bold text-slate-900 print:text-black border-b border-dotted border-slate-400 print:border-slate-600 flex-1">{teacher.name}</span>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-slate-500 print:text-black font-bold min-w-[80px]">المسار:</span>
               <span className="text-lg text-slate-900 print:text-black border-b border-dotted border-slate-400 print:border-slate-600 flex-1 ltr:text-right" dir="ltr">{teacher.folderPath}</span>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-slate-500 print:text-black font-bold min-w-[80px]">عدد الشواهد:</span>
               <span className="text-lg text-slate-900 print:text-black border-b border-dotted border-slate-400 print:border-slate-600 flex-1 flex items-center gap-2">
                 {teacher.files.length} ملف
                 <FileText className="w-4 h-4 text-slate-400 print:text-black" />
               </span>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-slate-500 print:text-black font-bold min-w-[80px]">النتيجة النهائية:</span>
               <span className={`text-xl font-bold ${gradeColor} print:text-black border-b border-dotted border-slate-400 print:border-slate-600 flex-1`}>
                 {totalScore}% ({gradeText})
               </span>
             </div>
          </div>

          {/* جدول التقييم التفصيلي */}
          <div className="mb-8">
             <table className="w-full border-collapse border border-slate-400 print:border-black">
               <thead>
                 <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 print:text-black text-sm">
                   <th className="border border-slate-400 print:border-black px-4 py-3 w-[40%] text-right">عناصر التقييم (المعيار)</th>
                   <th className="border border-slate-400 print:border-black px-2 py-3 w-[10%] text-center">الوزن</th>
                   <th className="border border-slate-400 print:border-black px-2 py-3 w-[10%] text-center">الدرجة</th>
                   <th className="border border-slate-400 print:border-black px-4 py-3 w-[40%] text-right">المبررات والشواهد المرفقة</th>
                 </tr>
               </thead>
               <tbody>
                 {EVALUATION_CRITERIA.map((criteria, index) => {
                   const scoreData = teacher.scores?.find(s => s.criteriaId === criteria.id);
                   const rawScore = scoreData?.score || 0;
                   const weightedScore = (rawScore / 10) * criteria.weight;
                   
                   return (
                     <tr key={criteria.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50 print:bg-slate-50'}>
                       <td className="border border-slate-400 print:border-black px-4 py-3">
                         <div className="flex items-center gap-3">
                           <criteria.icon className="w-5 h-5 text-indigo-600 print:text-black flex-shrink-0" />
                           <p className="font-bold text-slate-800 print:text-black text-sm">{criteria.nameAr}</p>
                         </div>
                       </td>
                       <td className="border border-slate-400 print:border-black px-2 py-3 text-center text-sm font-bold print:text-black">
                         {criteria.weight}%
                       </td>
                       <td className="border border-slate-400 print:border-black px-2 py-3 text-center">
                         <div className="flex flex-col items-center justify-center">
                            <span className="font-bold text-slate-900 print:text-black">{weightedScore.toFixed(0)}</span>
                         </div>
                       </td>
                       <td className="border border-slate-400 print:border-black px-4 py-3 text-xs text-slate-700 print:text-black leading-relaxed text-justify">
                         {scoreData?.justification || "لم يتم العثور على شواهد كافية لهذا المعيار."}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
               <tfoot>
                 <tr className="bg-slate-200 print:bg-slate-200 font-bold print:text-black">
                   <td className="border border-slate-400 print:border-black px-4 py-3 text-center">المجموع الكلي</td>
                   <td className="border border-slate-400 print:border-black px-2 py-3 text-center">100%</td>
                   <td className="border border-slate-400 print:border-black px-2 py-3 text-center text-lg">{Math.round(totalScore)}%</td>
                   <td className="border border-slate-400 print:border-black px-4 py-3 bg-slate-50 print:bg-white"></td>
                 </tr>
               </tfoot>
             </table>
          </div>

          {/* الملخص */}
          <div className="border border-slate-400 print:border-black rounded-lg p-4 mb-12 bg-white break-inside-avoid">
            <h3 className="font-bold text-slate-800 print:text-black mb-2 border-b border-slate-200 print:border-black pb-2">ملخص التحليل الذكي:</h3>
            <p className="text-sm leading-7 text-slate-700 print:text-black text-justify">
              {teacher.aiAnalysis || "جاري التحليل..."}
            </p>
          </div>

          {/* التواقيع الرسمية */}
          <div className="flex justify-between items-start pt-12 px-8 break-inside-avoid page-break-avoid">
            <div className="text-center">
              <p className="font-bold mb-16 text-black">المشرف التربوي</p>
              <p className="text-slate-400 print:text-black text-sm">.......................................</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-16 text-black">مدير المدرسة</p>
              <p className="text-slate-400 print:text-black text-sm">.......................................</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-16 text-black">ختم المدرسة</p>
              <div className="w-24 h-24 border-2 border-dashed border-slate-300 print:border-black rounded-full mx-auto flex items-center justify-center text-slate-300 print:text-black text-xs">
                 مكان الختم
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
