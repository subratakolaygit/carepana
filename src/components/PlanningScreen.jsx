import React, { useState } from 'react';
import { Plus, Clock, User, Users, ClipboardList, Pencil, Check, X, Ban } from 'lucide-react';
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

function PlanCard({ plan, customers, onCopyToExecution, showToast, onDataChanged }) {
  const [editMode,      setEditMode]      = useState(false);
  const [fromTime,      setFromTime]      = useState(plan.FromTime || '');
  const [toTime,        setToTime]        = useState(plan.ToTime || '');
  const [numSvc,        setNumSvc]        = useState(parseInt(plan.NumServices) || 1);
  const [customerId,    setCustomerId]    = useState(plan.CustomerID || '');
  const [customerName,  setCustomerName]  = useState(plan.CustomerName || '');
  const [saving,        setSaving]        = useState(false);

  const isCancelled = plan.Status === 'Cancelled';

  const enterEdit = () => {
    setFromTime(plan.FromTime || '');
    setToTime(plan.ToTime || '');
    setNumSvc(parseInt(plan.NumServices) || 1);
    setCustomerId(plan.CustomerID || '');
    setCustomerName(plan.CustomerName || '');
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateServiceRecord(plan.RecordID, {
        ...plan,
        FromTime: fromTime,
        ToTime: toTime,
        NumServices: numSvc,
        CustomerID: customerId,
        CustomerName: customerName,
      });
      showToast('Plan updated');
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
      await updateServiceRecord(plan.RecordID, { ...plan, Status: 'Cancelled' });
      showToast('Plan cancelled');
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
      isCancelled ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'
    }`}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
            isCancelled ? 'text-slate-400 bg-slate-100' : 'text-indigo-600 bg-indigo-50'
          }`}>
            {plan.RecordID}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
            isCancelled ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-700'
          }`}>
            Plan
          </span>
          {isCancelled && (
            <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded font-semibold">
              Cancelled
            </span>
          )}
        </div>
        {!isCancelled && (
          <button
            onClick={editMode ? () => setEditMode(false) : enterEdit}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 ${
              editMode
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            {editMode ? <><X size={11} />Discard</> : <><Pencil size={11} />Edit</>}
          </button>
        )}
      </div>

      {/* Details */}
      <div className={`space-y-1.5 mb-4 ${isCancelled ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Users size={13} className="text-slate-400 flex-shrink-0" />
          <span className="font-medium">{plan.CaregiverName || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User size={13} className="text-slate-400 flex-shrink-0" />
          {editMode ? (
            <select
              value={customerId}
              onChange={e => {
                const cust = customers.find(c => c.CustomerID === e.target.value);
                setCustomerId(e.target.value);
                setCustomerName(cust ? cust.Name : '');
              }}
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {customers.map(c => (
                <option key={c.CustomerID} value={c.CustomerID}>{c.Name}</option>
              ))}
            </select>
          ) : (
            <>
              <span>{plan.CustomerName || '—'}</span>
              <span className="text-xs text-slate-400 font-mono ml-auto">{plan.CustomerID}</span>
            </>
          )}
        </div>

        {editMode ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Clock size={13} className="text-slate-400 flex-shrink-0" />
            <input
              type="time"
              value={fromTime}
              onChange={e => setFromTime(e.target.value)}
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-slate-400 text-xs flex-shrink-0">–</span>
            <input
              type="time"
              value={toTime}
              onChange={e => setToTime(e.target.value)}
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              type="number"
              min="1"
              value={numSvc}
              onChange={e => setNumSvc(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 flex-shrink-0 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-xs text-slate-400 flex-shrink-0">svc</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock size={13} className="text-slate-400 flex-shrink-0" />
            <span>{fmtTime(plan.FromTime)} – {fmtTime(plan.ToTime)}</span>
            <span className="ml-auto text-xs text-slate-400">{plan.NumServices} svc</span>
          </div>
        )}
      </div>

      {/* Action row */}
      {editMode ? (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 py-2.5 rounded-lg transition-colors"
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
      ) : !isCancelled ? (
        <button
          onClick={() => onCopyToExecution(plan)}
          className="w-full text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          Copy to Execution →
        </button>
      ) : null}
    </div>
  );
}

export default function PlanningScreen({
  plans,
  selectedDate,
  caregivers,
  customers,
  onCustomerAdded,
  showToast,
  onDataChanged,
}) {
  const [showModal,  setShowModal]  = useState(false);
  const [copyTarget, setCopyTarget] = useState(null);

  const handleCopyToExecution = (plan) => {
    setCopyTarget(plan);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setCopyTarget(null);
  };

  // Active plans first (sorted by start time), cancelled plans at the bottom
  const sorted = [...plans].sort((a, b) => {
    const aCancelled = a.Status === 'Cancelled';
    const bCancelled = b.Status === 'Cancelled';
    if (aCancelled !== bCancelled) return aCancelled ? 1 : -1;
    return (a.FromTime || '').localeCompare(b.FromTime || '');
  });

  const activeCount = sorted.filter(p => p.Status !== 'Cancelled').length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList size={18} className="text-indigo-500" />
            Planning Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(selectedDate)}</p>
        </div>
        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
          {activeCount} {activeCount === 1 ? 'plan' : 'plans'}
        </span>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-slate-700">No plans for this day</p>
          <p className="text-xs text-slate-400 mt-1">Tap below to add the first one</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map(plan => (
          <PlanCard
            key={plan.RecordID}
            plan={plan}
            customers={customers}
            onCopyToExecution={handleCopyToExecution}
            showToast={showToast}
            onDataChanged={onDataChanged}
          />
        ))}
      </div>

      {/* Add new plan button */}
      <button
        onClick={() => { setCopyTarget(null); setShowModal(true); }}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl py-3.5 text-sm font-semibold transition-colors"
      >
        <Plus size={16} />
        Add New Plan
      </button>

      {showModal && (
        <ServiceEntryModal
          type={copyTarget ? 'Actual' : 'Plan'}
          basedOn={copyTarget}
          selectedDate={selectedDate}
          caregivers={caregivers}
          customers={customers}
          onCustomerAdded={onCustomerAdded}
          showToast={showToast}
          onClose={handleModalClose}
          onSaved={onDataChanged}
        />
      )}
    </div>
  );
}
