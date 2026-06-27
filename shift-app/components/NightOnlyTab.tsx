'use client';

import { useApp } from '@/context/AppContext';

export default function NightOnlyTab() {
  const { staff, nightOnlyStaffId, setNightOnly, settings } = useApp();

  const eligible = staff.filter(s => s.active && !s.weekendOff);

  return (
    <section>
      <h2>夜勤専従の設定（月ごと）</h2>
      <p className="note">
        月に1名まで設定できます。夜勤を月{settings.nightCapNightOnly}回まで担当できます（通常は月{settings.nightCapGeneral}回まで）。<br />
        {settings.nightOnlyMaxStreak}回連続まで夜勤ができ、連続後は必ず{settings.nightOnlyForcedRest}連休になります。<br />
        休みは公休・祝で埋まる分はそのまま、足りない分は「特」（特別休）として表示されます。
      </p>
      <div className="field-row">
        <label>今月の夜勤専従</label>
        <select value={nightOnlyStaffId ?? ''} onChange={e => setNightOnly(e.target.value ? Number(e.target.value) : null)}>
          <option value="">なし</option>
          {eligible.map(s => (
            <option key={s.id} value={s.id}>{s.name}（{s.team}チーム）</option>
          ))}
        </select>
      </div>
    </section>
  );
}
