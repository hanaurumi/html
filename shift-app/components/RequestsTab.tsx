'use client';

import { useApp } from '@/context/AppContext';
import { RequestType } from '@/lib/types';
import { computeHolidays } from '@/lib/holidays';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const OPTS: [RequestType | '', string][] = [
  ['', '指定なし'], ['night', '夜勤希望'], ['late', '遅B希望'], ['day', '日勤希望'], ['off', '休み希望'],
];

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function RequestsTab() {
  const { staff, requests, setRequest, clearAllRequests, settings } = useApp();
  const { currentYear: year, currentMonth: month } = settings;

  const dim = new Date(year, month, 0).getDate();
  const holidaySet = computeHolidays(year);
  const active = staff.filter(s => s.active);

  function getDow(d: number) { return new Date(year, month - 1, d).getDay(); }
  function isHoliday(d: number) {
    const dk = `${year}-${pad(month)}-${pad(d)}`;
    if (Object.prototype.hasOwnProperty.call(settings.holidayOverride, dk)) return settings.holidayOverride[dk];
    return holidaySet.has(dk);
  }
  function isWe(d: number) { const w = getDow(d); return w === 0 || w === 6 || isHoliday(d); }

  return (
    <section>
      <h2>勤務希望の入力</h2>
      <p className="note">セルでスタッフの希望を選択してください。未選択は自動配置に任せます。</p>
      <div className="actions">
        <button className="btn secondary" onClick={async () => {
          if (!confirm('この月の勤務希望をすべて削除しますか？')) return;
          await clearAllRequests();
        }}>この月の希望をすべてクリア</button>
      </div>
      <div className="scroll-wrap" style={{ maxHeight: 560 }}>
        <table className="grid-table">
          <thead>
            <tr>
              <th className="name-col">氏名</th>
              {Array.from({ length: dim }, (_, i) => i + 1).map(d => (
                <th key={d} className={isWe(d) ? 'we' : ''}>{d}<br />{DOW[getDow(d)]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map(s => (
              <tr key={s.id}>
                <td className="name-col">{s.name}</td>
                {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
                  const cur = requests[s.id]?.[d] ?? '';
                  return (
                    <td key={d} className={isWe(d) ? 'we' : ''}>
                      <select value={cur} onChange={e => setRequest(s.id, d, e.target.value as RequestType | '')}>
                        {OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
