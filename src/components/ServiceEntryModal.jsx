import React, { useState } from 'react';
import { X, Plus, Minus, Clock, Calendar, Users, User } from 'lucide-react';
import { addCustomer, createServiceRecord } from '../lib/api.js';

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

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getNowHHMM = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};
const getNextSlot = () => {
  const n = new Date();
  const totalMins = n.getHours() * 60 + n.getMinutes() + 1;
  const slotMins = Math.ceil(totalMins / 30) * 30;
  const h = Math.floor(slotMins / 60) % 24;
  const m = slotMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

// type:    'Plan' | 'Actual'
// basedOn: plan record (Copy to Execution) | null (new / unplanned)
export default function ServiceEntryModal({
  type,
  basedOn,
  selectedDate,
  caregivers,
  customers,
  onCustomerAdded,
  showToast,
  onClose,
  onSaved,
}) {
  const isPlan     = type === 'Plan';
  const isCopy     = type === 'Actual' && !!basedOn;
  const isUnplanned = type === 'Actual' && !basedOn;

  const title = isPlan
    ? 'Add New Plan'
    : isCopy
    ? 'Copy Plan → Execution'
    : 'Add Unplanned Visit';

  const accentColor = isPlan ? 'indigo' : 'green';

  const [caregiverId, setCaregiverId] = useState(basedOn?.CaregiverID || '');
  const [custSearch,  setCustSearch]  = useState(basedOn?.CustomerName || '');
  const [selCust,     setSelCust]     = useState(
    basedOn ? { CustomerID: basedOn.CustomerID, Name: basedOn.CustomerName } : null
  );
  const [showDrop,    setShowDrop]    = useState(false);
  const [svcDate,     setSvcDate]     = useState(basedOn?.serviceDate || selectedDate);
  const [numSvc,      setNumSvc]      = useState(parseInt(basedOn?.NumServices) || 1);
  const [fromTime,    setFrom]        = useState(() => {
    if (basedOn?.FromTime) return basedOn.FromTime;
    if (isPlan) {
      const slot = getNextSlot();
      return TIME_OPTIONS.find(t => t.value >= slot)?.value || TIME_OPTIONS[0].value;
    }
    return '08:00';
  });
  const [toTime,      setTo]          = useState(() => {
    if (basedOn?.ToTime) return basedOn.ToTime;
    if (isPlan) {
      const slot = getNextSlot();
      const idx = TIME_OPTIONS.findIndex(t => t.value >= slot);
      return TIME_OPTIONS[Math.min(idx + 2, TIME_OPTIONS.length - 1)]?.value || '10:00';
    }
    return '10:00';
  });
  const [saving,      setSaving]      = useState(false);

  // For Plan type on today's date, only offer future time slots
  const isPlanOnToday = isPlan && svcDate === getTodayStr();
  const fromOptions = isPlanOnToday
    ? TIME_OPTIONS.filter(t => t.value >= getNowHHMM())
    : TIME_OPTIONS;

  const filtered = customers.filter(c =>
    (c.Name || '').toLowerCase().includes(custSearch.toLowerCase())
  );
  const showAddNew =
    custSearch.trim() &&
    !customers.find(c => (c.Name || '').toLowerCase() === custSearch.trim().toLowerCase());

  const selectCust = (c) => {
    setSelCust(c);
    setCustSearch(c.Name);
    setShowDrop(false);
  };

  const handleAddNew = async () => {
    try {
      const res = await addCustomer(custSearch.trim());
      const newC = { CustomerID: res.customerId, Name: res.name };
      onCustomerAdded(newC);
      selectCust(newC);
      showToast(`"${res.name}" added as ${res.customerId}`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (isPlan && newDate < getTodayStr()) {
      showToast('Cannot plan for a past date', 'error');
      setSvcDate(getTodayStr());
      return;
    }
    setSvcDate(newDate);
    // If switching to today, auto-advance fromTime/toTime if they've become past
    if (isPlan && newDate === getTodayStr()) {
      const now = getNowHHMM();
      if (fromTime < now) {
        const nextFrom = TIME_OPTIONS.find(t => t.value >= now)?.value;
        if (nextFrom) {
          setFrom(nextFrom);
          const idx = TIME_OPTIONS.findIndex(t => t.value === nextFrom);
          setTo(TIME_OPTIONS[Math.min(idx + 2, TIME_OPTIONS.length - 1)]?.value || toTime);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!caregiverId) return showToast('Select a caregiver', 'error');
    if (!selCust)     return showToast('Select or add a customer', 'error');
    if (!svcDate)     return showToast('Pick a date', 'error');
    if (isPlan) {
      const today = getTodayStr();
      if (svcDate < today) return showToast('Cannot save a plan for a past date', 'error');
      if (svcDate === today && fromTime < getNowHHMM()) {
        return showToast('Cannot save a plan with a past start time', 'error');
      }
    }

    setSaving(true);
    try {
      const cg = caregivers.find(c => c.CaregiverID === caregiverId);
      const result = await createServiceRecord({
        CaregiverID:   caregiverId,
        CaregiverName: cg?.Name || '',
        CustomerID:    selCust.CustomerID,
        CustomerName:  selCust.Name,
        serviceDate:   svcDate,
        NumServices:   numSvc,
        FromTime:      fromTime,
        ToTime:        toTime,
        type,
        parentPlanId:  basedOn?.RecordID || '',
      });
      showToast(`${isPlan ? 'Plan' : 'Execution'} saved — ${result.RecordID}`);
      onSaved();
      onClose();
    } catch (e) {
      showToast(e.message, 'error');
      setSaving(false);
    }
  };

  const btnBase = `w-full font-semibold py-3.5 rounded-xl transition-colors text-white`;
  const btnColor = isPlan
    ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'
    : 'bg-green-600 hover:bg-green-700 disabled:bg-green-300';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-base">{title}</h3>
            {isCopy && (
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                From plan {basedOn.RecordID} — modify as needed
              </p>
            )}
            {isUnplanned && (
              <p className="text-xs text-slate-400 mt-0.5">No prior plan — logging directly</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">

          {/* Caregiver */}
          <div>
            <label className={lbl}><Users size={11} className="inline mr-1" />Caregiver</label>
            <select value={caregiverId} onChange={e => setCaregiverId(e.target.value)} className={inp}>
              <option value="">Select caregiver…</option>
              {caregivers.map(c => (
                <option key={c.CaregiverID} value={c.CaregiverID}>
                  {c.Name} ({c.CaregiverID})
                </option>
              ))}
            </select>
          </div>

          {/* Customer — searchable */}
          <div>
            <label className={lbl}><User size={11} className="inline mr-1" />Customer / Client</label>
            <div className="relative">
              <input
                type="text"
                value={custSearch}
                placeholder="Search or add customer…"
                className={inp}
                onChange={e => { setCustSearch(e.target.value); setSelCust(null); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              />
              {showDrop && (custSearch || filtered.length > 0) && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filtered.map(c => (
                    <button key={c.CustomerID} onMouseDown={() => selectCust(c)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 flex justify-between">
                      <span>{c.Name}</span>
                      <span className="text-xs text-slate-400 font-mono">{c.CustomerID}</span>
                    </button>
                  ))}
                  {showAddNew && (
                    <button onMouseDown={handleAddNew}
                      className="w-full text-left px-3 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 font-semibold flex items-center gap-2 border-t border-slate-100">
                      <Plus size={13} />Add "{custSearch.trim()}" as new customer
                    </button>
                  )}
                  {!showAddNew && filtered.length === 0 && (
                    <div className="px-3 py-2.5 text-sm text-slate-400">No customers found</div>
                  )}
                </div>
              )}
            </div>
            {selCust && (
              <p className="text-xs text-green-600 mt-1 font-medium">✓ {selCust.CustomerID}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className={lbl}><Calendar size={11} className="inline mr-1" />Date of Service</label>
            <input
              type="date"
              value={svcDate}
              min={isPlan ? getTodayStr() : undefined}
              onChange={handleDateChange}
              className={inp}
            />
          </div>

          {/* Num Services */}
          <div>
            <label className={lbl}>Number of Services</label>
            <div className="flex items-center gap-5">
              <button onClick={() => setNumSvc(n => Math.max(1, n - 1))}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                <Minus size={15} />
              </button>
              <span className="text-3xl font-bold text-slate-800 w-10 text-center tabular-nums">{numSvc}</span>
              <button onClick={() => setNumSvc(n => n + 1)}
                className={`w-10 h-10 rounded-full ${isPlan ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700' : 'bg-green-100 hover:bg-green-200 text-green-700'} flex items-center justify-center`}>
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className={lbl}><Clock size={11} className="inline mr-1" />{isCopy ? 'Actual Hours Worked' : 'Service Hours'}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">From</p>
                <select value={fromTime} onChange={e => setFrom(e.target.value)} className={inp}>
                  {fromOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {isPlanOnToday && fromOptions.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No future slots available today</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">To</p>
                <select value={toTime} onChange={e => setTo(e.target.value)} className={inp}>
                  {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Context hint for copy flow */}
          {isCopy && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
              <strong>Tip:</strong> The fields above are pre-filled from the plan.
              Adjust anything that actually differed — any changes will be flagged
              as a discrepancy on the Execution Log.
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-4 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={handleSave} disabled={saving} className={`${btnBase} ${btnColor}`}>
            {saving
              ? 'Saving…'
              : isPlan
              ? 'Save Plan'
              : isCopy
              ? '✓ Confirm & Log Execution'
              : '✓ Log Unplanned Visit'}
          </button>
        </div>
      </div>
    </div>
  );
}
