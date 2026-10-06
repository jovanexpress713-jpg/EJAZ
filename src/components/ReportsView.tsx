/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  DollarSign, 
  Truck, 
  Users, 
  UserCheck, 
  Wrench, 
  TrendingUp,
  ChevronDown,
  Share2,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit,
  Pencil,
  X,
  Save,
  Check,
  RotateCcw,
  FileSpreadsheet,
  Smartphone,
  Building2
} from 'lucide-react';
import { safeOpenUrl } from '../utils/safeBrowser';
import { 
  Trip, 
  Customer, 
  Driver, 
  Truck as TruckType, 
  MaintenanceRecord, 
  CollectionRecord, 
  ExpenseRecord, 
  User,
  TripType,
  TripStatus,
  PaymentStatus,
  PaymentMethod,
  MaintenanceType
} from '../types';
import { shareTripReportViaWhatsApp } from '../utils/tripActions';
import { printDriverTripsStatement } from '../utils/driverActions';
import { StorageService } from '../services/storage';
import { extractDriverCode, extractTruckCode, generateTripUniqueKey } from '../utils/uniqueKeyService';
import { exportReportToExcel } from '../utils/excelExporter';
import { DailyHandoverModal } from './DailyHandoverModal';
import { MobileSavePointsModal } from './MobileSavePointsModal';

interface ReportsViewProps {
  trips: Trip[];
  customers: Customer[];
  drivers: Driver[];
  trucks: TruckType[];
  maintenance: MaintenanceRecord[];
  collections: CollectionRecord[];
  expenses: ExpenseRecord[];
  currentUser: User;
  onRefresh?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  trips,
  customers,
  drivers,
  trucks,
  maintenance,
  collections,
  expenses,
  currentUser,
  onRefresh,
}) => {
  const [reportType, setReportType] = useState<'FINANCIAL' | 'TRIPS' | 'CUSTOMERS' | 'DRIVERS' | 'MAINTENANCE'>('FINANCIAL');
  
  // Date filter: Default to ALL trips (empty dates) so no recorded trips are prematurely hidden
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('ALL');
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');
  const [selectedDriverId, setSelectedDriverId] = useState('ALL');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const [printFontSize, setPrintFontSize] = useState<'normal' | 'large' | 'xlarge' | 'huge'>('large');
  const [isDailyHandoverOpen, setIsDailyHandoverOpen] = useState(false);
  const [isSavePointsOpen, setIsSavePointsOpen] = useState(false);
  const settings = useMemo(() => StorageService.getSettings(), []);

  // Export current comprehensive report to Excel
  const handleExportToExcel = () => {
    exportReportToExcel({
      reportType,
      title: activeDriver ? `كشف حساب وعمليات السائق: ${activeDriver.name}` : activeCustomer ? `كشف حساب ومديونيات العميل: ${activeCustomer.name}` : undefined,
      startDate,
      endDate,
      searchTerm: reportSearchTerm,
      activeCustomer,
      activeDriver,
      trips: filteredTrips,
      customers,
      drivers,
      maintenance,
      companySettings: settings,
    });
    setFeedbackMessage('تم تصدير التقرير الشامل بنجاح إلى ملف إكسل (.xlsx)!');
  };

  // Selected driver object if filtered
  const activeDriver = useMemo(() => {
    if (selectedDriverId === 'ALL') return null;
    return drivers.find(d => d.id === selectedDriverId) || null;
  }, [drivers, selectedDriverId]);

  // Selected customer object if filtered
  const activeCustomer = useMemo(() => {
    if (selectedCustomerId === 'ALL') return null;
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Arabic text normalizer for accurate matching across spelling variations
  const normalizeArabic = (str: string): string => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
  };

  // Comprehensive driver trip matching with Strict Driver ID & Frozen Values Priority (يمنع تداخل التقارير عند تشارك الشاحنات)
  const isTripMatchingDriver = (t: Trip, driver: Driver): boolean => {
    // 1. If trip has frozen snapshot, strict match on frozen driver ID or driver name
    if (t.frozenValues?.isFrozen) {
      if (t.frozenValues.driverId === driver.id) return true;
      if (t.frozenValues.driverName && normalizeArabic(t.frozenValues.driverName) === normalizeArabic(driver.name)) return true;
      return false; // Do not fall back to shared trucks!
    }

    // 2. Strict match by driverId
    if (t.driverId && t.driverId === driver.id) return true;

    // 3. Match by driver exact/normalized name if driverId is missing
    if (t.driverName && driver.name) {
      if (t.driverName.trim() === driver.name.trim()) return true;
      if (normalizeArabic(t.driverName) === normalizeArabic(driver.name)) return true;
    }

    // 4. Match by unique phone number
    if (driver.phone && t.driverPhone) {
      const p1 = driver.phone.replace(/\D/g, '');
      const p2 = t.driverPhone.replace(/\D/g, '');
      if (p1 && p2 && p1.length >= 8 && (p1 === p2 || p1.endsWith(p2) || p2.endsWith(p1))) return true;
    }

    // Never match solely by truck when trucks are shared among drivers!
    return false;
  };

  // Total recorded trips for the active driver across ALL time in the system
  const totalDriverTripsInSystem = useMemo(() => {
    if (!activeDriver) return 0;
    return trips.filter(t => isTripMatchingDriver(t, activeDriver)).length;
  }, [trips, activeDriver]);

  // Filtered trips by date range, customer, driver and search term
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchDate = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
      const matchCust = selectedCustomerId === 'ALL' || t.customerId === selectedCustomerId || (activeCustomer && (
        t.customerName === activeCustomer.name ||
        normalizeArabic(t.customerName) === normalizeArabic(activeCustomer.name)
      ));
      const matchDriver = selectedDriverId === 'ALL' || 
        t.driverId === selectedDriverId || 
        (activeDriver && isTripMatchingDriver(t, activeDriver));
      const matchSearch = !reportSearchTerm || 
        t.tripNumber.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        t.customerName.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        t.driverName.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        t.plateNumber.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(reportSearchTerm.toLowerCase())) ||
        (t.cargoType && t.cargoType.toLowerCase().includes(reportSearchTerm.toLowerCase()));
      return matchDate && matchCust && matchDriver && matchSearch;
    });
  }, [trips, startDate, endDate, selectedCustomerId, selectedDriverId, activeCustomer, activeDriver, reportSearchTerm]);

  // Financial aggregates
  const totalRevenue = filteredTrips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalTax = filteredTrips.reduce((acc, t) => acc + (t.taxAmount || 0), 0);
  const totalPaid = filteredTrips.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
  const totalRemaining = filteredTrips.reduce((acc, t) => acc + (t.remainingAmount || 0), 0);
  const totalDriverCustody = filteredTrips.reduce((acc, t) => acc + (t.driverCustody || 0), 0);
  const totalExpensesInRange = expenses
    .filter(e => (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate))
    .reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpensesInRange;

  // Preset Date handler
  const handleSetDatePreset = (preset: 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM') => {
    setDateFilterPreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };

  const handleShowAllDriverTrips = () => {
    setStartDate('');
    setEndDate('');
    setDateFilterPreset('ALL');
  };

  // Active driver unique truck plates in filtered trips
  const activeDriverTripPlates: string[] = useMemo(() => {
    if (!activeDriver) return [];
    return Array.from(
      new Set<string>(
        filteredTrips
          .map(t => (t.plateNumber || t.frozenValues?.plateNumber || '').trim())
          .filter(Boolean)
      )
    );
  }, [activeDriver, filteredTrips]);

  // Official bound truck plate for active driver (Mandatory 1-to-1)
  const officialDriverPlate = useMemo(() => {
    if (!activeDriver) return '';
    return (
      activeDriver.assignedPlateNumber ||
      trucks.find(t => t.id === activeDriver.assignedTruckId)?.plateNumber ||
      (activeDriverTripPlates[0] || '')
    ).trim();
  }, [activeDriver, trucks, activeDriverTripPlates]);

  // Check if there is a discrepancy between driver's assigned truck and trips truck
  const hasTruckDiscrepancy = useMemo(() => {
    if (!activeDriver || activeDriverTripPlates.length === 0) return false;
    // If more than 1 plate is used across trips, strictly flag as discrepancy
    if (activeDriverTripPlates.length > 1) return true;
    if (officialDriverPlate && activeDriverTripPlates[0] !== officialDriverPlate) return true;
    return false;
  }, [activeDriver, activeDriverTripPlates, officialDriverPlate]);

  const handleSyncDriverToTripTruck = (driverId: string, truckPlate: string) => {
    StorageService.syncDriverToTripTruck(driverId, truckPlate, currentUser);
    if (onRefresh) onRefresh();
    setSyncNotification(`✅ تم بنجاح تعديل وتثبيت شاحنة السائق لتصبح (${truckPlate}) متطابقة 100% مع رحلاته المسجلة!`);
    setTimeout(() => setSyncNotification(null), 6000);
  };

  const handleSyncTripsToDriverTruck = (driverId: string, truckPlate: string) => {
    const count = StorageService.syncTripsToDriverTruck(driverId, truckPlate, currentUser);
    if (onRefresh) onRefresh();
    setSyncNotification(`✅ تم بنجاح تحديث وتوحيد لوحة الشاحنة في (${count}) رحلة لتصبح (${truckPlate}) متطابقة مع ملف السائق!`);
    setTimeout(() => setSyncNotification(null), 6000);
  };

  // Helper to render Note & Collection badge in compressed reports
  const renderCollectorBadge = (trip: Trip) => {
    const note = (trip.notes || '').trim();
    const paid = trip.paidAmount || 0;

    if (paid === 0 && !note) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
          <span>⏳ لم يُحصل بعد</span>
        </div>
      );
    }

    const isEjaz = note.includes('إيجاز') || note.includes('الشركة') || note.includes('المؤسسة');
    const isEmployeeOrPerson = note.includes('الموظف') || note.includes('بيد') || note.includes('أبو حسن') || note.includes('ابو حسن') || note.includes('السائق') || note.includes('نقد') || note.includes('كاش');

    return (
      <div className={`p-1.5 rounded-lg text-[11px] leading-snug font-bold border break-words ${
        isEjaz 
          ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
          : isEmployeeOrPerson 
          ? 'bg-amber-50 text-amber-950 border-amber-400 shadow-2xs'
          : note 
          ? 'bg-orange-50 text-orange-950 border-orange-300'
          : 'bg-emerald-50 text-emerald-950 border-emerald-200'
      }`}>
        <div className="flex items-center gap-1 text-[9px] font-bold mb-0.5">
          {isEjaz ? (
            <span className="text-emerald-800 font-black">🏢 مؤسسة إيجاز</span>
          ) : isEmployeeOrPerson ? (
            <span className="text-amber-900 font-black">👤 المحصل / الملاحظة</span>
          ) : note ? (
            <span className="text-orange-900 font-black">📝 ملاحظة التحصيل</span>
          ) : (
            <span className="text-emerald-800 font-black">🏢 مؤسسة إيجاز (حساب بنكي)</span>
          )}
        </div>
        {note ? (
          <div className="text-slate-900 font-black text-xs">{note}</div>
        ) : (
          <div className="text-emerald-800 text-[10px] font-bold">تم التحصيل لحساب المؤسسة</div>
        )}
      </div>
    );
  };

  const handlePrint = () => {
    if (activeDriver) {
      // Direct fail-safe dedicated statement window: guaranteed 0% row loss!
      const settings = StorageService.getSettings();
      printDriverTripsStatement(activeDriver, filteredTrips, settings, {
        start: startDate,
        end: endDate
      }, printFontSize);
    } else {
      window.print();
    }
  };

  const handlePrintDriverDirectStatement = () => {
    if (!activeDriver) return;
    const settings = StorageService.getSettings();
    printDriverTripsStatement(activeDriver, filteredTrips, settings, {
      start: startDate,
      end: endDate
    }, printFontSize);
  };

  const handleShareSummaryViaWhatsApp = () => {
    const reportTitle = 
      activeDriver ? `كشف حساب ورحلات السائق (${activeDriver.name})` :
      activeCustomer ? `كشف حساب العميل (${activeCustomer.name})` :
      reportType === 'FINANCIAL' ? 'التقرير المالي الشامل' :
      reportType === 'TRIPS' ? 'تقرير حركة الرحلات' :
      reportType === 'CUSTOMERS' ? 'كشف مديونيات العملاء' :
      reportType === 'DRIVERS' ? 'تقرير كفاءة السائقين والعهد' : 'تقرير الصيانة الدورية';

    const text = `📊 *مؤسسة إيجاز للنقليات – Ejaz Transport*
📋 *${reportTitle}*
${activeDriver ? `👤 السائق: ${activeDriver.name} (جوال: ${activeDriver.phone})\n🚛 الشاحنة المرتبطة: ${activeDriver.assignedPlateNumber || 'حسب الرحلة'}\n` : ''}${activeCustomer ? `🏢 العميل: ${activeCustomer.name}\n` : ''}📅 الفترة: ${startDate || endDate ? `من ${startDate || 'البداية'} إلى ${endDate || 'اليوم'}` : 'كافة الرحلات المسجلة (شامل)'}
━━━━━━━━━━━━━━━━━━━━
🚚 إجمالي الرحلات: ${filteredTrips.length} رحلة
💰 إجمالي قيمة النقل: ${totalRevenue.toLocaleString()} ر.س
💵 المبالغ المحصلة: ${totalPaid.toLocaleString()} ر.س
⏳ المبالغ المتبقية: ${totalRemaining.toLocaleString()} ر.س
🏷️ إجمالي عهد السائق: ${totalDriverCustody.toLocaleString()} ر.س
━━━━━━━━━━━━━━━━━━━━
تم استخراج التقرير آلياً عبر نظام إيجاز للنقليات.`;

    if (navigator.share) {
      navigator.share({
        title: `${reportTitle} - مؤسسة إيجاز للنقليات`,
        text: text,
      }).catch(() => {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        safeOpenUrl(url);
      });
    } else {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      safeOpenUrl(url);
    }
  };

  const canEdit = !currentUser || currentUser.role !== 'VIEWER';
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // 1. Quick Plate Number Edit State
  const [quickEditTrip, setQuickEditTrip] = useState<Trip | null>(null);
  const [quickPlateNumber, setQuickPlateNumber] = useState('');
  const [quickTruckId, setQuickTruckId] = useState('');
  const [quickAutoLinkDriver, setQuickAutoLinkDriver] = useState(true);
  const [quickError, setQuickError] = useState('');

  const handleOpenQuickPlateEdit = (trip: Trip) => {
    setQuickEditTrip(trip);
    setQuickPlateNumber(trip.plateNumber || '');
    setQuickTruckId(trip.truckId || '');
    setQuickAutoLinkDriver(true);
    setQuickError('');
  };

  const handleSelectQuickTruck = (selectedId: string) => {
    if (selectedId === '__MANUAL__') {
      setQuickTruckId('');
      return;
    }
    const trk = trucks.find(t => t.id === selectedId);
    if (trk) {
      setQuickTruckId(trk.id);
      setQuickPlateNumber(trk.plateNumber);
    }
  };

  const handleSaveQuickPlate = () => {
    if (!quickEditTrip) return;
    const cleanPlate = quickPlateNumber.trim();
    if (!cleanPlate) {
      setQuickError('يرجى إدخال أو اختيار رقم لوحة الشاحنة / السيارة.');
      return;
    }

    try {
      let updatedDriverId = quickEditTrip.driverId;
      let updatedDriverName = quickEditTrip.driverName;
      let updatedDriverPhone = quickEditTrip.driverPhone;

      if (quickAutoLinkDriver) {
        const trk = trucks.find(t => t.id === quickTruckId || t.plateNumber.trim() === cleanPlate);
        if (trk && trk.assignedDriverId) {
          const boundDrv = drivers.find(d => d.id === trk.assignedDriverId);
          if (boundDrv) {
            updatedDriverId = boundDrv.id;
            updatedDriverName = boundDrv.name;
            updatedDriverPhone = boundDrv.phone;
          }
        }
      }

      const updatedTrip: Trip = {
        ...quickEditTrip,
        plateNumber: cleanPlate,
        truckId: quickTruckId || quickEditTrip.truckId,
        driverId: updatedDriverId,
        driverName: updatedDriverName,
        driverPhone: updatedDriverPhone,
      };

      StorageService.saveTrip(updatedTrip, currentUser);
      setQuickEditTrip(null);
      setFeedbackMessage(`تم تحديث رقم السيارة للرحلة (${quickEditTrip.tripNumber}) إلى: ${cleanPlate}`);
      setTimeout(() => setFeedbackMessage(''), 4000);
      onRefresh?.();
    } catch (err: any) {
      setQuickError(err.message || 'فشل حفظ رقم اللوحة');
    }
  };

  // 2. Full Trip Edit State
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripFormData, setTripFormData] = useState<Partial<Trip>>({});
  const [tripValidationErrors, setTripValidationErrors] = useState<string[]>([]);

  const handleOpenEditTrip = (trip: Trip) => {
    setTripValidationErrors([]);
    setEditingTrip(trip);
    setTripFormData({
      ...trip,
      tripType: trip.tripType || 'رحلة داخلية',
      paymentMethod: trip.paymentMethod || 'BANK_TRANSFER',
      paymentStatus: trip.paymentStatus || 'UNPAID',
    });
  };

  const handleAmountChange = (field: string, val: number) => {
    setTripFormData(prev => {
      const updated = { ...prev, [field]: val };
      const base = field === 'baseAmount' ? val : (updated.baseAmount || 0);
      let taxVal = field === 'taxAmount' ? val : (updated.taxAmount || 0);
      let taxR = updated.taxRate ?? 0;

      if (field === 'taxAmount') {
        taxVal = val;
        taxR = base > 0 ? Number(((taxVal / base) * 100).toFixed(1)) : 0;
      } else if (field === 'taxRate') {
        taxR = val;
        taxVal = Math.round(base * (taxR / 100));
      } else if (field === 'baseAmount') {
        taxR = base > 0 ? Number(((taxVal / base) * 100).toFixed(1)) : 0;
      }

      const total = base + (taxVal || 0);
      const paid = field === 'paidAmount' ? val : (updated.paidAmount || 0);
      const remaining = Math.max(0, total - paid);
      
      const comm = field === 'commissionAmount' ? val : (updated.commissionAmount || 0);
      const exp = field === 'tripExpenses' ? val : (updated.tripExpenses || 0);
      const profit = base - exp - comm;

      let payStatus: PaymentStatus = 'UNPAID';
      if (remaining === 0 && total > 0) payStatus = 'PAID';
      else if (paid > 0) payStatus = 'PARTIAL';

      return {
        ...updated,
        baseAmount: base,
        taxRate: taxR,
        taxAmount: taxVal,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        paymentStatus: payStatus,
        commissionAmount: comm,
        tripExpenses: exp,
        netProfit: profit,
      };
    });
  };

  const handleTripTruckChange = (trkId: string) => {
    if (trkId === '__MANUAL__') {
      setTripFormData(prev => ({
        ...prev,
        truckId: '',
      }));
      return;
    }
    const trk = trucks.find(t => t.id === trkId);
    if (trk) {
      const boundDrv = drivers.find(d => d.id === trk.assignedDriverId || d.assignedTruckId === trk.id || (d.assignedPlateNumber && d.assignedPlateNumber === trk.plateNumber));
      setTripFormData(prev => ({
        ...prev,
        truckId: trk.id,
        plateNumber: trk.plateNumber,
        truckType: trk.truckType,
        ...(boundDrv ? {
          driverId: boundDrv.id,
          driverName: boundDrv.name,
          driverPhone: boundDrv.phone,
        } : {})
      }));
    } else {
      setTripFormData(prev => ({ ...prev, truckId: trkId }));
    }
  };

  const handleTripDriverChange = (drvId: string) => {
    if (drvId === '__MANUAL__') {
      setTripFormData(prev => ({
        ...prev,
        driverId: '',
      }));
      return;
    }
    const drv = drivers.find(d => d.id === drvId);
    if (drv) {
      const boundTrk = trucks.find(t => t.id === drv.assignedTruckId || t.assignedDriverId === drv.id || (drv.assignedPlateNumber && t.plateNumber === drv.assignedPlateNumber));
      setTripFormData(prev => ({
        ...prev,
        driverId: drv.id,
        driverName: drv.name,
        driverPhone: drv.phone,
        ...(boundTrk ? {
          truckId: boundTrk.id,
          plateNumber: boundTrk.plateNumber,
          truckType: boundTrk.truckType,
        } : {})
      }));
    } else {
      setTripFormData(prev => ({ ...prev, driverId: drvId }));
    }
  };

  const handleTripCustomerChange = (custId: string) => {
    if (custId === '__MANUAL__') {
      setTripFormData(prev => ({
        ...prev,
        customerId: '',
      }));
      return;
    }
    const c = customers.find(item => item.id === custId);
    if (c) {
      setTripFormData(prev => ({
        ...prev,
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        customerAddress: c.address,
      }));
    } else {
      setTripFormData(prev => ({ ...prev, customerId: custId }));
    }
  };

  const handleSaveFullTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    setTripValidationErrors([]);

    try {
      const tripToSave: Trip = {
        ...editingTrip,
        ...tripFormData,
        tripNumber: tripFormData.tripNumber || editingTrip.tripNumber,
        date: tripFormData.date || editingTrip.date,
        tripType: (tripFormData.tripType as TripType) || 'رحلة داخلية',
        status: (tripFormData.status as TripStatus) || editingTrip.status,
        customerId: tripFormData.customerId || editingTrip.customerId,
        customerName: tripFormData.customerName || editingTrip.customerName,
        customerPhone: tripFormData.customerPhone || '',
        customerAddress: tripFormData.customerAddress || '',
        driverId: tripFormData.driverId || editingTrip.driverId,
        driverName: tripFormData.driverName || editingTrip.driverName,
        driverPhone: tripFormData.driverPhone || '',
        truckId: tripFormData.truckId || editingTrip.truckId,
        plateNumber: tripFormData.plateNumber || editingTrip.plateNumber,
        truckType: (tripFormData.truckType as TruckType) || editingTrip.truckType,
        cargoType: tripFormData.cargoType || '',
        loadingLocation: tripFormData.loadingLocation || '',
        unloadingLocation: tripFormData.unloadingLocation || '',
        loadingTime: tripFormData.loadingTime || '',
        estimatedArrival: tripFormData.estimatedArrival || '',
        actualArrival: tripFormData.actualArrival || '',
        baseAmount: Number(tripFormData.baseAmount) || 0,
        taxRate: Number(tripFormData.taxRate) || 0,
        taxAmount: Number(tripFormData.taxAmount) || 0,
        totalAmount: Number(tripFormData.totalAmount) || 0,
        paidAmount: Number(tripFormData.paidAmount) || 0,
        remainingAmount: Number(tripFormData.remainingAmount) || 0,
        paymentStatus: (tripFormData.paymentStatus as PaymentStatus) || 'UNPAID',
        paymentMethod: (tripFormData.paymentMethod as PaymentMethod) || 'BANK_TRANSFER',
        commissionAmount: Number(tripFormData.commissionAmount) || 0,
        driverCustody: Number(tripFormData.driverCustody) || 0,
        custodyMethod: tripFormData.custodyMethod || '',
        tripExpenses: Number(tripFormData.tripExpenses) || 0,
        netProfit: Number(tripFormData.netProfit) || 0,
        notes: tripFormData.notes || '',
        photoUrl: tripFormData.photoUrl || '',
      };

      StorageService.saveTrip(tripToSave, currentUser);
      setEditingTrip(null);
      setFeedbackMessage(`تم حفظ وتحديث بيانات الرحلة (${tripToSave.tripNumber}) ورقم السيارة بنجاح.`);
      setTimeout(() => setFeedbackMessage(''), 4000);
      onRefresh?.();
    } catch (err: any) {
      setTripValidationErrors([err.message || 'حدث خطأ أثناء حفظ الرحلة']);
    }
  };

  // 3. Maintenance Edit State
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRecord | null>(null);
  const [maintenanceFormData, setMaintenanceFormData] = useState<Partial<MaintenanceRecord>>({});

  const handleOpenEditMaintenance = (record: MaintenanceRecord) => {
    setEditingMaintenance(record);
    setMaintenanceFormData({ ...record });
  };

  const handleSaveMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaintenance) return;
    try {
      const updated: MaintenanceRecord = {
        ...editingMaintenance,
        ...maintenanceFormData,
        plateNumber: (maintenanceFormData.plateNumber || editingMaintenance.plateNumber).trim(),
        amount: Number(maintenanceFormData.amount) || 0,
        date: maintenanceFormData.date || editingMaintenance.date,
        maintenanceType: maintenanceFormData.maintenanceType || editingMaintenance.maintenanceType,
        description: maintenanceFormData.description || editingMaintenance.description,
        nextMaintenanceDate: maintenanceFormData.nextMaintenanceDate || editingMaintenance.nextMaintenanceDate,
      };
      StorageService.saveMaintenance(updated, currentUser);
      setEditingMaintenance(null);
      setFeedbackMessage(`تم تحديث سجل الصيانة للشاحنة (${updated.plateNumber}) بنجاح.`);
      setTimeout(() => setFeedbackMessage(''), 4000);
      onRefresh?.();
    } catch (err: any) {
      setFeedbackMessage(err?.message || 'فشل حفظ سجل الصيانة');
      setTimeout(() => setFeedbackMessage(''), 4000);
    }
  };

  return (
    <div id="ejaz-reports-view" className="space-y-5" dir="rtl">
      {/* Header with Print & WhatsApp Share */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h1 className="text-xl font-black text-slate-900">مركز التقارير التنفيذية وكشوفات الحساب</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تقارير مالية وتشغيلية مجمعة، كشوفات حساب تفصيلية جاهزة للطباعة والتصدير والمشاركة عبر واتساب.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeDriver && (
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-300">
              <span className="text-xs font-bold text-slate-700 px-1">حجم خط الطباعة:</span>
              <select
                value={printFontSize}
                onChange={e => setPrintFontSize(e.target.value as any)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 focus:ring-2 focus:ring-orange-500 cursor-pointer"
                title="تحديد حجم الخط قبل الطباعة"
              >
                <option value="normal">عادي (11pt)</option>
                <option value="large">كبير (13pt)</option>
                <option value="xlarge">🔍 كبير جداً (15pt) ★</option>
                <option value="huge">🔍🔍 ضخم وواضح (17pt)</option>
              </select>
              <button
                type="button"
                onClick={handlePrintDriverDirectStatement}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm py-2 px-3 rounded-lg shadow-md transition flex items-center gap-1.5 cursor-pointer"
                title="طباعة كشف حساب السائق المتكامل بدون أي نقص في جدول A4 مخصص"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>طباعة كشف السائق ({filteredTrips.length} رحلة)</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportToExcel}
            className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            title="تصدير كافة بيانات التقرير الحالي إلى ملف Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>تصدير إلى Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDailyHandoverOpen(true)}
            className="bg-purple-900 hover:bg-purple-950 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-3.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer border border-purple-700"
            title="إعداد ومشاركة محضر التسليم والترحيل النهاري للمالك"
          >
            <Building2 className="w-4 h-4 text-purple-300" />
            <span>محضر التسليم النهاري</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSavePointsOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-3 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            title="نقاط الحفظ والنسخ الاحتياطي للجوال"
          >
            <Smartphone className="w-4 h-4 text-amber-200" />
            <span>نقاط الحفظ للجوال</span>
          </button>

          <button
            type="button"
            onClick={handleShareSummaryViaWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            title="مشاركة ملخص التقرير عبر واتساب"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span>مشاركة واتساب</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-2.5 px-5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>{activeDriver ? 'طباعة التقرير الشامل' : 'طباعة التقرير'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-200/60 p-1.5 rounded-2xl no-print">
        <button
          onClick={() => setReportType('FINANCIAL')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'FINANCIAL' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <DollarSign className="w-4 h-4 text-orange-400" />
          <span>التقرير المالي الشامل</span>
        </button>

        <button
          onClick={() => setReportType('TRIPS')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'TRIPS' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <Truck className="w-4 h-4 text-orange-400" />
          <span>تقرير حركة الرحلات</span>
        </button>

        <button
          onClick={() => setReportType('CUSTOMERS')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'CUSTOMERS' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4 text-orange-400" />
          <span>كشف مديونيات العملاء</span>
        </button>

        <button
          onClick={() => setReportType('DRIVERS')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'DRIVERS' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <UserCheck className="w-4 h-4 text-orange-400" />
          <span>أداء السائقين والعهد</span>
        </button>

        <button
          onClick={() => setReportType('MAINTENANCE')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'MAINTENANCE' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <Wrench className="w-4 h-4 text-orange-400" />
          <span>تكاليف صيانة الأسطول</span>
        </button>
      </div>

      {/* Date & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 no-print">
        {/* Date Filter Bar with Quick Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 ml-1">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>فترة التقرير:</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleSetDatePreset('ALL')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  dateFilterPreset === 'ALL' && !startDate && !endDate
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                جميع الفترات (الكل)
              </button>

              <button
                type="button"
                onClick={() => handleSetDatePreset('THIS_MONTH')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  dateFilterPreset === 'THIS_MONTH'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                هذا الشهر
              </button>

              <button
                type="button"
                onClick={() => handleSetDatePreset('LAST_MONTH')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  dateFilterPreset === 'LAST_MONTH'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                الشهر السابق
              </button>

              <button
                type="button"
                onClick={() => setDateFilterPreset('CUSTOM')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  dateFilterPreset === 'CUSTOM' || startDate || endDate
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                فترة مخصصة
              </button>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label htmlFor="reportStartDate" className="text-slate-500 font-semibold">من:</label>
              <input
                id="reportStartDate"
                name="reportStartDate"
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDateFilterPreset('CUSTOM');
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="reportEndDate" className="text-slate-500 font-semibold">إلى:</label>
              <input
                id="reportEndDate"
                name="reportEndDate"
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDateFilterPreset('CUSTOM');
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleShowAllDriverTrips}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold underline px-1 transition"
                title="إلغاء فلتر التاريخ وعرض كل الرحلات"
              >
                عرض الكل
              </button>
            )}
          </div>
        </div>

        {/* Filters Grid for Driver and Customer & Quick Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Search by note or keyword */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="بحث بالملاحظات (مثل: بيد أبو حسن، نقد، إيجاز)..."
              value={reportSearchTerm}
              onChange={e => setReportSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
            />
            {reportSearchTerm && (
              <button 
                type="button" 
                onClick={() => setReportSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 font-bold px-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Driver Filter - Highlighted */}
          <div className="flex items-center gap-2 bg-amber-50/70 p-2 rounded-xl border border-amber-200">
            <UserCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <label htmlFor="reportDriverSelect" className="text-amber-900 font-bold whitespace-nowrap">
              السائق:
            </label>
            <select
              id="reportDriverSelect"
              name="reportDriverSelect"
              value={selectedDriverId}
              onChange={e => setSelectedDriverId(e.target.value)}
              className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 font-bold text-xs text-slate-900 focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">جميع السائقين ({trips.length} رحلة)</option>
              {drivers.map(d => {
                const driverTripsCount = trips.filter(t => isTripMatchingDriver(t, d)).length;
                const linkedTruck = trucks.find(t => t.id === d.assignedTruckId || t.plateNumber === d.assignedPlateNumber);
                const truckInfo = d.assignedPlateNumber || linkedTruck?.plateNumber;
                return (
                  <option key={d.id} value={d.id}>
                    👤 {d.name} ({driverTripsCount} رحلة) {truckInfo ? `• ${truckInfo}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Customer Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <label htmlFor="reportCustomerSelect" className="text-slate-700 font-bold whitespace-nowrap">
              العميل:
            </label>
            <select
              id="reportCustomerSelect"
              name="reportCustomerSelect"
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-xs text-slate-900 focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">جميع العملاء</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Driver Banner with Discrepancy Prevention Alert */}
        {activeDriver && (
          <div className="space-y-2">
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                  {activeDriver.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">{activeDriver.name}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      تقرير سائق رسمي
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-3">
                    <span>📱 الجوال: <strong className="font-mono text-slate-800">{activeDriver.phone || 'غير مسجل'}</strong></span>
                    <span>🚛 الشاحنة المعتمدة (ربط إجباري): <strong className="font-mono text-emerald-800 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">{officialDriverPlate || 'غير محددة'}</strong></span>
                    {hasTruckDiscrepancy && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px]">
                        ⚠️ رحلات مسجلة بشاحنة أخرى ({activeDriverTripPlates.join('، ')})
                      </span>
                    )}
                    <span>🪪 الرخصة: <strong className="font-mono">{activeDriver.licenseNumber || '—'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mr-auto sm:mr-0">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-center">
                  <span className="text-[10px] text-slate-500 block font-semibold">إجمالي رحلاته بالنظام</span>
                  <span className="text-sm font-black text-slate-900">{totalDriverTripsInSystem} رحلة</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-center">
                  <span className="text-[10px] text-slate-500 block font-semibold">المعروضة بالتقرير</span>
                  <span className="text-sm font-black text-orange-600">{filteredTrips.length} رحلة</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-center">
                  <span className="text-[10px] text-slate-500 block font-semibold">إجمالي العهد</span>
                  <span className="text-sm font-black text-orange-600">{totalDriverCustody.toLocaleString()} ر.س</span>
                </div>

                <button
                  type="button"
                  onClick={handlePrintDriverDirectStatement}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="طباعة كشف حساب السائق كاملاً"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة كشف السائق</span>
                </button>
              </div>
            </div>

            {/* Date filter exclusion alert banner */}
            {filteredTrips.length < totalDriverTripsInSystem && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <div>
                    <span className="font-bold block">
                      انتبه: إجمالي رحلات السائق المسجلة بالنظام هي {totalDriverTripsInSystem} رحلة، لكن يظهر حالياً {filteredTrips.length} رحلة فقط بسبب فلتر الفترة الزمنية!
                    </span>
                    <span className="text-[11px] text-slate-600">
                      إذا أردت طباعة كافة الـ ({totalDriverTripsInSystem}) رحلة كاملة بدون أي استبعاد، اضغط الزر أدناه:
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShowAllDriverTrips}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm whitespace-nowrap cursor-pointer transition flex items-center gap-1"
                >
                  <span>عرض وطباعة كافة الرحلات ({totalDriverTripsInSystem} رحلة)</span>
                </button>
              </div>
            )}

            {/* Driver Truck Discrepancy Reconciliation Box */}
            {hasTruckDiscrepancy && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span className="font-black text-amber-950 text-sm">تنبيه نظام الربط الإجباري (سائق واحد = شاحنة واحدة): تم رصد اختلاف في شاحنات الرحلات</span>
                  </div>
                  <p className="text-amber-900 leading-relaxed">
                    الشاحنة الإلزامية المعتمدة للسائق هي <strong className="font-mono text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 font-black">[{officialDriverPlate}]</strong>، 
                    بينما توجد رحلات مسجلة بشاحنات أخرى <strong className="font-mono text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">[{activeDriverTripPlates.join('، ')}]</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleSyncTripsToDriverTruck(activeDriver.id, officialDriverPlate)}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
                    title="توحيد وتعديل كافة رحلات هذا السائق لتصبح بشاحنته الإلزامية"
                  >
                    <span>🔒 توحيد وإلزام كافة الرحلات بالشاحنة ({officialDriverPlate})</span>
                  </button>
                </div>
              </div>
            )}

            {syncNotification && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs">
                <span>✅</span>
                <span>{syncNotification}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable Report Canvas */}
      <div id="printable-report-sheet" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 print-page">
        {/* Report Official Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h2 className="text-xl font-black text-[#0F172A]">مؤسسة إيجاز للنقليات – Ejaz Transport</h2>
            <div className="text-xs text-slate-500 mt-1">سجل تجاري: 1010884921 • الرقم الضريبي: 300094829100003</div>
          </div>
          <div className="text-left">
            <div className="text-sm font-black text-orange-600 font-mono">
              {activeDriver ? `كشف حساب ورحلات السائق: ${activeDriver.name}` : (
                <>
                  {reportType === 'FINANCIAL' && 'تقرير الأداء المالي والأرباح'}
                  {reportType === 'TRIPS' && 'تقرير حركة وتشغيل الرحلات'}
                  {reportType === 'CUSTOMERS' && 'كشف مديونيات وحسابات العملاء'}
                  {reportType === 'DRIVERS' && 'تقرير إنتاجية السائقين والعهد'}
                  {reportType === 'MAINTENANCE' && 'تقرير مصاريف وصيانة الشاحنات'}
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              تاريخ الاستخراج: {new Date().toLocaleDateString('ar-SA')}
            </div>
            {activeDriver && (
              <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                الشاحنة المربوطة: {activeDriver.assignedPlateNumber || 'حسب الرحلة'}
              </div>
            )}
          </div>
        </div>

        {/* 1. FINANCIAL REPORT */}
        {reportType === 'FINANCIAL' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold">إجمالي إيرادات النقل</span>
                <div className="text-xl font-black text-slate-900 mt-1">{totalRevenue.toLocaleString()} ر.س</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-800 font-semibold">إجمالي المبالغ المحصلة</span>
                <div className="text-xl font-black text-emerald-700 mt-1">{totalPaid.toLocaleString()} ر.س</div>
              </div>
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-800 font-semibold">إجمالي المصروفات والتشغيل</span>
                <div className="text-xl font-black text-rose-700 mt-1">{totalExpensesInRange.toLocaleString()} ر.س</div>
              </div>
              <div className="bg-[#0F172A] p-4 rounded-xl text-white">
                <span className="text-xs text-orange-400 font-semibold">صافي الربح التشغيلي</span>
                <div className="text-xl font-black text-white mt-1">{netProfit.toLocaleString()} ر.س</div>
              </div>
            </div>

            {/* Detailed summary */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-right">
                <thead className="bg-slate-100 font-bold text-slate-800">
                  <tr>
                    <th className="p-3">البند المالي</th>
                    <th className="p-3">القيمة (ر.س)</th>
                    <th className="p-3">النسبة / الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-semibold">إجمالي قيمة فواتير النقل</td>
                    <td className="p-3 font-bold">{totalRevenue.toLocaleString()} ر.س</td>
                    <td className="p-3 text-slate-500">100% من حجم الأعمال</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">ضريبة القيمة المضافة (15%)</td>
                    <td className="p-3 font-bold">{totalTax.toLocaleString()} ر.س</td>
                    <td className="p-3 text-slate-500">مستحقة لهيئة الزكاة والضريبة والجمارك</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">المبالغ غير المحصلة (ذمم مدينة)</td>
                    <td className="p-3 font-bold text-amber-700">{totalRemaining.toLocaleString()} ر.س</td>
                    <td className="p-3 text-slate-500">مستحقات آجلة لدى العملاء</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">إجمالي عهد ومصاريف السائقين</td>
                    <td className="p-3 font-bold text-orange-600">{totalDriverCustody.toLocaleString()} ر.س</td>
                    <td className="p-3 text-slate-500">وقود، ميازين، إعاشة ومصروفات طريق</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-3 text-slate-900">صافي الأرباح المحققة بعد خصم المصاريف</td>
                    <td className="p-3 text-emerald-700 text-sm">{netProfit.toLocaleString()} ر.س</td>
                    <td className="p-3 text-emerald-700">هوامش تشغيل ممتازة</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. TRIPS REPORT */}
        {reportType === 'TRIPS' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                إجمالي الرحلات المسجلة: <strong className="font-bold text-slate-900">{filteredTrips.length} رحلة</strong>
                {reportSearchTerm && <span className="text-orange-600 mr-1">(تصفية بـ: "{reportSearchTerm}")</span>}
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span>المفوتر: <strong className="font-bold text-slate-900">{totalRevenue.toLocaleString()} ر.س</strong></span>
                <span>المحصل: <strong className="font-bold text-emerald-700">{totalPaid.toLocaleString()} ر.س</strong></span>
                <span>المتبقي: <strong className="font-bold text-amber-700">{totalRemaining.toLocaleString()} ر.س</strong></span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] sm:text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-[#0F172A] text-white font-bold text-[11px]">
                    <tr>
                      <th className="px-2.5 py-2.5 whitespace-nowrap">رقم وتاريخ الرحلة</th>
                      <th className="px-2 py-2.5 whitespace-nowrap">النوع</th>
                      <th className="px-2.5 py-2.5">العميل</th>
                      <th className="px-2.5 py-2.5">المسار والحمولة</th>
                      <th className="px-2 py-2.5 whitespace-nowrap">الشاحنة / السائق</th>
                      <th className="px-2 py-2.5 whitespace-nowrap">إجمالي الرحلة</th>
                      <th className="px-2 py-2.5 whitespace-nowrap text-emerald-400">المحصل</th>
                      <th className="px-2 py-2.5 whitespace-nowrap text-amber-300 font-bold">المبلغ المتبقي</th>
                      <th className="px-2.5 py-2.5 min-w-[150px] max-w-[220px] text-orange-300 font-black">
                        من المحصل
                      </th>
                      <th className="px-2 py-2.5 text-center whitespace-nowrap no-print">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTrips.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold">
                          لا توجد رحلات مسجلة مطابقة للبحث والفترة المحددة.
                        </td>
                      </tr>
                    ) : (
                      filteredTrips.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition">
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">{t.tripNumber}</div>
                            <div className="text-[10px] text-amber-800 font-mono font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200 mt-0.5 inline-block">
                              🏦 {t.financialCenterCode || 'FIN-' + t.tripNumber.replace('TRP-', '')}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">{t.date}</div>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {t.operationType === 'SUBCONTRACTED_SPOT' || t.isSubcontracted ? (
                              <div>
                                <span className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-200 block">
                                  🤝 وساطة لحظية
                                </span>
                                <span className="text-[9.5px] text-purple-700 font-mono font-bold block mt-0.5">
                                  هامش: +{(t.brokerageMargin ?? Math.max(0, (t.totalAmount || 0) - (t.externalCarrierCost || 0))).toLocaleString()} ر.س
                                </span>
                              </div>
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.tripType === 'رحلة دولية'
                                  ? 'bg-purple-100 text-purple-800'
                                  : t.tripType === 'رحلة خارجية'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {t.tripType || 'رحلة داخلية'}
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-2">
                            <div className="font-bold text-slate-900">{t.customerName}</div>
                            {t.customerPhone && <div className="text-[10px] font-mono text-slate-400">{t.customerPhone}</div>}
                          </td>
                          <td className="px-2.5 py-2">
                            <div className="font-semibold text-slate-800">
                              {t.loadingLocation.split('-')[0]} ➔ {t.unloadingLocation.split('-')[0]}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{t.cargoType}</div>
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800">{t.plateNumber}</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickPlateEdit(t)}
                                  className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition no-print cursor-pointer"
                                  title="تعديل سريع لرقم السيارة / اللوحة"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">{t.driverName}</div>
                          </td>
                          <td className="px-2.5 py-2 font-bold text-slate-900 whitespace-nowrap">
                            {t.totalAmount.toLocaleString()} ر.س
                          </td>
                          <td className="px-2.5 py-2 text-emerald-700 font-bold whitespace-nowrap">
                            {t.paidAmount.toLocaleString()} ر.س
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap font-bold">
                            {t.remainingAmount > 0 ? (
                              <span className="text-amber-700 font-black">{t.remainingAmount.toLocaleString()} ر.س</span>
                            ) : (
                              <span className="text-emerald-700 text-[10px] font-bold">مسدد 0 ر.س</span>
                            )}
                          </td>
                          {/* Dedicated Note & Collection Column */}
                          <td className="px-2.5 py-2 min-w-[150px] max-w-[220px]">
                            {renderCollectorBadge(t)}
                          </td>
                          <td className="px-2 py-2 text-center whitespace-nowrap no-print">
                            <div className="flex items-center justify-center gap-1.5">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTrip(t)}
                                  className="p-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition inline-flex items-center gap-1 text-[10px] font-bold border border-amber-200 cursor-pointer"
                                  title="تعديل كافة بيانات الرحلة ورقم السيارة"
                                >
                                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                                  <span>تعديل</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => shareTripReportViaWhatsApp(t)}
                                className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                title="مشاركة التقرير عبر واتساب"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">واتساب</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredTrips.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-[11px]">
                      <tr>
                        <td colSpan={5} className="px-2.5 py-2 text-slate-900 text-right">
                          الإجمالي العام ({filteredTrips.length} رحلة):
                        </td>
                        <td className="px-2.5 py-2 text-slate-900 whitespace-nowrap">{totalRevenue.toLocaleString()} ر.س</td>
                        <td className="px-2.5 py-2 text-emerald-700 whitespace-nowrap">{totalPaid.toLocaleString()} ر.س</td>
                        <td className="px-2.5 py-2 text-amber-700 whitespace-nowrap">{totalRemaining.toLocaleString()} ر.س</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. CUSTOMERS REPORT */}
        {reportType === 'CUSTOMERS' && (
          <div className="space-y-4">
            {activeCustomer ? (
              /* Single Customer Detailed Statement */
              <div className="space-y-4">
                {/* Customer Profile Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">كشف حساب ومديونية العميل: {activeCustomer.name}</span>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {activeCustomer.paymentTerms || 'أجل'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-4">
                      <span>رقم الجوال: <strong className="font-mono">{activeCustomer.phone || '—'}</strong></span>
                      <span>الرقم الضريبي: <strong className="font-mono">{activeCustomer.taxNumber || '—'}</strong></span>
                      <span>العنوان: <strong>{activeCustomer.address || '—'}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId('ALL')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-300 transition"
                  >
                    ← العودة لجميع العملاء
                  </button>
                </div>

                {/* Customer Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold">عدد الرحلات</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">{filteredTrips.length} رحلة</div>
                  </div>
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-semibold">إجمالي المفوتر</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">{totalRevenue.toLocaleString()} ر.س</div>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-semibold">إجمالي المسدد والمحصل</span>
                    <div className="text-base font-black text-emerald-700 mt-0.5">{totalPaid.toLocaleString()} ر.س</div>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-800 font-semibold">المتبقي المطلوب</span>
                    <div className={`text-base font-black mt-0.5 ${totalRemaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {totalRemaining.toLocaleString()} ر.س
                    </div>
                  </div>
                </div>

                {/* Detailed Customer Trips Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] sm:text-xs">
                  <div className="bg-[#0F172A] text-white px-3.5 py-2 font-bold flex items-center justify-between text-xs">
                    <span>سجل رحلات وفواتير وتحصيل العميل التفصيلي</span>
                    <span className="text-[10px] text-orange-400 font-normal">{filteredTrips.length} رحلة</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-100 font-bold text-slate-800 text-[11px]">
                        <tr>
                          <th className="px-2.5 py-2 whitespace-nowrap">رقم وتاريخ الرحلة</th>
                          <th className="px-2.5 py-2">المسار والحمولة</th>
                          <th className="px-2 py-2 whitespace-nowrap">الشاحنة / السائق</th>
                          <th className="px-2 py-2 text-slate-900 whitespace-nowrap">إجمالي الرحلة</th>
                          <th className="px-2 py-2 text-emerald-800 whitespace-nowrap">المحصل</th>
                          <th className="px-2 py-2 text-amber-800 whitespace-nowrap font-bold">المبلغ المتبقي</th>
                          <th className="px-2.5 py-2 min-w-[150px] max-w-[220px] text-orange-950 font-black">
                            من المحصل
                          </th>
                          <th className="px-2 py-2 text-center whitespace-nowrap">الحالة</th>
                          <th className="px-2 py-2 text-center whitespace-nowrap no-print">تعديل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTrips.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-slate-400 font-semibold">
                              لا توجد رحلات مسجلة لهذا العميل في الفترة المحددة.
                            </td>
                          </tr>
                        ) : (
                          filteredTrips.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="px-2.5 py-2 whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-900">{t.tripNumber}</div>
                                <div className="text-[10px] text-slate-500">{t.date}</div>
                              </td>
                              <td className="px-2.5 py-2">
                                <div className="font-semibold text-slate-800">
                                  {t.loadingLocation.split('-')[0]} ➔ {t.unloadingLocation.split('-')[0]}
                                </div>
                                <div className="text-[10px] text-slate-500">{t.cargoType}</div>
                              </td>
                              <td className="px-2.5 py-2 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-800">{t.plateNumber}</span>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuickPlateEdit(t)}
                                      className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition no-print cursor-pointer"
                                      title="تعديل سريع لرقم السيارة / اللوحة"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500">{t.driverName}</div>
                              </td>
                              <td className="px-2.5 py-2 font-bold text-slate-900 whitespace-nowrap">
                                {t.totalAmount.toLocaleString()} ر.س
                              </td>
                              <td className="px-2.5 py-2 text-emerald-700 font-bold whitespace-nowrap">
                                {t.paidAmount.toLocaleString()} ر.س
                              </td>
                              <td className="px-2.5 py-2 whitespace-nowrap font-bold">
                                {t.remainingAmount > 0 ? (
                                  <span className="text-amber-700 font-black">{t.remainingAmount.toLocaleString()} ر.س</span>
                                ) : (
                                  <span className="text-emerald-700 text-[10px] font-bold">مسدد 0 ر.س</span>
                                )}
                              </td>
                              {/* Dedicated Note & Collection Column */}
                              <td className="px-2.5 py-2 min-w-[150px] max-w-[220px]">
                                {renderCollectorBadge(t)}
                              </td>
                              <td className="px-2 py-2 text-center whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                                  {t.status === 'COMPLETED' ? 'مكتملة' : t.status === 'DELIVERED' ? 'تم التوصيل' : t.status === 'IN_TRANSIT' ? 'جارية' : 'جديدة'}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center whitespace-nowrap no-print">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTrip(t)}
                                    className="p-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition inline-flex items-center gap-1 text-[10px] font-bold border border-amber-200 cursor-pointer"
                                    title="تعديل كافة بيانات الرحلة ورقم السيارة"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-amber-700" />
                                    <span>تعديل</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {filteredTrips.length > 0 && (
                        <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-[11px]">
                          <tr>
                            <td colSpan={3} className="px-2.5 py-2 text-slate-900 text-right">
                              الإجمالي العام للعميل ({filteredTrips.length} رحلة):
                            </td>
                            <td className="px-2.5 py-2 text-slate-900 whitespace-nowrap">{totalRevenue.toLocaleString()} ر.س</td>
                            <td className="px-2.5 py-2 text-emerald-700 whitespace-nowrap">{totalPaid.toLocaleString()} ر.س</td>
                            <td className="px-2.5 py-2 text-amber-700 whitespace-nowrap">{totalRemaining.toLocaleString()} ر.س</td>
                            <td colSpan={3}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* All Customers Summary Table */
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-[#0F172A] text-white font-bold text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5">اسم العميل</th>
                      <th className="px-3 py-2.5">الجوال</th>
                      <th className="px-3 py-2.5">شروط السداد</th>
                      <th className="px-3 py-2.5">إجمالي المفوتر</th>
                      <th className="px-3 py-2.5">المحصل</th>
                      <th className="px-3 py-2.5">الرصيد المستحق (المتبقي)</th>
                      <th className="px-3 py-2.5 text-center">كشف العميل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map(c => {
                      const cTrips = trips.filter(t => {
                        const matchDate = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
                        return matchDate && (t.customerId === c.id || t.customerName === c.name);
                      });
                      const billed = cTrips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
                      const paid = cTrips.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
                      const rem = Math.max(0, billed - paid);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-900">{c.name}</td>
                          <td className="px-3 py-2 font-mono text-slate-500">{c.phone}</td>
                          <td className="px-3 py-2 text-slate-600">{c.paymentTerms}</td>
                          <td className="px-3 py-2 font-bold">{billed.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 font-bold text-emerald-700">{paid.toLocaleString()} ر.س</td>
                          <td className={`px-3 py-2 font-bold ${rem > 0 ? 'text-amber-700 font-black' : 'text-emerald-700'}`}>
                            {rem.toLocaleString()} ر.س
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId(c.id)}
                              className="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold transition border border-amber-200 inline-flex items-center gap-1"
                            >
                              <span>كشف مفصل</span>
                              <span>←</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. DRIVERS REPORT */}
        {reportType === 'DRIVERS' && (
          <div className="space-y-4">
            {activeDriver ? (
              /* Single Driver Detailed Account Statement */
              <div className="space-y-4">
                {/* Driver Profile Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900">كشف حساب ورحلات السائق: {activeDriver.name}</span>
                      <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        ID: {activeDriver.id}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {activeDriver.status === 'ACTIVE' ? 'على رأس العمل' : 'إجازة / موقف'}
                      </span>
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                        🔒 حساب معزول عن الشاحنات
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-4">
                      <span>الهوية / الإقامة: <strong className="font-mono">{activeDriver.nationalId || '—'}</strong></span>
                      <span>رقم الجوال: <strong className="font-mono">{activeDriver.phone || '—'}</strong></span>
                      <span>رقم الرخصة: <strong className="font-mono">{activeDriver.licenseNumber || '—'}</strong></span>
                      <span>انتهاء الرخصة: <strong className="font-mono">{activeDriver.licenseExpiry || '—'}</strong></span>
                      <span>الشاحنة المعتمدة (ربط إجباري): <strong className="font-mono text-emerald-800 font-bold">{officialDriverPlate || 'غير محددة'}</strong></span>
                      {hasTruckDiscrepancy && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                          ⚠️ رحلات بشاحنات أخرى ({activeDriverTripPlates.join('، ')})
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDriverId('ALL')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-300 transition"
                  >
                    ← العودة لجميع السائقين
                  </button>
                </div>

                {/* Driver Truck Discrepancy Reconciliation Box in Statement */}
                {hasTruckDiscrepancy && (() => {
                  const driverCode = extractDriverCode(activeDriver.nationalId);
                  const driverTruckCode = extractTruckCode(activeDriver.assignedPlateNumber);
                  const firstTripPlate = activeDriverTripPlates[0] || '';
                  const tripTruckCode = extractTruckCode(firstTripPlate);
                  const sampleTrip = filteredTrips[0];
                  const sampleKeyWithTripTruck = sampleTrip ? generateTripUniqueKey(sampleTrip.tripNumber, activeDriver.nationalId, firstTripPlate) : `TRIP-XXX-${driverCode}-${tripTruckCode}`;
                  const sampleKeyWithDriverTruck = sampleTrip ? generateTripUniqueKey(sampleTrip.tripNumber, activeDriver.nationalId, activeDriver.assignedPlateNumber) : `TRIP-XXX-${driverCode}-${driverTruckCode}`;

                  return (
                    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 shadow-sm space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⚠️</span>
                          <div>
                            <span className="font-black text-amber-950 text-sm">تنبيه التحقق المباشر (Validation) – عدم تطابق الشاحنة وكود الربط</span>
                            <div className="text-[11px] text-amber-800 font-semibold">
                              صيغة الربط الموحد: <strong className="font-mono text-slate-900">[كود الرحلة]-[آخر 5 أرقام للهوية]-[آخر رقمين للشاحنة]</strong>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-200/80 text-amber-950 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-300">
                            كود السائق (الهوية): <strong className="font-mono text-slate-900">{driverCode}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200">
                          <div className="text-slate-500 text-[10px] font-bold mb-0.5">الشاحنة المسجلة بملف السائق الرسمي:</div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded">
                              {activeDriver.assignedPlateNumber || 'غير محددة'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-700">
                              كود الشاحنة (آخر رقمين): <strong className="font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">{driverTruckCode}</strong>
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            المعرف المتوقع لملف السائق: <strong className="text-slate-800">{sampleKeyWithDriverTruck}</strong>
                          </div>
                        </div>

                        <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200">
                          <div className="text-slate-500 text-[10px] font-bold mb-0.5">الشاحنة الفعلية بالرحلات المسجلة ({filteredTrips.length} رحلة):</div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-900 text-xs bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                              {activeDriverTripPlates.join('، ')}
                            </span>
                            <span className="text-[11px] font-bold text-slate-700">
                              كود الشاحنة (آخر رقمين): <strong className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{tripTruckCode}</strong>
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            المعرف الفعلي بالرحلة: <strong className="text-blue-800">{sampleKeyWithTripTruck}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                        <span className="text-[11px] text-amber-900 font-semibold">
                          اختر إجراء المطابقة والتحديث التلقائي لتوحيد كود الربط في كافة ملفات السائق والرحلات:
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {activeDriverTripPlates.length === 1 && (
                            <button
                              type="button"
                              onClick={() => handleSyncDriverToTripTruck(activeDriver.id, activeDriverTripPlates[0])}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
                              title="تعديل شاحنة السائق الرسمية في الملف لتطابق شاحنة رحلاته وتحديث كود الربط"
                            >
                              <span>🔄 مطابقة: اعتماد شاحنة الرحلة ({activeDriverTripPlates[0]}) للملف</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSyncTripsToDriverTruck(activeDriver.id, activeDriver.assignedPlateNumber!)}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
                            title="تعديل لوحة الشاحنة في جميع رحلات هذا السائق لتطابق ملف السائق وتحديث كود الربط"
                          >
                            <span>🔄 مطابقة: تعديل الرحلات لتطابق ملف السائق ({activeDriver.assignedPlateNumber})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Driver Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold">عدد الرحلات المنفذة</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">{filteredTrips.length} رحلة</div>
                  </div>
                  <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-200">
                    <span className="text-[10px] text-orange-800 font-semibold">إجمالي العهد المسلمة للسائق</span>
                    <div className="text-base font-black text-orange-600 mt-0.5">{totalDriverCustody.toLocaleString()} ر.س</div>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-semibold">إجمالي قيمة النقل المنقول</span>
                    <div className="text-base font-black text-emerald-700 mt-0.5">{totalRevenue.toLocaleString()} ر.س</div>
                  </div>
                  <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-800 font-semibold">متوسط العهدة لكل رحلة</span>
                    <div className="text-base font-black text-blue-700 mt-0.5">
                      {filteredTrips.length > 0 ? Math.round(totalDriverCustody / filteredTrips.length).toLocaleString() : 0} ر.س
                    </div>
                  </div>
                </div>

                {/* Detailed Trips Table for this Driver - Compressed with Note Column */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] sm:text-xs print:overflow-visible print:border-none">
                  <div className="bg-[#0F172A] text-white px-3.5 py-2 font-bold flex flex-wrap items-center justify-between gap-2 text-xs no-print">
                    <div className="flex items-center gap-2">
                      <span>جدول رحلات وعُهد وإيرادات وملاحظات السائق ({activeDriver.name})</span>
                      <span className="text-[10px] text-orange-400 font-normal bg-slate-800 px-2 py-0.5 rounded-full">
                        {filteredTrips.length} رحلة مسجلة
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-300 font-bold">حجم خط الطباعة:</span>
                        <select
                          value={printFontSize}
                          onChange={e => setPrintFontSize(e.target.value as any)}
                          className="text-[11px] font-bold bg-slate-900 border border-slate-700 rounded text-orange-400 px-2 py-0.5 focus:outline-none cursor-pointer"
                        >
                          <option value="normal">عادي (11pt)</option>
                          <option value="large">كبير (13pt)</option>
                          <option value="xlarge">كبير جداً (15pt) ★</option>
                          <option value="huge">ضخم وواضح (17pt)</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handlePrintDriverDirectStatement}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        title="طباعة كشف هذا السائق كاملاً بدون أي نقص"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة كشف الحساب والرحلات A4</span>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-right print-table">
                      <thead className="bg-slate-100 font-bold text-slate-800 text-[11px]">
                        <tr>
                          <th className="px-2.5 py-2 whitespace-nowrap">رقم وتاريخ الرحلة</th>
                          <th className="px-2.5 py-2">العميل</th>
                          <th className="px-2.5 py-2">خط السير (المشوار)</th>
                          <th className="px-2 py-2 whitespace-nowrap">الشاحنة</th>
                          <th className="px-2 py-2 text-slate-900 whitespace-nowrap">إجمالي الرحلة</th>
                          <th className="px-2 py-2 text-emerald-800 whitespace-nowrap">المحصل</th>
                          <th className="px-2 py-2 text-amber-800 whitespace-nowrap font-bold">المبلغ المتبقي</th>
                          <th className="px-2.5 py-2 min-w-[150px] max-w-[220px] text-orange-950 font-black">
                            من المحصل
                          </th>
                          <th className="px-2 py-2 text-orange-700 whitespace-nowrap">العهدة</th>
                          <th className="px-2 py-2 whitespace-nowrap">طريقة الصرف</th>
                          <th className="px-2 py-2 text-center whitespace-nowrap">الحالة</th>
                          <th className="px-2 py-2 text-center whitespace-nowrap no-print">تعديل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTrips.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="p-6 text-center text-slate-400 font-semibold">
                              لا توجد رحلات مسجلة لهذا السائق في الفترة المحددة.
                            </td>
                          </tr>
                        ) : (
                          filteredTrips.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="px-2.5 py-2 whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-900">{t.tripNumber}</div>
                                <div className="text-[10px] text-slate-500">{t.date}</div>
                                <div className="mt-1">
                                  <span className="font-mono text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded inline-block" title="كود الربط الموحد: [كود الرحلة]-[آخر 5 أرقام للهوية]-[آخر رقمين للشاحنة]">
                                    🔑 {t.uniqueKey || generateTripUniqueKey(t.tripNumber, activeDriver?.nationalId, t.plateNumber)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-2.5 py-2 font-semibold text-slate-900">{t.customerName}</td>
                              <td className="px-2.5 py-2 font-medium text-slate-700">
                                {t.loadingLocation.split('-')[0]} ➔ {t.unloadingLocation.split('-')[0]}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-700">{t.plateNumber}</span>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuickPlateEdit(t)}
                                      className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition no-print cursor-pointer"
                                      title="تعديل سريع لرقم السيارة / اللوحة"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-2 font-black text-slate-900 whitespace-nowrap">{(t.totalAmount || 0).toLocaleString()} ر.س</td>
                              <td className="px-2 py-2 font-bold text-emerald-700 whitespace-nowrap">{(t.paidAmount || 0).toLocaleString()} ر.س</td>
                              <td className="px-2 py-2 whitespace-nowrap font-bold">
                                {t.remainingAmount > 0 ? (
                                  <span className="text-amber-700 font-black">{t.remainingAmount.toLocaleString()} ر.س</span>
                                ) : (
                                  <span className="text-emerald-700 text-[10px] font-bold">مسدد 0 ر.س</span>
                                )}
                              </td>
                              {/* Dedicated Note & Collection column */}
                              <td className="px-2.5 py-2 min-w-[150px] max-w-[220px]">
                                {renderCollectorBadge(t)}
                              </td>
                              <td className="px-2 py-2 font-bold text-orange-600 whitespace-nowrap">{(t.driverCustody || 0).toLocaleString()} ر.س</td>
                              <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{t.custodyMethod || 'تحويل بنكي'}</td>
                              <td className="px-2 py-2 text-center whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                                  {t.status === 'COMPLETED' ? 'مكتملة' : t.status === 'DELIVERED' ? 'تم التوصيل' : t.status === 'IN_TRANSIT' ? 'جارية' : 'جديدة'}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center whitespace-nowrap no-print">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTrip(t)}
                                    className="p-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition inline-flex items-center gap-1 text-[10px] font-bold border border-amber-200 cursor-pointer"
                                    title="تعديل كافة بيانات الرحلة ورقم السيارة"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-amber-700" />
                                    <span>تعديل</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {filteredTrips.length > 0 && (
                        <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-[11px]">
                          <tr>
                            <td colSpan={4} className="px-2.5 py-2 text-slate-900 text-right">
                              الإجمالي العام للسائق ({filteredTrips.length} رحلة):
                            </td>
                            <td className="px-2 py-2 text-slate-900 text-xs font-black whitespace-nowrap">{totalRevenue.toLocaleString()} ر.س</td>
                            <td className="px-2 py-2 text-emerald-700 text-xs font-black whitespace-nowrap">{totalPaid.toLocaleString()} ر.س</td>
                            <td className="px-2 py-2 text-amber-700 text-xs font-black whitespace-nowrap">{totalRemaining.toLocaleString()} ر.س</td>
                            <td></td>
                            <td className="px-2 py-2 text-orange-600 text-xs font-black whitespace-nowrap">{totalDriverCustody.toLocaleString()} ر.س</td>
                            <td colSpan={3}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* All Drivers Summary Table */
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs print:overflow-visible">
                <table className="w-full text-right print-table">
                  <thead className="bg-[#0F172A] text-white font-bold text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5">السائق</th>
                      <th className="px-3 py-2.5">الشاحنة المرتبطة</th>
                      <th className="px-3 py-2.5">الجوال</th>
                      <th className="px-3 py-2.5">عدد الرحلات</th>
                      <th className="px-3 py-2.5 text-emerald-300">إجمالي إيراد النقل</th>
                      <th className="px-3 py-2.5 text-orange-300">إجمالي العهد المسلمة</th>
                      <th className="px-3 py-2.5 text-center">كشف السائق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drivers.map(d => {
                      const dTrips = trips.filter(t => {
                        const matchDate = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
                        return matchDate && isTripMatchingDriver(t, d);
                      });
                      const revenue = dTrips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
                      const custody = dTrips.reduce((acc, t) => acc + (t.driverCustody || 0), 0);
                      const linkedTruck = trucks.find(t => t.id === d.assignedTruckId || t.plateNumber === d.assignedPlateNumber);

                      return (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-900">{d.name}</td>
                          <td className="px-3 py-2 font-mono font-bold text-emerald-800">
                            {d.assignedPlateNumber || linkedTruck?.plateNumber || '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">{d.phone}</td>
                          <td className="px-3 py-2 font-bold text-slate-800">{dTrips.length} رحلة</td>
                          <td className="px-3 py-2 font-black text-emerald-700">{revenue.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 font-bold text-orange-600">{custody.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDriverId(d.id)}
                                className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold transition border border-amber-200 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>كشف مفصل</span>
                                <span>←</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const settings = StorageService.getSettings();
                                  printDriverTripsStatement(d, dTrips, settings, { start: startDate, end: endDate });
                                }}
                                className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                                title="طباعة كشف حساب السائق كاملاً"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. MAINTENANCE REPORT */}
        {reportType === 'MAINTENANCE' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-right">
                <thead className="bg-[#0F172A] text-white font-bold">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الشاحنة / اللوحة</th>
                    <th className="p-3">نوع الصيانة</th>
                    <th className="p-3">الوصف</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">الموعد القادم</th>
                    <th className="p-3 text-center no-print">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenance.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500">{m.date}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{m.plateNumber}</td>
                      <td className="p-3 font-semibold">{m.maintenanceType}</td>
                      <td className="p-3 text-slate-600 max-w-sm">{m.description}</td>
                      <td className="p-3 font-bold text-rose-700">{m.amount.toLocaleString()} ر.س</td>
                      <td className="p-3 font-mono text-amber-700">{m.nextMaintenanceDate}</td>
                      <td className="p-3 text-center no-print">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditMaintenance(m)}
                            className="p-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-bold border border-amber-200 cursor-pointer"
                            title="تعديل سجل الصيانة ورقم اللوحة"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-700" />
                            <span>تعديل</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Footer Note */}
        <div className="text-[11px] text-slate-400 text-center pt-4 border-t border-slate-100">
          تم استخراج هذا التقرير آلياً بواسطة نظام مؤسسة إيجاز للنقليات الإداري والمالي.
        </div>
      </div>

      {/* ─── 1. QUICK PLATE EDIT MODAL ─── */}
      {quickEditTrip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in no-print" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-100 text-orange-700 rounded-xl">
                  <Truck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">تعديل رقم السيارة / اللوحة</h3>
                  <p className="text-xs text-slate-500">للرحلة رقم: <span className="font-mono font-bold text-slate-700">{quickEditTrip.tripNumber}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditTrip(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{quickError}</span>
              </div>
            )}

            <div className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  اختر من شاحنات الأسطول المسجلة
                </label>
                <select
                  value={quickTruckId}
                  onChange={(e) => handleSelectQuickTruck(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                >
                  <option value="__MANUAL__">-- إدخال يدوي حر لرقم اللوحة --</option>
                  {trucks.map(trk => (
                    <option key={trk.id} value={trk.id}>
                      {trk.plateNumber} - {trk.truckType} {trk.model ? `(${trk.model})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  رقم اللوحة / السيارة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickPlateNumber}
                  onChange={(e) => setQuickPlateNumber(e.target.value)}
                  placeholder="مثال: أ ب ج 1234"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickAutoLinkDriver}
                    onChange={(e) => setQuickAutoLinkDriver(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800 text-xs">
                    تحديث السائق آلياً في حال ارتباط اللوحة بسائق معتمد في النظام
                  </span>
                </label>
                <p className="text-[10px] text-slate-500 pr-6">
                  السائق الحالي المسجل بالرحلة: <strong className="text-slate-800">{quickEditTrip.driverName || 'بدون'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickEditTrip(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveQuickPlate}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. FULL TRIP EDIT MODAL ─── */}
      {editingTrip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in overflow-y-auto no-print" dir="rtl">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-100 text-orange-700 rounded-xl">
                  <Edit className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">تعديل بيانات الرحلة ورقم السيارة</h3>
                  <p className="text-xs text-slate-500">رقم الرحلة: <strong className="font-mono text-slate-800">{editingTrip.tripNumber}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tripValidationErrors.length > 0 && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex-shrink-0">
                {tripValidationErrors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveFullTrip} className="space-y-4 overflow-y-auto flex-1 pr-1 pl-1 py-3 text-xs">
              {/* Section 1: Trip Core Details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  البيانات الأساسية للرحلة
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">رقم الرحلة</label>
                    <input
                      type="text"
                      value={tripFormData.tripNumber || ''}
                      onChange={(e) => setTripFormData({ ...tripFormData, tripNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">تاريخ الرحلة</label>
                    <input
                      type="date"
                      value={tripFormData.date || ''}
                      onChange={(e) => setTripFormData({ ...tripFormData, date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">نوع الرحلة</label>
                    <select
                      value={tripFormData.tripType || 'رحلة داخلية'}
                      onChange={(e) => setTripFormData({ ...tripFormData, tripType: e.target.value as TripType })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold"
                    >
                      <option value="رحلة داخلية">رحلة داخلية (بين المدن)</option>
                      <option value="رحلة خارجية">رحلة خارجية</option>
                      <option value="رحلة دولية">رحلة دولية</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Truck & Plate Number (Primary Request Focus) */}
              <div className="bg-orange-50/50 p-3.5 rounded-xl border border-orange-200 space-y-3">
                <h4 className="font-bold text-orange-900 text-xs flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-600" />
                  بيانات السيارة / الشاحنة واللوحة
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">اختر من الأسطول</label>
                    <select
                      value={tripFormData.truckId || '__MANUAL__'}
                      onChange={(e) => handleTripTruckChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2"
                    >
                      <option value="__MANUAL__">-- إدخال يدوي حر للوحة --</option>
                      {trucks.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.plateNumber} ({t.truckType}) {t.model || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      رقم اللوحة / السيارة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tripFormData.plateNumber || ''}
                      onChange={(e) => setTripFormData({ ...tripFormData, plateNumber: e.target.value })}
                      placeholder="مثال: أ ب ج 1234"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-orange-950 focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Driver & Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Driver */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    السائق
                  </h4>
                  <div>
                    <select
                      value={tripFormData.driverId || '__MANUAL__'}
                      onChange={(e) => handleTripDriverChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs mb-2"
                    >
                      <option value="__MANUAL__">-- إدخال يدوي لاسم السائق --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.phone ? `(${d.phone})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={tripFormData.driverName || ''}
                      onChange={(e) => setTripFormData({ ...tripFormData, driverName: e.target.value })}
                      placeholder="اسم السائق"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Customer */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                    العميل
                  </h4>
                  <div>
                    <select
                      value={tripFormData.customerId || '__MANUAL__'}
                      onChange={(e) => handleTripCustomerChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs mb-2"
                    >
                      <option value="__MANUAL__">-- إدخال يدوي لاسم العميل --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.companyName ? `(${c.companyName})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={tripFormData.customerName || ''}
                      onChange={(e) => setTripFormData({ ...tripFormData, customerName: e.target.value })}
                      placeholder="اسم العميل"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Route & Cargo */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">المسار ونوع الحمولة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">مكان التحميل</label>
                    <input
                      type="text"
                      value={tripFormData.loadingLocation || ''}
                      onChange={(e) => setTripFormData({ ...tripFormData, loadingLocation: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">مكان التنزيل</label>
                    <input
                      type="text"
                      value={tripFormData.unloadingLocation || ''}
                      onChange={(e) => setTripFormData({ ...tripFormData, unloadingLocation: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">نوع الحمولة</label>
                    <input
                      type="text"
                      value={tripFormData.cargoType || ''}
                      onChange={(e) => setTripFormData({ ...tripFormData, cargoType: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Financials */}
              <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200 space-y-3">
                <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  المبالغ المالية والتحصيل
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-slate-700 text-[11px] font-semibold mb-1">المبلغ الأساسي</label>
                    <input
                      type="number"
                      value={tripFormData.baseAmount ?? 0}
                      onChange={(e) => handleAmountChange('baseAmount', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-[11px] font-semibold mb-1">الضريبة (ر.س)</label>
                    <input
                      type="number"
                      value={tripFormData.taxAmount ?? 0}
                      onChange={(e) => handleAmountChange('taxAmount', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-[11px] font-semibold mb-1">الإجمالي</label>
                    <input
                      type="number"
                      value={tripFormData.totalAmount ?? 0}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-mono font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-[11px] font-semibold mb-1">المبلغ المحصل</label>
                    <input
                      type="number"
                      value={tripFormData.paidAmount ?? 0}
                      onChange={(e) => handleAmountChange('paidAmount', Number(e.target.value))}
                      className="w-full bg-white border border-emerald-400 rounded-lg p-2 font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-100">
                  <div>
                    <label className="block text-slate-700 text-[11px] font-semibold mb-1">المتبقي</label>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono font-black text-amber-700">
                      {(tripFormData.remainingAmount ?? 0).toLocaleString()} ر.س
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 text-[11px] font-semibold mb-1">عهدة السائق (ر.س)</label>
                    <input
                      type="number"
                      value={tripFormData.driverCustody ?? 0}
                      onChange={(e) => setTripFormData({ ...tripFormData, driverCustody: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-orange-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-[11px] font-semibold mb-1">مصاريف الرحلة (ر.س)</label>
                    <input
                      type="number"
                      value={tripFormData.tripExpenses ?? 0}
                      onChange={(e) => handleAmountChange('tripExpenses', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">ملاحظات الرحلة والتسوية</label>
                <textarea
                  rows={2}
                  value={tripFormData.notes || ''}
                  onChange={(e) => setTripFormData({ ...tripFormData, notes: e.target.value })}
                  placeholder="ملاحظات توثيقية أو توضيحية حول الرحلة..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات في التقرير</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 3. MAINTENANCE RECORD EDIT MODAL ─── */}
      {editingMaintenance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in no-print" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-100 text-orange-700 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">تعديل سجل الصيانة والشاحنة</h3>
                  <p className="text-xs text-slate-500">تحديث تفاصيل الصيانة أو رقم لوحة الشاحنة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMaintenance(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  رقم لوحة الشاحنة / السيارة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={maintenanceFormData.plateNumber || ''}
                  onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, plateNumber: e.target.value })}
                  placeholder="مثال: أ ب ج 1234"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-sm focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نوع الصيانة</label>
                  <select
                    value={maintenanceFormData.maintenanceType || 'صيانة دورية'}
                    onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, maintenanceType: e.target.value as MaintenanceType })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5"
                  >
                    <option value="صيانة دورية">صيانة دورية</option>
                    <option value="تغيير زيت وفلاتر">تغيير زيت وفلاتر</option>
                    <option value="إطارات">إطارات</option>
                    <option value="ميكانيكا">ميكانيكا</option>
                    <option value="كهرباء">كهرباء</option>
                    <option value="فحص دوري وتأمين">فحص دوري وتأمين</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">المبلغ (ر.س)</label>
                  <input
                    type="number"
                    value={maintenanceFormData.amount ?? 0}
                    onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, amount: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">تاريخ الصيانة</label>
                  <input
                    type="date"
                    value={maintenanceFormData.date || ''}
                    onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">موعد الصيانة القادم</label>
                  <input
                    type="date"
                    value={maintenanceFormData.nextMaintenanceDate || ''}
                    onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, nextMaintenanceDate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">الوصف والتفاصيل</label>
                <textarea
                  rows={3}
                  value={maintenanceFormData.description || ''}
                  onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, description: e.target.value })}
                  placeholder="وصف الصيانة المنجزة والقطع المستبدلة..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMaintenance(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Shift Handover Modal */}
      <DailyHandoverModal
        isOpen={isDailyHandoverOpen}
        onClose={() => setIsDailyHandoverOpen(false)}
        currentUser={currentUser}
        trips={trips}
        settings={settings}
        onRefresh={onRefresh}
      />

      {/* Mobile Save Points Modal */}
      <MobileSavePointsModal
        isOpen={isSavePointsOpen}
        onClose={() => setIsSavePointsOpen(false)}
        currentUser={currentUser}
        settings={settings}
        onRefresh={onRefresh}
      />
    </div>
  );
};
