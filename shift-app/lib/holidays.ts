function pad(n: number): string { return String(n).padStart(2, '0'); }

export function computeHolidays(year: number): Set<string> {
  const set = new Set<string>();

  function add(m: number, d: number | null) {
    if (d) set.add(`${year}-${pad(m)}-${pad(d)}`);
  }

  function nthWeekday(month: number, weekday: number, n: number): number | null {
    let count = 0;
    const dim = new Date(year, month, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      if (new Date(year, month - 1, d).getDay() === weekday) {
        count++;
        if (count === n) return d;
      }
    }
    return null;
  }

  add(1, 1);
  add(1, nthWeekday(1, 1, 2));   // 成人の日
  add(2, 11);
  add(2, 23);                    // 天皇誕生日
  const shunbun = Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
  add(3, shunbun);
  add(4, 29);
  add(5, 3); add(5, 4); add(5, 5);
  add(7, nthWeekday(7, 1, 3));   // 海の日
  add(8, 11);
  add(9, nthWeekday(9, 1, 3));   // 敬老の日
  const shubun = Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
  add(9, shubun);
  add(10, nthWeekday(10, 1, 2)); // スポーツの日
  add(11, 3);
  add(11, 23);

  // 振替休日
  Array.from(set).forEach(ds => {
    const dt = new Date(ds + 'T00:00:00');
    if (dt.getDay() !== 0) return;
    const cursor = new Date(dt);
    let cursorKey: string;
    do {
      cursor.setDate(cursor.getDate() + 1);
      cursorKey = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    } while (cursor.getFullYear() === year && set.has(cursorKey));
    if (cursor.getFullYear() === year) set.add(cursorKey);
  });

  // 国民の休日（挟まれた平日）
  Array.from(set).forEach(ds => {
    const dt = new Date(ds + 'T00:00:00');
    const mid = new Date(dt); mid.setDate(mid.getDate() + 1);
    const next = new Date(dt); next.setDate(next.getDate() + 2);
    if (next.getFullYear() === year) {
      const ms = `${mid.getFullYear()}-${pad(mid.getMonth() + 1)}-${pad(mid.getDate())}`;
      const nsx = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
      if (set.has(nsx) && !set.has(ms) && mid.getDay() !== 0) set.add(ms);
    }
  });

  return set;
}
