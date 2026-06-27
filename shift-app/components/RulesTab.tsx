'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function RulesTab() {
  const { settings, customRulesHtml, saveRules, nightOnlyStaffId, staff } = useApp();
  const [editing, setEditing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const { weekdayPattern, weekdayDayMin, weekendDayMin, nenkyuCapDefault,
    nightCapGeneral, nightCap1st, nightCapNightOnly, lateCapSetting,
    maxConsecutiveDays, currentYear, currentMonth } = settings;

  const nightOnlyName = nightOnlyStaffId
    ? staff.find(s => s.id === nightOnlyStaffId)?.name ?? 'なし'
    : 'なし';

  function getDim() { return new Date(currentYear, currentMonth, 0).getDate(); }
  function countKou() {
    let k = 0, s2 = 0;
    for (let d = 1; d <= getDim(); d++) {
      const w = new Date(currentYear, currentMonth - 1, d).getDay();
      if (w === 0 || w === 6) k++; // simplified – doesn't apply holidayOverride
    }
    return k;
  }

  const defaultHtml = `
<p><strong>【勤務のつながり（固定ルール）】</strong></p>
<ul>
  <li>夜勤の翌日は必ず休み（明け）</li>
  <li>遅Bの翌日は夜勤または休みのみ</li>
  <li>連続勤務は最大${maxConsecutiveDays}日まで（①基本設定タブで変更可）</li>
</ul>
<p><strong>【人数配置（現在の設定値）】</strong></p>
<ul>
  <li>土日・祝日の夜勤は常に3人夜勤。遅Bの有無は①基本設定タブで選択</li>
  <li>平日の夜勤体制：月=${weekdayPattern['1']}, 火=${weekdayPattern['2']}, 水=${weekdayPattern['3']}, 木=${weekdayPattern['4']}, 金=${weekdayPattern['5']} (A=4人夜勤, B=3人夜勤+遅B1人)</li>
  <li>日勤の必要人数：平日${weekdayDayMin}名以上、土日祝日${weekendDayMin}名以上</li>
</ul>
<p><strong>【個人の回数上限（①基本設定タブで変更可）】</strong></p>
<ul>
  <li>夜勤：一般スタッフ月${nightCapGeneral}回・1年目月${nightCap1st}回・夜勤専従月${nightCapNightOnly}回まで</li>
  <li>遅B：月${lateCapSetting}回まで</li>
</ul>
<p><strong>【夜勤専従（夜勤専従タブで月ごとに設定）】</strong></p>
<ul>
  <li>現在の設定：${nightOnlyName}</li>
  <li>日勤・遅Bには入らない。夜勤は月${nightCapNightOnly}回まで</li>
</ul>
<p><strong>【年休】</strong></p>
<ul>
  <li>年休の上限：1人あたり月${nenkyuCapDefault}回（①基本設定タブで変更可）</li>
  <li>土日2連休は月1回、自動生成時にできるだけ確保</li>
</ul>
`;

  const html = customRulesHtml ?? defaultHtml;

  return (
    <section>
      <h2>このアプリが使っているルール一覧</h2>
      <p className="note">設定値は①タブで変更できます。「編集する」ボタンで自由に書き換えて保存できます。</p>
      <div className="actions">
        {!editing ? (
          <>
            <button className="btn" onClick={() => setEditing(true)}>編集する</button>
            <button className="btn secondary" onClick={async () => {
              if (!confirm('編集した内容を削除して既定の内容に戻しますか？')) return;
              await saveRules(null);
            }}>既定の内容に戻す</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={async () => {
              if (bodyRef.current) await saveRules(bodyRef.current.innerHTML);
              setEditing(false);
            }}>保存する</button>
            <button className="btn secondary" onClick={() => {
              if (bodyRef.current) bodyRef.current.innerHTML = html;
              setEditing(false);
            }}>キャンセル</button>
          </>
        )}
      </div>
      <div
        ref={bodyRef}
        contentEditable={editing}
        suppressContentEditableWarning
        style={{ fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', outline: editing ? '2px solid var(--accent)' : 'none' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
