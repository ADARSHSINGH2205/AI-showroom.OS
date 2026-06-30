import type { LucideIcon } from 'lucide-react';

export const MetricCard = ({ label, value, detail, icon: Icon, tone = 'ink' }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: 'ink' | 'cyan' | 'emerald' | 'amber' | 'rose' }) => {
  const tones = {
    ink: 'border-slate-800 bg-[linear-gradient(135deg,#020617,#0f172a_58%,#164e63)] text-white shadow-slate-950/15',
    cyan: 'border-cyan-100 bg-[linear-gradient(135deg,#ecfeff,#ffffff_65%)] text-cyan-950 shadow-cyan-950/10',
    emerald: 'border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff_65%)] text-emerald-950 shadow-emerald-950/10',
    amber: 'border-amber-100 bg-[linear-gradient(135deg,#fffbeb,#ffffff_65%)] text-amber-950 shadow-amber-950/10',
    rose: 'border-rose-100 bg-[linear-gradient(135deg,#fff1f2,#ffffff_65%)] text-rose-950 shadow-rose-950/10',
  };
  return (
    <div className={`group relative min-h-36 overflow-hidden rounded-xl border p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] ${tones[tone]}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-slate-900 opacity-70" />
      <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-white/35 blur-2xl transition group-hover:scale-125" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase text-current opacity-65">{label}</p>
        <span className="grid size-9 place-items-center rounded-lg bg-white/45 ring-1 ring-current/10"><Icon size={18} strokeWidth={2} /></span>
      </div>
      <p className="mt-6 text-2xl font-black tracking-tight tabular-nums">{value}</p>
      {detail ? <p className="mt-2 text-xs font-medium opacity-65">{detail}</p> : null}
    </div>
  );
};
