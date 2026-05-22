import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Download, Filter, Clock, Calendar } from 'lucide-react';
import { fetchServiceRecords } from '../lib/api.js';

function exportCSV(records, viewMode) {
  const cols = [
    'RecordID', 'Type', 'Parent_Plan_ID',
    'CaregiverID', 'CaregiverName',
    'CustomerID', 'CustomerName',
    'serviceDate', 'NumServices', 'FromTime', 'ToTime',
    'Status', 'CreatedAt', 'UpdatedAt',
  ];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [cols.join(','), ...records.map(r => cols.map(c => esc(r[c])).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {
    href: url,
    download: `carepana-${viewMode.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`,
  }).click();
  URL.revokeObjectURL(url);
}

const todayStr  = () => new Date().toISOString().split('T')[0];
const monthStr  = () => new Date().toISOString().slice(0, 7);

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function ReportingScreen({ showToast }) {
  const [allRecords,   setAllRecords]   = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [viewMode,     setViewMode]     = useState('Executed'); // 'Executed' | 'Planned'
  const [filterType,   setFilterType]   = useState('month');
  const [filterValue,  setFilterValue]  = useState(monthStr());

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchServiceRecords({});
      setAllRecords(data);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const targetType = viewMode === 'Executed' ? 'Actual' : 'Plan';
    return allRecords
      .filter(r => {
        const d = r.serviceDate || '';
        const dateMatch = !filterValue || (
          filterType === 'day' ? d === filterValue : d.startsWith(filterValue)
        );
        return dateMatch && r.Type === targetType;
      })
      .sort((a, b) => {
        if (b.serviceDate !== a.serviceDate) return b.serviceDate.localeCompare(a.serviceDate);
        return (a.FromTime || '').localeCompare(b.FromTime || '');
      });
  }, [allRecords, filterType, filterValue, viewMode]);

  const totalServices = filtered.reduce((s, r) => s + (parseInt(r.NumServices) || 0), 0);

  const switchFilter = (type) => {
    setFilterType(type);
    setFilterValue(type === 'day' ? todayStr() : monthStr());
  };

  const isExecuted = viewMode === 'Executed';

  return (
    <div className="space-y-4 pt-2">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">All caregivers · all records</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* View toggle — Planned vs Executed */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {['Planned', 'Executed'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              viewMode === mode
                ? mode === 'Executed'
                  ? 'bg-green-600 text-white'
                  : 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {mode === 'Planned' ? 'Planned Services' : 'Executed Services'}
          </button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Filter size={13} />Filter by period
        </div>
        <div className="flex gap-2">
          {['day', 'month'].map(t => (
            <button key={t} onClick={() => switchFilter(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filterType === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'day' ? 'By Day' : 'By Month'}
            </button>
          ))}
        </div>
        <input
          type={filterType === 'day' ? 'date' : 'month'}
          value={filterValue}
          onChange={e => setFilterValue(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <div className={`text-3xl font-bold ${isExecuted ? 'text-green-600' : 'text-indigo-600'}`}>
            {filtered.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">{isExecuted ? 'Executions' : 'Plans'}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <div className={`text-3xl font-bold ${isExecuted ? 'text-green-600' : 'text-indigo-600'}`}>
            {totalServices}
          </div>
          <div className="text-xs text-slate-500 mt-1">Total Services</div>
        </div>
      </div>

      {/* Export */}
      {filtered.length > 0 && (
        <button
          onClick={() => exportCSV(filtered, viewMode)}
          className="w-full flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold py-3 rounded-xl transition-colors shadow-sm"
        >
          <Download size={15} />
          Export {filtered.length} Record{filtered.length !== 1 ? 's' : ''} as CSV
        </button>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 text-center">
          <div className="text-5xl mb-3">{isExecuted ? '⚡' : '📋'}</div>
          <p className="font-semibold text-slate-700">No {viewMode.toLowerCase()} records for this period</p>
          <p className="text-sm text-slate-400 mt-1">Try a different date range</p>
        </div>
      )}

      {/* Dense scrollable list */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Column header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
            <span className="w-[80px] flex-shrink-0 text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Calendar size={10} />Date
            </span>
            <span className="flex-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Caregiver</span>
            <span className="flex-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Customer</span>
            <span className="w-8 flex-shrink-0 text-xs font-bold text-slate-400 uppercase tracking-wide text-right">Svc</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-50">
            {filtered.map(r => (
              <div key={r.RecordID} className="px-3 py-2.5 hover:bg-slate-50/70 transition-colors">
                {/* Main row */}
                <div className="flex items-center gap-2">
                  <span className="w-[80px] flex-shrink-0 text-xs font-mono text-slate-500">{r.serviceDate}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{r.CaregiverName || '—'}</span>
                  <span className="flex-1 text-sm text-slate-600 truncate">{r.CustomerName || '—'}</span>
                  <span className={`w-8 flex-shrink-0 text-sm font-bold text-right ${isExecuted ? 'text-green-600' : 'text-indigo-600'}`}>
                    {r.NumServices}
                  </span>
                </div>
                {/* Sub-row: time + record ID */}
                <div className="flex items-center gap-2 mt-0.5 pl-[88px]">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={9} />{fmtTime(r.FromTime)} – {fmtTime(r.ToTime)}
                  </span>
                  {r.Parent_Plan_ID && (
                    <span className="text-xs text-slate-300 font-mono ml-auto">↳ {r.Parent_Plan_ID}</span>
                  )}
                  {!r.Parent_Plan_ID && isExecuted && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-semibold ml-auto">Unplanned</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer count */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-right">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} · {totalServices} total services
          </div>
        </div>
      )}
    </div>
  );
}
