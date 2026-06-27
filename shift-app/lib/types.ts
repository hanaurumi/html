export type ShiftType = 'night' | 'late' | 'day' | 'rest' | '公' | '祝' | '年休' | '特';
export type ExpLevel = 'general' | '1st' | '2nd';
export type DayPattern = 'A' | 'B' | 'C';
export type RequestType = 'night' | 'late' | 'day' | 'off';
export type TeamId = 'A' | 'B';

export interface Staff {
  id: number;
  name: string;
  role: string;
  exp: ExpLevel;
  leader: boolean;
  night: boolean | 'request';
  lateB: boolean;
  shortTime: string | null;
  weekendOff: boolean;
  team: TeamId;
  active: boolean;
  sortOrder?: number;
}

export interface StaffOverride {
  weekendNightEnabled?: boolean;
  nenkyuExtra?: number;
}

export interface AppSettings {
  currentYear: number;
  currentMonth: number;
  weekdayPattern: Record<string, DayPattern>;
  holidayPattern: DayPattern;
  dateOverridePattern: Record<string, DayPattern>;
  holidayOverride: Record<string, boolean>;
  weekdayDayMin: number;
  weekendDayMin: number;
  nenkyuCapDefault: number;
  nightCapGeneral: number;
  nightCap1st: number;
  nightCapNightOnly: number;
  lateCapSetting: number;
  maxConsecutiveDays: number;
  nightOnlyMaxStreak: number;
  nightOnlyForcedRest: number;
  staffOverrides: Record<number, StaffOverride>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  weekdayPattern: { '0': 'B', '1': 'B', '2': 'A', '3': 'B', '4': 'A', '5': 'A', '6': 'B' },
  holidayPattern: 'B',
  dateOverridePattern: {},
  holidayOverride: {},
  weekdayDayMin: 12,
  weekendDayMin: 6,
  nenkyuCapDefault: 2,
  nightCapGeneral: 5,
  nightCap1st: 2,
  nightCapNightOnly: 9,
  lateCapSetting: 3,
  maxConsecutiveDays: 5,
  nightOnlyMaxStreak: 2,
  nightOnlyForcedRest: 2,
  staffOverrides: {},
};

export interface ShiftCell {
  type: ShiftType;
  leader?: boolean;
}

export type Schedule = Record<number, Record<number, ShiftCell>>;
export type Requests = Record<number, Record<number, RequestType>>;
