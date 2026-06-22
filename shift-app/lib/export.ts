import { Staff, Schedule, ShiftType } from './types';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

function dowLabel(year: number, month: number, d: number): string {
  return DOW[new Date(year, month - 1, d).getDay()];
}

function cellLabel(type: ShiftType): string {
  if (type === 'night') return '夜';
  if (type === 'late') return '遅';
  if (type === 'day') return '日';
  if (type === 'rest') return '明';
  return type;
}

export function exportToCSV(staff: Staff[], schedule: Schedule, year: number, month: number): void {
  const dim = new Date(year, month, 0).getDate();
  const rows: string[][] = [];

  const header = ['氏名', 'チーム'];
  for (let d = 1; d <= dim; d++) header.push(`${d}(${dowLabel(year, month, d)})`);
  header.push('夜勤', '遅B', '日勤', '明け', '公休', '祝', '年休', '特');
  rows.push(header);

  staff.forEach(s => {
    const row: (string | number)[] = [s.name, s.team];
    let night = 0, late = 0, day = 0, rest = 0, kou = 0, shuku = 0, other = 0, toku = 0;
    for (let d = 1; d <= dim; d++) {
      const a = schedule[s.id]?.[d];
      if (!a) { row.push(''); continue; }
      row.push(cellLabel(a.type) + (a.leader ? '★' : ''));
      if (a.type === 'night') night++;
      else if (a.type === 'late') late++;
      else if (a.type === 'day') day++;
      else if (a.type === 'rest') rest++;
      else if (a.type === '公') kou++;
      else if (a.type === '祝') shuku++;
      else if (a.type === '年休') other++;
      else if (a.type === '特') toku++;
    }
    row.push(night, late, day, rest, kou, shuku, other, toku);
    rows.push(row.map(String));
  });

  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `勤務表_${year}年${month}月.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
