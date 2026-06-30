import { FormEvent, useState } from 'react';
import { ArrowRight, BarChart3, Eye, EyeOff, LockKeyhole, PackageCheck, ScanLine, ShieldCheck, Sparkles, TrendingUp, WalletCards } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { User } from '../../types/domain';

export const LoginPanel = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('Use your authorized owner account.');
  const [busy, setBusy] = useState(false);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('Verifying secure access...');
    try {
      const response = await apiClient.login(username.trim(), password);
      apiClient.setToken(response.access_token);
      onLogin(response.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen overflow-hidden bg-slate-100 lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]">
      <section className="relative hidden overflow-hidden bg-[#061018] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:46px_46px] opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(20,184,166,0.24),transparent_30rem),radial-gradient(circle_at_86%_20%,rgba(6,182,212,0.18),transparent_28rem),linear-gradient(135deg,rgba(2,6,23,0.15),rgba(15,23,42,0.82))]" />
        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-[repeating-linear-gradient(120deg,rgba(34,211,238,0.10)_0_1px,transparent_1px_18px)] opacity-80" />

        <div className="relative z-10 flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <span className="grid size-12 place-items-center rounded-xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30"><BarChart3 size={24} /></span>
          <div><p className="text-lg font-black">AI Showroom OS</p><p className="text-xs font-semibold text-cyan-100/70">Owner Operations Console</p></div>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase text-cyan-200">
            <Sparkles size={14} /> Built for showroom decisions
          </div>
          <h1 className="max-w-[12ch] text-5xl font-black leading-[1.02] text-white xl:text-6xl">Know what sold. Know what to buy next.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">Live sales, profit, stock risk, customer value, supplier dues, expenses, and Gemini bill intelligence in one private workspace.</p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[{ icon: ScanLine, label: 'AI bill scan' }, { icon: PackageCheck, label: 'Stock control' }, { icon: Sparkles, label: 'Business AI' }].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/8 p-4 shadow-xl shadow-black/10 backdrop-blur">
                <Icon size={18} className="mb-4 text-cyan-300" />
                <p className="text-sm font-bold text-white">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur">
              <TrendingUp className="mb-5 text-emerald-300" size={20} />
              <p className="text-2xl font-black">Live</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">profit and stock intelligence</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur">
              <WalletCards className="mb-5 text-cyan-300" size={20} />
              <p className="text-2xl font-black">Private</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">owner-only access control</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 flex items-center gap-2 text-xs font-semibold text-slate-400"><ShieldCheck size={15} /> Private system. No public account creation.</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f8fafc,#edf7f7_45%,#f8fafc)] px-5 py-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:54px_54px]" />
        <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16),0_2px_10px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-cyan-600 via-emerald-500 to-slate-950" />
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-12 place-items-center rounded-xl bg-slate-950 text-cyan-300 shadow-lg"><BarChart3 size={23} /></span>
            <div><p className="font-black text-slate-950">AI Showroom OS</p><p className="text-xs font-semibold text-slate-500">Owner Operations Console</p></div>
          </div>
          <div className="mb-8">
            <span className="mb-5 grid size-13 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-950 shadow-sm"><LockKeyhole size={22} /></span>
            <h2 className="text-3xl font-black leading-tight text-slate-950">Sign in to your showroom</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Authorized owner and staff accounts only. Public signup is intentionally disabled.</p>
          </div>
          <form className="grid gap-5" onSubmit={login}>
            <label><span className="field-label">Username</span><input className="field min-h-12 border-slate-300 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter owner username" required /></label>
            <label><span className="field-label">Password</span><span className="relative block"><input className="field min-h-12 border-slate-300 bg-white/95 pr-12 shadow-[0_8px_24px_rgba(15,23,42,0.04)] focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Enter password" required /><button type="button" className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" onClick={() => setShowPassword((value) => !value)} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
            <button className="mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-slate-950 via-cyan-950 to-cyan-700 px-4 py-2 text-sm font-black text-white shadow-[0_16px_34px_rgba(8,47,73,0.25)] transition hover:from-slate-900 hover:via-cyan-900 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:opacity-50" disabled={busy}>{busy ? 'Signing in...' : 'Sign in securely'}<ArrowRight size={17} /></button>
            <p className={`min-h-5 rounded-lg border px-3 py-2 text-sm font-semibold ${message.toLowerCase().includes('incorrect') || message.toLowerCase().includes('failed') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{message}</p>
          </form>
        </div>
      </section>
    </main>
  );
};
