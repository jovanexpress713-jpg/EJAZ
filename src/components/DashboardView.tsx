import React, { useEffect, useMemo } from 'react';
import { BarChart3, WalletCards, ReceiptText, ArrowUpRight, ArrowDownLeft, Users, UserCheck, Truck, Wrench, FileText, Route, Sparkles, ChevronLeft, Plus, AlertCircle, CircleDollarSign } from 'lucide-react';
import { Trip, Customer, Driver, Truck as TruckType, ExpenseRecord, CollectionRecord, User, MaintenanceRecord } from '../types';
import { printTripWaybill, shareTripViaWhatsApp } from '../utils/tripActions';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { EjazAssistant } from './EjazAssistant';

export interface DashboardViewProps {
  trips: Trip[]; customers: Customer[]; drivers: Driver[]; trucks: TruckType[]; maintenance?: MaintenanceRecord[];
  expenses: ExpenseRecord[]; collections: CollectionRecord[]; currentUser?: User | null;
  onNavigate?: (tab: string) => void; onNavigateTab?: (tab: string) => void; onViewTrip?: (trip: Trip) => void;
  onPrintWaybill?: (trip: Trip) => void; onShareWhatsApp?: (trip: Trip) => void; onOpenAddTrip?: () => void;
}

const money = (n: number) => Math.round(n || 0).toLocaleString('ar-SA');
const dayKey = (value?: string) => value ? String(value).slice(0, 10) : '';
const dateLabel = (d: Date) => d.toLocaleDateString('ar-SA', { weekday: 'short' });

export const DashboardView: React.FC<DashboardViewProps> = ({
  trips = [], customers = [], drivers = [], trucks = [], maintenance = [], expenses = [], collections = [],
  onNavigate, onNavigateTab, onViewTrip, onPrintWaybill, onShareWhatsApp, onOpenAddTrip,
}) => {
  const navigate = (tab: string) => (onNavigateTab || onNavigate)?.(tab.toUpperCase());

  useEffect(() => {
    const footer = document.querySelector('footer');
    const previousDisplay = footer instanceof HTMLElement ? footer.style.display : '';
    if (footer instanceof HTMLElement) footer.style.display = 'none';
    return () => { if (footer instanceof HTMLElement) footer.style.display = previousDisplay; };
  }, []);

  const totals = useMemo(() => {
    const revenue = trips.reduce((s, t) => s + Number(t.totalAmount || 0), 0);
    const collected = collections.reduce((s, c) => s + Number(c.amount || 0), 0);
    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const active = trips.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status)).length;
    const completed = trips.filter(t => t.status === 'COMPLETED').length;
    return { revenue, collected, expensesTotal, remaining: Math.max(0, revenue - collected), profit: revenue - expensesTotal, active, completed };
  }, [trips, collections, expenses]);

  const chart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6 - i)); return d; });
    return days.map(d => {
      const key = d.toISOString().slice(0, 10);
      const revenue = trips.filter(t => dayKey(t.date) === key).reduce((s, t) => s + Number(t.totalAmount || 0), 0);
      const collected = collections.filter(c => dayKey(c.date) === key).reduce((s, c) => s + Number(c.amount || 0), 0);
      const expense = expenses.filter(e => dayKey(e.date) === key).reduce((s, e) => s + Number(e.amount || 0), 0);
      return { key, label: dateLabel(d), revenue, collected, expense, profit: revenue - expense };
    });
  }, [trips, collections, expenses]);

  const maxChart = Math.max(1, ...chart.flatMap(d => [d.revenue, d.collected, d.expense]));
  const revenuePoints = chart.map((d, i) => `${(i / 6) * 100},${100 - (d.revenue / maxChart) * 86}`).join(' ');
  const expensePoints = chart.map((d, i) => `${(i / 6) * 100},${100 - (d.expense / maxChart) * 86}`).join(' ');

  const recentTrips = useMemo(() => [...trips].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 5), [trips]);
  const alerts = [
    totals.remaining > 0 ? `${money(totals.remaining)} ر.س مبالغ قيد التحصيل` : null,
    maintenance.length ? `${maintenance.length} سجل صيانة يحتاج متابعة` : null,
    totals.active ? `${totals.active} رحلة قيد التشغيل` : null,
  ].filter(Boolean) as string[];

  const Metric = ({ title, value, sub, icon, tone, onClick }: { title: string; value: string; sub: string; icon: React.ReactNode; tone: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="group text-right bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all w-full">
      <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500">{title}</span><span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone} group-hover:scale-105 transition-transform`}>{icon}</span></div>
      <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="mt-1 text-[9px] text-slate-400">{sub}</div>
    </button>
  );

  const modules = [
    { label: 'الرحلات', value: trips.length, tab: 'TRIPS', icon: Route, tone: 'bg-orange-50 text-orange-600' },
    { label: 'العملاء', value: customers.length, tab: 'CUSTOMERS', icon: Users, tone: 'bg-blue-50 text-blue-600' },
    { label: 'السائقون', value: drivers.length, tab: 'DRIVERS', icon: UserCheck, tone: 'bg-violet-50 text-violet-600' },
    { label: 'الشاحنات', value: trucks.length, tab: 'TRUCKS', icon: Truck, tone: 'bg-amber-50 text-amber-600' },
    { label: 'الصيانة', value: maintenance.length, tab: 'MAINTENANCE', icon: Wrench, tone: 'bg-rose-50 text-rose-600' },
    { label: 'التقارير', value: 'جاهز', tab: 'REPORTS', icon: FileText, tone: 'bg-slate-100 text-slate-700' },
  ];

  const status = (s: Trip['status']) => {
    const map: Record<string, string> = { COMPLETED: 'مكتملة', IN_TRANSIT: 'جارية', LOADING: 'تحميل', DELIVERED: 'تم التوصيل', CANCELLED: 'ملغاة' };
    return map[s] || 'جديدة';
  };

  return <div id="ejaz-dashboard-view" className="space-y-4 sm:space-y-5 pb-6" dir="rtl">
    <style>{`.ejaz-fade{animation:ejazFade .38s ease both}.ejaz-rise{animation:ejazRise .45s ease both}@keyframes ejazFade{from{opacity:0}to{opacity:1}}@keyframes ejazRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.ejaz-line{stroke-dasharray:500;stroke-dashoffset:500;animation:ejazLine 1.2s ease forwards}@keyframes ejazLine{to{stroke-dashoffset:0}}`}</style>

    <section className="ejaz-rise relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071226] via-[#102442] to-[#0b162b] p-5 sm:p-7 text-white shadow-xl border border-white/10">
      <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div><div className="flex items-center gap-2 mb-2"><span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-400/30 text-orange-300 text-[10px] font-black flex items-center gap-1"><Sparkles className="w-3 h-3" />مركز المؤسسة الذكي</span><span className="text-[10px] text-slate-400">إيجاز للنقليات</span></div><h1 className="text-2xl sm:text-3xl font-black tracking-tight">لوحة التحكم المالية والتشغيلية</h1><p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">كل ما يهم الإدارة في شاشة واحدة: الإيرادات، التحصيلات، المصروفات، المديونية وحركة الرحلات.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onOpenAddTrip?.()} className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-2 shadow-lg transition"><Plus className="w-4 h-4" />رحلة جديدة</button><button type="button" onClick={() => navigate('FINANCIAL')} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-2 transition"><WalletCards className="w-4 h-4 text-orange-300" />المالية</button><button type="button" onClick={() => navigate('REPORTS')} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-2 transition"><BarChart3 className="w-4 h-4 text-cyan-300" />التقارير</button></div>
      </div>
      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10">
        {[['الرحلات', trips.length], ['النشطة', totals.active], ['المكتملة', totals.completed], ['الصافي', `${money(totals.profit)} ر.س`]].map(([label, value], i) => <div key={String(label)}><div className="text-[9px] text-slate-500">{label}</div><div className={`text-lg font-black ${i === 3 ? (totals.profit >= 0 ? 'text-emerald-300' : 'text-rose-300') : 'text-white'}`}>{value}</div></div>)}
      </div>
    </section>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 ejaz-fade">
      <Metric title="الإيرادات" value={money(totals.revenue)} sub="قيمة الرحلات المسجلة" icon={<ArrowUpRight className="w-4 h-4" />} tone="bg-emerald-50 text-emerald-600" onClick={() => navigate('FINANCIAL')} />
      <Metric title="التحصيلات" value={money(totals.collected)} sub="سندات القبض المسجلة" icon={<CircleDollarSign className="w-4 h-4" />} tone="bg-blue-50 text-blue-600" onClick={() => navigate('COLLECTIONS')} />
      <Metric title="المتبقي" value={money(totals.remaining)} sub="قيد التحصيل" icon={<AlertCircle className="w-4 h-4" />} tone="bg-amber-50 text-amber-600" onClick={() => navigate('FINANCIAL')} />
      <Metric title="المصروفات" value={money(totals.expensesTotal)} sub="مصروفات التشغيل" icon={<ArrowDownLeft className="w-4 h-4" />} tone="bg-rose-50 text-rose-600" onClick={() => navigate('EXPENSES')} />
    </div>

    <section className="grid lg:grid-cols-[1.65fr_1fr] gap-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 ejaz-rise">
        <div className="flex items-center justify-between mb-4"><div><h2 className="font-black text-slate-900">الحركة المالية</h2><p className="text-[10px] text-slate-400 mt-1">آخر 7 أيام • إيرادات مقابل مصروفات</p></div><span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[9px] font-bold text-slate-500">بيانات حقيقية</span></div>
        <div className="relative h-52 sm:h-60 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
          <div className="absolute inset-x-4 top-4 bottom-7 flex flex-col justify-between"><span className="border-t border-dashed border-slate-200"/><span className="border-t border-dashed border-slate-200"/><span className="border-t border-dashed border-slate-200"/><span className="border-t border-dashed border-slate-200"/></div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-5 top-5 bottom-8 w-[calc(100%-40px)] h-[calc(100%-52px)]"><polyline points={revenuePoints} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="text-orange-500 ejaz-line"/><polyline points={expensePoints} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" className="text-slate-400 ejaz-line"/>{chart.map((d,i) => <circle key={d.key} cx={(i/6)*100} cy={100-(d.revenue/maxChart)*86} r="1.7" className="fill-orange-500" vectorEffect="non-scaling-stroke" />)}</svg>
          <div className="absolute bottom-1 inset-x-5 flex justify-between text-[9px] text-slate-400">{chart.map(d => <span key={d.key}>{d.label}</span>)}</div>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-bold"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-orange-500"/>الإيرادات</span><span className="flex items-center gap-1.5 text-slate-500"><i className="w-2.5 h-2.5 rounded-full bg-slate-400"/>المصروفات</span></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 ejaz-rise">
        <div className="flex items-center justify-between"><div><h2 className="font-black text-slate-900">ملخص المؤسسة</h2><p className="text-[10px] text-slate-400 mt-1">مؤشرات قابلة للمراجعة</p></div><ReceiptText className="w-5 h-5 text-orange-500"/></div>
        <div className="space-y-3 mt-4">
          {[['صافي التشغيل', totals.profit, totals.revenue ? Math.max(0, Math.min(100, (totals.profit/totals.revenue)*100)) : 0, 'bg-emerald-500'], ['التحصيل من الإيرادات', totals.collected, totals.revenue ? Math.min(100, (totals.collected/totals.revenue)*100) : 0, 'bg-blue-500'], ['المصروفات من الإيرادات', totals.expensesTotal, totals.revenue ? Math.min(100, (totals.expensesTotal/totals.revenue)*100) : 0, 'bg-rose-500']].map(([label, value, percent, bar]) => <div key={String(label)}><div className="flex items-center justify-between text-[10px] mb-1"><span className="font-bold text-slate-600">{label}</span><b className="text-slate-900">{money(Number(value))} ر.س</b></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${Number(percent)}%` }}/></div></div>)}
        </div>
        <button onClick={() => navigate('FINANCIAL')} className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-[10px] font-black text-slate-700 hover:border-orange-300 hover:text-orange-600 transition">فتح المركز المالي الكامل</button>
      </div>
    </section>

    <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
      {modules.map(({ label, value, tab, icon: Icon, tone }) => <button key={tab} type="button" onClick={() => navigate(tab)} className="bg-white border border-slate-200 rounded-2xl p-3 text-right hover:-translate-y-0.5 hover:shadow-md transition-all"><div className="flex items-center justify-between"><span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-4 h-4"/></span><ChevronLeft className="w-4 h-4 text-slate-300"/></div><b className="block mt-3 text-sm text-slate-800">{label}</b><span className="text-[10px] text-slate-400">{value}</span></button>)}
    </section>

    {alerts.length > 0 && <section className="bg-[#0b1730] rounded-3xl p-4 sm:p-5 text-white border border-white/10"><div className="flex items-center gap-2 mb-3"><AlertCircle className="w-4 h-4 text-orange-400"/><h2 className="font-black text-sm">يحتاج انتباهك</h2></div><div className="grid sm:grid-cols-3 gap-2">{alerts.map(a => <div key={a} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-[10px] text-slate-300">{a}</div>)}</div></section>}

    <AdvancedAnalytics trips={trips} collections={collections} expenses={expenses} />

    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-2 h-6 rounded-full bg-orange-500"/><div><h2 className="font-black text-sm text-slate-900">آخر الرحلات</h2><p className="text-[9px] text-slate-400">مع إمكانية فتح التفاصيل والطباعة والمشاركة</p></div></div><button onClick={() => navigate('TRIPS')} className="text-[10px] font-black text-orange-600 flex items-center gap-1">عرض الكل<ChevronLeft className="w-4 h-4"/></button></div>
      {recentTrips.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">لا توجد رحلات مسجلة حتى الآن.</div> : <div className="divide-y divide-slate-100">{recentTrips.map(trip => <div key={trip.id} className="p-4 hover:bg-slate-50/70 transition"><div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between"><div className="flex items-center gap-3 min-w-0"><span className="font-mono font-black text-xs bg-slate-100 text-slate-700 rounded-lg px-2.5 py-1">{trip.tripNumber}</span><div className="min-w-0"><b className="block text-xs text-slate-900 truncate">{trip.customerName}</b><span className="text-[10px] text-slate-500">{trip.driverName || 'بدون سائق'} · {trip.plateNumber || 'بدون شاحنة'}</span></div></div><div className="flex flex-wrap items-center gap-2 text-[10px]"><span className="text-slate-400">{trip.date}</span><span className="font-bold text-slate-800">{money(trip.totalAmount)} ر.س</span><span className="text-emerald-600 font-bold">محصل {money(trip.paidAmount)} ر.س</span><span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">{status(trip.status)}</span></div><div className="flex items-center gap-1"><button type="button" onClick={() => onViewTrip?.(trip)} className="p-2 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-600" title="التفاصيل"><FileText className="w-4 h-4"/></button><button type="button" onClick={() => (onPrintWaybill ? onPrintWaybill(trip) : printTripWaybill(trip))} className="p-2 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600" title="طباعة"><FileText className="w-4 h-4"/></button><button type="button" onClick={() => (onShareWhatsApp ? onShareWhatsApp(trip) : shareTripViaWhatsApp(trip))} className="p-2 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600" title="مشاركة">↗</button></div></div></div>)}</div>}
    </section>

    <EjazAssistant trips={trips} customers={customers} drivers={drivers} trucks={trucks} expenses={expenses} collections={collections} onNavigate={navigate}/>
  </div>;
};
