import React, { useState } from 'react';
import { X, Plus, Minus, Clock, Calendar, Users, User } from 'lucide-react';
import { updateServiceRecord } from '../lib/api.js';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor((i * 30) / 60);
  const m = (i * 30) % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return {
    value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    label: `${h12}:${String(m).padStart(2, '0')} ${ampm}`,
  };
});

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

export default function ExecuteModal({ record, caregivers, customers, showToast, onClose, onExecuted }) {
  const [form, setForm] = useState({
    CaregiverID:   record.CaregiverID,
    CaregiverName: record.CaregiverName,
    CustomerID:    record.CustomerID,
    CustomerName:  record.CustomerName,
    serviceDate:   record.Date,
    NumServices:   parseInt(record.NumServices) || 1,
    FromTime:      record.FromTime || '08:00',
    ToTime:        record.ToTime   || '10:00',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await updateServiceRecord(record.RecordID, {
        ...form,
        Status:    'Executed',
        CreatedAt: record.CreatedAt,
        UpdatedAt: new Date().toISOString(),
      });
      onExecuted(record.RecordID);
    } catch (e) {
      showToast(e.message, 'error');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-800">Promote to Execution</h3>
            <p className="text-xs font-mono text-indigo-500 mt-0.5">{record.RecordID}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Caregiver */}
          <div>
            <label className={labelCls}>
              <Users size={13} className="inline mr-1 mb-0.5" />
              Caregiver
            </label>
            <select
              value={form.CaregiverID}
              onChange={e => {
                const cg = caregivers.find(c => c.CaregiverID === e.target.value);
                setForm(f => ({ ...f, CaregiverID: e.target.value, CaregiverName: cg?.Name || '' }));
              }}
              className={inputCls}
            >
              {caregivers.map(c => (
                <option key={c.CaregiverID} value={c.CaregiverID}>{c.Name} ({c.CaregiverID})</option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div>
            <label className={labelCls}>
              <User size={13} className="inline mr-1 mb-0.5" />
              Customer
            </label>
            <select
              value={form.CustomerID}
              onChange={e => {
                const cu = customers.find(c => c.CustomerID === e.target.value);
                setForm(f => ({ ...f, CustomerID: e.target.value, CustomerName: cu?.Name || '' }));
              }}
              className={inputCls}
            >
              {customers.map(c => (
                <option key={c.CustomerID} value={c.CustomerID}>{c.Name} ({c.CustomerID})</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>
              <Calendar size={13} className="inline mr-1 mb-0.5" />
              Date of Service
            </label>
            <input type="date" value={form.serviceDate} onChange={e => set('serviceDate', e.target.value)} className={inputCls} />
          </div>

          {/* Num Services */}
          <div>
            <label className={labelCls}>Number of Services</label>
            <div className="flex items-center gap-5">
              <button
                onClick={() => set('NumServices', Math.max(1, form.NumServices - 1))}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                <Minus size={15} />
              </button>
              <span className="text-3xl font-bold text-slate-800 w-10 text-center tabular-nums">
                {form.NumServices}
              </span>
              <button
                onClick={() => set('NumServices', form.NumServices + 1)}
                className="w-10 h-10 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className={labelCls}>
              <Clock size={13} className="inline mr-1 mb-0.5" />
              Actual Hours Worked
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">From</p>
                <select value={form.FromTime} onChange={e => set('FromTime', e.target.value)} className={inputCls}>
                  {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">To</p>
                <select value={form.ToTime} onChange={e => set('ToTime', e.target.value)} className={inputCls}>
                  {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Change summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <strong>Tip:</strong> Adjust any field above to reflect what actually happened — these values override the original plan.
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {saving ? 'Executing…' : '✓ Confirm & Execute'}
          </button>
        </div>
      </div>
    </div>
  );
}
