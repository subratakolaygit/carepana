import React, { useState } from 'react';
import { Plus, Clock, User, Users, Calendar, ClipboardList } from 'lucide-react';
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

function PlanCard({ plan, onCopyToExecution }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      {/* Top row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {plan.RecordID}
        </span>
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-semibold">
          Plan
        </span>
      </div>

      {/* Details grid */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Users size={13} className="text-slate-400 flex-shrink-0" />
          <span className="font-medium">{plan.CaregiverName || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User size={13} className="text-slate-400 flex-shrink-0" />
          <span>{plan.CustomerName || '—'}</span>
          <span className="text-xs text-slate-400 font-mono ml-auto">{plan.CustomerID}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={13} className="text-slate-400 flex-shrink-0" />
          <span>{fmtTime(plan.FromTime)} – {fmtTime(plan.ToTime)}</span>
          <span className="ml-auto text-xs text-slate-400">{plan.NumServices} svc</span>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => onCopyToExecution(plan)}
        className="w-full text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
      >
        Copy to Execution →
      </button>
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
  const [copyTarget, setCopyTarget] = useState(null); // plan to copy → execution

  const handleCopyToExecution = (plan) => {
    setCopyTarget(plan);
    setShowModal(true);
  };

  const handleAddPlan = () => {
    setCopyTarget(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setCopyTarget(null);
  };

  // Sort plans by start time
  const sorted = [...plans].sort((a, b) => (a.FromTime || '').localeCompare(b.FromTime || ''));

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
          {sorted.length} {sorted.length === 1 ? 'plan' : 'plans'}
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

      {/* Plan cards — they stay permanently as the historical record */}
      <div className="space-y-3">
        {sorted.map(plan => (
          <PlanCard
            key={plan.RecordID}
            plan={plan}
            onCopyToExecution={handleCopyToExecution}
          />
        ))}
      </div>

      {/* Add new plan button */}
      <button
        onClick={handleAddPlan}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl py-3.5 text-sm font-semibold transition-colors"
      >
        <Plus size={16} />
        Add New Plan
      </button>

      {/* Entry modal — handles both new plans and copy-to-execution */}
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
