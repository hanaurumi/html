'use client';

import { useApp } from '@/context/AppContext';
import { Staff, ExpLevel, TeamId } from '@/lib/types';

export default function StaffTab() {
  const { staff, setStaff, addStaff, removeStaff, persistStaff, persistSettings, settings, updateSettings } = useApp();

  function update<K extends keyof Staff>(id: number, field: K, value: Staff[K]) {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function updateOverride(id: number, field: 'weekendNightEnabled' | 'nenkyuExtra', value: boolean | number) {
    const ov = { ...(settings.staffOverrides[id] || {}), [field]: value };
    updateSettings({ staffOverrides: { ...settings.staffOverrides, [id]: ov } });
  }

  async function handleSave() {
    await persistStaff();
    await persistSettings();
  }

  return (
    <section>
      <h2>スタッフ一覧</h2>
      <p className="note">表内で直接編集できます。「有効」のチェックを外すと今月の勤務表から除外されます。</p>
      <div className="scroll-wrap" style={{ maxHeight: 520 }}>
        <table className="staff-table">
          <thead>
            <tr>
              <th>有効</th><th>チーム</th><th>氏名</th><th>役職</th><th>経験</th>
              <th>リーダー</th><th>夜勤</th><th>遅B</th><th>時短</th><th>土日祝休み</th>
              <th>土日夜勤<br />解禁(1年)</th><th>年休追加</th><th>削除</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => {
              const ov = settings.staffOverrides[s.id] || {};
              return (
                <tr key={s.id}>
                  <td><input type="checkbox" checked={s.active !== false}
                    onChange={e => update(s.id, 'active', e.target.checked)} /></td>
                  <td>
                    <select value={s.team} onChange={e => update(s.id, 'team', e.target.value as TeamId)}>
                      <option value="A">A</option><option value="B">B</option>
                    </select>
                  </td>
                  <td className="name">
                    <input type="text" value={s.name} style={{ width: 90 }}
                      onChange={e => update(s.id, 'name', e.target.value)} />
                  </td>
                  <td>
                    <input type="text" value={s.role} style={{ width: 80 }}
                      onChange={e => update(s.id, 'role', e.target.value)} />
                  </td>
                  <td>
                    <select value={s.exp} onChange={e => update(s.id, 'exp', e.target.value as ExpLevel)}>
                      <option value="general">一般</option>
                      <option value="1st">1年目</option>
                      <option value="2nd">2年目</option>
                    </select>
                  </td>
                  <td><input type="checkbox" checked={s.leader}
                    onChange={e => update(s.id, 'leader', e.target.checked)} /></td>
                  <td>
                    <select value={s.night === true ? 'true' : s.night === false ? 'false' : 'request'}
                      onChange={e => update(s.id, 'night', e.target.value === 'true' ? true : e.target.value === 'false' ? false : 'request')}>
                      <option value="true">対象</option>
                      <option value="false">対象外</option>
                      <option value="request">希望時のみ</option>
                    </select>
                  </td>
                  <td><input type="checkbox" checked={s.lateB}
                    onChange={e => update(s.id, 'lateB', e.target.checked)} /></td>
                  <td>
                    <input type="text" value={s.shortTime || ''} placeholder="例：①" style={{ width: 50 }}
                      onChange={e => update(s.id, 'shortTime', e.target.value || null)} />
                  </td>
                  <td><input type="checkbox" checked={s.weekendOff}
                    onChange={e => update(s.id, 'weekendOff', e.target.checked)} /></td>
                  <td>
                    {s.exp === '1st'
                      ? <input type="checkbox" checked={!!ov.weekendNightEnabled}
                          onChange={e => updateOverride(s.id, 'weekendNightEnabled', e.target.checked)} />
                      : '－'}
                  </td>
                  <td>
                    {s.weekendOff ? '－' : (
                      <input type="number" min={0} max={31} style={{ width: 55 }}
                        value={ov.nenkyuExtra ?? 0}
                        onChange={e => updateOverride(s.id, 'nenkyuExtra', Number(e.target.value))} />
                    )}
                  </td>
                  <td>
                    <button className="btn secondary btn-sm" onClick={async () => {
                      if (!confirm(`${s.name}を削除しますか？（元に戻せません）`)) return;
                      await removeStaff(s.id);
                    }}>削除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="actions">
        <button className="btn" onClick={addStaff}>＋ 新しいスタッフを追加</button>
        <button className="btn secondary" onClick={handleSave}>スタッフ設定を保存</button>
      </div>
    </section>
  );
}
