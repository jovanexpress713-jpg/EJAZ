import React from 'react';
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  UserCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle,
  Plus,
  Share2,
  Printer,
  ChevronLeft,
  FileText,
  CreditCard,
  Wrench
} from 'lucide-react';
import { Trip, Customer, Driver, Truck as TruckType, ExpenseRecord, CollectionRecord, User, MaintenanceRecord } from '../types';
import { printTripWaybill, shareTripViaWhatsApp } from '../utils/tripActions';

export interface DashboardViewProps {
  trips: Trip[];
  customers: Customer[];
  drivers: Driver[];
  trucks: TruckType[];
  maintenance?: MaintenanceRecord[];
  expenses: ExpenseRecord[];
  collections: CollectionRecord[];
  currentUser?: User | null;
  onNavigate?: (tab: string) => void;
  onNavigateTab?: (tab: string) => void;
  onViewTrip?: (trip: Trip) => void;
  onPrintWaybill?: (trip: Trip) => void;
  onShareWhatsApp?: (trip: Trip) => void;
  onOpenAddTrip?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trips = [],
  customers = [],
  drivers = [],
  trucks = [],
  expenses = [],
  collections = [],
  currentUser,
  onNavigate,
  onNavigateTab,
  onViewTrip,
  onPrintWaybill,
  onShareWhatsApp,
  onOpenAddTrip,
}) => {
  const navigateTo = (tab: string) => {
    const target = tab.toUpperCase();
    if (onNavigateTab) {
      onNavigateTab(target);
    } else if (onNavigate) {
      onNavigate(target);
    }
  };

  const handlePrint = (trip: Trip) => {
    if (onPrintWaybill) {
      onPrintWaybill(trip);
    } else {
      printTripWaybill(trip);
    }
  };

  const handleWhatsApp = (trip: Trip) => {
    if (onShareWhatsApp) {
      onShareWhatsApp(trip);
    } else {
      shareTripViaWhatsApp(trip);
    }
  };

  const handleOpenAdd = () => {
    if (onOpenAddTrip) {
      onOpenAddTrip();
    } else {
      navigateTo('TRIPS');
    }
  };

  const handleTripClick = (trip: Trip) => {
    if (onViewTrip) {
      onViewTrip(trip);
    } else {
      navigateTo('TRIPS');
    }
  };

  // Compute Key Metrics
  const totalTrips = trips.length;
  const completedTrips = trips.filter(t => t.status === 'COMPLETED').length;
  const activeTrips = trips.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
  
  const totalRevenues = trips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalCollected = collections.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalRemaining = Math.max(0, totalRevenues - totalCollected);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = totalRevenues - totalExpenses;

  const totalCustomers = customers.length;
  const totalDrivers = drivers.length;
  const totalTrucks = trucks.length;

  const recentTrips = [...trips].slice(0, 6);

  const getStatusBadge = (status: Trip['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> مكتملة
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 animate-spin" /> جارية على الطريق
          </span>
        );
      case 'LOADING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> قيد التحميل
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            تم التوصيل
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            ملغاة
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            جديدة
          </span>
        );
    }
  };

  return (
    <div id="ejaz-dashboard-view" className="space-y-6" dir="rtl">
      {/* Top Banner & Quick Shortcuts */}
      <div className="bg-[#0F172A] rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#F97316] text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
              لوحة التحكم المباشرة
            </span>
            <span className="text-slate-400 text-xs">
              مؤسسة إيجاز للنقليات – الرياض
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            مرحبًا بك في نظام إدارة النقل والأسطول
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            متابعة فورية للرحلات، التحصيلات المالية، السائقين وجاهزية الشاحنات.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            id="dash-add-trip-btn"
            type="button"
            onClick={handleOpenAdd}
            className="bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة رحلة جديدة</span>
          </button>
          <button
            id="dash-financial-btn"
            type="button"
            onClick={() => navigateTo('FINANCIAL')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm py-2.5 px-3.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-orange-400" />
            <span>المالية والتحصيل</span>
          </button>
        </div>
      </div>

      {/* Grid of 8 Core Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Trips */}
        <div 
          onClick={() => navigateTo('TRIPS')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي الرحلات</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalTrips}</span>
            <span className="text-[11px] text-slate-500 font-medium">رحلة</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{completedTrips} مكتملة</span>
            <span className="text-slate-400 mx-1">•</span>
            <span className="text-blue-600">{activeTrips} جارية</span>
          </div>
        </div>

        {/* Total Revenues */}
        <div 
          onClick={() => navigateTo('FINANCIAL')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي الإيرادات</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{totalRevenues.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-bold">ر.س</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            شاملة ضريبة القيمة المضافة 15%
          </div>
        </div>

        {/* Total Collected */}
        <div 
          onClick={() => navigateTo('FINANCIAL')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي المحصل</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700">{totalCollected.toLocaleString()}</span>
            <span className="text-xs text-emerald-700 font-bold">ر.س</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            تم إيداعه في الحسابات النقدية والبنكية
          </div>
        </div>

        {/* Remaining Amount */}
        <div 
          onClick={() => navigateTo('FINANCIAL')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">المبالغ المتبقية</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-600">{totalRemaining.toLocaleString()}</span>
            <span className="text-xs text-amber-600 font-bold">ر.س</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-semibold">
            مستحقات آجلة قيد المتابعة
          </div>
        </div>

        {/* Total Expenses */}
        <div 
          onClick={() => navigateTo('FINANCIAL')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي المصروفات</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-600">{totalExpenses.toLocaleString()}</span>
            <span className="text-xs text-rose-600 font-bold">ر.س</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            وقود، صيانة، رسوم وعهد تشغيلية
          </div>
        </div>

        {/* Net Profit */}
        <div 
          onClick={() => navigateTo('REPORTS')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">صافي الربح</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-2xl font-black ${netProfit >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              {netProfit.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-bold">ر.س</span>
          </div>
          <div className="mt-2 text-[11px] text-orange-600 font-bold">
            الإيرادات - المصروفات الإجمالية
          </div>
        </div>

        {/* Fleet & Personnel Compact Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 grid grid-cols-3 divide-x divide-x-reverse divide-slate-100">
          <div 
            onClick={() => navigateTo('CUSTOMERS')} 
            className="text-center px-2 cursor-pointer hover:bg-slate-50 rounded-lg p-1 transition"
          >
            <div className="text-xs text-slate-500 font-semibold mb-1">العملاء</div>
            <div className="text-xl font-black text-slate-900">{totalCustomers}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">عميل مسجل</div>
          </div>
          <div 
            onClick={() => navigateTo('DRIVERS')} 
            className="text-center px-2 cursor-pointer hover:bg-slate-50 rounded-lg p-1 transition"
          >
            <div className="text-xs text-slate-500 font-semibold mb-1">السائقون</div>
            <div className="text-xl font-black text-slate-900">{totalDrivers}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">سائق معتمد</div>
          </div>
          <div 
            onClick={() => navigateTo('TRUCKS')} 
            className="text-center px-2 cursor-pointer hover:bg-slate-50 rounded-lg p-1 transition"
          >
            <div className="text-xs text-slate-500 font-semibold mb-1">الشاحنات</div>
            <div className="text-xl font-black text-slate-900">{totalTrucks}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">شاحنة بالأسطول</div>
          </div>
        </div>
      </div>

      {/* Section: آخر الرحلات (Recent Trips) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              آخر الرحلات والعمليات
            </h2>
          </div>
          <button
            id="dash-view-all-trips-btn"
            type="button"
            onClick={() => navigateTo('TRIPS')}
            className="text-xs font-bold text-[#F97316] hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>عرض كل الرحلات ({trips.length})</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم الرحلة</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">السائق</th>
                <th className="py-3 px-4">السيارة / الشاحنة</th>
                <th className="py-3 px-4">المسار</th>
                <th className="py-3 px-4">الإجمالي</th>
                <th className="py-3 px-4">المدفوع</th>
                <th className="py-3 px-4">المتبقي</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTrips.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    لا توجد رحلات مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                recentTrips.map(trip => (
                  <tr key={trip.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {trip.tripNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {trip.date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[160px] truncate">
                      {trip.customerName}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {trip.driverName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {trip.plateNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      <span className="font-semibold">{trip.loadingLocation.split('-')[0]}</span>
                      <span className="text-orange-500 mx-1">➔</span>
                      <span className="font-semibold">{trip.unloadingLocation.split('-')[0]}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {trip.totalAmount.toLocaleString()} ر.س
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {trip.paidAmount.toLocaleString()} ر.س
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-700">
                      {trip.remainingAmount.toLocaleString()} ر.س
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(trip.status)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTripClick(trip)}
                          className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition cursor-pointer"
                          title="تفاصيل الرحلة"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint(trip)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          title="طباعة بوليصة الشحن"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(trip)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                          title="مشاركة عبر واتساب"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards List */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {recentTrips.map(trip => (
            <div key={trip.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {trip.tripNumber}
                </span>
                {getStatusBadge(trip.status)}
              </div>

              <div>
                <div className="text-sm font-bold text-slate-900">{trip.customerName}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>السائق: {trip.driverName}</span>
                  <span>•</span>
                  <span>الشاحنة: {trip.plateNumber}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1 text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">المسار:</span>
                  <span className="font-semibold text-slate-900">
                    {trip.loadingLocation.split('-')[0]} ➔ {trip.unloadingLocation.split('-')[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span>الإجمالي: {trip.totalAmount.toLocaleString()} ر.س</span>
                  <span className="text-emerald-700">المدفوع: {trip.paidAmount.toLocaleString()} ر.س</span>
                </div>
                {trip.remainingAmount > 0 && (
                  <div className="flex items-center justify-between text-amber-700 font-bold">
                    <span>المتبقي:</span>
                    <span>{trip.remainingAmount.toLocaleString()} ر.س</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleTripClick(trip)}
                  className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  عرض التفاصيل
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePrint(trip)}
                    className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 rounded-lg transition cursor-pointer"
                    title="طباعة"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWhatsApp(trip)}
                    className="p-2 text-slate-600 hover:text-emerald-600 bg-slate-100 rounded-lg transition cursor-pointer"
                    title="واتساب"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
