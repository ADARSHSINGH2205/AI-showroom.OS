import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Banknote, CheckCircle2, IndianRupee, ReceiptText, RefreshCw, Search, Truck, WalletCards, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Panel } from '../../components/Panel';
import type { Purchase, Sale } from '../../types/domain';
import { formatCurrency } from '../../utils/money';
import { formatDate } from '../../utils/date';

type DueMode = 'customers' | 'suppliers';
type ActivePayment = { kind: DueMode; bill: Sale | Purchase } | null;

const dueAmount = (bill: Sale | Purchase) => Math.max(Number(bill.total) - Number(bill.payment_amount), 0);
const isPartial = (bill: Sale | Purchase) => Number(bill.payment_amount) > 0 && dueAmount(bill) > 0;

export const DueBillsPanel = ({ onChanged }: { onChanged: () => void }) => {
  const [mode, setMode] = useState<DueMode>('customers');
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial'>('all');
  const [activePayment, setActivePayment] = useState<ActivePayment>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [message, setMessage] = useState('Customer due bills and supplier unpaid bills appear here.');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const [dueSales, duePurchases] = await Promise.all([apiClient.dueSales(), apiClient.duePurchases()]);
      setSales(dueSales);
      setPurchases(duePurchases);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load due bills');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeBills = mode === 'customers' ? sales : purchases;
  const filtered = useMemo(() => activeBills.filter((bill) => {
    const name = mode === 'customers' ? (bill as Sale).customer_name : (bill as Purchase).supplier_name;
    const phone = mode === 'customers' ? (bill as Sale).customer_phone : (bill as Purchase).supplier_phone;
    const text = `${bill.invoice_number} ${name} ${phone ?? ''}`.toLowerCase();
    const matchesText = text.includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'partial' ? isPartial(bill) : Number(bill.payment_amount) <= 0);
    return matchesText && matchesStatus;
  }), [activeBills, mode, query, statusFilter]);

  const customerDue = sales.reduce((sum, sale) => sum + dueAmount(sale), 0);
  const supplierDue = purchases.reduce((sum, purchase) => sum + dueAmount(purchase), 0);
  const activeDue = activeBills.reduce((sum, bill) => sum + dueAmount(bill), 0);
  const activePartialCount = activeBills.filter(isPartial).length;

  const refreshAfterPayment = async (text: string) => {
    setMessage(text);
    setActivePayment(null);
    setPartialAmount('');
    await load();
    await onChanged();
  };

  const recordPayment = async (kind: DueMode, bill: Sale | Purchase, amount: number, full: boolean) => {
    const due = dueAmount(bill);
    if (amount <= 0 || due <= 0) return;
    setBusy(true);
    try {
      if (kind === 'customers') {
        await apiClient.recordSalePayment(bill.id, amount.toFixed(2));
      } else {
        await apiClient.recordPurchasePayment(bill.id, amount.toFixed(2));
      }
      await refreshAfterPayment(full ? `${bill.invoice_number} is fully paid and removed from this section.` : `${formatCurrency(amount)} recorded for ${bill.invoice_number}. Remaining due was updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not record payment');
    } finally {
      setBusy(false);
    }
  };

  const payFull = (kind: DueMode, bill: Sale | Purchase) => recordPayment(kind, bill, dueAmount(bill), true);

  const payPartial = async (event: FormEvent) => {
    event.preventDefault();
    if (!activePayment) return;
    const amount = Number(partialAmount);
    const due = dueAmount(activePayment.bill);
    if (amount <= 0 || amount >= due) {
      setMessage(`Enter a partial amount greater than 0 and less than ${formatCurrency(due)}.`);
      return;
    }
    await recordPayment(activePayment.kind, activePayment.bill, amount, false);
  };

  const activeTitle = mode === 'customers' ? 'Customers who did not pay you' : 'Suppliers you did not pay';
  const activeNameLabel = mode === 'customers' ? 'Customer' : 'Supplier';
  const activePhone = (bill: Sale | Purchase) => mode === 'customers' ? (bill as Sale).customer_phone : (bill as Purchase).supplier_phone;
  const activeName = (bill: Sale | Purchase) => mode === 'customers' ? (bill as Sale).customer_name : (bill as Purchase).supplier_name;

  return <div className="grid gap-5 pb-20 lg:pb-0">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="text-xs font-bold uppercase text-cyan-700">Bill overview</p><h1 className="mt-1 text-2xl font-black">Partial or Due Bills</h1><p className="mt-1 text-sm text-slate-500">Track money customers owe you and money you owe suppliers.</p></div>
      <button className="btn-secondary" onClick={load} disabled={busy}><RefreshCw size={16} /> Refresh</button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button className={`panel text-left transition ${mode === 'customers' ? 'ring-2 ring-cyan-200' : ''}`} onClick={() => setMode('customers')}><WalletCards className="text-rose-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(customerDue)}</p><p className="text-xs font-bold uppercase text-slate-500">Customers owe you</p></button>
      <button className={`panel text-left transition ${mode === 'suppliers' ? 'ring-2 ring-cyan-200' : ''}`} onClick={() => setMode('suppliers')}><Truck className="text-amber-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(supplierDue)}</p><p className="text-xs font-bold uppercase text-slate-500">You owe suppliers</p></button>
      <div className="panel"><ReceiptText className="text-cyan-700" size={19} /><p className="mt-5 text-2xl font-black">{activeBills.length}</p><p className="text-xs font-bold uppercase text-slate-500">Open {mode === 'customers' ? 'customer' : 'supplier'} bills</p></div>
      <div className="panel"><Banknote className="text-emerald-600" size={19} /><p className="mt-5 text-2xl font-black">{activePartialCount}</p><p className="text-xs font-bold uppercase text-slate-500">Partially paid</p></div>
    </div>

    <div className="grid grid-cols-2 rounded-md bg-slate-100 p-1 md:w-fit">
      <button className={`min-h-10 rounded px-4 text-sm font-bold ${mode === 'customers' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`} onClick={() => setMode('customers')}>Customers did not pay</button>
      <button className={`min-h-10 rounded px-4 text-sm font-bold ${mode === 'suppliers' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`} onClick={() => setMode('suppliers')}>I did not pay suppliers</button>
    </div>

    {activePayment ? <Panel title={`Partial payment: ${activePayment.bill.invoice_number}`} subtitle={`${activeName(activePayment.bill)} still has ${formatCurrency(dueAmount(activePayment.bill))} due.`} action={<button className="icon-btn" onClick={() => setActivePayment(null)} title="Close"><X size={16} /></button>}>
      <form className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end" onSubmit={payPartial}>
        <label><span className="field-label">Amount paid now</span><input className="field" type="number" min="0.01" max={dueAmount(activePayment.bill) - 0.01} step="0.01" value={partialAmount} onChange={(event) => setPartialAmount(event.target.value)} placeholder="Enter partial amount" required /></label>
        <button className="btn-primary" disabled={busy}><IndianRupee size={16} /> Record partial</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {[0.25, 0.5, 0.75].map((ratio) => <button key={ratio} className="btn-secondary min-h-9 px-3 text-xs" onClick={() => setPartialAmount((dueAmount(activePayment.bill) * ratio).toFixed(2))}>{Math.round(ratio * 100)}%</button>)}
      </div>
    </Panel> : null}

    <Panel title={activeTitle} subtitle={`${formatCurrency(activeDue)} pending in this section. ${message}`} action={<div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className="field h-10 w-56 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search invoice/${activeNameLabel.toLowerCase()}`} /></div><select className="field h-10 w-36" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All due</option><option value="unpaid">Unpaid only</option><option value="partial">Partial only</option></select></div>}>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Invoice</th><th>{activeNameLabel}</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Actions</th></tr></thead><tbody>{filtered.map((bill) => {
        const due = dueAmount(bill);
        const partial = isPartial(bill);
        return <tr key={`${mode}-${bill.id}`}><td><p className="font-bold">{bill.invoice_number}</p><p className="text-xs text-slate-500">{formatDate(bill.bill_date)}</p></td><td><p className="font-bold">{activeName(bill)}</p><p className="text-xs text-slate-500">{activePhone(bill) || 'No phone'}</p></td><td><span className={`status-pill ${partial ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{partial ? 'Partial' : 'Unpaid'}</span></td><td className="text-right font-bold tabular-nums">{formatCurrency(bill.total)}</td><td className="text-right tabular-nums">{formatCurrency(bill.payment_amount)}</td><td className="text-right font-black tabular-nums text-rose-700">{formatCurrency(due)}</td><td><div className="flex flex-wrap gap-2"><button className="btn-secondary min-h-9 px-3 text-xs" onClick={() => setActivePayment({ kind: mode, bill })} disabled={busy || due <= 0}><IndianRupee size={14} /> Partial</button><button className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50" onClick={() => payFull(mode, bill)} disabled={busy || due <= 0}><CheckCircle2 size={14} /> Paid full</button></div></td></tr>;
      })}</tbody></table>{!filtered.length ? <div className="grid min-h-44 place-items-center p-6 text-center"><div><CheckCircle2 className="mx-auto text-emerald-500" size={30} /><p className="mt-3 text-sm font-bold">No pending bills</p><p className="mt-1 text-xs text-slate-500">{mode === 'customers' ? 'Customer unpaid and partially paid selling bills will appear here.' : 'Supplier unpaid and partially paid buying bills will appear here.'}</p></div></div> : null}</div>
    </Panel>
  </div>;
};
