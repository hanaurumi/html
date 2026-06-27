'use client';

import { useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppProvider, useApp } from '@/context/AppContext';
import SettingsTab from '@/components/SettingsTab';
import StaffTab from '@/components/StaffTab';
import NightOnlyTab from '@/components/NightOnlyTab';
import RequestsTab from '@/components/RequestsTab';
import ResultTab from '@/components/ResultTab';
import RulesTab from '@/components/RulesTab';

const TABS = [
  { id: 'settings',  label: '①基本設定' },
  { id: 'staff',     label: '②スタッフ' },
  { id: 'nightonly', label: '夜勤専従' },
  { id: 'requests',  label: '③勤務希望' },
  { id: 'result',    label: '④生成結果' },
  { id: 'rules',     label: '⑤ルール一覧' },
];

function SetupScreen() {
  return (
    <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2C5F6F' }}>⚙️ Supabaseの設定が必要です</h1>
      <ol style={{ lineHeight: 2 }}>
        <li><a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a> でプロジェクトを作成</li>
        <li><code>supabase/schema.sql</code> の内容をSupabase SQL Editorで実行</li>
        <li><code>.env.local.example</code> を <code>.env.local</code> にコピーしてURLとキーを入力</li>
        <li><code>npm run dev</code> を再起動</li>
      </ol>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('settings');
  const { settings, isLoading } = useApp();

  const label = `対象期間：${settings.currentYear}年${settings.currentMonth}月`;

  return (
    <>
      <header style={{ background: '#2C5F6F', color: '#fff', padding: '18px 24px' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>5西勤務表作成</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, opacity: 0.85 }}>{label}</p>
      </header>

      <nav style={{ display: 'flex', gap: 2, background: '#2C5F6F', padding: '0 16px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? '#F7F8FA' : 'rgba(255,255,255,0.12)',
              color: activeTab === t.id ? '#2C5F6F' : '#fff',
              border: 'none', padding: '10px 16px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', borderRadius: '6px 6px 0 0', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: 18, maxWidth: '100%' }}>
        {isLoading ? (
          <p style={{ color: '#6B7785' }}>読み込み中…</p>
        ) : (
          <>
            {activeTab === 'settings'  && <SettingsTab />}
            {activeTab === 'staff'     && <StaffTab />}
            {activeTab === 'nightonly' && <NightOnlyTab />}
            {activeTab === 'requests'  && <RequestsTab />}
            {activeTab === 'result'    && <ResultTab />}
            {activeTab === 'rules'     && <RulesTab />}
          </>
        )}
      </main>
    </>
  );
}

export default function Page() {
  if (!isSupabaseConfigured) return <SetupScreen />;
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
