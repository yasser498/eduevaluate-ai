
import React, { useMemo } from 'react';
import { Teacher } from '../types';
import { EVALUATION_CRITERIA } from '../constants';
import { logAction } from '../services/auditService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Award, TrendingUp, Users, Printer, Download, Files } from 'lucide-react';

interface DashboardProps {
  teachers: Teacher[];
  onPrintAll?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ teachers, onPrintAll }) => {
  const completedTeachers = teachers.filter(t => t.status === 'completed');

  // Calculate Average Score per Criteria
  const criteriaAverages = useMemo(() => {
    if (completedTeachers.length === 0) return [];
    
    return EVALUATION_CRITERIA.map(criteria => {
      const totalScore = completedTeachers.reduce((acc, teacher) => {
        const score = teacher.scores?.find(s => s.criteriaId === criteria.id)?.score || 0;
        return acc + score;
      }, 0);
      
      return {
        name: criteria.nameAr, // Use Arabic Name
        nameEn: criteria.nameEn,
        average: Number((totalScore / completedTeachers.length).toFixed(1)),
        fullMark: 10
      };
    });
  }, [completedTeachers]);

  // Overall Performance
  const overallAverage = useMemo(() => {
     if (completedTeachers.length === 0) return 0;
     const sum = completedTeachers.reduce((acc, t) => acc + (t.totalScore || 0), 0);
     return Math.round(sum / completedTeachers.length);
  }, [completedTeachers]);

  const topPerformer = useMemo(() => {
    if (completedTeachers.length === 0) return null;
    return [...completedTeachers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))[0];
  }, [completedTeachers]);

  const handleExportCSV = () => {
    logAction('EXPORT', 'تصدير بيانات التقييم الشاملة بصيغة CSV');
    
    // Add BOM for Excel Arabic support
    const BOM = "\uFEFF";
    const headers = ['اسم المعلم', 'الدرجة الكلية', ...EVALUATION_CRITERIA.map(c => c.nameAr)];
    const rows = completedTeachers.map(t => [
      t.name,
      t.totalScore,
      ...EVALUATION_CRITERIA.map(c => t.scores?.find(s => s.criteriaId === c.id)?.score || 0)
    ]);
    
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_التقييم_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handlePrintSummary = () => {
    logAction('REPORT', 'طباعة ملخص لوحة المعلومات العامة');
    window.print();
  };

  if (completedTeachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
        <p>لا توجد بيانات تحليل متاحة حتى الآن.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Action Bar */}
      <div className="flex justify-end gap-2 print:hidden">
        {onPrintAll && (
           <button 
            onClick={onPrintAll}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Files className="w-4 h-4" />
            طباعة الكل ({completedTeachers.length})
          </button>
        )}
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-colors border border-indigo-200"
        >
          <Download className="w-4 h-4" />
          تصدير Excel
        </button>
        <button 
          onClick={handlePrintSummary}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
        >
          <Printer className="w-4 h-4" />
          طباعة الملخص
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-blue-50 print:bg-transparent rounded-br-full -ml-4 -mt-4 z-0"></div>
          <div className="p-4 bg-blue-100 text-blue-600 print:text-black print:bg-transparent rounded-xl z-10">
            <Users className="w-6 h-6" />
          </div>
          <div className="z-10">
            <p className="text-sm text-slate-500 font-bold mb-1 print:text-black">عدد المعلمين المقيمين</p>
            <h3 className="text-3xl font-bold text-slate-800 print:text-black">{completedTeachers.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-50 print:bg-transparent rounded-br-full -ml-4 -mt-4 z-0"></div>
          <div className="p-4 bg-emerald-100 text-emerald-600 print:text-black print:bg-transparent rounded-xl z-10">
            <Award className="w-6 h-6" />
          </div>
          <div className="z-10 w-full">
             <p className="text-sm text-slate-500 font-bold mb-1 print:text-black">الأعلى أداءً</p>
             <div className="flex justify-between items-end w-full gap-4">
                <h3 className="text-xl font-bold text-slate-800 truncate max-w-[150px] print:text-black" title={topPerformer?.name}>
                  {topPerformer?.name || '-'}
                </h3>
                {topPerformer && <span className="text-lg font-bold text-emerald-600 print:text-black">{topPerformer.totalScore}%</span>}
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-50 print:bg-transparent rounded-br-full -ml-4 -mt-4 z-0"></div>
          <div className="p-4 bg-indigo-100 text-indigo-600 print:text-black print:bg-transparent rounded-xl z-10">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="z-10">
            <p className="text-sm text-slate-500 font-bold mb-1 print:text-black">متوسط الأداء العام</p>
            <h3 className="text-3xl font-bold text-slate-800 print:text-black">{overallAverage}%</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">
        
        {/* Radar Chart - Criteria Balance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 break-inside-avoid print:border-slate-300">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-800 print:text-black">تحليل التوازن في المعايير</h3>
          </div>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={criteriaAverages}>
                <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#000000', fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#cbd5e1" />
                <Radar
                  name="متوسط الدرجة"
                  dataKey="average"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="#4f46e5"
                  fillOpacity={0.4}
                />
                <Tooltip 
                   formatter={(value: number) => [`${value}/10`, 'المتوسط']}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Strengths & Weaknesses */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 break-inside-avoid print:border-slate-300">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-800 print:text-black">الأداء حسب الفئة</h3>
          </div>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={criteriaAverages}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 10]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  tick={{ fontSize: 11, fill: '#000000', fontWeight: 600 }}
                  orientation="right" 
                />
                <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', direction: 'rtl' }}
                />
                <Bar 
                  dataKey="average" 
                  name="الدرجة" 
                  fill="#3b82f6" 
                  radius={[4, 0, 0, 4]} 
                  barSize={18} 
                  background={{ fill: '#f8fafc' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
