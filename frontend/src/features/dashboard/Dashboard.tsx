import { AlertTriangle, ArrowRight, Banknote, Boxes, Download, FileText, PackageSearch, ReceiptIndianRupee, ShoppingBag, TrendingUp } from 'lucide-react';
import { MetricCard } from '../../components/MetricCard';
import { Panel } from '../../components/Panel';
import type { AppView, DashboardSummary, TrendPoint } from '../../types/domain';
import { apiClient } from '../../api/client';
import { formatCurrency } from '../../utils/money';
import { formatDate } from '../../utils/date';

const SalesChart = ({ data }: { data: TrendPoint[] }) => {
  const width = 760;
  const height = 190;
  const values = data.map((point) => Number(point.sales));
  const max = Math.max(...values, 1);
  const points = data.map((point, index) => `${(index / Math.max(data.length - 1, 1)) * width},${height - (Number(point.sales) / max) * (height - 18)}`).join(' ');
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <div>
      <div className="h-56 w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Fourteen day sales trend">
          {[0.25, 0.5, 0.75, 1].map((line) => <line key={line} x1="0" y1={height * line} x2={width} y2={height * line} stroke="#e2e8f0" strokeWidth="1" />)}
          <polygon points={area} fill="#cffafe" opacity="0.75" />
          <polyline points={points} fill="none" stroke="#0891b2" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400"><span>{data[0]?.label}</span><span>{data[Math.floor(data.length / 2)]?.label}</span><span>{data[data.length - 1]?.label}</span></div>
    </div>
  );
};

const MonthlyDistribution = ({ data }: { data: Array<{ label: string; sales: string; profit: string; orders: number }> }) => {
  const maxSales = Math.max(...data.map((item) => Number(item.sales)), 1);
  return <div className="grid gap-3">{data.map((item) => <div key={item.label} className="grid gap-2"><div className="flex justify-between gap-3 text-sm"><span className="font-bold">{item.label}</span><span className="font-black tabular-nums">{formatCurrency(item.sales)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max((Number(item.sales) / maxSales) * 100, 3)}%` }} /></div><div className="flex justify-between text-xs text-slate-500"><span>{item.orders} bills</span><span>Profit {formatCurrency(item.profit)}</span></div></div>)}</div>;
};
export const Dashboard = ({ dashboard, onNavigate }: { dashboard: DashboardSummary | null; onNavigate: (view: AppView) => void }) => {
  if (!dashboard) return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><TrendingUp className="mx-auto animate-pulse text-cyan-600" size={30} /><p className="mt-3 text-sm font-bold text-slate-600">Loading live analytics...</p></div></div>;
  const maxCategory = Math.max(...dashboard.category_performance.map((item) => Number(item.revenue)), 1);
  return (
    <div className="grid gap-5 pb-20 lg:pb-0">
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(135deg,#020617,#0f172a_58%,#164e63)] p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.20),transparent_24rem),radial-gradient(circle_at_86%_18%,rgba(16,185,129,0.16),transparent_20rem)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px] opacity-60" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div><div className="mb-3 flex items-center gap-2"><span className={`size-2 rounded-full ${dashboard.business_health_summary === 'Healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} /><p className="text-xs font-bold uppercase text-slate-400">Business health: {dashboard.business_health_summary}</p></div><h1 className="text-2xl font-black md:text-3xl">Your showroom at a glance</h1><p className="mt-2 text-sm text-slate-400">{dashboard.total_stock_units} units across {dashboard.total_skus} products, serving {dashboard.total_customers} customers.</p></div>
        <div className="flex gap-2"><button className="btn-secondary border-slate-700 bg-slate-900 text-white hover:bg-slate-800" onClick={() => onNavigate('inventory')}><PackageSearch size={17} /> Stock</button><button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-cyan-400 px-4 text-sm font-black text-slate-950 hover:bg-cyan-300" onClick={() => onNavigate('billing')}><ReceiptIndianRupee size={17} /> New bill</button></div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's sales" value={formatCurrency(dashboard.today_sales)} detail={`${dashboard.sales_trend[dashboard.sales_trend.length - 1]?.orders ?? 0} orders today`} icon={ShoppingBag} tone="ink" />
        <MetricCard label="Monthly net profit" value={formatCurrency(dashboard.monthly_profit)} detail={`${dashboard.gross_margin_percentage}% gross margin`} icon={TrendingUp} tone="emerald" />
        <MetricCard label="Inventory value" value={formatCurrency(dashboard.blocked_inventory_value)} detail={`${dashboard.total_stock_units} units in store`} icon={Boxes} tone="cyan" />
        <MetricCard label="Pending payments" value={formatCurrency(dashboard.pending_payments)} detail={Number(dashboard.pending_payments) ? 'Collection action needed' : 'All customer dues clear'} icon={Banknote} tone={Number(dashboard.pending_payments) ? 'rose' : 'amber'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
        <Panel title="Sales momentum" subtitle="Daily billed revenue over the last 14 days" action={<span className="status-pill bg-cyan-50 text-cyan-700"><TrendingUp size={13} /> Live</span>}><SalesChart data={dashboard.sales_trend} /><div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-500">Monthly sales</p><p className="mt-1 font-black">{formatCurrency(dashboard.monthly_sales)}</p></div><div className="pl-4"><p className="text-xs text-slate-500">Avg. bill</p><p className="mt-1 font-black">{formatCurrency(dashboard.average_order_value)}</p></div><div className="pl-4"><p className="text-xs text-slate-500">Expenses</p><p className="mt-1 font-black">{formatCurrency(dashboard.monthly_expenses)}</p></div></div></Panel>
        <Panel title="Stock attention" subtitle="Products at or below minimum level" action={<span className="status-pill bg-amber-50 text-amber-700"><AlertTriangle size={13} /> {dashboard.low_stock}</span>}>
          <div className="grid gap-1">{dashboard.stock_risk.length ? dashboard.stock_risk.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"><span className="grid size-9 place-items-center rounded-md bg-amber-50 text-sm font-black text-amber-800">{item.current_stock}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-slate-500">Min {item.minimum_stock} � reorder {item.reorder_quantity}</p></div></div>) : <div className="py-12 text-center"><Boxes className="mx-auto text-emerald-500" /><p className="mt-3 text-sm font-bold">Stock levels look good</p></div>}</div>
          <button className="mt-3 flex items-center gap-2 text-sm font-bold text-cyan-700" onClick={() => onNavigate('inventory')}>Review inventory <ArrowRight size={15} /></button>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Monthly distribution" subtitle="Sales, profit, and bill count over the last 6 months"><MonthlyDistribution data={dashboard.monthly_distribution} /></Panel>
        <Panel title="Top selling products" subtitle="Fast moving products by billed quantity"><div className="grid gap-3">{dashboard.top_selling_products.length ? dashboard.top_selling_products.map((item) => <div key={item.name} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"><span className="font-bold">{item.name}</span><span className="status-pill bg-cyan-50 text-cyan-700">{item.sold_quantity} sold</span></div>) : <p className="py-12 text-center text-sm text-slate-500">Top selling products will appear after sales.</p>}</div></Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Category performance" subtitle="Revenue contribution by showroom category">
          <div className="grid gap-4">{dashboard.category_performance.length ? dashboard.category_performance.map((item) => <div key={item.category}><div className="mb-2 flex justify-between gap-4 text-sm"><span className="font-bold">{item.category}</span><span className="font-black tabular-nums">{formatCurrency(item.revenue)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${Math.max((Number(item.revenue) / maxCategory) * 100, 3)}%` }} /></div><p className="mt-1 text-xs text-slate-500">{item.units} units sold</p></div>) : <p className="py-12 text-center text-sm text-slate-500">Category analytics will appear after the first sale.</p>}</div>
        </Panel>
        <Panel title="Recent sales" subtitle="Latest invoices with downloadable bills">
          <div className="table-wrap border-0"><table className="data-table"><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th className="text-right">Total</th><th>Status</th><th>Bill</th></tr></thead><tbody>{dashboard.recent_sales.map((sale) => <tr key={sale.invoice_number}><td className="font-bold">{sale.invoice_number}</td><td className="whitespace-nowrap text-slate-600">{formatDate(sale.bill_date)}</td><td className="max-w-40 truncate text-slate-600">{sale.customer_name}</td><td className="text-right font-black tabular-nums">{formatCurrency(sale.total)}</td><td><span className={`status-pill ${sale.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{sale.payment_status}</span></td><td><div className="flex gap-1"><button className="icon-btn size-9" title="Download PDF invoice" onClick={() => apiClient.download(`/reports/sales/${sale.id}/invoice.pdf`, `invoice-${sale.invoice_number}.pdf`)}><FileText size={14} /></button><button className="icon-btn size-9" title="Download CSV invoice" onClick={() => apiClient.download(`/reports/sales/${sale.id}/invoice.csv`, `invoice-${sale.invoice_number}.csv`)}><Download size={14} /></button></div></td></tr>)}</tbody></table>{dashboard.recent_sales.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No sales recorded yet.</p> : null}</div>
        </Panel>
      </div>
    </div>
  );
};




