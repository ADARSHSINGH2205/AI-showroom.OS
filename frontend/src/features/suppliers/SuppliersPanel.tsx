import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, CalendarRange, IndianRupee, Phone, Plus, Search, ShieldAlert, Trash2, Truck, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Panel } from '../../components/Panel';
import type { Supplier } from '../../types/domain';
import { formatCurrency } from '../../utils/money';

export const SuppliersPanel = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleteMode, setDeleteMode] = useState<'range' | 'all'>('range');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const load = async () => { setBusy(true); try { setSuppliers(await apiClient.suppliers()); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load suppliers'); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => suppliers.filter((supplier) => `${supplier.name} ${supplier.phone ?? ''}`.toLowerCase().includes(query.toLowerCase())), [suppliers, query]);
  const outstanding = suppliers.reduce((sum, supplier) => sum + Number(supplier.outstanding_amount), 0);
  const create = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { await apiClient.createSupplier({ name: form.name.trim(), phone: form.phone.trim() || null, address: form.address.trim() || null }); setForm({ name: '', phone: '', address: '' }); setShowForm(false); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create supplier'); setBusy(false); } };
  const removeSupplier = async () => {
    if (!deleteTarget || confirmation !== 'DELETE') return;
    if (deleteMode === 'range' && (!dateFrom || !dateTo)) { setMessage('Select both from and to dates.'); return; }
    setBusy(true);
    try {
      const result = await apiClient.deleteSupplier(deleteTarget.id, deleteMode, dateFrom || undefined, dateTo || undefined);
      setMessage(`${result.message}. ${result.purchases_removed} purchase bill(s) removed.`);
      setDeleteTarget(null); setConfirmation(''); setDateFrom(''); setDateTo(''); setDeleteMode('range');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete supplier'); setBusy(false); }
  };

  return <div className="grid gap-5 pb-20 lg:pb-0">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase text-cyan-700">Purchase network</p><h1 className="mt-1 text-2xl font-black">Suppliers</h1><p className="mt-1 text-sm text-slate-500">Manage sourcing partners and outstanding purchase payments.</p></div><button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Add supplier</button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="panel"><Truck className="text-cyan-700" size={19} /><p className="mt-5 text-2xl font-black">{suppliers.length}</p><p className="text-xs font-bold uppercase text-slate-500">Active suppliers</p></div><div className="panel"><IndianRupee className="text-rose-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(outstanding)}</p><p className="text-xs font-bold uppercase text-slate-500">Outstanding dues</p></div><div className="panel"><AlertCircle className="text-amber-600" size={19} /><p className="mt-5 text-2xl font-black">{suppliers.filter((s) => Number(s.outstanding_amount) > 0).length}</p><p className="text-xs font-bold uppercase text-slate-500">Accounts payable</p></div></div>
    {showForm ? <Panel title="New supplier" action={<button className="icon-btn" onClick={() => setShowForm(false)} title="Close"><X size={17} /></button>}><form className="grid gap-4 md:grid-cols-3" onSubmit={create}><label><span className="field-label">Business name</span><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label><span className="field-label">Phone</span><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label><span className="field-label">Address</span><input className="field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><div className="md:col-span-3"><button className="btn-primary" disabled={busy}>Create supplier</button></div></form></Panel> : null}
    {deleteTarget ? <Panel title={`Strict delete: ${deleteTarget.name}`} subtitle="This changes purchase history, stock quantities, and supplier dues." action={<button className="icon-btn" onClick={() => setDeleteTarget(null)} title="Close"><X size={17} /></button>}>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <button className={`rounded-xl border p-4 text-left transition ${deleteMode === 'range' ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-100' : 'border-slate-200 bg-white hover:border-amber-200'}`} onClick={() => setDeleteMode('range')}><CalendarRange className="text-amber-700" size={19} /><span className="mt-3 block text-sm font-black">Remove a date range</span><span className="mt-1 block text-xs leading-5 text-slate-600">Deletes only this supplier's purchase bills between selected bill dates and reverses their stock.</span></button>
          <button className={`rounded-xl border p-4 text-left transition ${deleteMode === 'all' ? 'border-rose-400 bg-rose-50 ring-4 ring-rose-100' : 'border-slate-200 bg-white hover:border-rose-200'}`} onClick={() => setDeleteMode('all')}><ShieldAlert className="text-rose-700" size={19} /><span className="mt-3 block text-sm font-black">Remove everything</span><span className="mt-1 block text-xs leading-5 text-slate-600">Deletes the supplier, all linked purchase bills, purchase movements, dues, and supplier links from products.</span></button>
        </div>
        {deleteMode === 'range' ? <div className="grid gap-3 md:grid-cols-2"><label><span className="field-label">From bill date</span><input className="field" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label><span className="field-label">To bill date</span><input className="field" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label></div> : null}
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm font-black text-rose-900">Type DELETE to confirm</p><p className="mt-1 text-xs leading-5 text-rose-700">This action cannot be undone. Export reports first if you may need the history later.</p><input className="field mt-3 border-rose-200" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE" /></div>
        <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-black text-white shadow-lg shadow-rose-900/20 hover:bg-rose-600 disabled:opacity-40" disabled={busy || confirmation !== 'DELETE' || (deleteMode === 'range' && (!dateFrom || !dateTo))} onClick={removeSupplier}><Trash2 size={16} /> Delete selected data</button></div>
      </div>
    </Panel> : null}
    <Panel title="Supplier directory" subtitle={`${filtered.length} sourcing partners`} action={<div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className="field h-10 w-56 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search suppliers" /></div>}>
      {message ? <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}<div className="table-wrap"><table className="data-table"><thead><tr><th>Supplier</th><th>Phone</th><th>Address</th><th className="text-right">Outstanding</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((supplier) => <tr key={supplier.id}><td><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-cyan-50 text-cyan-700"><Building2 size={17} /></span><span className="font-bold">{supplier.name}</span></div></td><td><span className="flex gap-1.5 text-slate-600"><Phone size={14} />{supplier.phone || 'Not provided'}</span></td><td className="max-w-xs truncate text-slate-500">{supplier.address || 'Not provided'}</td><td className="text-right font-black tabular-nums">{formatCurrency(supplier.outstanding_amount)}</td><td><span className={`status-pill ${Number(supplier.outstanding_amount) ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{Number(supplier.outstanding_amount) ? 'Due' : 'Clear'}</span></td><td><button className="icon-btn text-rose-600" title="Delete supplier history" onClick={() => { setDeleteTarget(supplier); setDeleteMode('range'); setConfirmation(''); setDateFrom(''); setDateTo(''); }}><Trash2 size={15} /></button></td></tr>)}</tbody></table>{busy ? <p className="py-14 text-center text-sm text-slate-500">Loading suppliers...</p> : null}{!busy && !filtered.length ? <p className="py-14 text-center text-sm text-slate-500">No matching suppliers.</p> : null}</div>
    </Panel>
  </div>;
};
