import React, { useMemo } from 'react';
import { Truck, CheckCircle2, AlertCircle, Plus, Share2, Printer, ChevronLeft, FileText, CreditCard, ArrowUpRight, ArrowDownLeft, Users, UserCheck, Wrench, Activity } from 'lucide-react';
import { Trip, Customer, Driver, Truck as TruckType, ExpenseRecord, CollectionRecord, User, MaintenanceRecord } from '../types';
import { printTripWaybill, shareTripViaWhatsApp } from '../utils/tripActions';
import { AdvancedAnalytics } from './AdvancedAnalytics';

export interface DashboardViewProps {
  trips: Trip[]; customers: Customer[]; drivers: Driver[]; trucks: TruckType[]; maintenance?: MaintenanceRecord[];
  expenses: ExpenseRecord[]; collections: CollectionRecord[]; currentUser?: User | null;
  onNavigate?: (tab: string) => void; onNavigateTab?: (tab: string) => void; onViewTrip?: (trip: Trip) => void;
  onPrintWaybill?: (trip: Trip) => void; onShareWhatsApp?: (trip: Trip) => void; onOpenAddTrip?: () => void;
}

const money = (n: number) => Math.round(n || 0).toLocaleString('ar-SA');

export const DashboardView: React.FC<DashboardViewProps> = ({
  trips = [], customers = [], drivers = [], trucks = [], maintenance = [], expenses = [], collections = [],
  onNavigate, onNavigateTab, onViewTrip, onPrintWaybill, onShareWhatsApp, onOpenAddTrip,
}) => {
  const navigate = (tab: string) => (onNavigateTab || onNavigate)?.(tab.toUpperCase());
  const totalRevenue = trips.reduce((s, t) => s + Number(t.totalAmount || 0), 0);
  const collected = collections.reduce((s, c) => s + Number(c.amount || 0), 0);
  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const remaining = Math.max(0, totalRevenue - collected);
  const profit = totalRevenue - expensesTotal;
  const completed = trips.filter(t => t.status === 'COMPLETED').length;
  const active = trips.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status)).length;
  const recentTrips = useMemo(() => [...trips].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 6), [trips]);

  const status = (s: Trip['status']) => {
    const map: Record<string, { label: string; cls: string }> = {
      COMPLETED: { label: 'مكتملة', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      IN_TRANSIT: { label: 'جارية', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
      LOADING: { label: 'تحميل', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
      DELIVERED: { label: 'تم التوصيل', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
      CANCELLED: { label: 'ملغاة', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    };
    const x = map[s] || { label: 'جديدة', cls: 'bg-slate-50 text-slate-700 border-slate-200' };
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${x.cls}`}><CheckCircle2 className="w-3 h-3" />{x.label}</span>;
  };

  const Metric = ({ title, value, sub, icon, tone, onClick }: { title: string; value: string; sub: string; icon: React.ReactNode; tone: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="text-right bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer w-full">
      <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500">{title}</span><span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>{icon}</span></div>
      <div className="mt-2 flex items-baseline gap-1"><span className="text-2xl font-black text-slate-900">{value}</span><span className="text-[9px] font-bold text-slate-400">ر.س</span></div>
      <div className="mt-1 text-[10px] text-slate-400">{sub}</div>
    </button>
  );

  return (
    <div id="ejaz-dashboard-view" className="space-y-5" dir="rtl">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#081225] via-[#10203a] to-[#0a1427] p-5 sm:p-7 text-white shadow-xl border border-slate-700/60">
        <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div><div className="flex items-center gap-2 mb-2"><span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-400/30 text-orange-300 text-[10px] font-black">لوحة تشغيل مباشرة</span><span className="text-[10px] text-slate-400">مؤسسة إيجاز للنقليات</span></div><h1 className="text-2xl sm:text-3xl font-black tracking-tight">مركز التحكم التشغيلي</h1><p className="mt-1 text-xs sm:text-sm text-slate-400">صورة لحظية للرحلات، التحصيلات، المصروفات، الأسطول والأداء المالي.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onOpenAddTrip?.()} className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-2 shadow-lg"><Plus className="w-4 h-4" />رحلة جديدة</button><button type="button" onClick={() => navigate('FINANCIAL')} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-orange-300" />المالية</button><button type="button" onClick={() => navigate('REPORTS')} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-300" />التقارير</button></div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10"><div><div className="text-[9px] text-slate-500">الرحلات</div><div className="text-lg font-black">{trips.length}</div><div className="text-[9px] text-emerald-300">{completed} مكتملة</div></div><div><div className="text-[9px] text-slate-500">قيد التشغيل</div><div className="text-lg font-black">{active}</div><div className="text-[9px] text-blue-300">رحلات نشطة</div></div><div><div className="text-[9px] text-slate-500">صافي التشغيل</div><div className={`text-lg font-black ${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{money(profit)} <span className="text-[9px]">ر.س</span></div><div className="text-[9px] text-slate-500">إيرادات - مصروفات</div></div></div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric title="إجمالي الإيرادات" value={money(totalRevenue)} sub="قيمة الرحلات المسجلة" icon={<ArrowUpRight className="w-4 h-4" />} tone="bg-emerald-50 text-emerald-600" onClick={() => navigate('FINANCIAL')} />
        <Metric title="إجمالي المحصل" value={money(collected)} sub="سندات القبض المسجلة" icon={<CreditCard className="w-4 h-4" />} tone="bg-blue-50 text-blue-600" onClick={() => navigate('COLLECTIONS')} />
        <Metric title="المبالغ المتبقية" value={money(remaining)} sub="أرصدة قيد التحصيل" icon={<AlertCircle className="w-4 h-4" />} tone="bg-amber-50 text-amber-600" onClick={() => navigate('FINANCIAL')} />
        <Metric title="إجمالي المصروفات" value={money(expensesTotal)} sub="مصروفات التشغيل المسجلة" icon={<ArrowDownLeft className="w-4 h-4" />} tone="bg-rose-50 text-rose-600" onClick={() => navigate('EXPENSES')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
        ['العملاء', customers.length, 'CUSTOMERS', Users, 'text-blue-600 bg-blue-50'],
        ['السائقون', drivers.length, 'DRIVERS', UserCheck, 'text-violet-600 bg-violet-50'],
        ['الشاحنات', trucks.length, 'TRUCKS', Truck, 'text-orange-600 bg-orange-50'],
        ['الصيانة', maintenance.length, 'MAINTENANCE', Wrench, 'text-rose-600 bg-rose-50'],
      ].map(([label, value, tab, Icon, tone]) => <button key={String(label)} type="button" onClick={() => navigate(String(tab))} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 text-right hover:shadow-md transition"><span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-4 h-4" /></span><span><b className="block text-sm text-slate-900">{value as number}</b><small className="text-[10px] text-slate-500">{label}</small></span></button>)}
      </div>

      <AdvancedAnalytics trips={trips} collections={collections} expenses={expenses} />

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-2 h-6 rounded-full bg-orange-500" /><h2 className="font-black text-sm sm:text-base text-slate-900">آخر الرحلات والعمليات</h2></div><button type="button" onClick={() => navigate('TRIPS')} className="text-[10px] font-black text-orange-600 flex items-center gap-1">عرض الكل ({trips.length})<ChevronLeft className="w-4 h-4" /></button></div>
        {recentTrips.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">لا توجد رحلات مسجلة حتى الآن.</div> : <div className="divide-y divide-slate-100">{recentTrips.map(trip => <div key={trip.id} className="p-4 hover:bg-slate-50/70 transition"><div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between"><div className="flex items-center gap-3 min-w-0"><span className="font-mono font-black text-xs bg-slate-100 text-slate-700 rounded-lg px-2.5 py-1">{trip.tripNumber}</span><div className="min-w-0"><b className="block text-xs text-slate-900 truncate">{trip.customerName}</b><span className="text-[10px] text-slate-500">{trip.driverName || 'بدون سائق'} · {trip.plateNumber || 'بدون شاحنة'}</span></div></div><div className="flex flex-wrap items-center gap-3 text-[10px]"><span className="text-slate-400">{trip.date}</span><span className="font-bold text-slate-800">{money(trip.totalAmount)} ر.س</span><span className="text-emerald-600 font-bold">مدفوع {money(trip.paidAmount)} ر.س</span><span className="text-amber-600 font-bold">متبقي {money(trip.remainingAmount)} ر.س</span>{status(trip.status)}</div><div className="flex items-center gap-1"><button type="button" onClick={() => onViewTrip?.(trip)} className="p-2 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-600" title="التفاصيل"><FileText className="w-4 h-4" /></button><button type="button" onClick={() => (onPrintWaybill ? onPrintWaybill(trip) : printTripWaybill(trip))} className="p-2 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600" title="طباعة"><Printer className="w-4 h-4" /></button><button type="button" onClick={() => (onShareWhatsApp ? onShareWhatsApp(trip) : shareTripViaWhatsApp(trip))} className="p-2 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600" title="واتساب"><Share2 className="w-4 h-4" /></button></div></div></div>)}</div>}
      </section>
    </div>
  );
};
