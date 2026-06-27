import { supabase } from './supabase';
import { Staff, AppSettings, Requests, RequestType, DEFAULT_SETTINGS } from './types';

// ── Settings ──────────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('ward_settings').select('*').eq('id', 1).single();
  if (error || !data) return { ...DEFAULT_SETTINGS };
  return {
    currentYear: data.year,
    currentMonth: data.month,
    weekdayPattern: data.weekday_pattern,
    holidayPattern: data.holiday_pattern,
    dateOverridePattern: data.date_override_pattern,
    holidayOverride: data.holiday_override,
    weekdayDayMin: data.weekday_day_min,
    weekendDayMin: data.weekend_day_min,
    nenkyuCapDefault: data.nenkyu_cap_default,
    nightCapGeneral: data.night_cap_general,
    nightCap1st: data.night_cap_1st,
    nightCapNightOnly: data.night_cap_night_only,
    lateCapSetting: data.late_cap,
    maxConsecutiveDays: data.max_consecutive_days,
    nightOnlyMaxStreak: data.night_only_max_streak,
    nightOnlyForcedRest: data.night_only_forced_rest,
    staffOverrides: data.staff_overrides,
  };
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await supabase.from('ward_settings').upsert({
    id: 1,
    year: s.currentYear,
    month: s.currentMonth,
    weekday_pattern: s.weekdayPattern,
    holiday_pattern: s.holidayPattern,
    date_override_pattern: s.dateOverridePattern,
    holiday_override: s.holidayOverride,
    weekday_day_min: s.weekdayDayMin,
    weekend_day_min: s.weekendDayMin,
    nenkyu_cap_default: s.nenkyuCapDefault,
    night_cap_general: s.nightCapGeneral,
    night_cap_1st: s.nightCap1st,
    night_cap_night_only: s.nightCapNightOnly,
    late_cap: s.lateCapSetting,
    max_consecutive_days: s.maxConsecutiveDays,
    night_only_max_streak: s.nightOnlyMaxStreak,
    night_only_forced_rest: s.nightOnlyForcedRest,
    staff_overrides: s.staffOverrides,
    updated_at: new Date().toISOString(),
  });
}

// ── Staff ──────────────────────────────────────────────────────────────────────

export async function loadStaff(): Promise<Staff[]> {
  const { data, error } = await supabase.from('staff').select('*').order('sort_order').order('id');
  if (error || !data) return [];
  return data.map((r: any): Staff => ({
    id: r.id,
    name: r.name,
    role: r.role,
    exp: r.exp,
    leader: r.leader,
    night: r.night === 'true' ? true : r.night === 'false' ? false : 'request',
    lateB: r.late_b,
    shortTime: r.short_time,
    weekendOff: r.weekend_off,
    team: r.team,
    active: r.active,
    sortOrder: r.sort_order,
  }));
}

export async function saveStaff(staff: Staff[]): Promise<void> {
  const rows = staff.map((s, i) => ({
    id: s.id < 0 ? undefined : s.id,  // negative id = new (let DB assign)
    name: s.name,
    role: s.role,
    exp: s.exp,
    leader: s.leader,
    night: s.night === true ? 'true' : s.night === false ? 'false' : 'request',
    late_b: s.lateB,
    short_time: s.shortTime,
    weekend_off: s.weekendOff,
    team: s.team,
    active: s.active,
    sort_order: i,
  }));
  // Upsert existing rows
  const toUpdate = rows.filter(r => r.id !== undefined);
  const toInsert = rows.filter(r => r.id === undefined);
  if (toUpdate.length) await supabase.from('staff').upsert(toUpdate);
  if (toInsert.length) await supabase.from('staff').insert(toInsert);
}

export async function deleteStaffRow(id: number): Promise<void> {
  await supabase.from('staff').delete().eq('id', id);
}

export async function insertStaff(s: Omit<Staff, 'id'>): Promise<Staff | null> {
  const { data, error } = await supabase.from('staff').insert({
    name: s.name, role: s.role, exp: s.exp, leader: s.leader,
    night: s.night === true ? 'true' : s.night === false ? 'false' : 'request',
    late_b: s.lateB, short_time: s.shortTime, weekend_off: s.weekendOff,
    team: s.team, active: s.active, sort_order: 999,
  }).select().single();
  if (error || !data) return null;
  return { ...s, id: data.id };
}

// ── Requests ──────────────────────────────────────────────────────────────────

export async function loadRequests(year: number, month: number): Promise<Requests> {
  const { data, error } = await supabase.from('shift_requests').select('*').eq('year', year).eq('month', month);
  if (error || !data) return {};
  const result: Requests = {};
  for (const row of data) {
    result[row.staff_id] = row.data as Record<number, RequestType>;
  }
  return result;
}

export async function saveRequests(year: number, month: number, staffId: number, data: Record<number, RequestType>): Promise<void> {
  if (Object.keys(data).length === 0) {
    await supabase.from('shift_requests').delete().eq('year', year).eq('month', month).eq('staff_id', staffId);
  } else {
    await supabase.from('shift_requests').upsert({ year, month, staff_id: staffId, data });
  }
}

export async function clearRequests(year: number, month: number): Promise<void> {
  await supabase.from('shift_requests').delete().eq('year', year).eq('month', month);
}

// ── Night-only ────────────────────────────────────────────────────────────────

export async function loadNightOnly(year: number, month: number): Promise<number | null> {
  const { data } = await supabase.from('night_only').select('staff_id').eq('year', year).eq('month', month).single();
  return data?.staff_id ?? null;
}

export async function saveNightOnly(year: number, month: number, staffId: number | null): Promise<void> {
  if (staffId === null) {
    await supabase.from('night_only').delete().eq('year', year).eq('month', month);
  } else {
    await supabase.from('night_only').upsert({ year, month, staff_id: staffId });
  }
}

// ── Custom rules ──────────────────────────────────────────────────────────────

export async function loadCustomRules(): Promise<string | null> {
  const { data } = await supabase.from('custom_rules').select('html').eq('id', 1).single();
  return data?.html ?? null;
}

export async function saveCustomRules(html: string | null): Promise<void> {
  if (html === null) {
    await supabase.from('custom_rules').delete().eq('id', 1);
  } else {
    await supabase.from('custom_rules').upsert({ id: 1, html, updated_at: new Date().toISOString() });
  }
}
