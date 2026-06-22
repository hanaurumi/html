'use client';

import { useApp } from '@/context/AppContext';
import { ShiftType } from '@/lib/types';
import { exportToCSV } from '@/lib/export';
import { computeHolidays } from '@/lib/holidays';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const EDIT_OPTIONS: [ShiftType, string][] = [
  ['night', '夜'], ['late', '遅'], ['day', '日'], ['rest', '明'],
  ['公', '公'], ['祝', '祝'], ['年休', '年休'], ['特', '特'],
];

function pad(n: number) { return String(n).padStart(2, '0'); }
function cellLabel(t: ShiftType): string {
  if (t === 'night') return '夜'; if (t === 'late') return '遅';
  if (t === 'day') return '日'; if (t === 'rest') return '明';
  return t;
}
function cellClass(t: ShiftType): string {
  if (t === 'night') return 'cell-night'; if (t === 'late') return 'cell-late';
  if (t === 'day') return 'cell-day'; if (t === 'rest') return 'cell-rest';
  if (t === '公') return 'cell-公'; if (t === '祝') return 'cell-祝';
  if (t === '年休') return 'cell-年休'; if (t === '特') return 'cell-特';
  return 'cell-公';
}

export default function ResultTab() {
  const { staff, schedule, warnings, runGeneration, editCell, settings } = useApp();
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
    <>
      <div className="assumption">
        <strong>このアプリの前提：</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          <li>副看護師長は通常スタッフとして夜勤・遅Bのカウント対象に含めています。</li>
          <li>「土日祝日休み」が設定されているスタッフは遅Bには入りません。</li>
          <li>公休・祝は月間枚数として全員に同数を割り振ります。</li>
        </ul>
      </div>

      <div className="actions">
        <button className="btn" onClick={runGeneration}>勤務表を自動生成する</button>
        {schedule && (
          <button className="btn secondary" onClick={() => exportToCSV(active, schedule, year, month)}>
            CSVエクスポート
          </button>
        )}
      </div>

      {schedule && (
        <>
          <section>
            <h2>生成結果</h2>
            <div className="legend">
              {[['var(--night)', '夜勤'], ['var(--late)', '遅B'], ['var(--day)', '日勤'],
                ['var(--rest)', '明け'], ['var(--kou)', '公休'], ['var(--shuku)', '祝'],
                ['var(--other)', '年休'], ['var(--toku)', '特']].map(([bg, lbl]) => (
                <span key={lbl}><span className="swatch" style={{ background: bg }}></span>{lbl}</span>
              ))}
              <span><span style={{ color: 'var(--leader)', fontWeight: 700 }}>★</span> リーダー</span>
            </div>
            <p className="note">各セルはプルダウンで手動変更できます（変更は集計に反映されます）。</p>
            <div className="scroll-wrap">
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
                        const a = schedule[s.id]?.[d];
                        if (!a) return <td key={d}></td>;
                        return (
                          <td key={d} className={cellClass(a.type)}>
                            <select
                              style={{ background: 'transparent', border: 'none', color: 'inherit', fontWeight: 'inherit', width: '100%', textAlign: 'center' }}
                              value={a.type}
                              onChange={e => editCell(s.id, d, e.target.value)}
                            >
                              {EDIT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                            {a.leader && <span className="leader-star">★</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>警告・確認事項</h2>
            {warnings.length === 0
              ? <div className="ok-box">警告はありません。すべての配置基準を満たしています。</div>
              : <div className="warn-box">
                  <strong>{warnings.length}件の確認事項があります：</strong>
                  <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
            }
          </section>

          <section>
            <h2>集計</h2>
            <div className="scroll-wrap">
              <table className="staff-table summary-table">
                <thead>
                  <tr>
                    <th>氏名</th><th>チーム</th>
                    <th>夜勤</th><th>遅B</th><th>日勤</th><th>明け</th>
                    <th>公休</th><th>祝</th><th>年休</th><th>特</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map(s => {
                    let night = 0, late = 0, day = 0, rest = 0, kou = 0, shuku = 0, other = 0, toku = 0;
                    for (let d = 1; d <= dim; d++) {
                      const t = schedule[s.id]?.[d]?.type;
                      if (t === 'night') night++;
                      else if (t === 'late') late++;
                      else if (t === 'day') day++;
                      else if (t === 'rest') rest++;
                      else if (t === '公') kou++;
                      else if (t === '祝') shuku++;
                      else if (t === '年休') other++;
                      else if (t === '特') toku++;
                    }
                    return (
                      <tr key={s.id}>
                        <td className="name">{s.name}</td>
                        <td>{s.team}</td>
                        <td className="num">{night}</td><td className="num">{late}</td>
                        <td className="num">{day}</td><td className="num">{rest}</td>
                        <td className="num">{kou}</td><td className="num">{shuku}</td>
                        <td className="num">{other}</td><td className="num">{toku}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
