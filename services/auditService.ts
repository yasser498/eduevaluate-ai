
import { AuditLogEntry } from '../types';

const STORAGE_KEY = 'edu_evaluate_audit_log';

export const logAction = (action: AuditLogEntry['action'], details: string) => {
  try {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action,
      details,
    };

    const currentLogs = getLogs();
    // Keep latest 500 logs to prevent overflow
    const updatedLogs = [entry, ...currentLogs].slice(0, 500); 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    return entry;
  } catch (error) {
    console.error("Failed to save audit log", error);
    return null;
  }
};

export const getLogs = (): AuditLogEntry[] => {
  try {
    const logs = localStorage.getItem(STORAGE_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error("Failed to parse audit logs", error);
    return [];
  }
};

export const clearLogs = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear logs", error);
  }
};
