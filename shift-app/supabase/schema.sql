-- ============================================================
-- 5西勤務表 – Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ── Settings (single row, id=1) ────────────────────────────
CREATE TABLE IF NOT EXISTS ward_settings (
  id                    int PRIMARY KEY DEFAULT 1,
  year                  int NOT NULL,
  month                 int NOT NULL,
  weekday_pattern       jsonb NOT NULL DEFAULT '{"0":"B","1":"B","2":"A","3":"B","4":"A","5":"A","6":"B"}',
  holiday_pattern       text NOT NULL DEFAULT 'B',
  date_override_pattern jsonb NOT NULL DEFAULT '{}',
  holiday_override      jsonb NOT NULL DEFAULT '{}',
  weekday_day_min       int NOT NULL DEFAULT 12,
  weekend_day_min       int NOT NULL DEFAULT 6,
  nenkyu_cap_default    int NOT NULL DEFAULT 2,
  night_cap_general     int NOT NULL DEFAULT 5,
  night_cap_1st         int NOT NULL DEFAULT 2,
  night_cap_night_only  int NOT NULL DEFAULT 9,
  late_cap              int NOT NULL DEFAULT 3,
  max_consecutive_days  int NOT NULL DEFAULT 5,
  night_only_max_streak int NOT NULL DEFAULT 2,
  night_only_forced_rest int NOT NULL DEFAULT 2,
  staff_overrides       jsonb NOT NULL DEFAULT '{}',
  updated_at            timestamptz DEFAULT now()
);

-- Seed default settings row
INSERT INTO ward_settings (id, year, month)
VALUES (1, EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int)
ON CONFLICT (id) DO NOTHING;

-- ── Staff ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  role        text NOT NULL DEFAULT 'スタッフ',
  exp         text NOT NULL DEFAULT 'general' CHECK (exp IN ('general','1st','2nd')),
  leader      boolean NOT NULL DEFAULT false,
  night       text NOT NULL DEFAULT 'true' CHECK (night IN ('true','false','request')),
  late_b      boolean NOT NULL DEFAULT true,
  short_time  text,
  weekend_off boolean NOT NULL DEFAULT false,
  team        text NOT NULL DEFAULT 'A' CHECK (team IN ('A','B')),
  active      boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0
);

-- Seed default staff
INSERT INTO staff (id, name, role, exp, leader, night, late_b, short_time, weekend_off, team, active, sort_order) VALUES
  (1,  '藤井友晴',   '副看護師長', 'general', true,  'true',    true,  null, false, 'A', true,  0),
  (3,  '都丸裕未',   'スタッフ',   'general', true,  'true',    true,  null, false, 'A', true,  1),
  (4,  '高山千里',   'スタッフ',   'general', true,  'true',    true,  null, false, 'A', true,  2),
  (5,  '遠藤智子',   'スタッフ',   'general', true,  'true',    true,  null, false, 'A', true,  3),
  (6,  '燕千尋',     'スタッフ',   'general', true,  'true',    true,  null, false, 'A', true,  4),
  (7,  '高橋真理',   'スタッフ',   'general', true,  'true',    true,  null, false, 'A', true,  5),
  (8,  '佐藤あつ子', 'スタッフ',   'general', true,  'true',    true,  null, false, 'A', true,  6),
  (9,  '神谷華',     'スタッフ',   'general', true,  'true',    true,  null, false, 'A', true,  7),
  (10, '米原彩',     'スタッフ',   'general', false, 'true',    true,  null, false, 'A', true,  8),
  (11, '山田泰音',   'スタッフ',   '2nd',     false, 'true',    true,  null, false, 'A', true,  9),
  (12, '佐藤真由',   'スタッフ',   '2nd',     false, 'true',    true,  null, false, 'A', true,  10),
  (13, '高橋幸子',   'スタッフ',   'general', false, 'false',   false, '⑮', true,  'A', true,  11),
  (14, '小林彩乃',   'スタッフ',   '1st',     false, 'true',    true,  null, false, 'A', false, 12),
  (15, '平田彩花',   'スタッフ',   '1st',     false, 'true',    true,  null, false, 'A', false, 13),
  (2,  '畠山佳苗',   '副看護師長', 'general', true,  'true',    true,  null, false, 'B', true,  14),
  (16, '島田恵里',   'スタッフ',   'general', true,  'true',    true,  null, false, 'B', true,  15),
  (17, '園部真琴',   'スタッフ',   'general', true,  'true',    true,  null, false, 'B', true,  16),
  (18, '青葉純子',   'スタッフ',   'general', true,  'true',    true,  null, false, 'B', true,  17),
  (19, '安井郁代',   'スタッフ',   'general', true,  'true',    true,  null, false, 'B', true,  18),
  (20, '櫛引宏江',   'スタッフ',   'general', true,  'true',    true,  null, false, 'B', true,  19),
  (21, '楠ひかる',   'スタッフ',   'general', true,  'true',    true,  null, false, 'B', true,  20),
  (22, '浅見祥子',   'スタッフ',   'general', false, 'true',    true,  null, false, 'B', true,  21),
  (23, '野口萌々華', 'スタッフ',   'general', false, 'true',    true,  null, false, 'B', true,  22),
  (24, '武村舞',     'スタッフ',   '2nd',     false, 'true',    true,  null, false, 'B', true,  23),
  (25, '武井朋子',   'スタッフ',   'general', false, 'request', false, '①', true,  'B', true,  24),
  (26, '永田遥菜',   'スタッフ',   'general', false, 'false',   false, '①', true,  'B', true,  25),
  (27, '近江紗弥',   'スタッフ',   '2nd',     false, 'true',    true,  null, false, 'B', true,  26),
  (28, '愛宕菜摘',   'スタッフ',   '1st',     false, 'true',    true,  null, false, 'B', false, 27)
ON CONFLICT (id) DO NOTHING;

-- Reset serial sequence after explicit id inserts
SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff));

-- ── Shift requests (per staff per month) ──────────────────
CREATE TABLE IF NOT EXISTS shift_requests (
  year     int NOT NULL,
  month    int NOT NULL,
  staff_id int NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  data     jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (year, month, staff_id)
);

-- ── Night-only assignment (per month) ─────────────────────
CREATE TABLE IF NOT EXISTS night_only (
  year     int NOT NULL,
  month    int NOT NULL,
  staff_id int NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  PRIMARY KEY (year, month)
);

-- ── Custom rules HTML ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_rules (
  id         int PRIMARY KEY DEFAULT 1,
  html       text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────
-- Enable RLS and allow all operations for authenticated users.
-- For a single-ward internal tool you can also use the anon key
-- with open policies (shown below). Tighten as needed.

ALTER TABLE ward_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_only     ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_rules   ENABLE ROW LEVEL SECURITY;

-- Allow all for anon (simple internal tool – change to authenticated if you add auth)
CREATE POLICY "allow_all_ward_settings"  ON ward_settings  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_staff"          ON staff          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_shift_requests" ON shift_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_night_only"     ON night_only     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_custom_rules"   ON custom_rules   FOR ALL TO anon USING (true) WITH CHECK (true);
