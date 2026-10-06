/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 *
 * Driver Tracking & Central Immutable Ledger System
 * نظام إلكتروني لإدارة وتتبع رحلات السائقين يمنع تداخل التقارير عند تشارك الشاحنات
 */

import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Truck, 
  Lock, 
  ShieldCheck, 
  Database, 
  Code2, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Printer, 
  FileSpreadsheet, 
  ArrowRightLeft, 
  Calendar, 
  Hash, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  Eye,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { Trip, Driver, Truck as TruckType, User } from '../types';
import { StorageService } from '../services/storage';
import { 
  createImmutableTripSnapshot, 
  queryDriverIsolatedLedger, 
  calculateDriverStatement, 
  generateGoogleAppsScriptCode 
} from '../services/driverTrackingLedger';
import { exportTripsTableToExcel } from '../utils/excelExporter';

interface DriverTrackingLedgerViewProps {
  trips: Trip[];
  drivers: Driver[];
  trucks: TruckType[];
  currentUser: User;
  onRefresh: () => void;
  onNavigateToTrips?: () => void;
}

export const DriverTrackingLedgerView: React.FC<DriverTrackingLedgerViewProps> = ({
  trips,
  drivers,
  trucks,
  currentUser,
  onRefresh,
  onNavigateToTrips
}) => {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'QUERY' | 'RELAY_FORM' | 'CENTRAL_LEDGER' | 'GAS_SCRIPT'>('QUERY');

  // Query & Filter State
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Relay Form State (واجهة إدخال بسيطة مع زر ترحيل آمن)
  const [formDriverId, setFormDriverId] = useState<string>(drivers[0]?.id || '');
  const [formTruckId, setFormTruckId] = useState<string>(trucks[0]?.id || '');
  const [formCustomerName, setFormCustomerName] = useState<string>('');
  const [formRoute, setFormRoute] = useState<string>('الرياض ⟵ جدة');
  const [formCargo, setFormCargo] = useState<string>('مواد غذائية وبضائع عامة');
  const [formBaseAmount, setFormBaseAmount] = useState<number>(4500);
  const [formDriverCustody, setFormDriverCustody] = useState<number>(1200);
  const [formCommission, setFormCommission] = useState<number>(650);
  const [formExpenses, setFormExpenses] = useState<number>(400);
  const [formNotes, setFormNotes] = useState<string>('');
  const [isRelaying, setIsRelaying] = useState<boolean>(false);
  const [relaySuccessNotice, setRelaySuccessNotice] = useState<string | null>(null);
  const [relayErrorNotice, setRelayErrorNotice] = useState<string | null>(null);

  // Script Copy State
  const [isScriptCopied, setIsScriptCopied] = useState<boolean>(false);

  // Selected driver object
  const activeDriver = useMemo(() => {
    return drivers.find(d => d.id === selectedDriverId) || drivers[0] || null;
  }, [drivers, selectedDriverId]);

  // Isolated Driver Statement & Trips (مفصول تماماً عن الشاحنات)
  const statement = useMemo(() => {
    if (!activeDriver) return null;
    return calculateDriverStatement(activeDriver, trips, {
      start: startDate || undefined,
      end: endDate || undefined,
    });
  }, [activeDriver, trips, startDate, endDate]);

  // Central Ledger Filtered
  const centralLedgerTrips = useMemo(() => {
    return trips.filter(t => {
      const matchSearch = !searchTerm || 
        t.tripNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.frozenValues?.driverId && t.frozenValues.driverId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDate = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
      return matchSearch && matchDate;
    });
  }, [trips, searchTerm, startDate, endDate]);

  // Execute Safe Relay (زر الترحيل الآمن الذي يجمد القيم ويمنع الدوال المتغيرة)
  const handleSafeRelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDriverId || !formTruckId) return;

    setIsRelaying(true);
    try {
      const selectedDrv = drivers.find(d => d.id === formDriverId);
      const selectedTrk = trucks.find(t => t.id === formTruckId);

      const tripNum = StorageService.generateTripNumber();
      const today = new Date().toISOString().split('T')[0];

      // Build frozen static snapshot payload
      const snapshot = createImmutableTripSnapshot(
        {
          tripNumber: tripNum,
          date: today,
          driverId: selectedDrv?.id,
          driverName: selectedDrv?.name,
          driverPhone: selectedDrv?.phone,
          truckId: selectedTrk?.id,
          plateNumber: selectedTrk?.plateNumber,
          baseAmount: formBaseAmount,
          taxAmount: 0,
          totalAmount: formBaseAmount,
          driverCustody: formDriverCustody,
          commissionAmount: formCommission,
          tripExpenses: formExpenses,
        },
        selectedDrv,
        selectedTrk,
        'GAS_RELAY'
      );

      const newTrip: Trip = {
        id: `trp_relay_${Date.now()}`,
        tripNumber: tripNum,
        date: today,
        tripType: 'رحلة داخلية',
        status: 'IN_TRANSIT',
        customerId: '',
        customerName: formCustomerName.trim() || 'عميل نقليات عام',
        customerPhone: '',
        customerAddress: '',
        driverId: selectedDrv?.id || '',
        driverName: selectedDrv?.name || '',
        driverPhone: selectedDrv?.phone || '',
        truckId: selectedTrk?.id || '',
        plateNumber: selectedTrk?.plateNumber || '',
        truckType: selectedTrk?.truckType || 'CURTAIN',
        cargoType: formCargo,
        loadingLocation: formRoute.split('⟵')[0]?.trim() || 'الرياض',
        unloadingLocation: formRoute.split('⟵')[1]?.trim() || 'جدة',
        loadingTime: '08:00 صباحًا',
        estimatedArrival: `${today} 20:00`,
        baseAmount: formBaseAmount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: formBaseAmount,
        paidAmount: 0,
        remainingAmount: formBaseAmount,
        paymentStatus: 'UNPAID',
        paymentMethod: 'BANK_TRANSFER',
        commissionAmount: formCommission,
        driverCustody: formDriverCustody,
        custodyMethod: 'تحويل بنكي مباشر',
        tripExpenses: formExpenses,
        netProfit: formBaseAmount - formExpenses - formCommission,
        notes: formNotes || `تم الترحيل والتجميد الآمن عبر واجهة تتبع السائقين (بصمة: ${snapshot.relayChecksum})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        frozenValues: snapshot,
      };

      StorageService.saveTrip(newTrip, currentUser);
      onRefresh();

      setRelaySuccessNotice(`✅ تم الترحيل الآمن وتجميد بيانات الرحلة (${tripNum}) للسائق (${selectedDrv?.name}) بمعرف ثابت (${selectedDrv?.id}) دون أي تداخل مع حساب الشاحنة!`);
      setTimeout(() => setRelaySuccessNotice(null), 5000);

      // Reset fields
      setFormCustomerName('');
      setFormNotes('');
    } catch (err: any) {
      setRelayErrorNotice(err?.message || 'فشل الترحيل الآمن');
      setTimeout(() => setRelayErrorNotice(null), 6000);
    } finally {
      setIsRelaying(false);
    }
  };

  // Copy GAS Code to Clipboard
  const handleCopyGasCode = () => {
    const code = generateGoogleAppsScriptCode();
    navigator.clipboard.writeText(code);
    setIsScriptCopied(true);
    setTimeout(() => setIsScriptCopied(false), 3000);
  };

  // Print Driver Isolated Statement
  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div id="driver-tracking-ledger-container" className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-[#0F172A] to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>نظام تجميد القيم ومنع تداخل الحسابات عند تشارك الشاحنات</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>تتبع رحلات ومستحقات السائقين (Driver ID Ledger)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              فصل كلي بين حساب السائق ورقم الشاحنة وتثبيت الحركات كقيم دائمة لحظة الإدخال، لمنع تأثر تقارير السائق عند قيادته لأكثر من شاحنة أو تبادل السائقين لنفس الشاحنة.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('RELAY_FORM')}
              className="px-4 py-2.5 bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>نموذج الترحيل الآمن</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('GAS_SCRIPT')}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="كود وسكربت Google Apps Script للتكامل مع Google Sheets"
            >
              <Code2 className="w-4 h-4 text-orange-400" />
              <span>كود GAS</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('QUERY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'QUERY'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>1. واجهة الاستعلام المفلترة لكل سائق</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('RELAY_FORM')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'RELAY_FORM'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. نموذج الإدخال وزر الترحيل الآمن</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('CENTRAL_LEDGER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'CENTRAL_LEDGER'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>3. السجل المركزي للحركات المجمّدة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('GAS_SCRIPT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'GAS_SCRIPT'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>4. كود Google Apps Script</span>
          </button>
        </div>
      </div>

      {/* Notice Message */}
      {relaySuccessNotice && (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-950 p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{relaySuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setRelaySuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {relayErrorNotice && (
        <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{relayErrorNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setRelayErrorNotice(null)}
            className="text-rose-700 hover:text-rose-900 text-xs underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. QUERY & ISOLATED STATEMENT VIEW (التقرير: استعلام مفلتر ومستحقات دقيقة) */}
      {/* ========================================================================= */}
      {activeSubTab === 'QUERY' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-5 bg-[#F97316] rounded-full" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  استعلام مفلتر ومستحقات السائق دون أي تداخل
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintStatement}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الكشف</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportTripsTableToExcel(statement?.trips || [], `كشف_رحلات_السائق_${activeDriver?.name || 'محدد'}`)}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تصدير إكسل</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Driver Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">اختيار السائق (Driver ID):</label>
                <select
                  value={selectedDriverId}
                  onChange={e => setSelectedDriverId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-orange-500 cursor-pointer"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id}) - {d.phone || 'بدون هاتف'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">من تاريخ:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-900 focus:outline-orange-500"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">إلى تاريخ:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-900 focus:outline-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Driver Card & KPI Summary */}
          {activeDriver && statement && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Driver Identity Card */}
              <div className="bg-[#0F172A] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      معرّف السائق الثابت
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">حساب مستقل</span>
                  </div>
                  <h4 className="text-base font-black text-white mt-2">{activeDriver.name}</h4>
                  <div className="text-xs text-orange-400 font-mono mt-0.5">ID: {activeDriver.id}</div>
                  <div className="text-[11px] text-slate-300 mt-2 space-y-0.5">
                    <div>📞 الهاتف: {activeDriver.phone || 'غير مسجل'}</div>
                    <div>🪪 الهوية/الإقامة: {activeDriver.nationalId || 'غير مسجل'}</div>
                  </div>
                </div>

                {/* Truck Participation Overview */}
                <div className="pt-3 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3 text-orange-400" />
                    <span>الشاحنات التي قادها هذا السائق:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {statement.trucksUsed.length === 0 ? (
                      <span className="text-[10px] text-slate-500">لا توجد رحلات مسجلة</span>
                    ) : (
                      statement.trucksUsed.map(trk => (
                        <span key={trk.plateNumber} className="text-[10px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                          {trk.plateNumber} ({trk.count} رحلة)
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* KPI 1: Trips Count */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                  <span>إجمالي رحلات السائق</span>
                  <Truck className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  {statement.totalTrips} <span className="text-xs font-normal text-slate-500">رحلة مجمّدة</span>
                </div>
                <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg mt-2 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>معزولة تماماً عن حسابات الشاحنة</span>
                </div>
              </div>

              {/* KPI 2: Total Custody & Expenses */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                  <span>العهد المسلمة والمصروفات</span>
                  <DollarSign className="w-4 h-4 text-blue-500" />
                </div>
                <div className="space-y-1 mt-2">
                  <div className="text-xs text-slate-600 font-semibold flex justify-between">
                    <span>إجمالي العهد:</span>
                    <span className="font-black text-slate-900">{statement.totalDriverCustody.toLocaleString()} ر.س</span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold flex justify-between">
                    <span>المصروفات:</span>
                    <span className="font-black text-red-600">{statement.totalExpenses.toLocaleString()} ر.س</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 mt-2">
                  قيم ثابتة مخزنة لحظة الإدخال
                </div>
              </div>

              {/* KPI 3: Net Due */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-100 text-xs font-bold">
                  <span>صافي المستحق المالي للسائق</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2">
                  {statement.netDue.toLocaleString()} <span className="text-xs font-normal text-emerald-200">ر.س</span>
                </div>
                <div className="text-[10px] text-emerald-100 bg-emerald-800/40 px-2 py-1 rounded-lg mt-2 font-semibold">
                  العمولة المستحقة الصافية بعد تصفية المصروفات
                </div>
              </div>
            </div>
          )}

          {/* Statement Table of Trips */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <span>سجل رحلات السائق المستعلم عنه ({statement?.trips.length || 0} رحلة)</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500">
                مرتبطة بمعرّف: <span className="text-orange-600 font-mono font-black">{activeDriver?.id}</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0F172A] text-white font-bold text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5">رقم الرحلة</th>
                    <th className="px-3 py-2.5">التاريخ</th>
                    <th className="px-3 py-2.5">الشاحنة / اللوحة المستخدمة</th>
                    <th className="px-3 py-2.5">العميل</th>
                    <th className="px-3 py-2.5">مسار الشحن</th>
                    <th className="px-3 py-2.5 text-center">نوع الحمولة</th>
                    <th className="px-3 py-2.5 text-emerald-300">قيمة الرحلة</th>
                    <th className="px-3 py-2.5 text-orange-300">العهدة</th>
                    <th className="px-3 py-2.5 text-blue-300">عمولة السائق</th>
                    <th className="px-3 py-2.5 text-amber-300">صافي المستحق</th>
                    <th className="px-3 py-2.5 text-center">حالة التجميد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!statement || statement.trips.length === 0) ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-xs text-slate-400">
                        لا توجد رحلات مسجلة لهذا السائق خلال الفترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    statement.trips.map(t => {
                      const frozen = t.frozenValues;
                      const plate = frozen?.plateNumber || t.plateNumber;
                      const rev = frozen?.totalAmount ?? t.totalAmount;
                      const custody = frozen?.driverCustody ?? t.driverCustody;
                      const comm = frozen?.commissionAmount ?? t.commissionAmount;
                      const due = frozen?.driverNetDue ?? (comm > 0 ? (comm - t.tripExpenses) : custody);

                      const finCode = t.financialCenterCode || frozen?.financialCenterCode || ('FIN-' + t.tripNumber.replace('TRP-', ''));

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition font-medium">
                          <td className="px-3 py-2.5 font-mono">
                            <div className="font-bold text-slate-900">{t.tripNumber}</div>
                            <div className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5" title="كود القائم المالي / المركز">
                              🏛️ {finCode}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 font-mono whitespace-nowrap">{t.date}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[10.5px]">
                              {plate}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-800 font-bold">{t.customerName}</td>
                          <td className="px-3 py-2.5 text-slate-600 text-[11px] whitespace-nowrap">
                            {t.loadingLocation} ⟵ {t.unloadingLocation}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-600">{t.cargoType || 'بضائع عامة'}</td>
                          <td className="px-3 py-2.5 text-emerald-700 font-black whitespace-nowrap">{rev.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2.5 text-orange-600 font-bold whitespace-nowrap">{custody.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2.5 text-blue-700 font-bold whitespace-nowrap">{comm.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2.5 text-emerald-700 font-black whitespace-nowrap bg-emerald-50/50">{due.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Lock className="w-2.5 h-2.5" />
                              <span>مجمّدة وثابتة</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {statement && statement.trips.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                    <tr>
                      <td colSpan={6} className="px-3 py-2.5 text-slate-900 text-right">
                        الإجمالي العام لمستحقات ورحلات السائق ({statement.trips.length} رحلة):
                      </td>
                      <td className="px-3 py-2.5 text-emerald-800 font-black whitespace-nowrap">
                        {statement.totalRevenue.toLocaleString()} ر.س
                      </td>
                      <td className="px-3 py-2.5 text-orange-700 font-black whitespace-nowrap">
                        {statement.totalDriverCustody.toLocaleString()} ر.س
                      </td>
                      <td className="px-3 py-2.5 text-blue-800 font-black whitespace-nowrap">
                        {statement.totalCommission.toLocaleString()} ر.س
                      </td>
                      <td className="px-3 py-2.5 text-emerald-800 font-black whitespace-nowrap bg-emerald-100">
                        {statement.netDue.toLocaleString()} ر.س
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. RELAY INPUT FORM (النموذج: واجهة إدخال بسيطة مع زر ترحيل آمن) */}
      {/* ========================================================================= */}
      {activeSubTab === 'RELAY_FORM' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    نموذج الإدخال المباشر وزر الترحيل الآمن (Safe Relay Button)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    يقوم بترحيل البيانات لحظياً وتجميدها كقيم نصية ورقمية دائمة تمنع الدوال المتغيرة
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>حماية ضد تداخل الشاحنات</span>
              </div>
            </div>

            <form onSubmit={handleSafeRelay} className="p-4 sm:p-6 space-y-5">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>ملاحظة تقنية مهمة:</strong> عند ضغط زر «الترحيل الآمن»، يتم استنساخ كافة بيانات السائق والشاحنة المحددة وتجميدها معاً في مصفوفة دائمة. حتى لو تم لاحقاً نقل الشاحنة لسائق آخر أو تغيير السائق في أي مكان، سيبقى هذا السجل محتفظاً بالقيم الثابتة المدخلة ولن يتأثر حسابه نهائياً.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Driver Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    1. معرّف واسم السائق الثابت (Driver ID) *
                  </label>
                  <select
                    value={formDriverId}
                    onChange={e => setFormDriverId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-orange-500 cursor-pointer"
                  >
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.id})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 block">
                    يتم الربط حصرياً بهذا المعرف لمنع تداخل التقارير.
                  </span>
                </div>

                {/* Truck Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    2. الشاحنة المستخدمة في هذه الرحلة *
                  </label>
                  <select
                    value={formTruckId}
                    onChange={e => setFormTruckId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-orange-500 cursor-pointer"
                  >
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.plateNumber} ({t.model || 'شاحنة نقل'})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 block">
                    حتى لو كانت الشاحنة مشتركة، تثبت الرحلة باسم السائق المختار أعلاه.
                  </span>
                </div>

                {/* Customer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">3. اسم العميل *</label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={e => setFormCustomerName(e.target.value)}
                    placeholder="مثال: شركة المراعي / مصنع الرياض"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-orange-500"
                  />
                </div>

                {/* Route */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">4. مسار النقل (من - إلى) *</label>
                  <input
                    type="text"
                    value={formRoute}
                    onChange={e => setFormRoute(e.target.value)}
                    placeholder="مثال: الرياض ⟵ جدة"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-orange-500"
                  />
                </div>

                {/* Cargo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">5. نوع الشحنة والبضاعة</label>
                  <input
                    type="text"
                    value={formCargo}
                    onChange={e => setFormCargo(e.target.value)}
                    placeholder="مثال: حمولة طبالي مواد غذائية"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-orange-500"
                  />
                </div>

                {/* Base Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">6. قيمة النقل الإجمالية (ر.س) *</label>
                  <input
                    type="number"
                    min="0"
                    value={formBaseAmount}
                    onChange={e => setFormBaseAmount(Number(e.target.value) || 0)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-black text-emerald-800 focus:outline-orange-500"
                  />
                </div>

                {/* Driver Custody */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">7. عهدة السائق المسلمة (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    value={formDriverCustody}
                    onChange={e => setFormDriverCustody(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-orange-700 focus:outline-orange-500"
                  />
                </div>

                {/* Commission */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">8. عمولة السائق المخصصة (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    value={formCommission}
                    onChange={e => setFormCommission(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-blue-700 focus:outline-orange-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">ملاحظات الترحيل والتثبيت:</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="أي تفاصيل خاصة بتشغيل هذه الشاحنة بواسطة السائق..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-orange-500"
                />
              </div>

              {/* Submit Relay Button */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isRelaying}
                  className="w-full sm:w-auto px-8 py-3 bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isRelaying ? 'جاري الترحيل والتجميد...' : '🔒 ترحيل آمن وتجميد البيانات (Safe Relay)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CENTRAL IMMUTABLE LEDGER (السجل المركزي للحركات المجمّدة) */}
      {/* ========================================================================= */}
      {activeSubTab === 'CENTRAL_LEDGER' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  السجل المركزي للحركات المجمّدة (Central Frozen Master Ledger)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                جدول مركزي يجمع الحركة كبيانات مجمّدة ومربوطة بمعرّف السائق الثابت (Driver ID) دون أي دوال متغيرة.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="بحث برقم الرحلة، السائق، ID..."
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-orange-500"
                />
              </div>

              <button
                type="button"
                onClick={() => exportTripsTableToExcel(centralLedgerTrips, 'السجل_المركزي_المجمد')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير السجل</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0F172A] text-white font-bold text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5">كود الترحيل / البصمة</th>
                    <th className="px-3 py-2.5">رقم الرحلة</th>
                    <th className="px-3 py-2.5">التاريخ</th>
                    <th className="px-3 py-2.5">معرّف السائق (Driver ID)</th>
                    <th className="px-3 py-2.5">اسم السائق</th>
                    <th className="px-3 py-2.5">رقم الشاحنة / اللوحة</th>
                    <th className="px-3 py-2.5">العميل</th>
                    <th className="px-3 py-2.5">المسار</th>
                    <th className="px-3 py-2.5 text-emerald-300">قيمة النقل</th>
                    <th className="px-3 py-2.5 text-orange-300">العهدة</th>
                    <th className="px-3 py-2.5 text-blue-300">صافي المستحق</th>
                    <th className="px-3 py-2.5 text-center">حالة السجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {centralLedgerTrips.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-xs text-slate-400">
                        لا توجد رحلات مجمّدة تطابق البحث.
                      </td>
                    </tr>
                  ) : (
                    centralLedgerTrips.map(t => {
                      const frozen = t.frozenValues;
                      const driverId = frozen?.driverId || t.driverId || 'DRV-UNKNOWN';
                      const driverName = frozen?.driverName || t.driverName;
                      const plate = frozen?.plateNumber || t.plateNumber;
                      const checksum = frozen?.relayChecksum || `SYS-${t.id.slice(-6)}`;
                      const rev = frozen?.totalAmount ?? t.totalAmount;
                      const custody = frozen?.driverCustody ?? t.driverCustody;
                      const due = frozen?.driverNetDue ?? (t.commissionAmount > 0 ? (t.commissionAmount - t.tripExpenses) : custody);

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition font-medium">
                          <td className="px-3 py-2 font-mono text-[10px] text-slate-500 truncate max-w-[120px]" title={checksum}>
                            {checksum}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            <div className="font-bold text-slate-900">{t.tripNumber}</div>
                            <div className="text-[9.5px] text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200 inline-block mt-0.5" title="كود القائم المالي / المركز">
                              🏛️ {t.financialCenterCode || frozen?.financialCenterCode || ('FIN-' + t.tripNumber.replace('TRP-', ''))}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-mono whitespace-nowrap">{t.date}</td>
                          <td className="px-3 py-2">
                            <span className="font-mono font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                              {driverId}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">{driverName}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[10.5px]">
                              {plate}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-800">{t.customerName}</td>
                          <td className="px-3 py-2 text-slate-600 text-[11px] whitespace-nowrap">
                            {t.loadingLocation} ⟵ {t.unloadingLocation}
                          </td>
                          <td className="px-3 py-2 text-emerald-700 font-black whitespace-nowrap">{rev.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 text-orange-600 font-bold whitespace-nowrap">{custody.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 text-emerald-800 font-black whitespace-nowrap bg-emerald-50/40">{due.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Lock className="w-2.5 h-2.5" />
                              <span>مجمّدة (LOCKED)</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GOOGLE APPS SCRIPT CODE & INSTRUCTIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'GAS_SCRIPT' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  كود Google Apps Script الجاهز لزر الترحيل الآمن في جداول جوجل (Google Sheets)
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCopyGasCode}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                {isScriptCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>تم نسخ الكود!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-orange-400" />
                    <span>نسخ كود السكربت</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              تمت برمجة هذا الكود خصيصاً ليتم لصقه داخل <strong>Extensions ⟵ Apps Script</strong> في جدول Google Sheets الخاص بكم. يقوم الكود بقراءة قيم الإدخال ولصقها كقيم ثابتة (Static Values) داخل شيت <strong>«سجل الحركات المركزي (Master Ledger)»</strong> دون استخدام دوال مثل VLOOKUP أو QUERY المتغيرة، مما يحفظ تاريخ الرحلة ومستحقات السائق بدقة متناهية حتى لو تغيّرت بيانات الشاحنات لاحقاً.
            </p>
          </div>

          {/* Code Viewer */}
          <div className="bg-slate-950 text-slate-100 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs text-left" dir="ltr">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-slate-400 text-[11px]">
              <span>GoogleAppsScript_SafeRelay.js</span>
              <button
                type="button"
                onClick={handleCopyGasCode}
                className="text-orange-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isScriptCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto max-h-[480px] p-2 leading-relaxed text-emerald-400">
              {generateGoogleAppsScriptCode()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
