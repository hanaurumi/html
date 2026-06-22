'use client';

import { useApp } from '@/context/AppContext';
import { DayPattern } from '@/lib/types';
import { computeHolidays } from '@/lib/holidays';

const DOW_LABEL = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_OPTS: [DayPattern, string][] = [['A', '4人夜勤（遅Bなし）'], ['B', '3人夜勤+遅B1人']];
const WEEKEND_OPTS: [DayPattern, string][] = [['B', '3人夜勤+遅B1人'], ['C', '3人夜勤・遅Bなし']];
const PATTERN_OPTS: [DayPattern, string][] = [['A', '4人夜勤（遅Bなし）'], ['B', '3人夜勤+遅B1人'], ['C', '3人夜勤・遅Bなし']];

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function SettingsTab() {
  const { settings, updateSettings, persistSettings, setSaveStatus } = useApp();
  const {
    currentYear: year, currentMonth: month,
    weekdayPattern, holidayPattern,
    dateOverridePattern, holidayOverride,
    weekdayDayMin, weekendDayMin, nenkyuCapDefault,
    nightCapGeneral, nightCap1st, nightCapNightOnly,
    lateCapSetting, maxConsecutiveDays, nightOnlyMaxStreak, nightOnlyForcedRest,
  } = settings;

  const dim = new Date(year, month, 0).getDate();
  const holidaySet = computeHolidays(year);

  function dateKey(d: number) { return `${year}-${pad(month)}-${pad(d)}`; }
  function getDow(d: number) { return new Date(year, month - 1, d).getDay(); }
  function isWeekend(d: number) { const w = getDow(d); return w === 0 || w === 6; }
  function isHoliday(d: number) {
    const dk = dateKey(d);
    if (Object.prototype.hasOwnProperty.call(holidayOverride, dk)) return holidayOverride[dk];
    return holidaySet.has(dk);
  }
  function isWeekendOrHoliday(d: number) { return isWeekend(d) || isHoliday(d); }

  async function save() {
    await persistSettings();
    setSaveStatus('設定を保存しました');
  }

  return (
    <>
      {/* 対象月 */}
      <section>
        <h2>対象月</h2>
        <div className="field-row">
          <label>年</label>
          <input type="number" min={2020} max={2099} style={{ width: 90 }} value={year}
            onChange={e => updateSettings({ currentYear: Number(e.target.value) })} />
          <label>月</label>
          <input type="number" min={1} max={12} style={{ width: 70 }} value={month}
            onChange={e => updateSettings({ currentMonth: Number(e.target.value) })} />
          <button className="btn" onClick={save}>この月を表示・保存</button>
        </div>
        <p className="note">勤務希望・夜勤専従は月ごとに保存されます。月を変えたら「この月を表示・保存」を押してください。</p>
      </section>

      {/* 曜日ごとの夜勤パターン */}
      <section>
        <h2>曜日ごとの夜勤パターン</h2>
        <p className="note">「4人夜勤」＝遅Bなし。「3人夜勤+遅B1人」＝夜勤3名＋遅B1名。祝日は曜日に関わらず祝日設定が使われます。</p>
        <div className="weekday-grid">
          {[0, 1, 2, 3, 4, 5, 6].map(w => {
            const isWe = w === 0 || w === 6;
            const opts = isWe ? WEEKEND_OPTS : WEEKDAY_OPTS;
            return (
              <div key={w} className="cell">
                <div className="lbl">{DOW_LABEL[w]}曜日</div>
                <select value={weekdayPattern[String(w)]}
                  onChange={e => updateSettings({ weekdayPattern: { ...weekdayPattern, [String(w)]: e.target.value as DayPattern } })}>
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            );
          })}
          <div className="cell" style={{ background: '#FBE3E3' }}>
            <div className="lbl">祝日</div>
            <select value={holidayPattern}
              onChange={e => updateSettings({ holidayPattern: e.target.value as DayPattern })}>
              {WEEKEND_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="actions"><button className="btn" onClick={save}>この設定を反映する</button></div>
      </section>

      {/* 日勤必要人数 */}
      <section>
        <h2>日勤の必要人数</h2>
        <div className="field-row">
          <label>平日の日勤（最低人数）</label>
          <input type="number" min={1} max={40} style={{ width: 80 }} value={weekdayDayMin}
            onChange={e => updateSettings({ weekdayDayMin: Number(e.target.value) })} />
          <span className="note" style={{ margin: 0 }}>人</span>
        </div>
        <div className="field-row">
          <label>土日祝日の日勤（最低人数）</label>
          <input type="number" min={1} max={40} style={{ width: 80 }} value={weekendDayMin}
            onChange={e => updateSettings({ weekendDayMin: Number(e.target.value) })} />
          <span className="note" style={{ margin: 0 }}>人</span>
        </div>
        <div className="actions"><button className="btn" onClick={save}>この設定を反映する</button></div>
      </section>

      {/* 年休上限 */}
      <section>
        <h2>年休の上限（個人ごと・1ヶ月）</h2>
        <div className="field-row">
          <label>年休の上限（既定値）</label>
          <input type="number" min={0} max={31} style={{ width: 80 }} value={nenkyuCapDefault}
            onChange={e => updateSettings({ nenkyuCapDefault: Number(e.target.value) })} />
          <span className="note" style={{ margin: 0 }}>回／月</span>
        </div>
        <div className="actions"><button className="btn" onClick={save}>この設定を反映する</button></div>
      </section>

      {/* 勤務回数・連続日数の上限 */}
      <section>
        <h2>勤務回数・連続日数の上限</h2>
        <p className="note">変更後は「この設定を反映する」を押してください。</p>
        {[
          ['夜勤上限（一般スタッフ）', 'nightCapGeneral', nightCapGeneral, 1, 31, '回／月'],
          ['夜勤上限（1年目）', 'nightCap1st', nightCap1st, 0, 31, '回／月'],
          ['夜勤上限（夜勤専従）', 'nightCapNightOnly', nightCapNightOnly, 1, 31, '回／月'],
          ['遅B上限', 'lateCapSetting', lateCapSetting, 0, 31, '回／月'],
          ['連続勤務の上限', 'maxConsecutiveDays', maxConsecutiveDays, 1, 31, '日'],
          ['夜勤専従：連続夜勤の上限', 'nightOnlyMaxStreak', nightOnlyMaxStreak, 1, 10, '回連続まで'],
          ['夜勤専従：連続夜勤後の強制休み', 'nightOnlyForcedRest', nightOnlyForcedRest, 1, 10, '日'],
        ].map(([label, key, val, min, max, unit]) => (
          <div key={key as string} className="field-row">
            <label>{label as string}</label>
            <input type="number" min={min as number} max={max as number} style={{ width: 80 }} value={val as number}
              onChange={e => updateSettings({ [key as string]: Number(e.target.value) } as any)} />
            <span className="note" style={{ margin: 0 }}>{unit as string}</span>
          </div>
        ))}
        <div className="actions"><button className="btn" onClick={save}>この設定を反映する</button></div>
      </section>

      {/* カレンダー上書き */}
      <section>
        <h2>カレンダーで個別の日を上書き</h2>
        <p className="note">祝日判定を変えたい日・夜勤パターンを変えたい日はここで上書きできます。</p>
        <div className="scroll-wrap" style={{ maxHeight: 600 }}>
          <div className="calmini">
            {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
              const dk = dateKey(d);
              const we = isWeekendOrHoliday(d);
              const curPat = dateOverridePattern[dk] || '';
              const curHol = Object.prototype.hasOwnProperty.call(holidayOverride, dk) ? String(holidayOverride[dk]) : '';
              const dayOpts = we ? WEEKEND_OPTS : WEEKDAY_OPTS;
              return (
                <div key={d} className={`day${we ? ' we' : ''}`}>
                  <div className="d">{d}日({DOW_LABEL[getDow(d)]})</div>
                  {isHoliday(d) && <div className="holiday-tag">祝</div>}
                  <select value={curPat} onChange={e => {
                    const v = e.target.value as DayPattern | '';
                    const next = { ...dateOverridePattern };
                    if (v) next[dk] = v; else delete next[dk];
                    updateSettings({ dateOverridePattern: next });
                  }}>
                    <option value="">既定（曜日設定）</option>
                    {PATTERN_OPTS.filter(([v]) => dayOpts.some(([ov]) => ov === v)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select value={curHol} onChange={e => {
                    const v = e.target.value;
                    const next = { ...holidayOverride };
                    if (v === '') delete next[dk];
                    else next[dk] = v === 'true';
                    updateSettings({ holidayOverride: next });
                  }}>
                    <option value="">標準判定のまま</option>
                    <option value="true">祝日にする</option>
                    <option value="false">祝日にしない</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
        <div className="actions"><button className="btn" onClick={save}>この設定を反映する</button></div>
      </section>
    </>
  );
}
