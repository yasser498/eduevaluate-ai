import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EvaluationCriteria {
  id: string;
  nameEn: string;
  nameAr: string;
  description: string;
  weight: number; // Percentage (e.g., 10 for 10%)
  evidenceExamples: string; // Specific file keywords or examples to look for
  icon: LucideIcon;
}

export interface TeacherScore {
  criteriaId: string;
  score: number; // 0-10
  justification: string;
}

export interface Prediction {
  category: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  confidence: number; // 0-100
  timeframe: string;
}

export interface Teacher {
  id: string;
  name: string;
  folderPath: string;
  files: string[]; // List of file paths relative to teacher root
  fileObjects: File[]; // Actual File objects for content reading
  scores?: TeacherScore[];
  totalScore?: number;
  aiAnalysis?: string;
  predictions?: Prediction[];
  status: 'pending' | 'analyzing' | 'completed' | 'error';
}

export interface AnalysisResult {
  scores: TeacherScore[];
  summary: string;
  predictions: Prediction[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: 'UPLOAD' | 'ANALYSIS' | 'REPORT' | 'EXPORT' | 'SYSTEM';
  details: string;
}
