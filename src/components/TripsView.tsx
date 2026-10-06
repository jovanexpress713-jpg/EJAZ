import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Printer, 
  Share2, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Image as ImageIcon,
  MapPin,
  Calendar,
  DollarSign,
  UserCheck,
  Truck as TruckIcon,
  X,
  Upload,
  Check,
  Copy,
  Link2,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';
import { Trip, Customer, Driver, Truck, TripStatus, TripType, PaymentStatus, PaymentMethod, TruckType, User } from '../types';
import { StorageService } from '../services/storage';
import { printTripWaybill, shareTripViaWhatsApp, shareTripReportViaWhatsApp } from '../utils/tripActions';
import { exportTripsTableToExcel } from '../utils/excelExporter';
import { extractDriverCode, extractTruckCode, generateTripUniqueKey } from '../utils/uniqueKeyService';
import { normalizeTruckNumber, isExactTruckMatch } from '../utils/truckUtils';

interface TripsViewProps {
  trips: Trip[];
  customers: Customer[];
  drivers: Driver[];
  trucks: Truck[];
  currentUser: User;
  onRefresh: () => void;
  onPrintWaybill?: (trip: Trip) => void;
  onShareWhatsApp?: (trip: Trip) => void;
  initialAddOpen?: boolean;
  onCloseInitialAdd?: () => void;
  initialSelectedTrip?: Trip | null;
  onNavigateToDriverTracking?: () => void;
}

export const TripsView: React.FC<TripsViewProps> = ({
  trips,
  customers,
  drivers,
  trucks,
  currentUser,
  onRefresh,
  onPrintWaybill,
  onShareWhatsApp,
  initialAddOpen = false,
  onCloseInitialAdd,
  initialSelectedTrip = null,
  onNavigateToDriverTracking,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [truckFilter, setTruckFilter] = useState<string>('ALL');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(initialAddOpen);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(initialSelectedTrip);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);

  // Batch deletion state
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Copy Code & Copy Link state & feedback
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    } catch {
      return false;
    }
  };

  const handleCopyCode = async (trip: Trip, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const code = trip.tripNumber || trip.id;
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedCodeId(trip.id);
      setToastNotification(`تم نسخ كود الرحلة: ${code}`);
      setTimeout(() => setCopiedCodeId(null), 2500);
      setTimeout(() => setToastNotification(null), 3000);
    }
  };

  const handleCopyLink = async (trip: Trip, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let link = '';
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('trip', trip.tripNumber || trip.id);
      link = url.toString();
    } catch {
      link = `${window.location.origin}${window.location.pathname}?trip=${encodeURIComponent(trip.tripNumber || trip.id)}`;
    }
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopiedLinkId(trip.id);
      setToastNotification(`تم نسخ رابط الرحلة المباشر: ${trip.tripNumber}`);
      setTimeout(() => setCopiedLinkId(null), 2500);
      setTimeout(() => setToastNotification(null), 3000);
    }
  };

  useEffect(() => {
    if (initialSelectedTrip) {
      setViewingTrip(initialSelectedTrip);
    }
  }, [initialSelectedTrip]);

  useEffect(() => {
    if (initialAddOpen) {
      setIsFormModalOpen(true);
    }
  }, [initialAddOpen]);

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

  // Form fields
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Trip>>({
    tripNumber: '',
    financialCenterCode: '',
    financialCenterName: 'مركز مالي تشغيلي',
    operationType: 'INTERNAL',
    isSubcontracted: false,
    date: new Date().toISOString().split('T')[0],
    tripType: 'رحلة داخلية',
    status: 'NEW',
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    driverId: '',
    driverName: '',
    driverPhone: '',
    truckId: '',
    plateNumber: '',
    truckType: 'CURTAIN',
    // External / Spot carrier fields
    externalCarrierName: '',
    externalCarrierPhone: '',
    externalTruckPlate: '',
    externalCompany: '',
    clientAgreedAmount: 3500,
    externalCarrierCost: 0,
    brokerageMargin: 0,
    externalCarrierPaymentStatus: 'UNPAID',
    cargoType: '',
    loadingLocation: '',
    unloadingLocation: '',
    loadingTime: '08:00 صباحًا',
    estimatedArrival: '',
    actualArrival: '',
    baseAmount: 3500,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 3500,
    paidAmount: 0,
    remainingAmount: 3500,
    paymentStatus: 'UNPAID',
    paymentMethod: '' as unknown as PaymentMethod,
    commissionAmount: 0,
    driverCustody: 0,
    custodyMethod: '',
    tripExpenses: 0,
    netProfit: 3500,
    notes: '',
    photoUrl: '',
  });

  // Open create form
  const handleOpenCreate = () => {
    const defaultCust = customers[0] || { id: '', name: '', phone: '', address: '' };
    const defaultDrv = drivers[0] || { id: '', name: '', phone: '' };
    
    // Choose linked truck if available
    let defaultTrk = trucks[0] || { id: '', plateNumber: '', truckType: 'CURTAIN' };
    if (defaultDrv && defaultDrv.assignedTruckId) {
      const linked = trucks.find(t => t.id === defaultDrv.assignedTruckId);
      if (linked) defaultTrk = linked;
    }

    const autoTripNum = StorageService.generateTripNumber();
    const autoFinCode = StorageService.generateFinancialCenterCode(autoTripNum);

    const base = 3500;
    const tax = 0;
    const total = base + tax;
    const paid = 0;
    const expenses = 0;
    const comm = 0;
    const profit = base - expenses - comm;

    setValidationErrors([]);
    setFormData({
      tripNumber: autoTripNum,
      financialCenterCode: autoFinCode,
      financialCenterName: 'مركز مالي موحد',
      operationType: 'INTERNAL',
      isSubcontracted: false,
      date: new Date().toISOString().split('T')[0],
      tripType: 'رحلة داخلية',
      status: 'NEW',
      customerId: defaultCust.id,
      customerName: defaultCust.name,
      customerPhone: defaultCust.phone,
      customerAddress: defaultCust.address,
      driverId: defaultDrv.id,
      driverName: defaultDrv.name,
      driverPhone: defaultDrv.phone,
      truckId: defaultTrk.id,
      plateNumber: defaultTrk.plateNumber,
      truckType: defaultTrk.truckType,
      externalCarrierName: '',
      externalCarrierPhone: '',
      externalTruckPlate: '',
      externalCompany: '',
      clientAgreedAmount: base,
      externalCarrierCost: 0,
      brokerageMargin: 0,
      externalCarrierPaymentStatus: 'UNPAID',
      cargoType: '',
      loadingLocation: '',
      unloadingLocation: '',
      loadingTime: '08:00 صباحًا',
      estimatedArrival: `${new Date().toISOString().split('T')[0]} 17:00`,
      actualArrival: '',
      baseAmount: base,
      taxRate: 0,
      taxAmount: tax,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: total - paid,
      paymentStatus: 'UNPAID',
      paymentMethod: '' as unknown as PaymentMethod,
      commissionAmount: 0,
      driverCustody: 0,
      custodyMethod: '',
      tripExpenses: 0,
      netProfit: profit,
      notes: '',
      photoUrl: '',
    });
    setEditingTrip(null);
    setIsFormModalOpen(true);
  };

  // Helper to render Note & Collection badge
  const renderCollectorBadge = (trip: Trip) => {
    const note = (trip.notes || '').trim();
    const paid = trip.paidAmount || 0;

    if (paid === 0 && !note) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
          ⏳ لم يُحصل بعد
        </span>
      );
    }

    const isEjaz = note.includes('إيجاز') || note.includes('الشركة') || note.includes('المؤسسة');
    const isEmployeeOrPerson = note.includes('الموظف') || note.includes('بيد') || note.includes('أبو حسن') || note.includes('ابو حسن') || note.includes('السائق') || note.includes('نقد') || note.includes('كاش');

    return (
      <div className={`p-1 rounded-md text-[11px] leading-snug font-bold border break-words ${
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
          <div className="text-slate-900 font-black text-[10.5px]">{note}</div>
        ) : (
          <div className="text-emerald-800 text-[9px]">تم التحصيل للمؤسسة</div>
        )}
      </div>
    );
  };

  // Open edit form
  const handleOpenEdit = (trip: Trip) => {
    setValidationErrors([]);
    setEditingTrip(trip);
    const finCode = trip.financialCenterCode || StorageService.generateFinancialCenterCode(trip.tripNumber);
    const isSpot = trip.operationType === 'SUBCONTRACTED_SPOT' || Boolean(trip.isSubcontracted);
    const clientPrice = trip.clientAgreedAmount || trip.totalAmount;
    const extCost = trip.externalCarrierCost || 0;
    const margin = trip.brokerageMargin ?? Math.max(0, clientPrice - extCost);

    setFormData({ 
      ...trip,
      tripType: trip.tripType || 'رحلة داخلية',
      financialCenterCode: finCode,
      financialCenterName: trip.financialCenterName || 'مركز مالي موحد',
      operationType: isSpot ? 'SUBCONTRACTED_SPOT' : 'INTERNAL',
      isSubcontracted: isSpot,
      clientAgreedAmount: clientPrice,
      externalCarrierCost: extCost,
      brokerageMargin: margin,
      externalCarrierName: trip.externalCarrierName || '',
      externalCarrierPhone: trip.externalCarrierPhone || '',
      externalTruckPlate: trip.externalTruckPlate || '',
      externalCompany: trip.externalCompany || '',
      externalCarrierPaymentStatus: trip.externalCarrierPaymentStatus || 'UNPAID',
    });
    setIsFormModalOpen(true);
  };

  // Handle Customer Selection in Form
  const handleCustomerChange = (custId: string) => {
    if (custId === '__MANUAL__') {
      setFormData(prev => ({
        ...prev,
        customerId: '',
        customerName: '',
        customerPhone: '',
      }));
      return;
    }
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setFormData(prev => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerAddress: cust.address,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customerId: custId,
      }));
    }
  };

  // Handle Driver Selection in Form with Strict Auto-Linking to His One Truck
  const handleDriverChange = (drvId: string) => {
    if (drvId === '__MANUAL__') {
      setFormData(prev => ({
        ...prev,
        driverId: '',
        driverName: '',
        driverPhone: '',
      }));
      return;
    }
    const drv = drivers.find(d => d.id === drvId);
    if (drv) {
      // Strict 1-to-1 rule: find driver's assigned truck
      const linkedTruck = trucks.find(t => t.id === drv.assignedTruckId || t.assignedDriverId === drv.id || (drv.assignedPlateNumber && t.plateNumber === drv.assignedPlateNumber));

      setFormData(prev => ({
        ...prev,
        driverId: drv.id,
        driverName: drv.name,
        driverPhone: drv.phone,
        // Mandatorily enforce the driver's one truck
        ...(linkedTruck ? {
          truckId: linkedTruck.id,
          plateNumber: linkedTruck.plateNumber,
          truckType: linkedTruck.truckType,
          truckNumber: linkedTruck.truckNumber,
        } : (drv.assignedPlateNumber ? {
          plateNumber: drv.assignedPlateNumber,
          truckNumber: drv.assignedTruckNumber,
        } : {}))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        driverId: drvId,
      }));
    }
  };

  // Handle Truck Selection in Form with Strict Auto-Linking to Driver
  const handleTruckChange = (trkId: string) => {
    if (trkId === '__MANUAL__') {
      setFormData(prev => ({
        ...prev,
        truckId: '',
        plateNumber: '',
      }));
      return;
    }
    const trk = trucks.find(t => t.id === trkId);
    if (trk) {
      // Find if this truck is already assigned to a driver
      const linkedDriver = drivers.find(d => d.id === trk.assignedDriverId || d.assignedTruckId === trk.id || (d.assignedPlateNumber && d.assignedPlateNumber === trk.plateNumber));

      setFormData(prev => ({
        ...prev,
        truckId: trk.id,
        plateNumber: trk.plateNumber,
        truckType: trk.truckType,
        truckNumber: trk.truckNumber,
        // Mandatorily enforce the truck's one driver
        ...(linkedDriver ? {
          driverId: linkedDriver.id,
          driverName: linkedDriver.name,
          driverPhone: linkedDriver.phone,
        } : {})
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        truckId: trkId,
      }));
    }
  };

  // Auto calculate finances in form - completely manual tax
  const handleAmountChange = (field: string, val: number) => {
    setFormData(prev => {
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
        // Keep existing tax amount manual, only update taxRate ratio if base > 0
        taxR = base > 0 ? Number(((taxVal / base) * 100).toFixed(1)) : 0;
      }

      // Equation: Total = Base Amount + Manual Tax Amount
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

  // Spot brokerage price change handler (Client price & External truck cost)
  const handleSpotAmountChange = (field: 'clientAgreedAmount' | 'externalCarrierCost', val: number) => {
    setFormData(prev => {
      const clientPrice = field === 'clientAgreedAmount' ? val : (prev.clientAgreedAmount ?? prev.totalAmount ?? 0);
      const truckCost = field === 'externalCarrierCost' ? val : (prev.externalCarrierCost ?? 0);
      const margin = Math.max(0, clientPrice - truckCost);
      const paid = prev.paidAmount || 0;
      const remaining = Math.max(0, clientPrice - paid);

      return {
        ...prev,
        [field]: val,
        baseAmount: clientPrice,
        totalAmount: clientPrice,
        brokerageMargin: margin,
        netProfit: margin,
        remainingAmount: remaining,
      };
    });
  };

  // Save Trip
  const handleSaveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tripNumber || !formData.customerName) return;

    const isSpot = formData.operationType === 'SUBCONTRACTED_SPOT' || Boolean(formData.isSubcontracted);
    const clientPrice = isSpot ? (Number(formData.clientAgreedAmount) || Number(formData.totalAmount) || 0) : (formData.totalAmount || 0);
    const extCost = isSpot ? (Number(formData.externalCarrierCost) || 0) : 0;
    const spotMargin = isSpot ? Math.max(0, clientPrice - extCost) : (formData.netProfit || 0);
    const finCode = formData.financialCenterCode?.trim() || StorageService.generateFinancialCenterCode(formData.tripNumber);

    const tripToSave: Trip = {
      id: editingTrip ? editingTrip.id : `trp_${Date.now()}`,
      tripNumber: formData.tripNumber || StorageService.generateTripNumber(),
      financialCenterCode: finCode,
      financialCenterName: formData.financialCenterName || 'مركز مالي موحد',
      operationType: isSpot ? 'SUBCONTRACTED_SPOT' : 'INTERNAL',
      isSubcontracted: isSpot,
      // Spot external carrier & economics
      externalCarrierName: isSpot ? (formData.externalCarrierName || formData.driverName || 'سائق خارجي') : '',
      externalCarrierPhone: isSpot ? (formData.externalCarrierPhone || formData.driverPhone || '') : '',
      externalTruckPlate: isSpot ? (formData.externalTruckPlate || formData.plateNumber || 'لوحة خارجية') : '',
      externalCompany: isSpot ? (formData.externalCompany || '') : '',
      clientAgreedAmount: clientPrice,
      externalCarrierCost: extCost,
      brokerageMargin: spotMargin,
      externalCarrierPaymentStatus: formData.externalCarrierPaymentStatus || 'UNPAID',

      date: formData.date || new Date().toISOString().split('T')[0],
      tripType: (formData.tripType as TripType) || 'رحلة داخلية',
      status: formData.status as TripStatus,
      customerId: formData.customerId || '',
      customerName: formData.customerName || '',
      customerPhone: formData.customerPhone || '',
      customerAddress: formData.customerAddress || '',
      driverId: isSpot ? '' : (formData.driverId || ''),
      driverName: isSpot ? (formData.externalCarrierName || 'ناقل خارجي') : (formData.driverName || ''),
      driverPhone: isSpot ? (formData.externalCarrierPhone || '') : (formData.driverPhone || ''),
      truckId: isSpot ? '' : (formData.truckId || ''),
      plateNumber: isSpot ? (formData.externalTruckPlate || 'شاحنة خارجية') : (formData.plateNumber || ''),
      truckType: formData.truckType as TruckType,
      cargoType: formData.cargoType || '',
      loadingLocation: formData.loadingLocation || '',
      unloadingLocation: formData.unloadingLocation || '',
      loadingTime: formData.loadingTime || '',
      estimatedArrival: formData.estimatedArrival || '',
      actualArrival: formData.actualArrival || '',
      baseAmount: isSpot ? clientPrice : (formData.baseAmount || 0),
      taxRate: isSpot ? 0 : (formData.taxRate ?? 0),
      taxAmount: isSpot ? 0 : (formData.taxAmount || 0),
      totalAmount: clientPrice,
      paidAmount: formData.paidAmount || 0,
      remainingAmount: Math.max(0, clientPrice - (formData.paidAmount || 0)),
      paymentStatus: formData.paymentStatus as PaymentStatus,
      paymentMethod: (formData.paymentMethod as PaymentMethod) || 'BANK_TRANSFER',
      commissionAmount: isSpot ? 0 : (formData.commissionAmount || 0),
      driverCustody: isSpot ? 0 : (formData.driverCustody || 0),
      custodyMethod: formData.custodyMethod || '',
      tripExpenses: isSpot ? extCost : (formData.tripExpenses || 0),
      netProfit: isSpot ? spotMargin : (formData.netProfit || 0),
      notes: formData.notes || '',
      photoUrl: formData.photoUrl || '',
      createdAt: editingTrip ? editingTrip.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Validate trip data and compulsory driver-truck relationship
    const validation = StorageService.validateTrip(tripToSave);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    try {
      StorageService.saveTrip(tripToSave, currentUser);
      setIsFormModalOpen(false);
      if (onCloseInitialAdd) onCloseInitialAdd();
      onRefresh();
    } catch (err: any) {
      setValidationErrors([err?.message || 'حدث خطأ أثناء حفظ الرحلة']);
    }
  };

  // Delete Single Trip
  const handleDeleteTrip = () => {
    if (!deletingTrip) return;
    StorageService.deleteTrip(deletingTrip.id, currentUser);
    setSelectedTripIds(prev => prev.filter(id => id !== deletingTrip.id));
    setDeletingTrip(null);
    onRefresh();
  };

  // Delete Batch Trips
  const handleDeleteBatchTrips = () => {
    if (!selectedTripIds.length) return;
    StorageService.deleteTrips(selectedTripIds, currentUser);
    setSelectedTripIds([]);
    setIsBatchDeleteModalOpen(false);
    onRefresh();
  };

  const handleToggleSelectTrip = (id: string) => {
    setSelectedTripIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (filtered: Trip[]) => {
    const allIds = filtered.map(t => t.id);
    const areAllSelected = allIds.length > 0 && allIds.every(id => selectedTripIds.includes(id));
    if (areAllSelected) {
      setSelectedTripIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedTripIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportTripsTableToExcel(filteredTrips);
  };

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const cleanSearch = searchTerm.trim();
      const tripTruckNum = trip.truckNumber || normalizeTruckNumber(trip.plateNumber);

      const matchesSearch = !cleanSearch || 
        trip.tripNumber.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        trip.customerName.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        trip.driverName.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        trip.plateNumber.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        (tripTruckNum && isExactTruckMatch(tripTruckNum, cleanSearch)) ||
        trip.loadingLocation.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        trip.unloadingLocation.toLowerCase().includes(cleanSearch.toLowerCase()) ||
        trip.cargoType.toLowerCase().includes(cleanSearch.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;
      const matchesPayment = paymentFilter === 'ALL' || trip.paymentStatus === paymentFilter;
      const matchesDriver = driverFilter === 'ALL' || trip.driverId === driverFilter || trip.driverName === driverFilter;
      const matchesTruck = truckFilter === 'ALL' || 
        (trip.truckId && trip.truckId === truckFilter) || 
        (tripTruckNum && isExactTruckMatch(tripTruckNum, truckFilter)) ||
        (trip.plateNumber && trip.plateNumber === truckFilter);

      return matchesSearch && matchesStatus && matchesPayment && matchesDriver && matchesTruck;
    });
  }, [trips, searchTerm, statusFilter, paymentFilter, driverFilter, truckFilter]);

  const canEditOrDelete = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'OPERATIONS';

  return (
    <div id="ejaz-trips-view" className="space-y-5" dir="rtl">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h1 className="text-xl font-black text-slate-900">إدارة الرحلات والشحنات</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إضافة ومتابعة وثائق النقل، بوالص الشحن، حسابات السداد والتسليم الفعلي.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToDriverTracking && (
            <button
              type="button"
              onClick={onNavigateToDriverTracking}
              className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer border border-slate-700"
              title="الانتقال إلى نظام تتبع السائقين وتجميد القيم لمنع تداخل الشاحنات"
            >
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>تتبع السائقين (قيم مجمّدة)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            title="تصدير جدول الرحلات إلى ملف إكسل النهائي"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>تصدير إكسل ({filteredTrips.length})</span>
          </button>

          {canEditOrDelete && (
            <button
              id="trips-add-new-btn"
              onClick={handleOpenCreate}
              className="bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة رحلة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Action Toolbar */}
      {selectedTripIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-red-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0" />
            <span>تم تحديد <strong className="font-mono text-sm text-red-700">{selectedTripIds.length}</strong> رحلة من أصل {filteredTrips.length}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setSelectedTripIds([])}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              إلغاء التحديد
            </button>
            <button
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف الرحلات المحددة ({selectedTripIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <input
            id="trips-search-input"
            type="text"
            placeholder="بحث بالرقم، الشاحنة، العميل..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white pl-9 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Truck Filter */}
        <div>
          <select
            id="trips-truck-filter"
            value={truckFilter}
            onChange={e => setTruckFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition"
          >
            <option value="ALL">جميع الشاحنات</option>
            {trucks.map(t => (
              <option key={t.id} value={t.truckNumber || t.id}>
                🚛 شاحنة {t.truckNumber || normalizeTruckNumber(t.plateNumber)} ({t.plateNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Driver Filter */}
        <div>
          <select
            id="trips-driver-filter"
            value={driverFilter}
            onChange={e => setDriverFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition"
          >
            <option value="ALL">جميع السائقين</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                👤 {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            id="trips-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition"
          >
            <option value="ALL">جميع حالات الرحلات</option>
            <option value="NEW">جديدة</option>
            <option value="LOADING">قيد التحميل</option>
            <option value="IN_TRANSIT">جارية على الطريق</option>
            <option value="DELIVERED">تم التوصيل</option>
            <option value="COMPLETED">مكتملة</option>
            <option value="CANCELLED">ملغاة</option>
          </select>
        </div>

        {/* Payment Filter */}
        <div>
          <select
            id="trips-payment-filter"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition"
          >
            <option value="ALL">جميع حالات السداد</option>
            <option value="PAID">مدفوع بالكامل</option>
            <option value="PARTIAL">مدفوع جزئياً</option>
            <option value="UNPAID">غير مدفوع (متبقي)</option>
          </select>
        </div>
      </div>

      {/* Trips Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>عرض {filteredTrips.length} من أصل {trips.length} رحلة</span>
      </div>

      {/* Trips Desktop List */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right text-xs text-slate-700">
          <thead className="bg-[#0F172A] text-white font-bold">
            <tr>
              {canEditOrDelete && (
                <th className="py-3.5 px-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredTrips.length > 0 && filteredTrips.every(t => selectedTripIds.includes(t.id))}
                    onChange={() => handleSelectAllFiltered(filteredTrips)}
                    className="rounded border-slate-400 text-orange-600 focus:ring-orange-500 cursor-pointer w-4 h-4"
                    title="تحديد الكل"
                  />
                </th>
              )}
              <th className="py-3.5 px-3 whitespace-nowrap">رقم الرحلة</th>
              <th className="py-3.5 px-3 whitespace-nowrap">التاريخ</th>
              <th className="py-3.5 px-2.5 whitespace-nowrap">نوع الرحلة</th>
              <th className="py-3.5 px-3">العميل</th>
              <th className="py-3.5 px-3 whitespace-nowrap">السائق / الشاحنة</th>
              <th className="py-3.5 px-3">المسار والحمولة</th>
              <th className="py-3.5 px-3 whitespace-nowrap">إجمالي الرحلة</th>
              <th className="py-3.5 px-3 whitespace-nowrap text-emerald-400">المحصل</th>
              <th className="py-3.5 px-3 whitespace-nowrap text-amber-300 font-bold">المبلغ المتبقي</th>
              <th className="py-3.5 px-3 min-w-[140px] text-orange-300 font-bold">من المحصل</th>
              <th className="py-3.5 px-3 text-center whitespace-nowrap">الحالة</th>
              <th className="py-3.5 px-3 text-center whitespace-nowrap">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTrips.map(trip => (
              <tr key={trip.id} className={`hover:bg-slate-50 transition ${selectedTripIds.includes(trip.id) ? 'bg-orange-50/40' : ''}`}>
                {canEditOrDelete && (
                  <td className="py-3.5 px-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTripIds.includes(trip.id)}
                      onChange={() => handleToggleSelectTrip(trip.id)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer w-4 h-4"
                    />
                  </td>
                )}
                <td className="py-3.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                  <div className="inline-flex items-center bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200/90 rounded-lg p-0.5 transition">
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(trip, e)}
                      className="font-mono font-bold text-xs text-slate-900 px-1.5 py-0.5 rounded hover:bg-white flex items-center gap-1 transition cursor-pointer"
                      title="اضغط لنسخ كود الرحلة"
                    >
                      <span>{trip.tripNumber}</span>
                      {copiedCodeId === trip.id ? (
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400 hover:text-slate-700 shrink-0" />
                      )}
                    </button>

                    <span className="w-px h-3.5 bg-slate-300 mx-0.5" />

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(trip, e)}
                      className="px-1.5 py-0.5 hover:bg-white text-slate-600 hover:text-orange-600 rounded transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      title="نسخ رابط مباشر للرحلة"
                    >
                      {copiedLinkId === trip.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Link2 className="w-3 h-3 text-orange-600" />
                      )}
                      <span>رابط</span>
                    </button>
                  </div>
                  {trip.financialCenterCode && (
                    <div className="mt-1">
                      <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded inline-block" title="كود القائم المالي / المركز المالي الموحد">
                        🏛️ {trip.financialCenterCode}
                      </span>
                    </div>
                  )}
                  {trip.uniqueKey && (
                    <div className="mt-0.5">
                      <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-block" title="المعرف الفريد الموحد: [كود الرحلة]-[آخر 5 أرقام للهوية]-[آخر رقمين للشاحنة]">
                        🔑 {trip.uniqueKey}
                      </span>
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                  {trip.date}
                </td>
                <td className="py-3.5 px-2.5 whitespace-nowrap">
                  {trip.operationType === 'SUBCONTRACTED_SPOT' || trip.isSubcontracted ? (
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 inline-block">
                        🤝 وساطة لحظية
                      </span>
                      <div className="text-[9.5px] text-emerald-700 font-bold font-mono">
                        هامش: +{(trip.brokerageMargin ?? Math.max(0, trip.totalAmount - (trip.externalCarrierCost || 0))).toLocaleString()} ر.س
                      </div>
                    </div>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      trip.tripType === 'رحلة دولية'
                        ? 'bg-purple-100 text-purple-800'
                        : trip.tripType === 'رحلة خارجية'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {trip.tripType || 'رحلة داخلية'}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3 font-semibold text-slate-900 max-w-[140px] truncate">
                  {trip.customerName}
                </td>
                <td className="py-3.5 px-3 whitespace-nowrap">
                  {trip.operationType === 'SUBCONTRACTED_SPOT' || trip.isSubcontracted ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="font-bold text-purple-950">{trip.externalCarrierName || trip.driverName}</div>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          ناقل خارجي
                        </span>
                      </div>
                      <div className="text-[10px] text-purple-700 font-mono font-bold mt-0.5">
                        🚛 لوحة: {trip.externalTruckPlate || trip.plateNumber}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="font-semibold text-slate-900">{trip.driverName}</div>
                        {trip.frozenValues?.isFrozen && (
                          <span className="p-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold" title={`قيم مجمّدة برقم معرّف السائق: ${trip.frozenValues.driverId}`}>
                            🔒
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {trip.truckNumber ? (
                          <span className="font-bold text-blue-700 bg-blue-50 px-1 rounded ml-1">
                            شاحنة {trip.truckNumber}
                          </span>
                        ) : null}
                        <span>{trip.plateNumber}</span>
                      </div>
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-3 text-[11px]">
                  <div className="font-medium text-slate-800">
                    {trip.loadingLocation.split('-')[0]} ➔ {trip.unloadingLocation.split('-')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {trip.cargoType}
                  </div>
                </td>
                <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                  {trip.totalAmount.toLocaleString()} ر.س
                </td>
                <td className="py-3.5 px-3 font-bold text-emerald-700 whitespace-nowrap">
                  {(trip.paidAmount || 0).toLocaleString()} ر.س
                </td>
                <td className="py-3.5 px-3 font-bold whitespace-nowrap">
                  {trip.remainingAmount > 0 ? (
                    <span className="text-amber-700 font-black">{trip.remainingAmount.toLocaleString()} ر.س</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">مسدد 0 ر.س</span>
                  )}
                </td>
                <td className="py-3.5 px-3 min-w-[140px]">
                  {renderCollectorBadge(trip)}
                </td>
                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  {trip.status === 'COMPLETED' ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">مكتملة</span>
                  ) : trip.status === 'IN_TRANSIT' ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">على الطريق</span>
                  ) : trip.status === 'LOADING' ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">قيد التحميل</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">{trip.status}</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setViewingTrip(trip)}
                      className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition"
                      title="عرض التفاصيل والتقرير"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePrint(trip)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="طباعة بوليصة شحن وفاتورة"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleWhatsApp(trip)}
                      className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                      title="مشاركة التقرير عبر واتساب"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {canEditOrDelete && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(trip)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTrip(trip)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trips Mobile View */}
      <div className="block md:hidden space-y-3">
        {filteredTrips.map(trip => (
          <div key={trip.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Trip Code & Direct Link Action Badge */}
                <div className="inline-flex items-center bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200/90 rounded-lg p-0.5 transition shadow-2xs">
                  <button
                    type="button"
                    onClick={(e) => handleCopyCode(trip, e)}
                    className="font-mono font-bold text-xs text-slate-900 px-1.5 py-0.5 rounded hover:bg-white flex items-center gap-1 transition cursor-pointer active:scale-95"
                    title="اضغط لنسخ كود الرحلة"
                  >
                    <span>{trip.tripNumber}</span>
                    {copiedCodeId === trip.id ? (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 hover:text-slate-700 shrink-0" />
                    )}
                  </button>

                  <span className="w-px h-3.5 bg-slate-300 mx-0.5" />

                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(trip, e)}
                    className="px-1.5 py-0.5 hover:bg-white text-slate-600 hover:text-orange-600 rounded transition cursor-pointer flex items-center gap-1 text-[10px] font-bold active:scale-95"
                    title="نسخ رابط مباشر للرحلة"
                  >
                    {copiedLinkId === trip.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3 h-3 text-orange-600" />
                        <span>رابط</span>
                      </>
                    )}
                  </button>
                </div>

                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  trip.tripType === 'رحلة دولية'
                    ? 'bg-purple-100 text-purple-800'
                    : trip.tripType === 'رحلة خارجية'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {trip.tripType || 'رحلة داخلية'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold shrink-0">{trip.date}</span>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">{trip.customerName}</div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                <span>🚛 {trip.truckNumber ? `شاحنة ${trip.truckNumber} (${trip.plateNumber})` : trip.plateNumber}</span>
                <span>•</span>
                <span>👤 {trip.driverName}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>المسار:</span>
                <span className="font-bold text-slate-900">
                  {trip.loadingLocation.split('-')[0]} ➔ {trip.unloadingLocation.split('-')[0]}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>الحمولة:</span>
                <span className="font-semibold text-slate-800">{trip.cargoType}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-900">الإجمالي: {trip.totalAmount.toLocaleString()} ر.س</span>
                {trip.remainingAmount > 0 ? (
                  <span className="font-bold text-amber-700">متبقي: {trip.remainingAmount.toLocaleString()} ر.س</span>
                ) : (
                  <span className="font-bold text-emerald-700">مدفوع بالكامل</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setViewingTrip(trip)}
                className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition"
              >
                عرض التفاصيل
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrint(trip)}
                  className="p-2 bg-slate-100 text-slate-700 hover:text-blue-600 rounded-lg transition"
                  title="طباعة"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleWhatsApp(trip)}
                  className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                  title="مشاركة التقرير عبر واتساب"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                {canEditOrDelete && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(trip)}
                      className="p-2 bg-slate-100 text-slate-700 hover:text-amber-600 rounded-lg transition"
                      title="تعديل"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTrip(trip)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                      title="حذف الرحلة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Trip Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 bg-[#F97316] rounded-full" />
                <h3 className="text-base sm:text-lg font-black">
                  {editingTrip ? `تعديل الرحلة: ${editingTrip.tripNumber}` : 'إضافة رحلة نقل جديدة'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsFormModalOpen(false);
                  if (onCloseInitialAdd) onCloseInitialAdd();
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrip} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Validation Errors Alert */}
              {validationErrors.length > 0 && (
                <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 text-rose-900 shadow-sm animate-shake">
                  <div className="flex items-center gap-2 font-bold text-sm mb-2 text-rose-700">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>تنبيه: لا يمكن حفظ الرحلة لوجود أخطاء في توافق البيانات:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs font-semibold mr-2">
                    {validationErrors.map((err, idx) => (
                      <li key={idx} className="leading-relaxed">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 1: Basic Info & Financial Center */}
              <div className="space-y-3">
                {/* Operation Mode Toggle */}
                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-800">
                      نمط تشغيل الرحلة والوساطة:
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {formData.operationType === 'SUBCONTRACTED_SPOT' ? '🤝 تشغيل وساطة فورية لشاحنة خارجية' : '🚛 تشغيل أسطول وسائقي المؤسسة'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          operationType: 'INTERNAL',
                          isSubcontracted: false,
                        }));
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        formData.operationType !== 'SUBCONTRACTED_SPOT'
                          ? 'bg-[#0F172A] text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                      }`}
                    >
                      <span>🚛 أسطول المؤسسة الداخلي</span>
                      <span className="text-[10px] opacity-75">(شاحنة وسائق المؤسسة)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => {
                          const clientP = prev.clientAgreedAmount || prev.totalAmount || 400;
                          const extC = prev.externalCarrierCost || 300;
                          const marg = Math.max(0, clientP - extC);
                          return {
                            ...prev,
                            operationType: 'SUBCONTRACTED_SPOT',
                            isSubcontracted: true,
                            baseAmount: clientP,
                            totalAmount: clientP,
                            clientAgreedAmount: clientP,
                            externalCarrierCost: extC,
                            brokerageMargin: marg,
                            netProfit: marg,
                          };
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        formData.operationType === 'SUBCONTRACTED_SPOT'
                          ? 'bg-purple-900 text-white shadow-sm ring-2 ring-purple-600'
                          : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-300'
                      }`}
                    >
                      <span>🤝 وساطة لحظية</span>
                      <span className="text-[10px] opacity-90">(شاحنة / سائق خارجي)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="tripNumber" className="block text-xs font-bold text-slate-700 mb-1">رقم الرحلة</label>
                    <input
                      id="tripNumber"
                      name="tripNumber"
                      type="text"
                      value={formData.tripNumber}
                      onChange={e => setFormData({ ...formData, tripNumber: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold"
                    />
                  </div>

                  {/* Financial Center Code (القائم المالي / المركز المالي) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="tripFinCode" className="block text-xs font-bold text-slate-700">
                        كود القائم المالي / المركز *
                      </label>
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded" title="يربط القيمة بكافة التفاصيل والتصفيات">
                        مركز مالي
                      </span>
                    </div>
                    <input
                      id="tripFinCode"
                      name="tripFinCode"
                      type="text"
                      placeholder="FIN-2026-0001"
                      value={formData.financialCenterCode || ''}
                      onChange={e => setFormData({ ...formData, financialCenterCode: e.target.value })}
                      required
                      className="w-full bg-amber-50/60 border border-amber-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-black text-amber-950 focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="tripDate" className="block text-xs font-bold text-slate-700 mb-1">تاريخ الرحلة</label>
                    <input
                      id="tripDate"
                      name="tripDate"
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="tripType" className="block text-xs font-bold text-slate-700 mb-1">نوع الرحلة</label>
                    <select
                      id="tripType"
                      name="tripType"
                      value={formData.tripType || 'رحلة داخلية'}
                      onChange={e => setFormData({ ...formData, tripType: e.target.value as TripType })}
                      className="w-full bg-slate-50 border border-orange-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-orange-600 focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="رحلة داخلية">رحلة داخلية</option>
                      <option value="رحلة دولية">رحلة دولية</option>
                      <option value="رحلة خارجية">رحلة خارجية</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tripStatus" className="block text-xs font-bold text-slate-700 mb-1">حالة الرحلة</label>
                    <select
                      id="tripStatus"
                      name="tripStatus"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as TripStatus })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-800"
                    >
                      <option value="NEW">جديدة</option>
                      <option value="LOADING">قيد التحميل</option>
                      <option value="IN_TRANSIT">جارية على الطريق</option>
                      <option value="DELIVERED">تم التوصيل</option>
                      <option value="COMPLETED">مكتملة</option>
                      <option value="CANCELLED">ملغاة</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Customer, Driver, Truck Selection */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    الأطراف والمركبة (العميل، السائق، والشاحنة)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">يمكنك الاختيار من القائمة أو الكتابة يدوياً</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Customer Block */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <label htmlFor="tripCustomerIdSelect" className="block text-[11px] font-bold text-slate-700">
                      العميل (اختر من القائمة أو اكتب)
                    </label>
                    <select
                      id="tripCustomerIdSelect"
                      name="tripCustomerIdSelect"
                      value={formData.customerId || (formData.customerName ? '__MANUAL__' : '')}
                      onChange={e => handleCustomerChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">-- اختر العميل من القائمة --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      <option value="__MANUAL__">➕ كتابة اسم عميل جديد...</option>
                    </select>

                    <div>
                      <label htmlFor="tripCustomerNameInput" className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                        اسم العميل *
                      </label>
                      <input
                        id="tripCustomerNameInput"
                        name="tripCustomerNameInput"
                        type="text"
                        placeholder="اسم العميل أو المؤسسة"
                        value={formData.customerName || ''}
                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="tripCustomerPhoneInput" className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                        رقم جوال العميل
                      </label>
                      <input
                        id="tripCustomerPhoneInput"
                        name="tripCustomerPhoneInput"
                        type="tel"
                        inputMode="tel"
                        placeholder="05XXXXXXXX"
                        value={formData.customerPhone || ''}
                        onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                  </div>

                  {/* Spot External Carrier Block VS Internal Driver/Truck */}
                  {formData.operationType === 'SUBCONTRACTED_SPOT' ? (
                    <div className="md:col-span-2 bg-purple-50/70 p-3.5 rounded-lg border border-purple-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🤝</span>
                          <label className="block text-[11px] font-bold text-purple-950">
                            بيانات الناقل والشاحنة الخارجية (وساطة وتشغيل لحظي)
                          </label>
                        </div>
                        <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full border border-purple-300">
                          شاحنة وسائق خارجي
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-700 font-bold mb-0.5">
                            اسم السائق / الناقل الخارجي *
                          </label>
                          <input
                            type="text"
                            placeholder="مثال: أبو فهد / مؤسسة النقل السريع"
                            value={formData.externalCarrierName || ''}
                            onChange={e => setFormData({ 
                              ...formData, 
                              externalCarrierName: e.target.value,
                              driverName: e.target.value 
                            })}
                            required
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-700 font-bold mb-0.5">
                            رقم جوال السائق الخارجي
                          </label>
                          <input
                            type="tel"
                            placeholder="05XXXXXXXX"
                            value={formData.externalCarrierPhone || ''}
                            onChange={e => setFormData({ 
                              ...formData, 
                              externalCarrierPhone: e.target.value,
                              driverPhone: e.target.value 
                            })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-700 font-bold mb-0.5">
                            رقم لوحة الشاحنة الخارجية *
                          </label>
                          <input
                            type="text"
                            placeholder="مثال: أ ب ج 1234"
                            value={formData.externalTruckPlate || ''}
                            onChange={e => setFormData({ 
                              ...formData, 
                              externalTruckPlate: e.target.value,
                              plateNumber: e.target.value 
                            })}
                            required
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-700 font-bold mb-0.5">
                            حالة سداد مستحقات الشاحنة الخارجية
                          </label>
                          <select
                            value={formData.externalCarrierPaymentStatus || 'UNPAID'}
                            onChange={e => setFormData({ ...formData, externalCarrierPaymentStatus: e.target.value as any })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="UNPAID">آجل (مستحق سداده لاحقاً للناقل)</option>
                            <option value="PAID">تم السداد بالكامل للشاحنة</option>
                            <option value="PARTIAL">سداد جزئي</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-[10px] text-purple-900 bg-purple-100/70 p-2 rounded border border-purple-200">
                        📌 <strong>ملاحظة هامة:</strong> تصدر بوليصة النقل البري الرسمية باسم مؤسستنا للعميل، وتدرج بيانات الشاحنة الخارجية كناقل معتمد، دون التأثير على حسابات الأسطول الداخلي.
                      </p>
                    </div>
                  ) : (() => {
                    const selectedDriverForBinding = drivers.find(d => d.id === formData.driverId);
                    const selectedTruckForBinding = trucks.find(t => t.id === formData.truckId || (formData.plateNumber && t.plateNumber === formData.plateNumber));
                    const isTruckLockedToDriver = Boolean(
                      selectedDriverForBinding && (selectedDriverForBinding.assignedTruckId || selectedDriverForBinding.assignedPlateNumber)
                    );
                    const isDriverLockedToTruck = Boolean(
                      selectedTruckForBinding && selectedTruckForBinding.assignedDriverId && !formData.driverId
                    );

                    return (
                      <>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <label htmlFor="tripDriverIdSelect" className="block text-[11px] font-bold text-slate-700">
                              السائق (معرّف السائق الثابت Driver ID)
                            </label>
                            {isDriverLockedToTruck ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                                🔒 سائق الشاحنة الإلزامي
                              </span>
                            ) : formData.plateNumber && formData.driverName ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                🔒 تجميد قيم مستقلة
                              </span>
                            ) : null}
                          </div>
                          <select
                            id="tripDriverIdSelect"
                            name="tripDriverIdSelect"
                            value={formData.driverId || (formData.driverName ? '__MANUAL__' : '')}
                            onChange={e => handleDriverChange(e.target.value)}
                            disabled={isDriverLockedToTruck}
                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                              isDriverLockedToTruck ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-slate-50 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="">-- اختر السائق من القائمة --</option>
                            {drivers.map(d => {
                              const linkedTrk = trucks.find(t => t.id === d.assignedTruckId || t.assignedDriverId === d.id);
                              return (
                                <option key={d.id} value={d.id}>
                                  {d.name} ({d.phone}) {linkedTrk ? `[🚛 الشاحنة الإلزامية: ${linkedTrk.plateNumber}]` : ''}
                                </option>
                              );
                            })}
                            <option value="__MANUAL__">➕ كتابة اسم سائق جديد...</option>
                          </select>

                          <div>
                            <label htmlFor="tripDriverNameInput" className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              اسم السائق *
                            </label>
                            <input
                              id="tripDriverNameInput"
                              name="tripDriverNameInput"
                              type="text"
                              placeholder="اسم السائق الثلاثي"
                              value={formData.driverName || ''}
                              onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                              readOnly={isDriverLockedToTruck}
                              required
                              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-orange-500 ${
                                isDriverLockedToTruck ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-300'
                              }`}
                            />
                          </div>

                          <div>
                            <label htmlFor="tripDriverPhoneInput" className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              رقم جوال السائق
                            </label>
                            <input
                              id="tripDriverPhoneInput"
                              name="tripDriverPhoneInput"
                              type="tel"
                              inputMode="tel"
                              placeholder="05XXXXXXXX"
                              value={formData.driverPhone || ''}
                              onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
                              readOnly={isDriverLockedToTruck}
                              className={`w-full border rounded-lg px-2.5 py-1 text-xs ${
                                isDriverLockedToTruck ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200' : 'bg-white text-slate-800 border-slate-200'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Truck Block */}
                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <label htmlFor="tripTruckIdSelect" className="block text-[11px] font-bold text-slate-700">
                              الشاحنة / السيارة (ربط إجباري 1:1 مع السائق)
                            </label>
                            {isTruckLockedToDriver ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full border border-emerald-300">
                                🔒 شاحنة السائق الإلزامية: {formData.plateNumber}
                              </span>
                            ) : formData.plateNumber && formData.driverName ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-300">
                                🚛 اللوحة: {formData.plateNumber}
                              </span>
                            ) : null}
                          </div>
                          <select
                            id="tripTruckIdSelect"
                            name="tripTruckIdSelect"
                            value={formData.truckId || (formData.plateNumber ? '__MANUAL__' : '')}
                            onChange={e => handleTruckChange(e.target.value)}
                            disabled={isTruckLockedToDriver}
                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold font-mono focus:ring-2 focus:ring-orange-500 ${
                              isTruckLockedToDriver ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200' : 'bg-slate-50 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="">-- اختر الشاحنة من القائمة --</option>
                            {trucks.map(t => {
                              const linkedDrv = drivers.find(d => d.id === t.assignedDriverId || d.assignedTruckId === t.id);
                              return (
                                <option key={t.id} value={t.id}>
                                  {t.plateNumber} ({t.model}) {linkedDrv ? `[👤 السائق: ${linkedDrv.name}]` : ''}
                                </option>
                              );
                            })}
                            <option value="__MANUAL__">➕ كتابة رقم لوحة جديدة...</option>
                          </select>

                          <div>
                            <label htmlFor="tripPlateNumberInput" className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              رقم اللوحة *
                            </label>
                            <input
                              id="tripPlateNumberInput"
                              name="tripPlateNumberInput"
                              type="text"
                              placeholder="مثال: أ ب ج 1234"
                              value={formData.plateNumber || ''}
                              onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
                              readOnly={isTruckLockedToDriver}
                              required
                              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono focus:ring-2 focus:ring-orange-500 ${
                                isTruckLockedToDriver ? 'bg-slate-100 text-slate-700 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900 border-slate-300'
                              }`}
                            />
                            {isTruckLockedToDriver && (
                              <p className="text-[10px] text-emerald-800 font-bold bg-emerald-50 p-1.5 rounded border border-emerald-200 mt-1">
                                🔒 الشاحنة مرتبطة ومقفلة إجبارياً بالسائق المحدد (سائق واحد = شاحنة واحدة).
                              </p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="tripTruckTypeSelect" className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              نوع الشاحنة / الهيكل
                            </label>
                            <select
                              id="tripTruckTypeSelect"
                              name="tripTruckTypeSelect"
                              value={formData.truckType || 'CURTAIN'}
                              onChange={e => setFormData({ ...formData, truckType: e.target.value as TruckType })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-orange-600"
                            >
                              <option value="CURTAIN">ستارة (Curtain)</option>
                              <option value="REFRIGERATED">براد (Refrigerated)</option>
                              <option value="FLATBED">سطحة (Flatbed)</option>
                              <option value="TANKER">صهريج (Tanker)</option>
                              <option value="DUMPER">قلاب (Dumper)</option>
                              <option value="BOX">صندوق / لوري (Box)</option>
                            </select>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Unique Key & Driver-Truck Direct Verification Badge (For Internal Fleet Trips) */}
                {formData.operationType !== 'SUBCONTRACTED_SPOT' && (() => {
                  const selDriver = drivers.find(d => d.id === formData.driverId || d.name === formData.driverName);
                  const driverCode = extractDriverCode(selDriver?.nationalId);
                  const truckCode = extractTruckCode(formData.plateNumber);
                  const tripNum = formData.tripNumber || 'TRIP-NEW';
                  const keyPreview = `${tripNum}-${driverCode}-${truckCode}`;
                  const assignedDriverPlate = selDriver?.assignedPlateNumber || '';
                  const driverTruckCode = extractTruckCode(assignedDriverPlate);
                  const hasDiscrepancy = Boolean(assignedDriverPlate && formData.plateNumber && assignedDriverPlate.trim() !== formData.plateNumber.trim());

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🔑</span>
                          <span className="font-bold text-xs text-slate-800">
                            كود الربط الموحد (Unique Key):
                          </span>
                        </div>
                        <div className="font-mono font-black text-xs text-blue-800 bg-blue-100/90 px-3 py-1 rounded-lg border border-blue-300 shadow-2xs">
                          {keyPreview}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-600 flex flex-wrap items-center gap-2 font-medium bg-white/70 p-2 rounded-lg border border-slate-200">
                        <span>قاعدة التوليد: <strong className="font-mono text-slate-900">[كود الرحلة]-[آخر 5 أرقام للهوية]-[آخر رقمين للشاحنة]</strong></span>
                        <span>•</span>
                        <span>السائق: <strong className="font-mono text-slate-900">{driverCode}</strong></span>
                        <span>•</span>
                        <span>الشاحنة: <strong className="font-mono text-slate-900">{truckCode}</strong></span>
                      </div>

                      {hasDiscrepancy && (
                        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900">
                          <div>
                            <span className="font-bold">⚠️ تنبيه عدم تطابق:</span> شاحنة ملف السائق (<strong className="font-mono">{assignedDriverPlate}</strong> كود {driverTruckCode}) تختلف عن شاحنة الرحلة (<strong className="font-mono">{formData.plateNumber}</strong> كود {truckCode}).
                          </div>
                          {selDriver && (
                            <button
                              type="button"
                              onClick={() => {
                                StorageService.syncDriverToTripTruck(selDriver.id, formData.plateNumber || '', currentUser);
                                onRefresh();
                              }}
                              className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-2.5 py-1.5 rounded text-[10px] whitespace-nowrap transition cursor-pointer shadow-2xs"
                            >
                              🔄 تحديث ملف السائق ليطابق الرحلة
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Section 3: Cargo & Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان التحميل (البداية)</label>
                  <input
                    type="text"
                    placeholder="أدخل مكان التحميل (يدوي)..."
                    value={formData.loadingLocation || ''}
                    onChange={e => setFormData({ ...formData, loadingLocation: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان التنزيل (الوجهة)</label>
                  <input
                    type="text"
                    placeholder="أدخل مكان التنزيل (يدوي)..."
                    value={formData.unloadingLocation || ''}
                    onChange={e => setFormData({ ...formData, unloadingLocation: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع البضاعة / الحمولة</label>
                  <input
                    type="text"
                    placeholder="أدخل نوع البضاعة أو الحمولة (يدوي)..."
                    value={formData.cargoType || ''}
                    onChange={e => setFormData({ ...formData, cargoType: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وقت التحميل والتسليم المتوقع</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="وقت التحميل"
                      value={formData.loadingTime || ''}
                      onChange={e => setFormData({ ...formData, loadingTime: e.target.value })}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="وقت الوصول المتوقع"
                      value={formData.estimatedArrival || ''}
                      onChange={e => setFormData({ ...formData, estimatedArrival: e.target.value })}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Financial Calculations */}
              {formData.operationType === 'SUBCONTRACTED_SPOT' ? (
                /* Spot Brokerage Economics Card (رحلة لحظية وساطة) */
                <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-5 bg-purple-700 rounded-full" />
                      <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                        الحسابات المالية للرحلة اللحظية (هامش ربح الوساطة)
                      </h4>
                    </div>
                    <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                      تشغيل ووساطة خارجية
                    </span>
                  </div>

                  {/* Clarification Box for 400 - 300 = 100 */}
                  <div className="bg-white p-3 rounded-lg border border-purple-200 text-xs text-purple-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🤝</span>
                      <span>
                        <strong>معادلة الهامش الربحي:</strong> سعر بيع الرحلة للعميل ({formData.clientAgreedAmount || formData.totalAmount || 0} ر.س) - تكلفة الشاحنة الخارجية ({formData.externalCarrierCost || 0} ر.س) = <strong className="text-emerald-700 font-mono font-black text-sm">+{formData.brokerageMargin || 0} ر.س</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded font-bold border border-emerald-200 whitespace-nowrap">
                      ★ يدخل في الهامش الربحي للمؤسسة
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-purple-300 shadow-2xs">
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        سعر البيع المتفق عليه مع العميل اللحظي (ر.س) *
                      </label>
                      <input
                        type="number"
                        placeholder="مثلاً 400"
                        value={formData.clientAgreedAmount === 0 ? '' : formData.clientAgreedAmount ?? ''}
                        onChange={e => handleSpotAmountChange('clientAgreedAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-black text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">القيمة الرسمية للبوليصة والفاتورة</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-purple-300 shadow-2xs">
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        تكلفة بيع الرحلة للشاحنة الخارجية (ر.س) *
                      </label>
                      <input
                        type="number"
                        placeholder="مثلاً 300"
                        value={formData.externalCarrierCost === 0 ? '' : formData.externalCarrierCost ?? ''}
                        onChange={e => handleSpotAmountChange('externalCarrierCost', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-black text-purple-950 focus:bg-white focus:border-purple-600 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">المبلغ المستحق للشاحنة الخارجية</span>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-300 shadow-2xs flex flex-col justify-between">
                      <span className="block text-[11px] font-bold text-emerald-950 mb-1">
                        فارق الهامش الربحي المحقق (ر.س)
                      </span>
                      <div className="text-2xl font-black text-emerald-700 font-mono">
                        +{formData.brokerageMargin || 0} ر.س
                      </div>
                      <span className="text-[10px] text-emerald-800 font-medium mt-1">يُرحل إلى أرباح المؤسسة والتسليم للمالك</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المبلغ المحصل من العميل مقدماً</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.paidAmount === 0 ? '' : formData.paidAmount ?? ''}
                        onChange={e => handleAmountChange('paidAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المتبقي المطلوب من العميل</label>
                      <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-700">
                        {formData.remainingAmount || 0} ر.س
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة سداد العميل</label>
                      <select
                        value={formData.paymentMethod || 'BANK_TRANSFER'}
                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="BANK_TRANSFER">تحويل بنكي</option>
                        <option value="CASH">نقدي كاش</option>
                        <option value="CREDIT">آجل</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Internal Fleet Calculations */
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-orange-950 uppercase tracking-wider">
                      البيانات المالية وضريبة القيمة المضافة (الأسطول الداخلي)
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-slate-500 font-bold ml-1">تحديد الضريبة:</span>
                      <button
                        type="button"
                        onClick={() => handleAmountChange('taxRate', 0)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                          formData.taxRate === 0
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        بدون ضريبة (0%)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAmountChange('taxRate', 15)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                          formData.taxRate === 15
                            ? 'bg-[#F97316] text-white shadow-sm'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        ضريبة قياسية (15%)
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-800">
                          قيمة الرحلة (قائم مالي أو مركز) *
                        </label>
                        <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200" title="كود القائم المالي مرتبط بكافة التفاصيل والتقارير">
                          كود: {formData.financialCenterCode || 'FIN-TRP'}
                        </span>
                      </div>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.baseAmount === 0 ? '' : formData.baseAmount ?? ''}
                        onChange={e => handleAmountChange('baseAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">القيمة المعتمدة للقائم المالي والتصفية</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>نسبة الضريبة (%)</span>
                        <span className="text-[10px] text-slate-400">يدوي</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={formData.taxRate === 0 ? '' : formData.taxRate ?? ''}
                        onChange={e => handleAmountChange('taxRate', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-slate-800 focus:border-orange-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>مبلغ الضريبة المضافة (ر.س)</span>
                        <span className="text-[10px] text-orange-600 font-bold">يدوي</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={formData.taxAmount === 0 ? '' : formData.taxAmount ?? ''}
                        onChange={e => handleAmountChange('taxAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-white border border-orange-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-orange-950 focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الإجمالي شامل الضريبة
                      </label>
                      <div className="bg-orange-100 border border-orange-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-black text-orange-950 flex items-center justify-between">
                        <span>{formData.totalAmount || 0}</span>
                        <span className="text-[10px] text-orange-700 font-normal">ر.س</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-orange-200/60">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المبلغ المدفوع مقدماً (ر.س)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.paidAmount === 0 ? '' : formData.paidAmount ?? ''}
                        onChange={e => handleAmountChange('paidAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-emerald-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المبلغ المتبقي</label>
                      <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-amber-700">
                        {formData.remainingAmount || 0} ر.س
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة السداد</label>
                      <select
                        value={formData.paymentMethod || ''}
                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">-- اختر طريقة السداد --</option>
                        <option value="BANK_TRANSFER">تحويل بنكي</option>
                        <option value="CASH">نقدي</option>
                        <option value="CHEQUE">شيك مصرفي</option>
                        <option value="CREDIT">آجل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">صافي ربح الرحلة</label>
                      <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-black text-emerald-900">
                        {formData.netProfit || 0} ر.س
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-orange-200/60">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">مصروفات الرحلة (وقود/رسوم)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.tripExpenses === 0 ? '' : formData.tripExpenses ?? ''}
                        onChange={e => handleAmountChange('tripExpenses', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">عهدة السائق (ر.س)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.driverCustody === 0 ? '' : formData.driverCustody ?? ''}
                        onChange={e => setFormData({ ...formData, driverCustody: e.target.value === '' ? 0 : Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">عمولة الوساطة / المكتب</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.commissionAmount === 0 ? '' : formData.commissionAmount ?? ''}
                        onChange={e => handleAmountChange('commissionAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: Notes & Waybill Attachment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات وتعليمات خاصة</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="تعليمات السلامة، جهة الاتصال عند التنزيل..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">إرفاق صورة البوليصة / الحمولة</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl p-3 bg-slate-50 transition">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-600 font-semibold">اختيار صورة من الجهاز</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.photoUrl && (
                      <div className="w-16 h-16 rounded-xl border border-slate-300 overflow-hidden relative group">
                        <img src={formData.photoUrl} alt="Attached" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, photoUrl: '' })}
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                {editingTrip && canEditOrDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      const tripToDelete = editingTrip;
                      setIsFormModalOpen(false);
                      setDeletingTrip(tripToDelete);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>حذف هذه الرحلة</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
                  >
                    {editingTrip ? 'حفظ التعديلات' : 'إنشاء الرحلة'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Trip Details Modal */}
      {viewingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-orange-600 px-2 py-0.5 rounded font-mono uppercase">
                  تفاصيل الرحلة الرسمية
                </span>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <h3 className="text-lg font-black">{viewingTrip.tripNumber}</h3>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(viewingTrip)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="نسخ كود الرحلة"
                  >
                    {copiedCodeId === viewingTrip.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{copiedCodeId === viewingTrip.id ? 'تم النسخ' : 'نسخ الكود'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(viewingTrip)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-orange-400 rounded-lg transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="نسخ رابط مباشر للرحلة"
                  >
                    {copiedLinkId === viewingTrip.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 text-orange-400" />
                    )}
                    <span>{copiedLinkId === viewingTrip.id ? 'تم نسخ الرابط' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              </div>
              <button onClick={() => setViewingTrip(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Financial Center Code Banner */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏛️</span>
                  <div>
                    <span className="text-[10px] text-amber-800 font-bold block">كود القائم المالي / المركز المالي الموحد:</span>
                    <span className="text-sm font-mono font-black text-amber-950">
                      {viewingTrip.financialCenterCode || ('FIN-' + viewingTrip.tripNumber.replace('TRP-', ''))}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 font-semibold block">نوع التشغيل:</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-block ${
                    viewingTrip.operationType === 'SUBCONTRACTED_SPOT' || viewingTrip.isSubcontracted
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                  }`}>
                    {viewingTrip.operationType === 'SUBCONTRACTED_SPOT' || viewingTrip.isSubcontracted
                      ? '🤝 وساطة وتشغيل لحظي (شاحنة خارجية)'
                      : '🚛 أسطول المؤسسة الداخلي'}
                  </span>
                </div>
              </div>

              {/* Spot Brokerage Economics Card if applicable */}
              {(viewingTrip.operationType === 'SUBCONTRACTED_SPOT' || viewingTrip.isSubcontracted) && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                      <span>🤝</span>
                      <span>الحسابات المالية لرحلة الوساطة (فارق الهامش الربحي للمؤسسة)</span>
                    </span>
                    <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded">
                      بوليصة تشغيل لوجستي
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                      <span className="text-[10px] text-slate-500 block font-semibold">سعر العميل اللحظي</span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {(viewingTrip.clientAgreedAmount || viewingTrip.totalAmount || 0).toLocaleString()} ر.س
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                      <span className="text-[10px] text-slate-500 block font-semibold">تكلفة الشاحنة الخارجية</span>
                      <span className="text-sm font-black text-purple-950 font-mono">
                        {(viewingTrip.externalCarrierCost || 0).toLocaleString()} ر.س
                      </span>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-300">
                      <span className="text-[10px] text-emerald-800 block font-bold">الهامش الربحي المحقق</span>
                      <span className="text-base font-black text-emerald-700 font-mono">
                        +{(viewingTrip.brokerageMargin || Math.max(0, (viewingTrip.clientAgreedAmount || viewingTrip.totalAmount || 0) - (viewingTrip.externalCarrierCost || 0))).toLocaleString()} ر.س
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">تاريخ الرحلة</span>
                  <span className="text-xs font-bold text-slate-800">{viewingTrip.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">نوع الرحلة</span>
                  <span className="text-xs font-bold text-orange-600">{viewingTrip.tripType || 'رحلة داخلية'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">الحالة</span>
                  <span className="text-xs font-bold text-slate-800">{viewingTrip.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">حالة السداد</span>
                  <span className="text-xs font-bold text-emerald-700">{viewingTrip.paymentStatus}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">طريقة السداد</span>
                  <span className="text-xs font-bold text-slate-800">{viewingTrip.paymentMethod}</span>
                </div>
              </div>

              {/* Customer & Driver Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-xs font-black text-slate-800 block">بيانات العميل</span>
                  <div className="text-xs font-bold text-slate-900">{viewingTrip.customerName}</div>
                  <div className="text-xs text-slate-500">الجوال: {viewingTrip.customerPhone || 'غير مسجل'}</div>
                  <div className="text-xs text-slate-500">العنوان: {viewingTrip.customerAddress || 'الرياض'}</div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-xs font-black text-slate-800 block">بيانات السائق والشاحنة</span>
                  <div className="text-xs font-bold text-slate-900">{viewingTrip.driverName}</div>
                  <div className="text-xs text-slate-500">الجوال: {viewingTrip.driverPhone || 'غير مسجل'}</div>
                  <div className="text-xs text-slate-500">لوحة الشاحنة: {viewingTrip.plateNumber} ({viewingTrip.truckType})</div>
                </div>
              </div>

              {/* Route & Cargo */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-500">مسار النقل:</span>
                  <span className="text-slate-900 font-bold">{viewingTrip.loadingLocation} ➔ {viewingTrip.unloadingLocation}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>نوع البضاعة:</span>
                  <span className="font-bold text-slate-800">{viewingTrip.cargoType}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>وقت التحميل / الوصول:</span>
                  <span>{viewingTrip.loadingTime} / {viewingTrip.estimatedArrival}</span>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-black text-slate-800">الملخص المالي والربحي للرحلة</div>
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">قيمة أجور النقل الأساسية:</span>
                    <span className="font-bold">{viewingTrip.baseAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">ضريبة القيمة المضافة ({viewingTrip.taxRate ?? 0}%):</span>
                    <span className="font-bold">{viewingTrip.taxAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>الإجمالي المستحق:</span>
                    <span>{viewingTrip.totalAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700 font-bold">
                    <span>المسدد / المحصل:</span>
                    <span>{viewingTrip.paidAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-700 font-bold">
                    <span>المتبقي:</span>
                    <span>{viewingTrip.remainingAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                    <span>مصروفات الرحلة والوقود:</span>
                    <span>{viewingTrip.tripExpenses.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between font-black text-orange-600">
                    <span>صافي الربح التقديري:</span>
                    <span>{viewingTrip.netProfit.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>

              {/* Photo & Notes */}
              {viewingTrip.photoUrl && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">مرفق صورة البوليصة / الحمولة:</span>
                  <div className="w-full max-h-48 rounded-xl overflow-hidden border border-slate-200">
                    <img src={viewingTrip.photoUrl} alt="Trip Doc" className="w-full h-full object-contain bg-slate-900" />
                  </div>
                </div>
              )}

              {viewingTrip.notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold block mb-0.5">ملاحظات:</span>
                  {viewingTrip.notes}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                {canEditOrDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      const tripToDelete = viewingTrip;
                      setViewingTrip(null);
                      setDeletingTrip(tripToDelete);
                    }}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>حذف الرحلة</span>
                  </button>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {canEditOrDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        const tripToEdit = viewingTrip;
                        setViewingTrip(null);
                        handleOpenEdit(tripToEdit);
                      }}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                      <span>تعديل بيانات الرحلة</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePrint(viewingTrip)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة البوليصة والفاتورة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => shareTripReportViaWhatsApp(viewingTrip)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>مشاركة التقرير عبر واتساب</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف الرحلة</h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف الرحلة رقم <span className="font-mono font-bold text-slate-900">{deletingTrip.tripNumber}</span> الخاصة بالعميل {deletingTrip.customerName}؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingTrip(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteTrip}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف مجموعة رحلات</h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف <strong className="font-mono text-red-600 text-sm">{selectedTripIds.length}</strong> رحلة محددة دفعة واحدة؟ لن يمكن التراجع عن هذا الإجراء وسيتم شطبها نهائياً من السجلات.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteBatchTrips}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                تأكيد حذف ({selectedTripIds.length}) رحلة
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Toast Notification for Copy Actions */}
      {toastNotification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl shadow-2xl border border-orange-500/50 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastNotification}</span>
        </div>
      )}
    </div>
  );
};
