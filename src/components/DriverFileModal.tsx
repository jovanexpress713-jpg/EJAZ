import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  User as UserIcon, 
  Truck as TruckIcon, 
  MapPin, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  FileText, 
  ChevronDown, 
  Check, 
  Clock, 
  ShieldCheck, 
  Camera, 
  Upload,
  Info
} from 'lucide-react';
import { 
  Driver, 
  Truck, 
  Trip, 
  TruckType, 
  TruckStatus, 
  TripStatus, 
  User 
} from '../types';
import { StorageService, CompleteDriverTripInput } from '../services/storage';
import { normalizeTruckNumber, isExactTruckMatch, getTruckDisplayTitle } from '../utils/truckUtils';
import { compressImageFile } from '../utils/imageCompressor';

interface DriverFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverToEdit?: Driver | null;
  trucks: Truck[];
  currentUser: User;
  onSaved: (message: string) => void;
}

export const DriverFileModal: React.FC<DriverFileModalProps> = ({
  isOpen,
  onClose,
  driverToEdit,
  trucks,
  currentUser,
  onSaved,
}) => {
  const isEditing = Boolean(driverToEdit);

  // Active section tab: 'ALL' (scrollable) or explicit tabs
  const [activeTab, setActiveTab] = useState<'DRIVER' | 'TRUCK' | 'TRIPS'>('DRIVER');

  // 1. Driver State
  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverNationalId, setDriverNationalId] = useState('');
  const [driverAddress, setDriverAddress] = useState('');
  const [driverStatus, setDriverStatus] = useState<'ACTIVE' | 'VACATION' | 'SUSPENDED'>('ACTIVE');
  const [driverNotes, setDriverNotes] = useState('');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState('2028-12-31');
  const [driverPhotoUrl, setDriverPhotoUrl] = useState<string | undefined>(undefined);
  const [driverLicensePhotoUrl, setDriverLicensePhotoUrl] = useState<string | undefined>(undefined);
  const [driverIdPhotoUrl, setDriverIdPhotoUrl] = useState<string | undefined>(undefined);
  const [driverNationality, setDriverNationality] = useState('سعودي');
  const [driverJobTitle, setDriverJobTitle] = useState('سائق نقل ثقيل وتريلات');

  // 2. Truck State
  const [truckMode, setTruckMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [newTruckNumber, setNewTruckNumber] = useState('');
  const [newPlateNumber, setNewPlateNumber] = useState('');
  const [newTruckType, setNewTruckType] = useState<TruckType>('CURTAIN');
  const [newTruckModel, setNewTruckModel] = useState('مرسيدس أكتروس');
  const [newTruckStatus, setNewTruckStatus] = useState<TruckStatus>('AVAILABLE');
  const [newTruckNotes, setNewTruckNotes] = useState('');

  // 3. Trips State
  const [trips, setTrips] = useState<CompleteDriverTripInput[]>([]);

  // Feedback and loading state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when opened
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setIsSubmitting(false);

    if (driverToEdit) {
      // Load Existing Driver
      setDriverId(driverToEdit.id);
      setDriverName(driverToEdit.name || '');
      setDriverPhone(driverToEdit.phone || '');
      setDriverNationalId(driverToEdit.nationalId || '');
      setDriverAddress(driverToEdit.address || '');
      setDriverStatus(driverToEdit.status || 'ACTIVE');
      setDriverNotes(driverToEdit.notes || '');
      setDriverLicenseNumber(driverToEdit.licenseNumber || '');
      setDriverLicenseExpiry(driverToEdit.licenseExpiry || '2028-12-31');
      setDriverPhotoUrl(driverToEdit.photoUrl);
      setDriverLicensePhotoUrl(driverToEdit.licensePhotoUrl);
      setDriverIdPhotoUrl(driverToEdit.idPhotoUrl);
      setDriverNationality(driverToEdit.nationality || 'سعودي');
      setDriverJobTitle(driverToEdit.jobTitle || 'سائق نقل ثقيل وتريلات');

      // Check linked truck
      if (driverToEdit.assignedTruckId) {
        setTruckMode('EXISTING');
        setSelectedTruckId(driverToEdit.assignedTruckId);
        const linkedTruck = trucks.find(t => t.id === driverToEdit.assignedTruckId);
        if (linkedTruck) {
          setNewTruckNumber(linkedTruck.truckNumber || normalizeTruckNumber(linkedTruck.plateNumber));
          setNewPlateNumber(linkedTruck.plateNumber);
        }
      } else {
        setTruckMode(trucks.length > 0 ? 'EXISTING' : 'NEW');
        if (trucks.length > 0) {
          setSelectedTruckId(trucks[0].id);
        }
      }

      // Load all trips belonging to this driver
      const driverTrips = StorageService.getTripsByDriverId(driverToEdit.id);
      setTrips(
        driverTrips.map(t => ({
          id: t.id,
          tripNumber: t.tripNumber,
          date: t.date,
          loadingLocation: t.loadingLocation,
          unloadingLocation: t.unloadingLocation,
          cargoType: t.cargoType,
          cargoDescription: t.cargoDescription || '',
          baseAmount: t.baseAmount,
          tripExpenses: t.tripExpenses,
          netProfit: t.netProfit,
          status: t.status,
          notes: t.notes,
          truckId: t.truckId,
          truckNumber: t.truckNumber,
          plateNumber: t.plateNumber,
        }))
      );
    } else {
      // Create New Driver
      const nextDriverId = StorageService.generateNextDriverId();
      setDriverId(nextDriverId);
      setDriverName('');
      setDriverPhone('');
      setDriverNationalId('');
      setDriverAddress('');
      setDriverStatus('ACTIVE');
      setDriverNotes('');
      setDriverLicenseNumber('');
      setDriverLicenseExpiry('2028-12-31');
      setDriverPhotoUrl(undefined);
      setDriverLicensePhotoUrl(undefined);
      setDriverIdPhotoUrl(undefined);
      setDriverNationality('سعودي');
      setDriverJobTitle('سائق نقل ثقيل وتريلات');

      // Initialize truck
      if (trucks.length > 0) {
        setTruckMode('EXISTING');
        setSelectedTruckId(trucks[0].id);
        setNewTruckNumber(trucks[0].truckNumber || normalizeTruckNumber(trucks[0].plateNumber));
        setNewPlateNumber(trucks[0].plateNumber);
      } else {
        setTruckMode('NEW');
        setNewTruckNumber('25');
        setNewPlateNumber('25');
      }
      setNewTruckType('CURTAIN');
      setNewTruckModel('مرسيدس أكتروس');
      setNewTruckStatus('AVAILABLE');
      setNewTruckNotes('');

      // Initialize with 0 trips or prepare empty list
      setTrips([]);
    }
  }, [isOpen, driverToEdit, trucks]);

  // Current selected truck object (if existing mode)
  const currentSelectedTruck = useMemo(() => {
    return trucks.find(t => t.id === selectedTruckId);
  }, [trucks, selectedTruckId]);

  // Add a new trip to the driver's list
  const handleAddNewTrip = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextSeq = String(trips.length + 1).padStart(3, '0');
    const autoTripNum = `TRP-${nextSeq}`;

    // Determine current truck identifier to display
    const currentTruckNum = truckMode === 'EXISTING' 
      ? (currentSelectedTruck?.truckNumber || normalizeTruckNumber(currentSelectedTruck?.plateNumber) || '')
      : newTruckNumber;
    const currentPlate = truckMode === 'EXISTING'
      ? (currentSelectedTruck?.plateNumber || '')
      : newPlateNumber;

    const newTripItem: CompleteDriverTripInput = {
      tripNumber: autoTripNum,
      date: today,
      loadingLocation: 'الرياض',
      unloadingLocation: 'الدمام',
      cargoType: 'بضائع عامة',
      cargoDescription: '',
      baseAmount: 3500,
      tripExpenses: 500,
      netProfit: 3000,
      status: 'COMPLETED',
      notes: '',
      truckId: truckMode === 'EXISTING' ? currentSelectedTruck?.id : undefined,
      truckNumber: currentTruckNum,
      plateNumber: currentPlate,
    };

    setTrips(prev => [...prev, newTripItem]);
  };

  // Update a field inside a trip row
  const handleUpdateTripField = (
    index: number,
    field: keyof CompleteDriverTripInput,
    value: any
  ) => {
    setTrips(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'baseAmount' || field === 'tripExpenses') {
        const base = Number(item.baseAmount) || 0;
        const exp = Number(item.tripExpenses) || 0;
        item.netProfit = base - exp;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Remove a trip row
  const handleRemoveTrip = (index: number) => {
    setTrips(prev => prev.filter((_, i) => i !== index));
  };

  // Image upload with compression
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'photo' | 'license' | 'id'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 800, 0.75);
      if (type === 'photo') setDriverPhotoUrl(compressed);
      if (type === 'license') setDriverLicensePhotoUrl(compressed);
      if (type === 'id') setDriverIdPhotoUrl(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = ev => {
        const res = ev.target?.result as string;
        if (!res) return;
        if (type === 'photo') setDriverPhotoUrl(res);
        if (type === 'license') setDriverLicensePhotoUrl(res);
        if (type === 'id') setDriverIdPhotoUrl(res);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save the complete driver file atomically
  const handleSaveCompleteFile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validate Driver Input
    if (!driverName.trim()) {
      setErrorMessage('يجب إدخال اسم السائق.');
      setActiveTab('DRIVER');
      return;
    }
    if (!driverPhone.trim()) {
      setErrorMessage('يجب إدخال رقم هاتف السائق.');
      setActiveTab('DRIVER');
      return;
    }
    if (!driverNationalId.trim()) {
      setErrorMessage('يجب إدخال رقم هوية السائق.');
      setActiveTab('DRIVER');
      return;
    }

    // 2. Validate Truck Input
    let finalTruckNumber = '';
    let finalPlateNumber = '';

    if (truckMode === 'EXISTING') {
      if (!selectedTruckId) {
        setErrorMessage('يجب اختيار الشاحنة المرتبطة بالسائق.');
        setActiveTab('TRUCK');
        return;
      }
      const trk = trucks.find(t => t.id === selectedTruckId);
      if (!trk) {
        setErrorMessage('الشاحنة المحددة غير موجودة.');
        setActiveTab('TRUCK');
        return;
      }
      finalTruckNumber = trk.truckNumber || normalizeTruckNumber(trk.plateNumber);
      finalPlateNumber = trk.plateNumber;
    } else {
      finalTruckNumber = normalizeTruckNumber(newTruckNumber);
      finalPlateNumber = newPlateNumber.trim() || finalTruckNumber;

      if (!finalTruckNumber && !finalPlateNumber) {
        setErrorMessage('يجب إدخال رقم الشاحنة ورقم اللوحة.');
        setActiveTab('TRUCK');
        return;
      }
    }

    // 3. Validate Trips Input
    for (let i = 0; i < trips.length; i++) {
      const trp = trips[i];
      if (!trp.tripNumber.trim()) {
        setErrorMessage(`يجب تحديد رقم الرحلة للرحلة رقم (${i + 1}).`);
        setActiveTab('TRIPS');
        return;
      }
      if (!trp.loadingLocation.trim() || !trp.unloadingLocation.trim()) {
        setErrorMessage(`يجب تحديد مكان الانطلاق ومكان الوصول للرحلة (${trp.tripNumber}).`);
        setActiveTab('TRIPS');
        return;
      }
    }

    // 4. Submit Transaction
    setIsSubmitting(true);
    try {
      const result = StorageService.saveCompleteDriverFile({
        driver: {
          id: isEditing ? driverToEdit?.id : undefined,
          name: driverName.trim(),
          phone: driverPhone.trim(),
          nationalId: driverNationalId.trim(),
          licenseNumber: driverLicenseNumber.trim(),
          licenseExpiry: driverLicenseExpiry,
          address: driverAddress.trim(),
          status: driverStatus,
          notes: driverNotes.trim(),
          photoUrl: driverPhotoUrl,
          licensePhotoUrl: driverLicensePhotoUrl,
          idPhotoUrl: driverIdPhotoUrl,
          nationality: driverNationality,
          jobTitle: driverJobTitle,
        },
        truck: {
          isNewTruck: truckMode === 'NEW',
          existingTruckId: truckMode === 'EXISTING' ? selectedTruckId : undefined,
          truckNumber: finalTruckNumber,
          plateNumber: finalPlateNumber,
          truckType: newTruckType,
          model: newTruckModel,
          status: newTruckStatus,
          notes: newTruckNotes,
        },
        trips: trips,
        actor: currentUser,
      });

      onSaved(result.message);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ ملف السائق.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Financial calculations
  const totalTripsValue = useMemo(() => {
    return trips.reduce((sum, t) => sum + (Number(t.baseAmount) || 0), 0);
  }, [trips]);

  const totalTripsExpenses = useMemo(() => {
    return trips.reduce((sum, t) => sum + (Number(t.tripExpenses) || 0), 0);
  }, [trips]);

  const totalTripsNet = useMemo(() => {
    return totalTripsValue - totalTripsExpenses;
  }, [totalTripsValue, totalTripsExpenses]);

  if (!isOpen) return null;

  return (
    <div 
      id="driver-file-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto" 
      dir="rtl"
    >
      <div 
        id="driver-file-modal-container"
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-3 h-7 bg-[#F97316] rounded-full" />
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {isEditing ? `تعديل ملف السائق الشامل: ${driverName || driverToEdit?.name}` : 'إنشاء ملف سائق جديد'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                إدارة موحدة لبيانات السائق، الشاحنة المرتبطة إجبارياً، وجميع رحلاته التشغيلية.
              </p>
            </div>
          </div>
          <button 
            id="btn-close-driver-file-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 p-2 flex items-center gap-2 border-b border-slate-200">
          <button
            id="tab-driver-info"
            type="button"
            onClick={() => setActiveTab('DRIVER')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'DRIVER' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <UserIcon className="w-4 h-4 text-orange-500" />
            <span>[ 1. بيانات السائق ]</span>
          </button>

          <button
            id="tab-driver-truck"
            type="button"
            onClick={() => setActiveTab('TRUCK')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'TRUCK' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <TruckIcon className="w-4 h-4 text-blue-500" />
            <span>[ 2. الشاحنة المرتبطة ]</span>
          </button>

          <button
            id="tab-driver-trips"
            type="button"
            onClick={() => setActiveTab('TRIPS')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'TRIPS' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>[ 3. رحلات السائق ({trips.length}) ]</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-red-50 border-y border-red-200 p-3 px-5 flex items-center gap-3 text-red-700 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body - Tabbed Content */}
        <form onSubmit={handleSaveCompleteFile} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: DRIVER INFO */}
          {activeTab === 'DRIVER' && (
            <div id="section-driver-data" className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-slate-500 font-bold ml-1">معرف السائق (Driver ID):</span>
                  <span className="font-mono font-black text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded text-xs">
                    {driverId}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  * هذا المعرف فريد لا يتكرر لربط كافة الرحلات والشاحنات به بصورة دائمة.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم السائق الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-driver-name"
                    type="text"
                    required
                    placeholder="مثال: محمد أحمد علي"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف / الجوال <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-driver-phone"
                    type="text"
                    required
                    placeholder="مثال: 0501234567"
                    value={driverPhone}
                    onChange={e => setDriverPhone(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهوية الوطنية / الإقامة <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-driver-national-id"
                    type="text"
                    required
                    placeholder="مثال: 1089345211"
                    value={driverNationalId}
                    onChange={e => setDriverNationalId(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    العنوان / السكن
                  </label>
                  <input
                    id="input-driver-address"
                    type="text"
                    placeholder="مثال: الرياض - حي السلي"
                    value={driverAddress}
                    onChange={e => setDriverAddress(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة السائق
                  </label>
                  <select
                    id="select-driver-status"
                    value={driverStatus}
                    onChange={e => setDriverStatus(e.target.value as any)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                  >
                    <option value="ACTIVE">نشط ويعمل</option>
                    <option value="VACATION">في إجازة</option>
                    <option value="SUSPENDED">موقوف عن العمل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الجنسية
                  </label>
                  <input
                    id="input-driver-nationality"
                    type="text"
                    placeholder="سعودي، يمني، مصري..."
                    value={driverNationality}
                    onChange={e => setDriverNationality(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* License Details & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم رخصة القيادة
                  </label>
                  <input
                    id="input-driver-license"
                    type="text"
                    placeholder="رقم الرخصة"
                    value={driverLicenseNumber}
                    onChange={e => setDriverLicenseNumber(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ انتهاء الرخصة
                  </label>
                  <input
                    id="input-driver-license-expiry"
                    type="date"
                    value={driverLicenseExpiry}
                    onChange={e => setDriverLicenseExpiry(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات عامة حول السائق
                </label>
                <textarea
                  id="textarea-driver-notes"
                  rows={2}
                  placeholder="أي تفاصيل إضافية أو تنبيهات تشغيلية..."
                  value={driverNotes}
                  onChange={e => setDriverNotes(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* Optional Photos & Documents */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-orange-500" />
                  <span>صور ومستندات السائق الرسمية (اختياري مع ضغط فوري لتوفير المساحة)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Photo */}
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/50">
                    <span className="text-[11px] font-bold block text-slate-700 mb-2">الصورة الشخصية</span>
                    {driverPhotoUrl ? (
                      <div className="relative inline-block">
                        <img src={driverPhotoUrl} alt="Driver" className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-orange-500 shadow-sm" />
                        <button type="button" onClick={() => setDriverPhotoUrl(undefined)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 text-[10px]">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-white border border-orange-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-orange-50">
                        <Upload className="w-3 h-3" />
                        <span>رفع صورة</span>
                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'photo')} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* License Photo */}
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/50">
                    <span className="text-[11px] font-bold block text-slate-700 mb-2">صورة الرخصة</span>
                    {driverLicensePhotoUrl ? (
                      <div className="relative inline-block">
                        <img src={driverLicensePhotoUrl} alt="License" className="w-20 h-14 rounded-lg object-cover mx-auto border border-slate-300 shadow-sm" />
                        <button type="button" onClick={() => setDriverLicensePhotoUrl(undefined)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 text-[10px]">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-white border border-orange-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-orange-50">
                        <Upload className="w-3 h-3" />
                        <span>رفع رخصة</span>
                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'license')} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* ID Photo */}
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/50">
                    <span className="text-[11px] font-bold block text-slate-700 mb-2">صورة الهوية / الإقامة</span>
                    {driverIdPhotoUrl ? (
                      <div className="relative inline-block">
                        <img src={driverIdPhotoUrl} alt="ID" className="w-20 h-14 rounded-lg object-cover mx-auto border border-slate-300 shadow-sm" />
                        <button type="button" onClick={() => setDriverIdPhotoUrl(undefined)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 text-[10px]">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-white border border-orange-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-orange-50">
                        <Upload className="w-3 h-3" />
                        <span>رفع الهوية</span>
                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'id')} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LINKED TRUCK */}
          {activeTab === 'TRUCK' && (
            <div id="section-truck-data" className="space-y-5 animate-in fade-in duration-150">
              {/* Important Exact Match rule banner */}
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-start gap-2.5 text-blue-900 text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold">
                    قاعدة المطابقة الرقمية التامة (Exact Match) للشاحنات:
                  </p>
                  <p className="text-blue-800 text-[11px]">
                    المطابقة الأساسية تكون باستخدام رقم الشاحنة الرقمي الكامل. الشاحنة رقم <strong>(8)</strong> تختلف كلياً عن <strong>(18)</strong> وتختلف عن <strong>(80)</strong> وعن <strong>(108)</strong>. ولا يتم الاعتماد على تشابه الأحرف.
                  </p>
                </div>
              </div>

              {/* Toggle Mode: Existing vs New */}
              <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button
                  id="btn-choose-existing-truck"
                  type="button"
                  onClick={() => setTruckMode('EXISTING')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    truckMode === 'EXISTING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${truckMode === 'EXISTING' ? 'text-blue-600' : 'opacity-0'}`} />
                  <span>اختيار شاحنة موجودة في الأسطول</span>
                </button>

                <button
                  id="btn-add-new-truck"
                  type="button"
                  onClick={() => setTruckMode('NEW')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    truckMode === 'NEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className={`w-3.5 h-3.5 ${truckMode === 'NEW' ? 'text-orange-600' : 'opacity-0'}`} />
                  <span>إضافة شاحنة جديدة مباشرة</span>
                </button>
              </div>

              {truckMode === 'EXISTING' ? (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    حدد الشاحنة المراد ربط السائق بها إجبارياً <span className="text-red-500">*</span>
                  </label>
                  {trucks.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs font-bold">
                      لا توجد شاحنات مسجلة في الأسطول حالياً. يرجى اختيار &quot;إضافة شاحنة جديدة مباشرة&quot;.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        id="select-existing-truck"
                        value={selectedTruckId}
                        onChange={e => setSelectedTruckId(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {trucks.map(trk => (
                          <option key={trk.id} value={trk.id}>
                            {getTruckDisplayTitle(trk)}
                          </option>
                        ))}
                      </select>

                      {currentSelectedTruck && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">رقم الشاحنة الرقمي:</span>
                            <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {currentSelectedTruck.truckNumber || normalizeTruckNumber(currentSelectedTruck.plateNumber)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">رقم اللوحة:</span>
                            <span className="font-bold text-slate-900">{currentSelectedTruck.plateNumber}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">نوع الشاحنة والموديل:</span>
                            <span className="font-bold text-slate-900">{currentSelectedTruck.model} ({currentSelectedTruck.truckType})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-orange-500" />
                    <span>بيانات الشاحنة الجديدة</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم الشاحنة الرقمي الكامل <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="input-new-truck-number"
                        type="text"
                        required
                        placeholder="مثال: 25 أو 35 أو 108"
                        value={newTruckNumber}
                        onChange={e => {
                          const val = e.target.value;
                          setNewTruckNumber(val);
                          if (!newPlateNumber || newPlateNumber === newTruckNumber) {
                            setNewPlateNumber(val);
                          }
                        }}
                        className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        * المعيار الأساسي للمطابقة الصارمة (Exact Match).
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم اللوحة <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="input-new-plate-number"
                        type="text"
                        required
                        placeholder="مثال: أ ب ج 25 أو 25"
                        value={newPlateNumber}
                        onChange={e => setNewPlateNumber(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        نوع الشاحنة
                      </label>
                      <select
                        id="select-new-truck-type"
                        value={newTruckType}
                        onChange={e => setNewTruckType(e.target.value as any)}
                        className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                      >
                        <option value="CURTAIN">تريلا ستارة</option>
                        <option value="FLATBED">تريلا سطحة</option>
                        <option value="LOWBED">تريلا لوبد ثقيل</option>
                        <option value="REFRIGERATED">تريلا براد</option>
                        <option value="DYNA">دينا</option>
                        <option value="TIPPER">قلاب</option>
                        <option value="TANKER">تانكر</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        موديل الشاحنة والشركة المصنعة
                      </label>
                      <input
                        id="input-new-truck-model"
                        type="text"
                        placeholder="مثال: مرسيدس أكتروس 2024"
                        value={newTruckModel}
                        onChange={e => setNewTruckModel(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      حالة الشاحنة
                    </label>
                    <select
                      id="select-new-truck-status"
                      value={newTruckStatus}
                      onChange={e => setNewTruckStatus(e.target.value as any)}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    >
                      <option value="AVAILABLE">متاحة وجاهزة للعمل</option>
                      <option value="ON_TRIP">في رحلة حالياً</option>
                      <option value="MAINTENANCE">تحت الصيانة</option>
                      <option value="OUT_OF_SERVICE">خارج الخدمة</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRIPS LIST */}
          {activeTab === 'TRIPS' && (
            <div id="section-driver-trips" className="space-y-4 animate-in fade-in duration-150">
              {/* Top Banner and Add Trip Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-4 bg-emerald-500 rounded-full" />
                    <span>جميع رحلات السائق (عدد غير محدود)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    يتم ربط كل رحلة آلياً بالسائق والشاحنة بدون الحاجة لإعادة كتابة اسم السائق أو بيانات المركبة.
                  </p>
                </div>

                <button
                  id="btn-add-trip-to-file"
                  type="button"
                  onClick={handleAddNewTrip}
                  className="bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-black text-xs py-2 px-4 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة رحلة جديدة للسائق</span>
                </button>
              </div>

              {/* Trip Items List */}
              {trips.length === 0 ? (
                <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">لا توجد رحلات مسجلة في ملف هذا السائق بعد</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    اضغط على زر <strong>&quot;+ إضافة رحلة جديدة للسائق&quot;</strong> لإدراج رحلة 001، 002، 003... وحفظها كجزء أصيل من ملف السائق.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddNewTrip}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer"
                  >
                    + إضافة أول رحلة الآن
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.map((tripItem, index) => {
                    return (
                      <div
                        key={index}
                        id={`trip-card-item-${index}`}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition space-y-3 relative"
                      >
                        {/* Trip Row Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </span>
                            <span className="font-black text-xs text-slate-900">
                              رحلة {String(index + 1).padStart(3, '0')}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                              {tripItem.tripNumber}
                            </span>

                            {/* Historical Truck Badge if preserved */}
                            {tripItem.truckNumber && (
                              <span 
                                title="الشاحنة المسجلة لهذه الرحلة (تاريخ تشغيلي محفوظ)"
                                className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded"
                              >
                                شاحنة رقم {tripItem.truckNumber}
                              </span>
                            )}
                          </div>

                          <button
                            id={`btn-remove-trip-${index}`}
                            type="button"
                            onClick={() => handleRemoveTrip(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer"
                            title="حذف هذه الرحلة من الملف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Trip Inputs Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              رقم الرحلة *
                            </label>
                            <input
                              type="text"
                              required
                              value={tripItem.tripNumber}
                              onChange={e => handleUpdateTripField(index, 'tripNumber', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500 font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              التاريخ *
                            </label>
                            <input
                              type="date"
                              required
                              value={tripItem.date}
                              onChange={e => handleUpdateTripField(index, 'date', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              مكان الانطلاق *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="الرياض، الدمام..."
                              value={tripItem.loadingLocation}
                              onChange={e => handleUpdateTripField(index, 'loadingLocation', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              مكان الوصول *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="جدة، تعز، عدن..."
                              value={tripItem.unloadingLocation}
                              onChange={e => handleUpdateTripField(index, 'unloadingLocation', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              نوع الحمولة
                            </label>
                            <input
                              type="text"
                              placeholder="بضائع، حديد، مواد..."
                              value={tripItem.cargoType}
                              onChange={e => handleUpdateTripField(index, 'cargoType', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              وصف الحمولة
                            </label>
                            <input
                              type="text"
                              placeholder="تفاصيل الشحنة..."
                              value={tripItem.cargoDescription || ''}
                              onChange={e => handleUpdateTripField(index, 'cargoDescription', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              قيمة الرحلة (ر.س) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={tripItem.baseAmount}
                              onChange={e => handleUpdateTripField(index, 'baseAmount', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500 font-mono font-bold text-emerald-700"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              المصاريف (ر.س)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={tripItem.tripExpenses}
                              onChange={e => handleUpdateTripField(index, 'tripExpenses', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500 font-mono font-bold text-amber-700"
                            />
                          </div>
                        </div>

                        {/* Net Profit & Status Bar */}
                        <div className="bg-slate-50 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-slate-500 font-bold ml-1">الصافي:</span>
                              <span className={`font-mono font-black ${
                                (tripItem.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                              }`}>
                                {(tripItem.netProfit ?? 0).toLocaleString('ar-SA')} ر.س
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 font-bold">الحالة:</span>
                              <select
                                value={tripItem.status}
                                onChange={e => handleUpdateTripField(index, 'status', e.target.value as any)}
                                className="text-[11px] font-bold py-1 px-2 rounded-lg border border-slate-300 bg-white"
                              >
                                <option value="COMPLETED">مكتملة</option>
                                <option value="IN_PROGRESS">جارية</option>
                                <option value="CONFIRMED">مؤكدة</option>
                                <option value="CANCELLED">ملغاة</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex-1 min-w-[200px]">
                            <input
                              type="text"
                              placeholder="ملاحظات الرحلة (اختياري)..."
                              value={tripItem.notes || ''}
                              onChange={e => handleUpdateTripField(index, 'notes', e.target.value)}
                              className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-300 focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Bar */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Financial & Count Summary */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl font-bold text-slate-700">
                السائق: <span className="text-slate-900 font-black">{driverName || 'لم يُحدد بعد'}</span>
              </div>

              <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl font-bold text-blue-900">
                الشاحنة: <span className="font-mono font-black">
                  {truckMode === 'EXISTING' 
                    ? (currentSelectedTruck?.truckNumber || normalizeTruckNumber(currentSelectedTruck?.plateNumber) || 'لم تُحدد')
                    : (newTruckNumber || 'لم تُحدد')}
                </span>
              </div>

              <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl font-bold text-orange-900">
                الرحلات: <span className="font-black">{trips.length} رحلة</span>
              </div>

              {trips.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold text-emerald-900">
                  صافي الأرباح: <span className="font-black">{totalTripsNet.toLocaleString('ar-SA')} ر.س</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-cancel-driver-file"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>

              <button
                id="btn-save-driver-file"
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-black text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ الآمن...' : '[ حفظ ملف السائق ]'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
