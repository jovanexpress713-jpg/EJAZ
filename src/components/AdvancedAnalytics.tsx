import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Activity, WalletCards, CalendarDays } from 'lucide-react';
import { CollectionRecord, ExpenseRecord, Trip } from '../types';

interface Props {
  trips: Trip[];
  collections: CollectionRecord[];
  expenses: ExpenseRecord[];
}

const money = (n: number) => Math.round(n).toLocaleString('ar-SA');

const toDateKey = (value: string | undefined) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
};

export const AdvancedAnalytics: React.FC<Props> = ({ trips, collections, expenses }) => {
  const [range, setRange] = useState<7 | 30>(7);

  const series = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = Array.from({ length: range }, (_, index) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (range - 1 - index));
      return { key: d.toISOString().slice(0, 10), label: `${d.getDate()}/${d.getMonth() + 1}`, revenue: 0, expense: 0, trips: 0 };
    });
    const map = new Map(rows.map(r => [r.key, r]));
    trips.forEach(t => {
      const key = toDateKey(t.date);
      const row = map.get(key);
      if (row) { row.revenue += Number(t.totalAmount || 0); row.trips += 1; }
    });
    collections.forEach(c => {
      const key = toDateKey(c.date);
      const row = map.get(key);
      if (row) row.revenue += Number(c.amount || 0);
    });
    expenses.forEach(e => {
      const key = toDateKey(e.date);
      const row = map.get(key);
      if (row) row.expense += Number(e.amount || 0);
    });
    return rows;
  }, [trips, collections, expenses, range]);

  const totals = useMemo(() => series.reduce((a, r) => ({ revenue: a.revenue + r.revenue, expense: a.expense + r.expense, trips: a.trips + r.trips }), { revenue: 0, expense: 0, trips: 0 }), [series]);
  const max = Math.max(1, ...series.map(r => Math.max(r.revenue, r.expense)));
  const profit = totals.revenue - totals.expense;

  const points = (field: 'revenue' | 'expense') => series.map((r, i) => {
    const x = 18 + (i * 364) / Math.max(1, series.length - 1);
    const y = 150 - (r[field] / max) * 122;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="space-y-4" dir="rtl">
      <div className="bg-gradient-to-br from-[#0b1427] via-[#101c35] to-[#0a1325] rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-slate-700/60 overflow-hidden relative">
        <div className="absolute -top-16 -left-16 w-40 h-40 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              <h2 className="font-black text-sm sm:text-base">التحليلات الذكية والأداء المالي</h2>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400">مؤشرات حية محسوبة من بيانات الرحلات والتحصيلات والمصروفات المسجلة فعليًا.</p>
          </div>
          <div className="flex bg-slate-900/70 rounded-xl p-1 border border-slate-700">
            {[7, 30].map(days => (
              <button key={days} type="button" onClick={() => setRange(days as 7 | 30)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${range === days ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                {days === 7 ? '7 أيام' : '30 يوم'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 relative">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3"><div className="text-[10px] text-slate-400">إيرادات الفترة</div><div className="mt-1 text-lg font-black">{money(totals.revenue)} <span className="text-[9px] text-slate-400">ر.س</span></div></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3"><div className="text-[10px] text-slate-400">مصروفات الفترة</div><div className="mt-1 text-lg font-black text-rose-300">{money(totals.expense)} <span className="text-[9px] text-slate-400">ر.س</span></div></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3"><div className="text-[10px] text-slate-400">صافي التشغيل</div><div className={`mt-1 text-lg font-black ${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{money(profit)} <span className="text-[9px] text-slate-400">ر.س</span></div></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3"><div className="text-[10px] text-slate-400">رحلات الفترة</div><div className="mt-1 text-lg font-black">{totals.trips} <span className="text-[9px] text-slate-400">رحلة</span></div></div>
        </div>

        <div className="mt-4 rounded-xl bg-black/20 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2 text-[10px] text-slate-400"><span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> اتجاه الإيرادات والمصروفات</span><span>كل نقطة = يوم</span></div>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 400 170" className="w-full min-w-[520px] h-44" preserveAspectRatio="none" role="img" aria-label="الرسم البياني للإيرادات والمصروفات">
              {[28, 69, 109, 150].map(y => <line key={y} x1="18" x2="382" y1={y} y2={y} stroke="rgba(148,163,184,.15)" />)}
              <polyline points={points('revenue')} fill="none" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={points('expense')} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />
              {series.map((r, i) => {
                const x = 18 + (i * 364) / Math.max(1, series.length - 1);
                const yr = 150 - (r.revenue / max) * 122;
                return <circle key={r.key} cx={x} cy={yr} r="2.7" fill="#fb923c"><title>{`${r.label}: إيرادات ${money(r.revenue)} ر.س`}</title></circle>;
              })}
            </svg>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-1"><span className="flex items-center gap-1"><i className="w-3 h-0.5 bg-orange-400 inline-block" /> الإيرادات</span><span className="flex items-center gap-1"><i className="w-3 h-0.5 bg-rose-400 inline-block" /> المصروفات</span></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><WalletCards className="w-4 h-4 text-emerald-600" /><h3 className="font-black text-sm text-slate-900">هيكل الأداء المالي</h3></div><TrendingUp className="w-4 h-4 text-orange-500" /></div>
          {[
            ['الإيرادات', totals.revenue, 'bg-emerald-500'],
            ['المصروفات', totals.expense, 'bg-rose-500'],
            ['صافي التشغيل', Math.max(0, profit), 'bg-orange-500'],
          ].map(([label, value, color]) => {
            const numeric = Number(value); const width = totals.revenue ? Math.min(100, (numeric / totals.revenue) * 100) : 0;
            return <div key={String(label)} className="mb-3"><div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1"><span>{label}</span><span>{money(numeric)} ر.س</span></div><div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${width}%` }} /></div></div>;
          })}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4"><CalendarDays className="w-4 h-4 text-blue-600" /><h3 className="font-black text-sm text-slate-900">نشاط الرحلات حسب اليوم</h3></div>
          <div className="grid grid-cols-7 gap-1.5 items-end h-28">
            {series.slice(-7).map(r => { const h = Math.max(4, (r.trips / Math.max(1, ...series.map(x => x.trips))) * 92); return <div key={r.key} className="h-full flex flex-col justify-end items-center gap-1" title={`${r.label}: ${r.trips} رحلة`}><div className="w-full max-w-8 rounded-t-md bg-blue-500/80 hover:bg-blue-500 transition" style={{ height: `${h}px` }} /><span className="text-[8px] text-slate-400">{r.label}</span></div>; })}
          </div>
        </div>
      </div>
    </section>
  );
};
