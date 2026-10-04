import React, { useState, useEffect } from 'react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  isUsingLiveSupabase,
  resetDemoData,
  testSupabaseConnection,
  getDatabaseStats,
  exportAllDatabaseJson,
  importDatabaseJson,
  SUPABASE_SQL_SCHEMA,
} from '../supabase';
import {
  Database,
  Check,
  Copy,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Download,
  Upload,
  Eye,
  EyeOff,
  Server,
  Activity,
  Code2,
  Table as TableIcon,
  Shield,
  HelpCircle,
  Terminal,
  Zap,
  CheckCircle2,
  FileCode,
} from 'lucide-react';

interface DatabaseViewProps {
  onBack?: () => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ onBack }) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [showKey, setShowKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [testResult, setTestResult] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
    latencyMs?: number;
  }>({ running: false });

  const [activeSubTab, setActiveSubTab] = useState<'connection' | 'schema' | 'tables' | 'security' | 'guide' | 'snippets'>('connection');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const isLive = isUsingLiveSupabase();
  const stats = getDatabaseStats();

  const handleTestConnection = async () => {
    setTestResult({ running: true });
    const res = await testSupabaseConnection(url, key);
    setTestResult({
      running: false,
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs,
    });
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setSaveMessage({ text: 'Please enter both Supabase URL and Anon Key.', type: 'error' });
      return;
    }
    saveSupabaseConfig(url, key);
    setSaveMessage({
      text: 'Supabase configuration saved! Reloading application with live cloud connection...',
      type: 'success',
    });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleDisconnect = () => {
    saveSupabaseConfig('', '');
    setUrl('');
    setKey('');
    setSaveMessage({
      text: 'Disconnected from remote Supabase. Switching to high-speed persistent local mode.',
      type: 'success',
    });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', 'fleetledger_supabase_schema.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleCopySnippet = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = exportAllDatabaseJson();
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', `fleetledger_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const res = importDatabaseJson(content);
      if (res.success) {
        setImportStatus(`Imported ${res.countProfiles} vehicles and ${res.countRecords} daily records! Reloading...`);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setImportStatus(`Import failed: ${res.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all vehicle data and records back to initial factory demo seed?')) {
      resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-xl shrink-0 ${isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Database Connection & SQL Schema
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isLive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                  {isLive ? 'Live Supabase Cloud Connected' : 'Persistent In-Browser Local Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Full PostgreSQL schema specifications, Row Level Security (RLS) policies, live cloud connection tester, and fleet backup utilities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              title="Backup current database to JSON file"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export JSON Backup</span>
            </button>
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Restore JSON</span>
              <input type="file" accept=".json" onChange={handleImportJsonFile} className="hidden" />
            </label>
          </div>
        </div>

        {importStatus && (
          <div className="mt-4 p-3 rounded-lg text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Database Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Database Engine</span>
            <span className="font-semibold text-slate-900 flex items-center gap-1 mt-0.5">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              {isLive ? 'PostgreSQL 15+ (PostgREST)' : 'Indexed LocalStore Engine'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Registered Vehicles</span>
            <span className="font-bold text-slate-900 font-mono-tabular text-sm mt-0.5 block">
              {stats.totalProfiles} profiles
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Daily Ledger Entries</span>
            <span className="font-bold text-slate-900 font-mono-tabular text-sm mt-0.5 block">
              {stats.totalRecords} records
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Login History Audits</span>
            <span className="font-bold text-slate-900 font-mono-tabular text-sm mt-0.5 block">
              {stats.totalLogins} events logged
            </span>
          </div>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
        {[
          { id: 'connection', label: 'Connection & Setup', icon: Server },
          { id: 'schema', label: 'Complete SQL Schema', icon: Code2 },
          { id: 'tables', label: 'Table Inspector & Columns', icon: TableIcon },
          { id: 'security', label: 'Row Level Security (RLS)', icon: Shield },
          { id: 'guide', label: 'Step-by-Step Setup Guide', icon: HelpCircle },
          { id: 'snippets', label: 'SQL Query Snippets', icon: Terminal },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CONNECTION & SETUP */}
      {activeSubTab === 'connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 tracking-tight mb-1">
                Supabase Credentials Configuration
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Connect your cloud Supabase database by supplying your project URL and public anonymous key.
              </p>

              <form onSubmit={handleSaveConnection} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Supabase Project URL <span className="text-rose-500">*</span>
                    </label>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Supabase Dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://yourprojectref.supabase.co"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular transition-colors"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Found in your Supabase project under Settings &gt; API &gt; Project URL.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Supabase Anon / Public Key <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showKey ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      required
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={key}
                      onChange={e => setKey(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular transition-colors"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Use your public 'anon' key (safe for browser client-side requests under RLS).
                  </span>
                </div>

                {/* Connection Test Output */}
                {testResult.message && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{testResult.success ? 'Endpoint Reachable' : 'Connection Notice'}</div>
                      <div className="text-[11px] mt-0.5">{testResult.message}</div>
                    </div>
                  </div>
                )}

                {saveMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      saveMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveMessage.text}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testResult.running}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testResult.running ? 'animate-spin' : 'text-blue-600'}`} />
                    <span>{testResult.running ? 'Pinging Supabase...' : 'Test Connection Live'}</span>
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Connect Database</span>
                  </button>

                  {isLive && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-3.5 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Disconnect (Revert to Local)
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Side Info & Maintenance */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Connection Environment
              </h3>
              <p className="text-slate-500 leading-relaxed">
                FleetLedger supports seamless hot-swapping between remote Supabase cloud instances and browser storage.
              </p>

              <div className="space-y-2.5">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800 block">Offline & Local Mode:</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Preloaded with commercial vehicles and sample ledger logs. Fully interactive without any cloud setup.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800 block">Supabase Cloud Mode:</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Production PostgreSQL backed by Supabase Auth with RLS policies, multi-tenant isolation, and audit triggers.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Dataset Maintenance:</span>
                <button
                  onClick={handleResetData}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Demo Dataset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPLETE SQL SCHEMA */}
      {activeSubTab === 'schema' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Complete PostgreSQL Schema & Migration Script
              </h2>
              <p className="text-xs text-slate-500">
                Execute this exact script in your Supabase SQL Editor. It creates custom enums, tables, RLS policies, functions, and user registration triggers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSql}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .sql</span>
              </button>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono-tabular overflow-x-auto max-h-[550px] leading-relaxed border border-slate-800">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      )}

      {/* TAB 3: TABLE INSPECTOR & COLUMNS */}
      {activeSubTab === 'tables' && (
        <div className="space-y-6">
          {/* Table 1: profiles */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-mono-tabular font-bold text-sm text-slate-900">public.profiles</span>
                <p className="text-xs text-slate-500">Commercial vehicle drivers and fleet managers directory</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Primary Entity
              </span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Column</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Key / Constraints</th>
                  <th className="py-2.5 px-4">Default</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-tabular text-xs">
                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-600">id</td>
                  <td className="py-2.5 px-4 text-slate-600">uuid</td>
                  <td className="py-2.5 px-4"><span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">PRIMARY KEY, FK auth.users</span></td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">User authentication UUID</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">vehicle_number</td>
                  <td className="py-2.5 px-4 text-slate-600">text</td>
                  <td className="py-2.5 px-4"><span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">UNIQUE, NOT NULL</span></td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Vehicle license / registration number</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">name</td>
                  <td className="py-2.5 px-4 text-slate-600">text</td>
                  <td className="py-2.5 px-4 text-slate-500">NOT NULL</td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Driver / owner full name</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">phone</td>
                  <td className="py-2.5 px-4 text-slate-600">text</td>
                  <td className="py-2.5 px-4 text-slate-500">NOT NULL</td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Contact phone number</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">role</td>
                  <td className="py-2.5 px-4 text-slate-600">public.app_role</td>
                  <td className="py-2.5 px-4 text-slate-500">ENUM ('user', 'admin')</td>
                  <td className="py-2.5 px-4 text-emerald-700">'user'</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Fleet access privilege role</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">created_at</td>
                  <td className="py-2.5 px-4 text-slate-600">timestamptz</td>
                  <td className="py-2.5 px-4 text-slate-500">NOT NULL</td>
                  <td className="py-2.5 px-4 text-emerald-700">now()</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Registration timestamp</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 2: daily_records */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-mono-tabular font-bold text-sm text-slate-900">public.daily_records</span>
                <p className="text-xs text-slate-500">Itemized daily income, fuel cost, and other vehicle operating expenses</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Financial Transactions
              </span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Column</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Key / Constraints</th>
                  <th className="py-2.5 px-4">Default</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-tabular text-xs">
                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-600">id</td>
                  <td className="py-2.5 px-4 text-slate-600">uuid</td>
                  <td className="py-2.5 px-4"><span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">PRIMARY KEY</span></td>
                  <td className="py-2.5 px-4 text-emerald-700">gen_random_uuid()</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Unique ledger entry ID</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">user_id</td>
                  <td className="py-2.5 px-4 text-slate-600">uuid</td>
                  <td className="py-2.5 px-4"><span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">FK profiles(id) ON DELETE CASCADE</span></td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Driver profile reference</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">record_date</td>
                  <td className="py-2.5 px-4 text-slate-600">date</td>
                  <td className="py-2.5 px-4 text-slate-500">NOT NULL</td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Operational trip date (YYYY-MM-DD)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">income</td>
                  <td className="py-2.5 px-4 text-slate-600">numeric(14,2)</td>
                  <td className="py-2.5 px-4 text-slate-500">CHECK (income &gt;= 0)</td>
                  <td className="py-2.5 px-4 text-emerald-700">0</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Gross passenger / freight revenue</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">income_details</td>
                  <td className="py-2.5 px-4 text-slate-600">text</td>
                  <td className="py-2.5 px-4 text-slate-500">NOT NULL</td>
                  <td className="py-2.5 px-4 text-emerald-700">''</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Trip routes, manifests, passenger notes</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">cost</td>
                  <td className="py-2.5 px-4 text-slate-600">numeric(14,2)</td>
                  <td className="py-2.5 px-4 text-slate-500">CHECK (cost &gt;= 0)</td>
                  <td className="py-2.5 px-4 text-emerald-700">0</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Fuel and direct operational vehicle expenses</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">other</td>
                  <td className="py-2.5 px-4 text-slate-600">numeric(14,2)</td>
                  <td className="py-2.5 px-4 text-slate-500">CHECK (other &gt;= 0)</td>
                  <td className="py-2.5 px-4 text-emerald-700">0</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Incidentals (tolls, parking, repairs)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">other_details</td>
                  <td className="py-2.5 px-4 text-slate-600">text</td>
                  <td className="py-2.5 px-4 text-slate-500">NOT NULL</td>
                  <td className="py-2.5 px-4 text-emerald-700">''</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Details of incidental payments</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">created_at</td>
                  <td className="py-2.5 px-4 text-slate-600">timestamptz</td>
                  <td className="py-2.5 px-4 text-slate-500">NOT NULL</td>
                  <td className="py-2.5 px-4 text-emerald-700">now()</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Record creation timestamp</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 3: login_history */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-mono-tabular font-bold text-sm text-slate-900">public.login_history</span>
                <p className="text-xs text-slate-500">Security audit log of driver and admin sign-in timestamps</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Security Audit
              </span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Column</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Key / Constraints</th>
                  <th className="py-2.5 px-4">Default</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-tabular text-xs">
                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-600">id</td>
                  <td className="py-2.5 px-4 text-slate-600">bigint</td>
                  <td className="py-2.5 px-4"><span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">GENERATED ALWAYS AS IDENTITY PK</span></td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Sequential audit ID</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">user_id</td>
                  <td className="py-2.5 px-4 text-slate-600">uuid</td>
                  <td className="py-2.5 px-4"><span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">FK profiles(id) ON DELETE CASCADE</span></td>
                  <td className="py-2.5 px-4 text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">User who authenticated</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900">logged_in_at</td>
                  <td className="py-2.5 px-4 text-slate-600">timestamptz</td>
                  <td className="py-2.5 px-4 text-slate-500">NOT NULL</td>
                  <td className="py-2.5 px-4 text-emerald-700">now()</td>
                  <td className="py-2.5 px-4 text-slate-700 font-sans">Timestamp of authentication</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ROW LEVEL SECURITY (RLS) */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 tracking-tight mb-1">
              Row Level Security (RLS) Policies & RBAC Matrix
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Row Level Security is enabled on every table. Non-admin drivers can only inspect and mutate their own vehicle records, while fleet admins have global access.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <th className="py-3 px-4">Policy Name</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Operation</th>
                    <th className="py-3 px-4">Condition (USING / WITH CHECK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-tabular text-xs">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"profile read"</td>
                    <td className="py-2.5 px-4 text-blue-600">public.profiles</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-bold">SELECT</td>
                    <td className="py-2.5 px-4 text-slate-600">id = auth.uid() OR public.is_admin()</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"profile insert"</td>
                    <td className="py-2.5 px-4 text-blue-600">public.profiles</td>
                    <td className="py-2.5 px-4 text-blue-700 font-bold">INSERT</td>
                    <td className="py-2.5 px-4 text-slate-600">id = auth.uid()</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"profile update"</td>
                    <td className="py-2.5 px-4 text-blue-600">public.profiles</td>
                    <td className="py-2.5 px-4 text-amber-700 font-bold">UPDATE</td>
                    <td className="py-2.5 px-4 text-slate-600">id = auth.uid() OR public.is_admin()</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"record read"</td>
                    <td className="py-2.5 px-4 text-emerald-600">public.daily_records</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-bold">SELECT</td>
                    <td className="py-2.5 px-4 text-slate-600">user_id = auth.uid() OR public.is_admin()</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"record insert"</td>
                    <td className="py-2.5 px-4 text-emerald-600">public.daily_records</td>
                    <td className="py-2.5 px-4 text-blue-700 font-bold">INSERT</td>
                    <td className="py-2.5 px-4 text-slate-600">user_id = auth.uid()</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"record update"</td>
                    <td className="py-2.5 px-4 text-emerald-600">public.daily_records</td>
                    <td className="py-2.5 px-4 text-amber-700 font-bold">UPDATE</td>
                    <td className="py-2.5 px-4 text-slate-600">user_id = auth.uid() OR public.is_admin()</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"record delete"</td>
                    <td className="py-2.5 px-4 text-emerald-600">public.daily_records</td>
                    <td className="py-2.5 px-4 text-rose-700 font-bold">DELETE</td>
                    <td className="py-2.5 px-4 text-slate-600">user_id = auth.uid() OR public.is_admin()</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"history read"</td>
                    <td className="py-2.5 px-4 text-purple-600">public.login_history</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-bold">SELECT</td>
                    <td className="py-2.5 px-4 text-slate-600">user_id = auth.uid() OR public.is_admin()</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">"history insert"</td>
                    <td className="py-2.5 px-4 text-purple-600">public.login_history</td>
                    <td className="py-2.5 px-4 text-blue-700 font-bold">INSERT</td>
                    <td className="py-2.5 px-4 text-slate-600">user_id = auth.uid() OR public.is_admin()</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-900 block">Security Definer Function:</span>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg font-mono-tabular text-[11px] overflow-x-auto">
{`create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;`}
              </pre>
              <p className="text-slate-500 text-[11px]">
                Runs with definer privileges to prevent recursive RLS evaluation during admin authorization checks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STEP-BY-STEP SETUP GUIDE */}
      {activeSubTab === 'guide' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              4-Step Quick Supabase Cloud Setup Guide
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow these simple steps to deploy your live PostgreSQL database on Supabase within 2 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Step 1 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900">Create Supabase Project</h3>
                <p className="text-slate-600 leading-relaxed">
                  Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">supabase.com</a>, log in or sign up, and click <strong>"New Project"</strong>. Choose your nearest cloud region and set a database password.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900">Run SQL Migration</h3>
                <p className="text-slate-600 leading-relaxed">
                  In your Supabase project dashboard, navigate to the <strong>SQL Editor</strong> tab on the left. Click "New Query", paste the full SQL Schema from Tab 2, and press <strong>RUN</strong>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900">Copy API Credentials</h3>
                <p className="text-slate-600 leading-relaxed">
                  Navigate to <strong>Project Settings &gt; API</strong>. Copy the <strong>Project URL</strong> and the <strong>anon public</strong> key from the Project API keys box.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                4
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900">Connect in FleetLedger</h3>
                <p className="text-slate-600 leading-relaxed">
                  Return to Tab 1 (Connection & Setup), paste the Project URL and Anon Key, click <strong>"Test Connection Live"</strong>, then click <strong>"Save & Connect"</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SQL QUERY SNIPPETS */}
      {activeSubTab === 'snippets' && (
        <div className="space-y-4">
          {[
            {
              id: 'q1',
              title: 'Promote a Driver to Fleet Administrator',
              desc: 'Execute in Supabase SQL editor to grant full fleet admin privileges to any vehicle license plate.',
              code: `UPDATE public.profiles
SET role = 'admin'
WHERE vehicle_number = 'KA-01-AB-1234';`,
            },
            {
              id: 'q2',
              title: 'Monthly Income & Expense Summary per Vehicle',
              desc: 'Aggregates gross income, fuel costs, and net settlement balance for all vehicles.',
              code: `SELECT 
  p.vehicle_number,
  p.name AS driver_name,
  COUNT(r.id) AS days_logged,
  COALESCE(SUM(r.income), 0) AS total_income,
  COALESCE(SUM(r.cost), 0) AS total_fuel_cost,
  COALESCE(SUM(r.other), 0) AS total_other_cost,
  COALESCE(SUM(r.income - r.cost - r.other), 0) AS net_balance
FROM public.profiles p
LEFT JOIN public.daily_records r ON p.id = r.user_id
GROUP BY p.vehicle_number, p.name
ORDER BY net_balance DESC;`,
            },
            {
              id: 'q3',
              title: 'Check RLS Policy Status Across All Tables',
              desc: 'Verifies that Row Level Security is active and lists all enabled security rules.',
              code: `SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';`,
            },
          ].map(snippet => (
            <div key={snippet.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">{snippet.title}</h3>
                  <p className="text-[11px] text-slate-500">{snippet.desc}</p>
                </div>
                <button
                  onClick={() => handleCopySnippet(snippet.code, snippet.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  {copiedSnippet === snippet.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSnippet === snippet.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono-tabular text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                {snippet.code}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
