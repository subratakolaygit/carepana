const BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const fetchCaregivers = () => req('/caregivers');
export const fetchCustomers  = () => req('/customers');
export const addCustomer     = (name) => req('/customers', { method: 'POST', body: JSON.stringify({ name }) });

// { date?: 'YYYY-MM-DD', type?: 'Plan'|'Actual', status?: string }
export const fetchServiceRecords = ({ date, type, status } = {}) => {
  const p = new URLSearchParams();
  if (date)   p.set('date',   date);
  if (type)   p.set('type',   type);
  if (status) p.set('status', status);
  const qs = p.toString();
  return req(`/service-records${qs ? `?${qs}` : ''}`);
};

export const createServiceRecord = (data) =>
  req('/service-records', { method: 'POST', body: JSON.stringify(data) });

export const updateServiceRecord = (recordId, data) =>
  req(`/service-records/${recordId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteServiceRecord = (recordId) =>
  req(`/service-records/${recordId}`, { method: 'DELETE' });
