import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Clock, User, Users, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { deleteServiceRecord } from '../lib/api.js';
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

// Compute what differs between an actual and its parent plan
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

function ActualCard({ actual, plan, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const discrepancies = getDiscrepancies(actual, plan);
  const isUnplanned   = !actual.Parent_Plan_ID;
  const hasIssues     = discrepancies.length > 0;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(actual.RecordID);
    } catch (e) {
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${
      hasIssues ? 'border-amber-300' : 'border-slate-100'
    }`}>
      {/* Top row: badges + delete control */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
            {actual.RecordID}
          </span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
            Actual
          </span>
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
        </div>

        {/* Delete control */}
        <div className="flex-shrink-0 ml-2">
          {confirmDel ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {deleting ? '…' : 'Delete'}
              </button>
              <button onClick={() => setConfirmDel(false)} className="text-xs text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="p-1.5 text-slate-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
              aria-label="Delete execution record"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-1">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Users size={13} className="text-slate-400 flex-shrink-0" />
          <span className="font-medium">{actual.CaregiverName || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User size={13} className="text-slate-400 flex-shrink-0" />
          <span>{actual.CustomerName || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Clock size={13} className="text-slate-400 flex-shrink-0" />
          <span>{fmtTime(actual.FromTime)} – {fmtTime(actual.ToTime)}</span>
          <span className="ml-auto text-xs text-slate-400">{actual.NumServices} svc</span>
        </div>
      </div>

      {/* Discrepancy detail lines */}
      {discrepancies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-amber-100 space-y-0.5">
          {discrepancies.map(d => (
            <p key={d.label} className="text-xs text-amber-700">
              <AlertTriangle size={10} className="inline mr-1" />{d.detail}
            </p>
          ))}
        </div>
      )}

      {/* Parent plan ref */}
      {actual.Parent_Plan_ID && !isUnplanned && (
        <p className="mt-1.5 text-xs text-slate-400">
          Based on plan <span className="font-mono">{actual.Parent_Plan_ID}</span>
        </p>
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

  // Build a RecordID → plan map for O(1) discrepancy lookups
  const planMap = useMemo(
    () => plans.reduce((m, p) => { m[p.RecordID] = p; return m; }, {}),
    [plans]
  );

  const handleDelete = async (recordId) => {
    try {
      await deleteServiceRecord(recordId);
      showToast('Execution record deleted');
      onDataChanged();
    } catch (e) {
      showToast(e.message, 'error');
      throw e;
    }
  };

  const sorted = [...actuals].sort((a, b) => (a.FromTime || '').localeCompare(b.FromTime || ''));

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
          {sorted.length} {sorted.length === 1 ? 'record' : 'records'}
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

      {/* Actual cards */}
      <div className="space-y-3">
        {sorted.map(actual => (
          <ActualCard
            key={actual.RecordID}
            actual={actual}
            plan={actual.Parent_Plan_ID ? planMap[actual.Parent_Plan_ID] : null}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Add unplanned visit */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors shadow-sm"
      >
        <Plus size={16} />
        Add Direct Execution (Unplanned)
      </button>

      {/* Unplanned visit modal */}
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
