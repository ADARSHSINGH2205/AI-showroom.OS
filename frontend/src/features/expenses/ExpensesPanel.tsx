import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleDollarSign, Plus, Receipt, Search, Tags, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Panel } from '../../components/Panel';
import type { Expense, ExpenseCategory } from '../../types/domain';
import { formatCurrency } from '../../utils/money';

const categories: ExpenseCategory[] = ['rent', 'electricity', 'salary', 'transport', 'miscellaneous'];
const today = new Date().toISOString().slice(0, 10);

export const ExpensesPanel = ({ onChanged }: { onChanged: () => void }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'miscellaneous' as ExpenseCategory, amount: '', expense_date: today, note: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(true);
  const load = async () => { setBusy(true); try { setExpenses(await apiClient.expenses()); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load expenses'); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => expenses.filter((expense) => `${expense.category} ${expense.note ?? ''} ${expense.expense_date}`.toLowerCase().includes(query.toLowerCase())), [expenses, query]);
  const currentMonth = today.slice(0, 7);
  const monthlyTotal = expenses.filter((expense) => expense.expense_date.startsWith(currentMonth)).reduce((sum, expense) => sum + Number(expense.amount), 0);
  const todayTotal = expenses.filter((expense) => expense.expense_date === today).reduce((sum, expense) => sum + Number(expense.amount), 0);
  const create = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { await apiClient.createExpense({ ...form, amount: form.amount }); setForm({ category: 'miscellaneous', amount: '', expense_date: today, note: '' }); setShowForm(false); await load(); onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save expense'); setBusy(false); } };

  return <div className="grid gap-5 pb-20 lg:pb-0">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase text-cyan-700">Profit control</p><h1 className="mt-1 text-2xl font-black">Expenses</h1><p className="mt-1 text-sm text-slate-500">Every recorded expense is deducted from dashboard net profit.</p></div><button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Record expense</button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="panel"><CircleDollarSign className="text-rose-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(monthlyTotal)}</p><p className="text-xs font-bold uppercase text-slate-500">This month</p></div><div className="panel"><CalendarDays className="text-amber-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(todayTotal)}</p><p className="text-xs font-bold uppercase text-slate-500">Today</p></div><div className="panel"><Receipt className="text-cyan-700" size={19} /><p className="mt-5 text-2xl font-black">{expenses.length}</p><p className="text-xs font-bold uppercase text-slate-500">Entries</p></div></div>
    {showForm ? <Panel title="Record expense" subtitle="Use the actual payment date for accurate profit reports." action={<button className="icon-btn" onClick={() => setShowForm(false)} title="Close"><X size={17} /></button>}><form className="grid gap-4 md:grid-cols-4" onSubmit={create}><label><span className="field-label">Category</span><select className="field capitalize" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label><span className="field-label">Amount</span><input className="field" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label><label><span className="field-label">Date</span><input className="field" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required /></label><label><span className="field-label">Note</span><input className="field" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional reference" /></label><div className="md:col-span-4"><button className="btn-primary" disabled={busy}>Save expense</button></div></form></Panel> : null}
    <Panel title="Expense ledger" subtitle={`${filtered.length} recorded payments`} action={<div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className="field h-10 w-56 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search expenses" /></div>}>
      {message ? <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}<div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Category</th><th>Note</th><th className="text-right">Amount</th></tr></thead><tbody>{filtered.map((expense) => <tr key={expense.id}><td className="font-bold">{new Date(`${expense.expense_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><span className="status-pill bg-slate-100 capitalize text-slate-700"><Tags size={12} />{expense.category}</span></td><td className="text-slate-500">{expense.note || 'No note'}</td><td className="text-right font-black tabular-nums text-rose-700">{formatCurrency(expense.amount)}</td></tr>)}</tbody></table>{busy ? <p className="py-14 text-center text-sm text-slate-500">Loading expenses...</p> : null}{!busy && !filtered.length ? <p className="py-14 text-center text-sm text-slate-500">No matching expenses.</p> : null}</div>
    </Panel>
  </div>;
};
