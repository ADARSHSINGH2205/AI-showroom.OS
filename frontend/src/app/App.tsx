import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Bot, ChevronDown, CircleDollarSign, FileBarChart, LayoutDashboard, LogOut, Menu, Package, ReceiptText, Search, ShoppingCart, Store, Truck, Users, WalletCards, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { LoginPanel } from '../features/auth/LoginPanel';
import { AssistantPanel } from '../features/ai/AssistantPanel';
import { BillDesk } from '../features/billing/BillDesk';
import { CustomersPanel } from '../features/customers/CustomersPanel';
import { Dashboard } from '../features/dashboard/Dashboard';
import { DueBillsPanel } from '../features/dues/DueBillsPanel';
import { ExpensesPanel } from '../features/expenses/ExpensesPanel';
import { InventoryTable } from '../features/inventory/InventoryTable';
import { ReportsPanel } from '../features/reports/ReportsPanel';
import { SuppliersPanel } from '../features/suppliers/SuppliersPanel';
import type { AppView, DashboardSummary, Product, User } from '../types/domain';

const navItems = [
  { id: 'dashboard' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'billing' as const, label: 'Bill Desk', icon: ReceiptText },
  { id: 'dues' as const, label: 'Partial/Due Bills', icon: CircleDollarSign },
  { id: 'inventory' as const, label: 'Products & Stock', icon: Package },
  { id: 'customers' as const, label: 'Customers', icon: Users },
  { id: 'suppliers' as const, label: 'Suppliers', icon: Truck },
  { id: 'expenses' as const, label: 'Expenses', icon: WalletCards },
  { id: 'reports' as const, label: 'Reports', icon: FileBarChart },
  { id: 'assistant' as const, label: 'AI Copilot', icon: Bot },
];

export const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(apiClient.hasToken());
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [status, setStatus] = useState('Connecting to live business data...');
  const [menuOpen, setMenuOpen] = useState(false);
  const [command, setCommand] = useState('');

  const loadCoreData = useCallback(async () => {
    try {
      const [dashboardData, productData] = await Promise.all([apiClient.dashboard(), apiClient.products()]);
      setDashboard(dashboardData);
      setProducts(productData);
      setStatus('Live database connected');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Could not load business data';
      setStatus(text);
      if (text.toLowerCase().includes('not authenticated') || text.toLowerCase().includes('could not validate credentials')) {
        apiClient.clearToken();
        setUser(null);
        setDashboard(null);
        setProducts([]);
      }
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setDashboard(null);
      setProducts([]);
      setActiveView('dashboard');
      setStatus('Login session expired. Sign in again.');
    };
    window.addEventListener('showroom-auth-expired', handleAuthExpired);
    if (!apiClient.hasToken()) { setRestoring(false); return () => window.removeEventListener('showroom-auth-expired', handleAuthExpired); }
    apiClient.me()
      .then((currentUser) => { setUser(currentUser); return loadCoreData(); })
      .catch(() => { apiClient.clearToken(); handleAuthExpired(); })
      .finally(() => setRestoring(false));
    return () => window.removeEventListener('showroom-auth-expired', handleAuthExpired);
  }, [loadCoreData]);

  const handleLogin = (loggedInUser: User) => { setUser(loggedInUser); loadCoreData(); };
  const navigate = (view: AppView) => { setActiveView(view); setMenuOpen(false); };
  const logout = () => { apiClient.clearToken(); setUser(null); setDashboard(null); setProducts([]); setActiveView('dashboard'); };
  const activeLabel = navItems.find((item) => item.id === activeView)?.label ?? 'Overview';

  const commandMatches = useMemo(() => command ? navItems.filter((item) => item.label.toLowerCase().includes(command.toLowerCase())) : [], [command]);
  const runCommand = () => { if (commandMatches[0]) { navigate(commandMatches[0].id); setCommand(''); } };

  if (restoring) return <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_0%,#164e63,#020617_55%)] text-white"><div className="text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur"><BarChart3 className="animate-pulse text-cyan-300" size={34} /></span><p className="mt-4 text-sm font-bold">Restoring secure session...</p></div></div>;
  if (!user) return <LoginPanel onLogin={handleLogin} />;

  const content = {
    dashboard: <Dashboard dashboard={dashboard} onNavigate={navigate} />,
    billing: <BillDesk products={products} onSaved={loadCoreData} />,
    dues: <DueBillsPanel onChanged={loadCoreData} />,
    inventory: <InventoryTable products={products} onChanged={loadCoreData} />,
    customers: <CustomersPanel />,
    suppliers: <SuppliersPanel />,
    expenses: <ExpensesPanel onChanged={loadCoreData} />,
    reports: <ReportsPanel dashboard={dashboard} />,
    assistant: <AssistantPanel />,
  }[activeView];

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#eef7f8_42%,#f8fafc)] lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden bg-[#061018] px-3 py-4 text-white shadow-2xl shadow-slate-950/30 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(20,184,166,0.22),transparent_18rem),radial-gradient(circle_at_95%_28%,rgba(6,182,212,0.14),transparent_16rem)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] opacity-60" />
        <div className="relative flex items-center justify-between gap-3 px-2 py-2">
          <button className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-2 pr-4 text-left shadow-xl shadow-black/10 backdrop-blur transition hover:bg-white/12" onClick={() => navigate('dashboard')}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20"><Store size={22} /></span><span className="min-w-0"><span className="block truncate text-sm font-black">AI Showroom OS</span><span className="block text-xs font-semibold text-cyan-100/65">Owner Console</span></span></button>
          <button className="grid size-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMenuOpen(false)} title="Close menu"><X size={19} /></button>
        </div>
        <nav className="relative mt-7 grid gap-1.5">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${activeView === id ? 'bg-white text-slate-950 shadow-lg shadow-black/20' : 'text-slate-400 hover:bg-white/8 hover:text-white'}`}><span className={`grid size-8 place-items-center rounded-lg transition ${activeView === id ? 'bg-slate-950 text-cyan-300' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-cyan-200'}`}><Icon size={17} /></span><span>{label}</span>{id === 'assistant' ? <span className="ml-auto size-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" /> : null}</button>)}
        </nav>
        <div className="relative mt-auto rounded-2xl border border-white/10 bg-white/8 p-4 shadow-2xl shadow-black/10 backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300"><span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" /> System online</div>
          <p className="mt-2 truncate text-xs font-semibold text-slate-400">{status}</p>
        </div>
      </aside>
      {menuOpen ? <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation" /> : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-white/70 bg-white/82 px-4 shadow-[0_1px_0_rgba(255,255,255,0.9),0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl md:px-6">
          <button className="icon-btn lg:hidden" onClick={() => setMenuOpen(true)} title="Open menu"><Menu size={19} /></button>
          <div className="min-w-0"><p className="truncate text-sm font-black tracking-tight text-slate-950">{activeLabel}</p><p className="hidden text-xs font-medium text-slate-500 sm:block">Furniture & electronics operations</p></div>
          <div className="relative ml-auto hidden w-full max-w-xs md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input className="field h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 shadow-none focus:bg-white" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') runCommand(); }} placeholder="Jump to a module..." />
            {commandMatches.length ? <button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-700" onClick={runCommand}>Open</button> : null}
          </div>
          <div className="hidden h-7 w-px bg-slate-200 sm:block" />
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50" title="Account menu"><span className="grid size-8 place-items-center rounded-lg bg-slate-950 text-xs font-black text-white">{user.username.slice(0, 2).toUpperCase()}</span><span className="hidden sm:block"><span className="block text-xs font-bold">{user.username}</span><span className="block text-[11px] capitalize text-slate-500">{user.role}</span></span><ChevronDown className="hidden text-slate-400 sm:block" size={14} /></button>
          <button className="icon-btn" onClick={logout} title="Sign out"><LogOut size={17} /></button>
        </header>
        <main className="mx-auto max-w-[1540px] p-4 md:p-6">{content}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-slate-200 bg-white/92 p-2 shadow-[0_-12px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:hidden">
          {navItems.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={`grid min-w-20 flex-1 place-items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition ${activeView === id ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20' : 'text-slate-500 hover:bg-slate-100'}`}><Icon size={17} /><span>{label}</span></button>)}
        </nav>
      </div>
    </div>
  );
};

