import type { ReactNode } from 'react';

export const Panel = ({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`panel ${className}`}>
    <div className="mb-5 flex min-w-0 items-start justify-between gap-4 border-b border-slate-100 pb-4">
      <div className="min-w-0">
        <h2 className="text-base font-black tracking-tight text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </section>
);
