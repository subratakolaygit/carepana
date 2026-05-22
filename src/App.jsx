import React, { useState, useEffect, useCallback } from 'react';
import { fetchCaregivers, fetchCustomers, fetchServiceRecords } from './lib/api.js';
import BottomNav from './components/BottomNav.jsx';
import DateBar from './components/DateBar.jsx';
import PlanningScreen from './components/PlanningScreen.jsx';
import ExecutionScreen from './components/ExecutionScreen.jsx';
import ReportingScreen from './components/ReportingScreen.jsx';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function App() {
  const [screen,       setScreen]       = useState('planning');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [caregivers,   setCaregivers]   = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [plans,        setPlans]        = useState([]);
  const [actuals,      setActuals]      = useState([]);
  const [initLoading,  setInitLoading]  = useState(true);
  const [dayLoading,   setDayLoading]   = useState(false);
  const [toast,        setToast]        = useState(null);

  // Load static master data once
  useEffect(() => {
    Promise.all([fetchCaregivers(), fetchCustomers()])
      .then(([cgs, custs]) => { setCaregivers(cgs); setCustomers(custs); })
      .catch(() => showToast('Failed to load master data — check credentials', 'error'))
      .finally(() => setInitLoading(false));
  }, []);

  // Reload Plan + Actual rows whenever the selected date changes
  const refreshDayData = useCallback(() => {
    setDayLoading(true);
    Promise.all([
      fetchServiceRecords({ date: selectedDate, type: 'Plan' }),
      fetchServiceRecords({ date: selectedDate, type: 'Actual' }),
    ])
      .then(([p, a]) => { setPlans(p); setActuals(a); })
      .catch(() => showToast('Failed to load records for this date', 'error'))
      .finally(() => setDayLoading(false));
  }, [selectedDate]);

  useEffect(() => { refreshDayData(); }, [refreshDayData]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCustomerAdded = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer]);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const commonProps = {
    selectedDate,
    caregivers,
    customers,
    onCustomerAdded: handleCustomerAdded,
    showToast,
    onDataChanged: refreshDayData,
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* App header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span className="text-xl">🏥</span>
          <span className="text-base font-bold text-slate-800 tracking-tight">CarePana</span>
          {initLoading && (
            <span className="ml-auto flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin inline-block" />
              Loading…
            </span>
          )}
        </div>
      </header>

      {/* Prominent date navigator — hidden on Reports (has its own filter) */}
      {screen !== 'reporting' && (
        <DateBar
          selectedDate={selectedDate}
          onChange={handleDateChange}
          loading={dayLoading}
        />
      )}

      {/* Main content */}
      <main className="max-w-lg mx-auto pb-24 pt-3 px-4">
        {screen === 'planning' && (
          <PlanningScreen plans={plans} {...commonProps} />
        )}
        {screen === 'execution' && (
          <ExecutionScreen actuals={actuals} plans={plans} {...commonProps} />
        )}
        {screen === 'reporting' && (
          <ReportingScreen showToast={showToast} />
        )}
      </main>

      <BottomNav screen={screen} setScreen={setScreen} />

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full shadow-lg text-white text-sm font-medium pointer-events-none max-w-xs text-center ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
