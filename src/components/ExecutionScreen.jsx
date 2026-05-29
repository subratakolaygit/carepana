import React, { useState, useMemo } from 'react';
import { Plus, Clock, User, Users, AlertTriangle, RefreshCw, Zap, Pencil, Check, X, Ban } from 'lucide-react';
import { updateServiceRecord } from '../lib/api.js';
import ServiceEntryModal from './ServiceEntryModal.jsx';

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function getDiscrepancies(actual, plan) {
  if (!plan) return [];
  const issues = [];
  if (actual.CustomerID && plan.CustomerID && actual.CustomerID !== plan.CustomerID) {
    issues.push({ label: 'Changed Client', detail: `Was: ${plan.CustomerName}` });
  }
  if (
    (actual.FromTime && actual.FromTime !== plan.FromTime) ||
    (actual.ToTime   && actual.ToTime   !== plan.ToTime)
  ) {
    issues.push({
      label: 'Modified Hours',
      detail: `Planned: ${fmtTime(plan.FromTime)} – ${fmtTime(plan.ToTime)}`,
    });
  }
  if (actual.NumServices && String(actual.NumServices) !== String(plan.NumServices)) {
    issues.push({ label: 'Modified Count', detail: `Planned: ${plan.NumServices} svc` });
  }
  return issues;
}

function ActualCard({ actual, plan, showToast, onDataChanged }) {
  const [editMode, setEditMode] = useState(false);
  const [fromTime, setFromTime] = useState(actual.FromTime || '');
  const [toTime, setToTime]     = useState(actual.ToTime || '');
  const [numSvc, setNumSvc]     = useState(parseInt(actual.NumServices) || 1);
  const [saving, setSaving]     = useState(false);

  const isCancelled  = actual.Status === 'Cancelled';
  const isUnplanned  = !actual.Parent_Plan_ID;
  const discrepancies = isCancelled ? [] : getDiscrepancies(actual, plan);
  const hasIssues    = discrepancies.length > 0;

  const enterEdit = () => {
    setFromTime(actual.FromTime || '');
    setToTime(actual.ToTime || '');
    setNumSvc(parseInt(actual.NumServices) || 1);
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateServiceRecord(actual.RecordID, {
        ...actual,
        FromTime: fromTime,
        ToTime: toTime,
        NumServices: numSvc,
      });
      showToast('Execution updated');
      onDataChanged();
      setEditMode(false);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRecord = async () => {
    setSaving(true);
    try {
      await updateServiceRecord(actual.RecordID, { ...actual, Status: 'Cancelled' });
      showToast('Execution cancelled');
      onDataChanged();
      setEditMode(false);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border shadow-sm p-4 transition-all ${
      isCancelled
        ? 'bg-slate-50 border-slate-200'
        : hasIssues
        ? 'bg-white border-amber-300'
        : 'bg-white border-slate-100'
    }`}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
            isCancelled ? 'text-slate-400 bg-slate-100' : 'text-green-700 bg-green-50'
          }`}>
            {actual.RecordID}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
            isCancelled ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-700'
          }`}>
            Actual
          </span>
          {isCancelled ? (
            <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded font-semibold">
              Cancelled
            </span>
          ) : (
            <>
              {isUnplanned && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <Zap size={10} />Unplanned
                </span>
              )}
              {discrepancies.map(d => (
                <span key={d.label} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <AlertTriangle size={10} />{d.label}
                </span>
              ))}
            </>
          )}
        </div>

        {!isCancelled && (
          <button
            onClick={editMode ? () => setEditMode(false) : enterEdit}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 ml-2 ${
              editMode
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {editMode ? <><X size={11} />Discard</> : <><Pencil size={11} />Edit</>}
          </button>
        )}
      </div>

      {/* Details */}
      <div className={`space-y-1.5 ${isCancelled ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Users size={13} className="text-slate-400 flex-shrink-0" />
          <span className="font-medium">{actual.CaregiverName || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User size={13} className="text-slate-400 flex-shrink-0" />
          <span>{actual.CustomerName || '—'}</span>
        </div>

        {editMode ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Clock size={13} className="text-slate-400 flex-shrink-0" />
            <input
              type="time"
              value={fromTime}
              onChange={e => setFromTime(e.target.value)}
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            />
            <span className="text-slate-400 text-xs flex-shrink-0">–</span>
            <input
              type="time"
              value={toTime}
              onChange={e => setToTime(e.target.value)}
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            />
            <input
              type="number"
              min="1"
              value={numSvc}
              onChange={e => setNumSvc(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 flex-shrink-0 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            />
            <span className="text-xs text-slate-400 flex-shrink-0">svc</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Clock size={13} className="text-slate-400 flex-shrink-0" />
            <span>{fmtTime(actual.FromTime)} – {fmtTime(actual.ToTime)}</span>
            <span className="ml-auto text-xs text-slate-400">{actual.NumServices} svc</span>
          </div>
        )}
      </div>

      {/* Discrepancy detail lines */}
      {!isCancelled && discrepancies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-amber-100 space-y-0.5">
          {discrepancies.map(d => (
            <p key={d.label} className="text-xs text-amber-700">
              <AlertTriangle size={10} className="inline mr-1" />{d.detail}
            </p>
          ))}
        </div>
      )}

      {/* Parent plan ref */}
      {!isCancelled && actual.Parent_Plan_ID && !isUnplanned && (
        <p className="mt-1.5 text-xs text-slate-400">
          Based on plan <span className="font-mono">{actual.Parent_Plan_ID}</span>
        </p>
      )}

      {/* Edit mode save / cancel buttons */}
      {editMode && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 py-2.5 rounded-lg transition-colors"
          >
            <Check size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancelRecord}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 disabled:opacity-50 px-4 py-2.5 rounded-lg transition-colors"
          >
            <Ban size={14} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExecutionScreen({
  actuals,
  plans,
  selectedDate,
  caregivers,
  customers,
  onCustomerAdded,
  showToast,
  onDataChanged,
}) {
  const [showModal, setShowModal] = useState(false);

  const planMap = useMemo(
    () => plans.reduce((m, p) => { m[p.RecordID] = p; return m; }, {}),
    [plans]
  );

  // Active records first (by start time), cancelled records at the bottom
  const sorted = [...actuals].sort((a, b) => {
    const aCancelled = a.Status === 'Cancelled';
    const bCancelled = b.Status === 'Cancelled';
    if (aCancelled !== bCancelled) return aCancelled ? 1 : -1;
    return (a.FromTime || '').localeCompare(b.FromTime || '');
  });

  const activeCount = sorted.filter(a => a.Status !== 'Cancelled').length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <RefreshCw size={16} className="text-green-500" />
            Execution Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(selectedDate)}</p>
        </div>
        <span className="text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
          {activeCount} {activeCount === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">⚡</div>
          <p className="font-semibold text-slate-700">No executed services yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Use "Copy to Execution" from the Planning Log, or add a direct visit below
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map(actual => (
          <ActualCard
            key={actual.RecordID}
            actual={actual}
            plan={actual.Parent_Plan_ID ? planMap[actual.Parent_Plan_ID] : null}
            showToast={showToast}
            onDataChanged={onDataChanged}
          />
        ))}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors shadow-sm"
      >
        <Plus size={16} />
        Add Direct Execution (Unplanned)
      </button>

      {showModal && (
        <ServiceEntryModal
          type="Actual"
          basedOn={null}
          selectedDate={selectedDate}
          caregivers={caregivers}
          customers={customers}
          onCustomerAdded={onCustomerAdded}
          showToast={showToast}
          onClose={() => setShowModal(false)}
          onSaved={onDataChanged}
        />
      )}
    </div>
  );
}
