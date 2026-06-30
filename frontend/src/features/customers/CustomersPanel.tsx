import { FormEvent, useEffect, useMemo, useState } from 'react';
import { IndianRupee, MapPin, Plus, Search, UserRound, Users, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Panel } from '../../components/Panel';
import type { Customer } from '../../types/domain';
import { formatCurrency } from '../../utils/money';

export const CustomersPanel = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(true);

  const load = async () => { setBusy(true); try { setCustomers(await apiClient.customers()); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load customers'); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.phone ?? ''} ${customer.address ?? ''}`.toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const totalValue = customers.reduce((sum, customer) => sum + Number(customer.total_spending), 0);
  const topCustomer = [...customers].sort((a, b) => Number(b.total_spending) - Number(a.total_spending))[0];

  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { await apiClient.createCustomer({ name: form.name.trim(), phone: form.phone.trim() || null, address: form.address.trim() || null }); setForm({ name: '', phone: '', address: '' }); setShowForm(false); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create customer'); setBusy(false); }
  };

  return <div className="grid gap-5 pb-20 lg:pb-0">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase text-cyan-700">Relationship ledger</p><h1 className="mt-1 text-2xl font-black">Customers</h1><p className="mt-1 text-sm text-slate-500">Track contact details, lifetime value, and repeat purchase potential.</p></div><button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Add customer</button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="panel"><Users className="text-cyan-700" size={19} /><p className="mt-5 text-2xl font-black">{customers.length}</p><p className="text-xs font-bold uppercase text-slate-500">Total customers</p></div><div className="panel"><IndianRupee className="text-emerald-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(totalValue)}</p><p className="text-xs font-bold uppercase text-slate-500">Lifetime revenue</p></div><div className="panel"><UserRound className="text-amber-600" size={19} /><p className="mt-5 truncate text-lg font-black">{topCustomer?.name ?? 'No history'}</p><p className="text-xs font-bold uppercase text-slate-500">Top customer</p></div></div>
    {showForm ? <Panel title="New customer" subtitle="A customer can also be created automatically from a selling bill." action={<button className="icon-btn" onClick={() => setShowForm(false)} title="Close"><X size={17} /></button>}><form className="grid gap-4 md:grid-cols-3" onSubmit={create}><label><span className="field-label">Full name</span><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label><span className="field-label">Phone</span><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></label><label><span className="field-label">Address</span><input className="field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><div className="md:col-span-3"><button className="btn-primary" disabled={busy}>Create customer</button></div></form></Panel> : null}
    <Panel title="Customer directory" subtitle={`${filtered.length} records`} action={<div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className="field h-10 w-56 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers" /></div>}>
      {message ? <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}<div className="table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th className="text-right">Total spending</th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id}><td><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100 font-black text-slate-700">{customer.name.charAt(0).toUpperCase()}</span><span className="font-bold">{customer.name}</span></div></td><td className="text-slate-600">{customer.phone || 'Not provided'}</td><td><span className="flex max-w-xs items-center gap-1.5 truncate text-slate-500"><MapPin size={14} />{customer.address || 'Not provided'}</span></td><td className="text-right font-black tabular-nums">{formatCurrency(customer.total_spending)}</td></tr>)}</tbody></table>{!busy && filtered.length === 0 ? <p className="py-14 text-center text-sm text-slate-500">No matching customers.</p> : null}{busy ? <p className="py-14 text-center text-sm text-slate-500">Loading customer ledger...</p> : null}</div>
    </Panel>
  </div>;
};
