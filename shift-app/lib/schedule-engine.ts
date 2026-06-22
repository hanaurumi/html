import { Staff, Schedule, Requests, ShiftType, DayPattern, RequestType, AppSettings, ShiftCell } from './types';
import { computeHolidays } from './holidays';

const DOW_LABEL = ['日', '月', '火', '水', '木', '金', '土'];
function pad(n: number): string { return String(n).padStart(2, '0'); }

interface StaffState {
  nightCount: number;
  lateCount: number;
  consec: number;
  prevType: string | null;
  workCount: number;
  kouRemaining: number;
  shukuRemaining: number;
  otherCount: number;
  nightStreak: number;
  forcedRestDaysLeft: number;
  virtualRemaining: number;
}

export interface GenerateResult {
  schedule: Schedule;
  warnings: string[];
}

export function generateSchedule(params: {
  year: number;
  month: number;
  staff: Staff[];
  settings: AppSettings;
  requests: Requests;
  nightOnlyStaffId: number | null;
}): GenerateResult {
  const { year, month, settings, requests, nightOnlyStaffId } = params;
  const STAFF = params.staff.filter(s => s.active !== false);
  const STAFF_MAP = new Map(STAFF.map(s => [s.id, s]));
  const DAYS = new Date(year, month, 0).getDate();
  const warnings: string[] = [];
  const schedule: Schedule = {};
  STAFF.forEach(s => { schedule[s.id] = {}; });

  const holidaySet = computeHolidays(year);

  function dateKey(d: number): string { return `${year}-${pad(month)}-${pad(d)}`; }
  function getDow(d: number): number { return new Date(year, month - 1, d).getDay(); }
  function dowLabel(d: number): string { return DOW_LABEL[getDow(d)]; }
  function isWeekend(d: number): boolean { const w = getDow(d); return w === 0 || w === 6; }
  function isHoliday(d: number): boolean {
    const dk = dateKey(d);
    if (Object.prototype.hasOwnProperty.call(settings.holidayOverride, dk)) return settings.holidayOverride[dk];
    return holidaySet.has(dk);
  }
  function isWeekendOrHoliday(d: number): boolean { return isWeekend(d) || isHoliday(d); }

  function getPattern(d: number): DayPattern {
    const dk = dateKey(d);
    if (settings.dateOverridePattern[dk]) return settings.dateOverridePattern[dk];
    if (isHoliday(d)) return settings.holidayPattern;
    return settings.weekdayPattern[String(getDow(d))];
  }

  function requiredCounts(d: number) {
    const pattern = getPattern(d);
    return {
      night: pattern === 'A' ? 4 : 3,
      late: pattern === 'B' ? 1 : 0,
      day: isWeekendOrHoliday(d) ? settings.weekendDayMin : settings.weekdayDayMin,
    };
  }

  let kouQuota = 0, shukuQuota = 0;
  for (let d = 1; d <= DAYS; d++) {
    if (isHoliday(d)) shukuQuota++;
    else if (isWeekend(d)) kouQuota++;
  }

  function weekendNightEnabled(s: Staff): boolean {
    const ov = settings.staffOverrides[s.id];
    return !!(ov?.weekendNightEnabled);
  }
  function nenkyuExtra(s: Staff): number { return settings.staffOverrides[s.id]?.nenkyuExtra ?? 0; }
  function nightCap(s: Staff): number { return s.exp === '1st' ? settings.nightCap1st : settings.nightCapGeneral; }
  function isJunior(s: Staff): boolean { return s.exp === '1st' || s.exp === '2nd'; }

  const regularStaff = STAFF.filter(s => !s.weekendOff && s.id !== nightOnlyStaffId);
  let totalWorkSlots = 0;
  for (let d = 1; d <= DAYS; d++) { const r = requiredCounts(d); totalWorkSlots += r.night + r.late + r.day; }
  let shortWeekdayWork = 0;
  for (let d = 1; d <= DAYS; d++) {
    if (!isWeekendOrHoliday(d)) shortWeekdayWork += STAFF.filter(s => s.weekendOff).length;
  }
  const totalRest = regularStaff.length * DAYS - (totalWorkSlots - shortWeekdayWork);
  const avgRest = regularStaff.length > 0 ? totalRest / regularStaff.length : kouQuota + shukuQuota;

  const state: Record<number, StaffState> = {};
  STAFF.forEach(s => {
    state[s.id] = {
      nightCount: 0, lateCount: 0, consec: 0, prevType: null, workCount: 0,
      kouRemaining: kouQuota, shukuRemaining: shukuQuota, otherCount: 0,
      nightStreak: 0, forcedRestDaysLeft: 0,
      virtualRemaining: s.weekendOff ? kouQuota + shukuQuota : avgRest,
    };
  });

  const teamNightCount: Record<string, number> = { A: 0, B: 0 };
  const teamLateCount: Record<string, number> = { A: 0, B: 0 };
  const teamOtherCount: Record<string, number> = { A: 0, B: 0 };

  function reqOf(s: Staff, d: number): RequestType | undefined { return requests[s.id]?.[d]; }

  // Weekend pair planning
  const plannedPair: Record<number, number> = {};
  const saturdays: number[] = [];
  for (let d = 1; d <= DAYS - 1; d++) { if (getDow(d) === 6) saturdays.push(d); }
  if (saturdays.length > 0) {
    let idx = 0;
    STAFF.forEach(s => {
      if (s.weekendOff) return;
      plannedPair[s.id] = saturdays[idx % saturdays.length];
      idx++;
    });
  }

  function isPlannedRest(s: Staff, d: number): boolean {
    const sat = plannedPair[s.id];
    return sat !== undefined && (d === sat || d === sat + 1);
  }

  function eligibleNight(s: Staff, d: number): boolean {
    if (s.night === false) return false;
    if (s.night === 'request' && reqOf(s, d) !== 'night') return false;
    if (s.weekendOff && isWeekendOrHoliday(d)) return false;
    if (s.exp === '1st' && isWeekendOrHoliday(d) && !weekendNightEnabled(s)) return false;
    if (isPlannedRest(s, d) && reqOf(s, d) !== 'night') return false;
    const st = state[s.id];
    if (st.prevType === 'night') return false;
    if (st.consec >= settings.maxConsecutiveDays) return false;
    if (st.nightCount >= nightCap(s)) return false;
    const r = reqOf(s, d);
    if (r === 'off' || r === 'day' || r === 'late') return false;
    return true;
  }

  function eligibleLate(s: Staff, d: number): boolean {
    if (!s.lateB) return false;
    if (s.weekendOff && isWeekendOrHoliday(d)) return false;
    if (isPlannedRest(s, d) && reqOf(s, d) !== 'late') return false;
    const st = state[s.id];
    if (st.prevType === 'night' || st.prevType === 'late') return false;
    if (st.consec >= settings.maxConsecutiveDays) return false;
    if (st.lateCount >= settings.lateCapSetting) return false;
    const r = reqOf(s, d);
    if (r === 'off' || r === 'day' || r === 'night') return false;
    return true;
  }

  function eligibleDay(s: Staff, d: number): boolean {
    if (s.weekendOff && isWeekendOrHoliday(d)) return false;
    if (isPlannedRest(s, d) && reqOf(s, d) !== 'day') return false;
    const st = state[s.id];
    if (st.prevType === 'night' || st.prevType === 'late') return false;
    if (st.consec >= settings.maxConsecutiveDays) return false;
    const r = reqOf(s, d);
    if (r === 'off' || r === 'night' || r === 'late') return false;
    return true;
  }

  function canAddToNight(s: Staff, list: Staff[], reqNight: number, avoidDouble2nd: boolean): boolean {
    if (!isJunior(s)) return true;
    const max = reqNight === 4 ? 2 : 1;
    if (list.filter(isJunior).length >= max) return false;
    if (s.exp === '1st' && list.some(x => x.exp === '1st')) return false;
    if (avoidDouble2nd && s.exp === '2nd' && list.some(x => x.exp === '2nd')) return false;
    return true;
  }

  function finalizeRestLabel(s: Staff, d: number): string {
    if (s.weekendOff && isWeekendOrHoliday(d)) {
      const st = state[s.id];
      if (isHoliday(d)) { if (st.shukuRemaining > 0) st.shukuRemaining--; return '祝'; }
      if (st.kouRemaining > 0) st.kouRemaining--;
      return '公';
    }
    return 'restPending';
  }

  function restSortKey(s: Staff, daysLeft: number): number {
    return state[s.id].virtualRemaining / daysLeft;
  }

  // Main day loop
  for (let d = 1; d <= DAYS; d++) {
    const req = requiredCounts(d);
    const daysLeft = DAYS - d + 1;
    const dayAssign: Record<number, { type: string; leader: boolean }> = {};

    // Phase 0: night-only staff
    if (nightOnlyStaffId && STAFF_MAP.has(nightOnlyStaffId)) {
      const s = STAFF_MAP.get(nightOnlyStaffId)!;
      const st = state[s.id];
      if (st.forcedRestDaysLeft > 0) {
        dayAssign[s.id] = { type: 'restPendingSpecial', leader: false };
        st.forcedRestDaysLeft--;
      } else if (reqOf(s, d) === 'off') {
        dayAssign[s.id] = { type: 'restPendingSpecial', leader: false };
      } else if (st.nightCount < settings.nightCapNightOnly && st.nightStreak < settings.nightOnlyMaxStreak) {
        dayAssign[s.id] = { type: 'night', leader: false };
      } else {
        dayAssign[s.id] = { type: 'restPendingSpecial', leader: false };
      }
    }

    // Phase 1: 明け
    STAFF.forEach(s => {
      if (s.id === nightOnlyStaffId) return;
      if (state[s.id].prevType === 'night') dayAssign[s.id] = { type: 'rest', leader: false };
    });

    // Phase 2: requests
    STAFF.filter(s => !dayAssign[s.id]).forEach(s => {
      const r = reqOf(s, d);
      if (r === 'night' && eligibleNight(s, d)) dayAssign[s.id] = { type: 'night', leader: false };
      else if (r === 'late' && req.late > 0 && eligibleLate(s, d)) dayAssign[s.id] = { type: 'late', leader: false };
      else if (r === 'day' && eligibleDay(s, d)) dayAssign[s.id] = { type: 'day', leader: false };
    });

    // Phase 3: fill nights
    let nightList = STAFF.filter(s => dayAssign[s.id]?.type === 'night');
    let nightNeeded = req.night - nightList.length;
    if (nightNeeded > 0) {
      let cands = STAFF.filter(s => !dayAssign[s.id] && eligibleNight(s, d));
      cands.sort((a, b) => (state[a.id].nightCount * 100 + teamNightCount[a.team]) - (state[b.id].nightCount * 100 + teamNightCount[b.team]));
      for (const s of cands) {
        if (nightNeeded <= 0) break;
        if (!canAddToNight(s, nightList, req.night, true)) continue;
        nightList.push(s); dayAssign[s.id] = { type: 'night', leader: false }; nightNeeded--;
      }
      if (nightNeeded > 0) {
        for (const s of cands) {
          if (nightNeeded <= 0) break;
          if (dayAssign[s.id]) continue;
          if (!canAddToNight(s, nightList, req.night, false)) continue;
          nightList.push(s); dayAssign[s.id] = { type: 'night', leader: false }; nightNeeded--;
        }
      }
      if (nightNeeded > 0) warnings.push(`${d}日(${dowLabel(d)})：夜勤が${nightNeeded}名不足しています。`);
    }

    // Night team balance
    if (nightList.length >= 2 && new Set(nightList.map(s => s.team)).size < 2) {
      const missingTeam = nightList[0].team === 'A' ? 'B' : 'A';
      const removable = nightList.find(s => !s.leader && s.id !== nightOnlyStaffId) || nightList.find(s => s.id !== nightOnlyStaffId);
      if (removable) {
        const rest = nightList.filter(x => x !== removable);
        const cand = STAFF.find(s => !dayAssign[s.id] && s.team === missingTeam && eligibleNight(s, d) && canAddToNight(s, rest, req.night, false));
        if (cand) {
          nightList = rest.concat(cand);
          delete dayAssign[removable.id];
          dayAssign[cand.id] = { type: 'night', leader: false };
        }
      }
    }

    // Night leader
    if (nightList.length > 0 && !nightList.some(s => s.leader)) {
      const removable = nightList.filter(s => !s.leader && s.id !== nightOnlyStaffId).sort((a, b) => state[b.id].nightCount - state[a.id].nightCount)[0];
      const rest = removable ? nightList.filter(x => x !== removable) : nightList;
      const cand = STAFF.find(s => !dayAssign[s.id] && s.leader && eligibleNight(s, d) && canAddToNight(s, rest, req.night, false));
      if (cand && removable) {
        nightList = rest.concat(cand);
        delete dayAssign[removable.id];
        dayAssign[cand.id] = { type: 'night', leader: false };
      }
      if (!nightList.some(s => s.leader)) warnings.push(`${d}日(${dowLabel(d)})：夜勤にリーダー可能なスタッフがいません。`);
    }
    const nightLeader = nightList.find(s => s.leader);
    if (nightLeader) dayAssign[nightLeader.id].leader = true;

    // Phase 4: fill late-B
    let lateList = STAFF.filter(s => dayAssign[s.id]?.type === 'late');
    let lateNeeded = req.late - lateList.length;
    if (lateNeeded > 0) {
      let cands = STAFF.filter(s => !dayAssign[s.id] && eligibleLate(s, d));
      cands.sort((a, b) => (state[a.id].lateCount * 100 + teamLateCount[a.team]) - (state[b.id].lateCount * 100 + teamLateCount[b.team]));
      for (const s of cands) {
        if (lateNeeded <= 0) break;
        lateList.push(s); dayAssign[s.id] = { type: 'late', leader: false }; lateNeeded--;
      }
      if (lateNeeded > 0) warnings.push(`${d}日(${dowLabel(d)})：遅Bが${lateNeeded}名不足しています。`);
    }

    // Phase 5: rest / day
    const pool = STAFF.filter(s => !dayAssign[s.id]);
    const forcedRest = pool.filter(s => state[s.id].consec >= settings.maxConsecutiveDays || (s.weekendOff && isWeekendOrHoliday(d)) || isPlannedRest(s, d));
    let remaining = pool.filter(s => !forcedRest.includes(s));

    const locked = remaining.filter(s => s.weekendOff && reqOf(s, d) !== 'off');
    locked.forEach(s => { dayAssign[s.id] = { type: 'day', leader: false }; });
    remaining = remaining.filter(s => !locked.includes(s));

    const wishRest = remaining.filter(s => reqOf(s, d) === 'off');
    let flexible = remaining.filter(s => reqOf(s, d) !== 'off');

    // Phase 7: fill day
    let dayList = STAFF.filter(s => dayAssign[s.id]?.type === 'day');
    let dayNeeded = req.day - dayList.length;
    let flexA = flexible.filter(s => s.team === 'A').sort((a, b) => restSortKey(a, daysLeft) - restSortKey(b, daysLeft));
    let flexB = flexible.filter(s => s.team === 'B').sort((a, b) => restSortKey(a, daysLeft) - restSortKey(b, daysLeft));
    let pA = 0, pB = 0;
    while (dayNeeded > 0 && (flexA.length > 0 || flexB.length > 0)) {
      const useA = flexA.length === 0 ? false : flexB.length === 0 ? true : pA <= pB;
      const s = useA ? flexA.shift()! : flexB.shift()!;
      dayAssign[s.id] = { type: 'day', leader: false };
      dayList.push(s);
      if (useA) pA++; else pB++;
      dayNeeded--;
    }
    let restFromFlex = [...flexA, ...flexB];
    if (dayNeeded > 0) warnings.push(`${d}日(${dowLabel(d)})：日勤が${dayNeeded}名不足しています。`);

    // Day leaders
    if (isWeekendOrHoliday(d)) {
      if (!dayList.some(s => s.leader)) {
        const idx = restFromFlex.findIndex(s => s.leader);
        if (idx >= 0) { const c = restFromFlex.splice(idx, 1)[0]; dayAssign[c.id] = { type: 'day', leader: false }; dayList.push(c); }
        else warnings.push(`${d}日(${dowLabel(d)})：日勤のリーダーが不足しています。`);
      }
    } else {
      for (const team of ['A', 'B'] as const) {
        if (!dayList.some(s => s.leader && s.team === team)) {
          const idx = restFromFlex.findIndex(s => s.leader && s.team === team);
          if (idx >= 0) { const c = restFromFlex.splice(idx, 1)[0]; dayAssign[c.id] = { type: 'day', leader: false }; dayList.push(c); }
          else warnings.push(`${d}日(${dowLabel(d)})：${team}チームの日勤リーダーが不足しています。`);
        }
      }
    }

    // Phase 8: finalize rests
    [...forcedRest, ...wishRest, ...restFromFlex].forEach(s => {
      dayAssign[s.id] = { type: finalizeRestLabel(s, d), leader: false };
    });

    // Day leader marks
    if (isWeekendOrHoliday(d)) {
      const l = dayList.find(s => s.leader); if (l) dayAssign[l.id].leader = true;
    } else {
      for (const team of ['A', 'B'] as const) {
        const l = dayList.find(s => s.leader && s.team === team); if (l) dayAssign[l.id].leader = true;
      }
    }

    // State update
    STAFF.forEach(s => {
      const a = dayAssign[s.id] || { type: '公', leader: false };
      const st = state[s.id];
      schedule[s.id][d] = a as ShiftCell;
      if (a.type === 'night') {
        st.nightCount++; st.consec++; st.workCount++; st.prevType = 'night'; teamNightCount[s.team]++;
        if (s.id === nightOnlyStaffId) {
          st.nightStreak++;
          if (st.nightStreak >= settings.nightOnlyMaxStreak) st.forcedRestDaysLeft = settings.nightOnlyForcedRest;
        }
      } else if (a.type === 'late') {
        st.lateCount++; st.consec++; st.workCount++; st.prevType = 'late'; teamLateCount[s.team]++;
      } else if (a.type === 'day') {
        st.consec++; st.workCount++; st.prevType = 'day';
      } else {
        st.consec = 0; st.prevType = a.type; st.virtualRemaining--;
        if (s.id === nightOnlyStaffId) st.nightStreak = 0;
      }
    });
  }

  // Post: finalize restPending
  STAFF.forEach(s => {
    if (s.weekendOff || s.id === nightOnlyStaffId) return;
    let restDays = Object.entries(schedule[s.id]).filter(([, v]) => (v as any).type === 'restPending').map(([d]) => Number(d));
    const cap = kouQuota + shukuQuota + settings.nenkyuCapDefault + nenkyuExtra(s);
    if (restDays.length > cap) {
      const excess = restDays.length - cap;
      const keep: number[] = [];
      let taken = 0;
      for (let i = 0; i < restDays.length; i++) {
        const isEx = Math.floor(i * excess / restDays.length) !== Math.floor((i - 1) * excess / restDays.length);
        if (isEx && taken < excess) { schedule[s.id][restDays[i]] = { type: 'day', leader: false }; taken++; }
        else keep.push(restDays[i]);
      }
      restDays = keep;
    }
    if (restDays.length < kouQuota + shukuQuota) {
      warnings.push(`${s.name}：休みが${restDays.length}日で公休・祝の合計${kouQuota + shukuQuota}日分を確保できませんでした。`);
    }
    let kl = kouQuota, sl = shukuQuota;
    const ot = Math.max(0, restDays.length - kouQuota - shukuQuota);
    let ol = ot;
    restDays.forEach(d => {
      const kr = kouQuota > 0 ? kl / kouQuota : -1;
      const sr = shukuQuota > 0 ? sl / shukuQuota : -1;
      const or = ot > 0 ? ol / ot : -1;
      let label: ShiftType;
      if (kr >= sr && kr >= or && kl > 0) { label = '公'; kl--; }
      else if (sr >= or && sl > 0) { label = '祝'; sl--; }
      else if (ol > 0) { label = '年休'; ol--; }
      else { label = '公'; }
      schedule[s.id][d] = { type: label, leader: false };
      if (label === '年休') { state[s.id].otherCount++; teamOtherCount[s.team]++; }
    });
  });

  // Night-only rest finalization
  if (nightOnlyStaffId && STAFF_MAP.has(nightOnlyStaffId)) {
    const s = STAFF_MAP.get(nightOnlyStaffId)!;
    const restDays = Object.entries(schedule[s.id]).filter(([, v]) => (v as any).type === 'restPendingSpecial').map(([d]) => Number(d));
    let kl = kouQuota, sl = shukuQuota;
    const tt = Math.max(0, restDays.length - kouQuota - shukuQuota);
    let tl = tt;
    restDays.forEach(d => {
      const kr = kouQuota > 0 ? kl / kouQuota : -1;
      const sr = shukuQuota > 0 ? sl / shukuQuota : -1;
      const tr = tt > 0 ? tl / tt : -1;
      let label: ShiftType;
      if (kr >= sr && kr >= tr && kl > 0) { label = '公'; kl--; }
      else if (sr >= tr && sl > 0) { label = '祝'; sl--; }
      else if (tl > 0) { label = '特'; tl--; }
      else { label = '公'; }
      schedule[s.id][d] = { type: label, leader: false };
    });
  }

  // Quota check
  STAFF.filter(s => !s.weekendOff).forEach(s => {
    let ku = 0, su = 0;
    for (let d = 1; d <= DAYS; d++) {
      const t = schedule[s.id][d]?.type;
      if (t === '公') ku++; else if (t === '祝') su++;
    }
    if (ku < kouQuota || su < shukuQuota) {
      warnings.push(`${s.name}：公休${kouQuota - ku}日・祝${shukuQuota - su}日分が消化できませんでした。`);
    }
  });

  // Weekend pair check
  STAFF.filter(s => !s.weekendOff && s.id !== nightOnlyStaffId).forEach(s => {
    const isOff = (t: string) => t === '公' || t === '祝' || t === 'rest' || t === '年休';
    let has = false;
    for (let d = 1; d <= DAYS - 1; d++) {
      if (getDow(d) === 6) {
        const t1 = schedule[s.id][d]?.type;
        const t2 = schedule[s.id][d + 1]?.type;
        if (t1 && t2 && isOff(t1) && isOff(t2)) { has = true; break; }
      }
    }
    if (!has) warnings.push(`${s.name}：今月、土日2連休を確保できていません。`);
  });

  return { schedule, warnings };
}
