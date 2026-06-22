'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings, Staff, Schedule, Requests, RequestType, DEFAULT_SETTINGS } from '@/lib/types';
import { generateSchedule } from '@/lib/schedule-engine';
import * as db from '@/lib/db';

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  persistSettings: () => Promise<void>;

  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  addStaff: () => Promise<void>;
  removeStaff: (id: number) => Promise<void>;
  persistStaff: () => Promise<void>;

  requests: Requests;
  setRequest: (staffId: number, day: number, type: RequestType | '') => void;
  clearAllRequests: () => Promise<void>;

  nightOnlyStaffId: number | null;
  setNightOnly: (id: number | null) => Promise<void>;

  schedule: Schedule | null;
  warnings: string[];
  runGeneration: () => void;
  editCell: (staffId: number, day: number, type: string) => void;

  customRulesHtml: string | null;
  saveRules: (html: string | null) => Promise<void>;

  isLoading: boolean;
  saveStatus: string;
  setSaveStatus: (s: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [requests, setRequests] = useState<Requests>({});
  const [nightOnlyStaffId, setNightOnlyStaffId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [customRulesHtml, setCustomRulesHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [s, st, r, no, rules] = await Promise.all([
          db.loadSettings(),
          db.loadStaff(),
          db.loadRequests(DEFAULT_SETTINGS.currentYear, DEFAULT_SETTINGS.currentMonth),
          db.loadNightOnly(DEFAULT_SETTINGS.currentYear, DEFAULT_SETTINGS.currentMonth),
          db.loadCustomRules(),
        ]);
        setSettings(s);
        setStaff(st);
        setRequests(r);
        setNightOnlyStaffId(no);
        setCustomRulesHtml(rules);
      } catch (e) {
        console.error('Load error:', e);
      }
      setIsLoading(false);
    })();
  }, []);

  // Reload requests & night-only when month changes
  useEffect(() => {
    if (isLoading) return;
    (async () => {
      const [r, no] = await Promise.all([
        db.loadRequests(settings.currentYear, settings.currentMonth),
        db.loadNightOnly(settings.currentYear, settings.currentMonth),
      ]);
      setRequests(r);
      setNightOnlyStaffId(no);
      setSchedule(null);
      setWarnings([]);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.currentYear, settings.currentMonth]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const persistSettings = useCallback(async () => {
    await db.saveSettings(settings);
    setSaveStatus('設定を保存しました');
  }, [settings]);

  const addStaff = useCallback(async () => {
    const s = await db.insertStaff({
      name: '新しいスタッフ', role: 'スタッフ', exp: 'general',
      leader: false, night: true, lateB: true, shortTime: null,
      weekendOff: false, team: 'A', active: true,
    });
    if (s) setStaff(prev => [...prev, s]);
  }, []);

  const removeStaff = useCallback(async (id: number) => {
    await db.deleteStaffRow(id);
    setStaff(prev => prev.filter(s => s.id !== id));
  }, []);

  const persistStaff = useCallback(async () => {
    await db.saveStaff(staff);
    setSaveStatus('スタッフ情報を保存しました');
  }, [staff]);

  const setRequest = useCallback((staffId: number, day: number, type: RequestType | '') => {
    setRequests(prev => {
      const next = { ...prev };
      if (!next[staffId]) next[staffId] = {};
      else next[staffId] = { ...next[staffId] };
      if (type === '') delete next[staffId][day];
      else next[staffId][day] = type;

      // debounced save
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await db.saveRequests(settings.currentYear, settings.currentMonth, staffId, next[staffId] || {});
      }, 400);

      return next;
    });
  }, [settings.currentYear, settings.currentMonth]);

  const clearAllRequests = useCallback(async () => {
    await db.clearRequests(settings.currentYear, settings.currentMonth);
    setRequests({});
  }, [settings.currentYear, settings.currentMonth]);

  const setNightOnly = useCallback(async (id: number | null) => {
    setNightOnlyStaffId(id);
    await db.saveNightOnly(settings.currentYear, settings.currentMonth, id);
  }, [settings.currentYear, settings.currentMonth]);

  const runGeneration = useCallback(() => {
    const active = staff.filter(s => s.active);
    const result = generateSchedule({
      year: settings.currentYear,
      month: settings.currentMonth,
      staff: active,
      settings,
      requests,
      nightOnlyStaffId,
    });
    setSchedule(result.schedule);
    setWarnings(result.warnings);
  }, [staff, settings, requests, nightOnlyStaffId]);

  const editCell = useCallback((staffId: number, day: number, type: string) => {
    setSchedule(prev => {
      if (!prev) return prev;
      const next = { ...prev, [staffId]: { ...prev[staffId], [day]: { ...prev[staffId][day], type } } };
      return next;
    });
  }, []);

  const saveRules = useCallback(async (html: string | null) => {
    await db.saveCustomRules(html);
    setCustomRulesHtml(html);
  }, []);

  return (
    <AppContext.Provider value={{
      settings, updateSettings, persistSettings,
      staff, setStaff, addStaff, removeStaff, persistStaff,
      requests, setRequest, clearAllRequests,
      nightOnlyStaffId, setNightOnly,
      schedule, warnings, runGeneration, editCell,
      customRulesHtml, saveRules,
      isLoading, saveStatus, setSaveStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}
