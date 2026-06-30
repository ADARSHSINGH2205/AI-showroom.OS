import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, IndianRupee, PackageSearch, Printer, ReceiptText, TrendingUp } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Panel } from '../../components/Panel';
import type { DashboardSummary, Expense, Purchase, Sale } from '../../types/domain';
import { formatCurrency } from '../../utils/money';
import { formatDate } from '../../utils/date';

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ReportsPanel = ({ dashboard }: { dashboard: DashboardSummary | null }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tab, setTab] = useState<'sales' | 'purchases' | 'expenses'>('sales');
  const [message, setMessage] = useState('Loading reports...');
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [statementStart, setStatementStart] = useState(firstDay);
  const [statementEnd, setStatementEnd] = useState(today);

  useEffect(() => {
    Promise.all([apiClient.sales(), apiClient.purchases(), apiClient.expenses()])
      .then(([saleRows, purchaseRows, expenseRows]) => {
        setSales(saleRows);
        setPurchases(purchaseRows);
        setExpenses(expenseRows);
        setMessage('');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load reports'));
  }, []);

  const rows = useMemo(() => tab === 'sales' ? sales : tab === 'purchases' ? purchases : expenses, [tab, sales, purchases, expenses]);

  const exportStatement = async () => {
    if (!statementStart || !statementEnd) {
      setMessage('Choose statement start and end dates.');
      return;
    }
    await apiClient.download(`/reports/sales/statement.csv?start_date=${statementStart}&end_date=${statementEnd}`, `sales-statement-${statementStart}-to-${statementEnd}.csv`);
  };

  const exportCurrent = () => {
    if (tab === 'sales') downloadCsv('showroom-sales.csv', [['Invoice', 'Bill date', 'Customer', 'Phone', 'Subtotal', 'Tax', 'Total', 'Paid', 'Status', 'Profit'], ...sales.map((row) => [row.invoice_number, row.bill_date, row.customer_name, row.customer_phone ?? '', row.subtotal, row.tax, row.total, row.payment_amount, row.payment_status, row.profit_amount])]);
    if (tab === 'purchases') downloadCsv('showroom-purchases.csv', [['Invoice', 'Bill date', 'Supplier', 'Phone', 'Subtotal', 'Tax', 'Total', 'Paid'], ...purchases.map((row) => [row.invoice_number, row.bill_date, row.supplier_name, row.supplier_phone ?? '', row.subtotal, row.tax, row.total, row.payment_amount])]);
    if (tab === 'expenses') downloadCsv('showroom-expenses.csv', [['Date', 'Category', 'Amount', 'Note'], ...expenses.map((row) => [row.expense_date, row.category, row.amount, row.note ?? ''])]);
  };

  return <div className="grid gap-5 pb-20 lg:pb-0">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase text-cyan-700">Business intelligence</p><h1 className="mt-1 text-2xl font-black">Reports</h1><p className="mt-1 text-sm text-slate-500">Review financial activity and export clean records for accounting.</p></div><div className="flex gap-2"><button className="btn-secondary no-print" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button><button className="btn-primary no-print" onClick={exportCurrent}><Download size={16} /> Export CSV</button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="panel"><ReceiptText className="text-cyan-700" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(dashboard?.monthly_sales ?? 0)}</p><p className="text-xs font-bold uppercase text-slate-500">Monthly sales</p></div><div className="panel"><TrendingUp className="text-emerald-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(dashboard?.monthly_profit ?? 0)}</p><p className="text-xs font-bold uppercase text-slate-500">Net profit</p></div><div className="panel"><IndianRupee className="text-rose-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(dashboard?.monthly_expenses ?? 0)}</p><p className="text-xs font-bold uppercase text-slate-500">Expenses</p></div><div className="panel"><PackageSearch className="text-amber-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(dashboard?.blocked_inventory_value ?? 0)}</p><p className="text-xs font-bold uppercase text-slate-500">Inventory blocked</p></div></div>

    <Panel title="Sales statement" subtitle="Download a bank-statement style sales report between two dates." action={<button className="btn-primary no-print" onClick={exportStatement}><Download size={16} /> Download statement</button>}>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <label><span className="field-label">From date</span><input className="field" type="date" value={statementStart} onChange={(event) => setStatementStart(event.target.value)} /></label>
        <label><span className="field-label">To date</span><input className="field" type="date" value={statementEnd} onChange={(event) => setStatementEnd(event.target.value)} /></label>
        <div className="self-end text-xs leading-5 text-slate-500">Includes invoice, customer, subtotal, tax, total, paid, due, status, and profit totals.</div>
      </div>
    </Panel>

    <Panel title="Transaction register" subtitle={`${rows.length} records in selected report`} action={<div className="flex rounded-md bg-slate-100 p-1 no-print">{(['sales', 'purchases', 'expenses'] as const).map((item) => <button key={item} className={`rounded px-3 py-2 text-xs font-bold capitalize ${tab === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`} onClick={() => setTab(item)}>{item}</button>)}</div>}>
      {message ? <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{message}</p> : null}
      <div className="table-wrap"><table className="data-table"><thead>{tab === 'sales' ? <tr><th>Invoice</th><th>Date</th><th>Customer</th><th className="text-right">Total</th><th className="text-right">Profit</th><th>Status</th></tr> : tab === 'purchases' ? <tr><th>Invoice</th><th>Date</th><th>Supplier</th><th className="text-right">Total</th><th className="text-right">Paid</th><th>Status</th></tr> : <tr><th>Date</th><th>Category</th><th>Note</th><th className="text-right">Amount</th></tr>}</thead><tbody>{tab === 'sales' ? sales.map((row) => <tr key={row.id}><td className="font-bold">{row.invoice_number}</td><td>{formatDate(row.bill_date)}</td><td>{row.customer_name}</td><td className="text-right font-black">{formatCurrency(row.total)}</td><td className="text-right font-bold text-emerald-700">{formatCurrency(row.profit_amount)}</td><td><span className={`status-pill ${row.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row.payment_status}</span></td></tr>) : tab === 'purchases' ? purchases.map((row) => <tr key={row.id}><td className="font-bold">{row.invoice_number}</td><td>{formatDate(row.bill_date)}</td><td>{row.supplier_name}</td><td className="text-right font-black">{formatCurrency(row.total)}</td><td className="text-right">{formatCurrency(row.payment_amount)}</td><td><span className={`status-pill ${Number(row.payment_amount) >= Number(row.total) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{Number(row.payment_amount) >= Number(row.total) ? 'Paid' : 'Due'}</span></td></tr>) : expenses.map((row) => <tr key={row.id}><td className="font-bold">{formatDate(row.expense_date)}</td><td className="capitalize">{row.category}</td><td className="text-slate-500">{row.note || 'No note'}</td><td className="text-right font-black text-rose-700">{formatCurrency(row.amount)}</td></tr>)}</tbody></table>{!message && !rows.length ? <p className="py-16 text-center text-sm text-slate-500">No records in this report yet.</p> : null}</div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><FileSpreadsheet size={14} /> CSV files open directly in Microsoft Excel and Google Sheets.</div>
    </Panel>
  </div>;
};
