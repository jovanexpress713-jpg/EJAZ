import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  UserCheck, 
  Phone, 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  FileText, 
  X, 
  Clock, 
  Truck, 
  Printer, 
  Share2, 
  User, 
  Image as ImageIcon, 
  Upload, 
  ShieldCheck, 
  Award,
  IdCard,
  Zap,
  ChevronRight,
  ChevronLeft,
  Layers,
  Database
} from 'lucide-react';
import { Driver, Trip, User as UserType, Truck as TruckTypeObj, CompanySettings } from '../types';
import { StorageService } from '../services/storage';
import { DriverCardModal } from './DriverCardModal';
import { DriverFileModal } from './DriverFileModal';
import { printDriverOfficialCard, shareDriverViaWhatsApp, printDriverTripsStatement } from '../utils/driverActions';

interface DriversViewProps {
  drivers: Driver[];
  trucks?: TruckTypeObj[];
  trips: Trip[];
  currentUser: UserType;
  settings?: CompanySettings;
  onRefresh: () => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  trucks = [],
  trips,
  currentUser,
  settings,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(24);
  const [selectedDriverTrips, setSelectedDriverTrips] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [selectedCardDriver, setSelectedCardDriver] = useState<Driver | null>(null);
  const [isDriverFileModalOpen, setIsDriverFileModalOpen] = useState(false);
  const [driverFileToEdit, setDriverFileToEdit] = useState<Driver | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenAdd = () => {
    setDriverFileToEdit(null);
    setIsDriverFileModalOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setDriverFileToEdit(driver);
    setIsDriverFileModalOpen(true);
  };

  const handleDelete = () => {
    if (!deletingDriver) return;
    StorageService.deleteDriver(deletingDriver.id, currentUser);
    setDeletingDriver(null);
    showToast('تم حذف السائق بنجاح');
    onRefresh();
  };

  // Expiry check logic (e.g. within 30 days)
  const isLicenseExpiringSoon = (expiryDateStr: string) => {
    if (!expiryDateStr) return false;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm) ||
      d.nationalId.includes(searchTerm) ||
      d.licenseNumber.includes(searchTerm) ||
      (d.nationality && d.nationality.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [drivers, searchTerm]);

  // High capacity pagination calculation
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredDrivers.length / (pageSize as number)));

  const paginatedDrivers = useMemo(() => {
    if (pageSize === 'ALL') return filteredDrivers;
    const size = pageSize as number;
    const start = (currentPage - 1) * size;
    return filteredDrivers.slice(start, start + size);
  }, [filteredDrivers, currentPage, pageSize]);

  const canEdit = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'OPERATIONS';

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

  const isTripMatchingDriver = (t: Trip, driver: Driver): boolean => {
    // 1. If trip has frozen snapshot, strict match on frozen driver ID or driver name
    if (t.frozenValues?.isFrozen) {
      if (t.frozenValues.driverId === driver.id) return true;
      if (t.frozenValues.driverName && normalizeArabic(t.frozenValues.driverName) === normalizeArabic(driver.name)) return true;
      return false;
    }

    // 2. Strict match by driverId
    if (t.driverId && t.driverId === driver.id) return true;

    // 3. Match by exact or normalized driver name
    if (t.driverName && driver.name) {
      if (t.driverName.trim() === driver.name.trim()) return true;
      if (normalizeArabic(t.driverName) === normalizeArabic(driver.name)) return true;
    }

    // 4. Match by phone number
    if (driver.phone && t.driverPhone) {
      const p1 = driver.phone.replace(/\D/g, '');
      const p2 = t.driverPhone.replace(/\D/g, '');
      if (p1 && p2 && p1.length >= 8 && (p1 === p2 || p1.endsWith(p2) || p2.endsWith(p1))) return true;
    }

    // Never match solely by truck when trucks are shared among drivers!
    return false;
  };

  return (
    <div id="ejaz-drivers-view" className="space-y-5" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-orange-500/40 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h1 className="text-xl font-black text-slate-900">سجل السائقين وبطاقات الاعتماد الرسمية</h1>
            <span 
              onClick={() => {
                // Secret easter egg: double click opens the batch capacity tool if ever needed
              }}
              className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200"
            >
              إجمالي: {drivers.length.toLocaleString('ar-SA')} سائق
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة بيانات السائقين، رخص القيادة، صور الهويات والوثائق، وإصدار وطباعة بطاقات وتفويضات إيجاز الرسمية.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
          {canEdit && (
            <button
              id="drivers-add-btn"
              onClick={handleOpenAdd}
              className="bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سائق جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Quick Capacity Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            id="drivers-search-input"
            type="text"
            placeholder="بحث باسم السائق، المعرف (DRV-...)، الجوال، رقم الإقامة / الهوية، الرخصة..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white pl-9 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 text-xs text-slate-600 self-end sm:self-center">
          <span className="text-slate-400 font-bold whitespace-nowrap">عرض في الصفحة:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
              setPageSize(val as any);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500"
          >
            <option value={24}>24 سائق</option>
            <option value={48}>48 سائق</option>
            <option value={96}>96 سائق</option>
            <option value={250}>250 سائق</option>
            <option value="ALL">عرض الكل</option>
          </select>
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedDrivers.map(driver => {
          const driverTrips = trips.filter(t => isTripMatchingDriver(t, driver));
          const totalCustody = driverTrips.reduce((acc, t) => acc + (t.driverCustody || 0), 0);
          const expiringSoon = isLicenseExpiringSoon(driver.licenseExpiry);
          const matchedTruck = trucks.find(
            t => t.id === driver.assignedTruckId || t.plateNumber === driver.assignedPlateNumber
          );

          return (
            <div
              key={driver.id}
              className={`bg-white rounded-2xl border shadow-sm p-4 sm:p-5 flex flex-col justify-between space-y-4 transition hover:border-orange-300 ${
                expiringSoon ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Card Top Pill & Avatar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {/* Driver Avatar / Photo Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm">
                      {driver.photoUrl ? (
                        <img 
                          src={driver.photoUrl} 
                          alt={driver.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900 leading-tight">
                        {driver.name}
                      </h3>
                      <span className="text-[11px] text-orange-600 font-bold block mt-0.5">
                        {driver.jobTitle || 'سائق نقل ثقيل'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {driver.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      driver.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : driver.status === 'VACATION'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {driver.status === 'ACTIVE' ? 'على رأس العمل' : driver.status === 'VACATION' ? 'في إجازة' : 'موقوف'}
                    </span>
                  </div>
                </div>

                {/* Driver Details List */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{driver.phone || 'غير مسجل'}</span>
                    </div>
                    {driver.nationality && (
                      <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {driver.nationality}
                      </span>
                    )}
                  </div>

                  {/* Linked Truck Badge & Discrepancy Alert */}
                  {(() => {
                    const dTrips = trips.filter(t => isTripMatchingDriver(t, driver));
                    const dPlates: string[] = Array.from(
                      new Set<string>(
                        dTrips
                          .map(t => (t.plateNumber || t.frozenValues?.plateNumber || '').trim())
                          .filter(Boolean)
                      )
                    );
                    const hasDiscrepancy = 
                      dPlates.length > 0 && 
                      driver.assignedPlateNumber && 
                      !dPlates.includes(driver.assignedPlateNumber.trim());

                    return (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          {driver.assignedPlateNumber || driver.assignedTruckId ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              السيارة بالملف: {driver.assignedPlateNumber || matchedTruck?.plateNumber || 'مركبة معينة'}
                            </span>
                          ) : (
                            <span className="text-slate-400">غير مربوط بسيارة بعد</span>
                          )}
                        </div>

                        {hasDiscrepancy && (
                          <div className="flex items-center justify-between gap-1.5 bg-amber-50 border border-amber-300 p-1.5 rounded-lg text-amber-950 font-semibold text-[10px]">
                            <span>⚠️ رحلاته الفعلية: <strong className="font-mono text-slate-900">[{dPlates.join('، ')}]</strong></span>
                            {dPlates.length === 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  StorageService.syncDriverToTripTruck(driver.id, dPlates[0], currentUser);
                                  onRefresh();
                                }}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2 py-0.5 rounded text-[10px] cursor-pointer transition shadow-2xs whitespace-nowrap"
                                title="تحديث ومطابقة شاحنة السائق لتصبح مطابقة لرحلاته الفعلية"
                              >
                                مطابقة فورية 🔄
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono truncate">{driver.nationalId || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono truncate">{driver.licenseNumber || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className={expiringSoon ? 'text-amber-700 font-bold' : ''}>
                        انتهاء الرخصة: {driver.licenseExpiry}
                      </span>
                    </div>
                  </div>

                  {/* Attached Documents Indicators */}
                  <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                    <span className="text-slate-400">المرفقات:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${driver.photoUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      الصورة الشخصية {driver.photoUrl ? '✓' : '✗'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${driver.licensePhotoUrl ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                      الرخصة {driver.licensePhotoUrl ? '✓' : '✗'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${driver.idPhotoUrl ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                      الهوية {driver.idPhotoUrl ? '✓' : '✗'}
                    </span>
                  </div>
                </div>

                {expiringSoon && (
                  <div className="mt-2.5 p-2 bg-amber-100/80 border border-amber-300 rounded-lg text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>تنبيه: رخصة القيادة تنتهي قريباً (أقل من شهر)</span>
                  </div>
                )}

                {/* Driver Stats */}
                <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block text-[10px]">الرحلات المنفذة</span>
                    <span className="font-black text-slate-900">{driverTrips.length} رحلة</span>
                  </div>
                  <div className="text-left">
                    <span className="text-slate-500 block text-[10px]">إجمالي العهد المسلمة</span>
                    <span className="font-bold text-orange-600">{totalCustody.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>

              {/* Official Driver Card & Quick Actions */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                {/* Prominent Driver Accreditation Card Button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(driver)}
                    className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ملف السائق المتكامل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCardDriver(driver)}
                    className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-orange-400" />
                    <span>بطاقة الاعتماد</span>
                  </button>
                </div>

                {/* Secondary Action Row: Print, WhatsApp, Trips, Edit, Delete */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => printDriverOfficialCard(driver, settings, matchedTruck)}
                      className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="طباعة بطاقة السائق الرسمية بورق إيجاز"
                    >
                      <Printer className="w-3.5 h-3.5 text-orange-600" />
                      <span className="hidden sm:inline text-[11px]">طباعة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => shareDriverViaWhatsApp(driver, undefined, settings, matchedTruck)}
                      className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="مشاركة البطاقة والبيانات عبر واتساب"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline text-[11px]">مشاركة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDriverTrips(driver)}
                      className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="عرض سجل رحلات السائق"
                    >
                      <Truck className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-[11px]">({driverTrips.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => printDriverTripsStatement(driver, driverTrips, settings)}
                      className="p-2 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="طباعة كشف حساب ورحلات السائق كاملاً A4"
                    >
                      <FileText className="w-3.5 h-3.5 text-orange-600" />
                      <span className="hidden sm:inline text-[11px]">كشف الحساب</span>
                    </button>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(driver)}
                        className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition"
                        title="تعديل بيانات وصور السائق"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingDriver(driver)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="حذف السائق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDrivers.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-700">لم يتم العثور على سائقين مطابقين</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            جرب تعديل مصطلح البحث، أو قم بإضافة سائق جديد عبر زر «إضافة سائق جديد».
          </p>
        </div>
      )}

      {/* Pagination Controls Bar */}
      {filteredDrivers.length > 0 && pageSize !== 'ALL' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-500 font-medium">
            عرض السجلات من{' '}
            <span className="font-bold text-slate-900">
              {((currentPage - 1) * (pageSize as number) + 1).toLocaleString('ar-SA')}
            </span>{' '}
            إلى{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * (pageSize as number), filteredDrivers.length).toLocaleString('ar-SA')}
            </span>{' '}
            من إجمالي{' '}
            <span className="font-black text-orange-600">
              {filteredDrivers.length.toLocaleString('ar-SA')}
            </span>{' '}
            سائق
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="الصفحة الأولى"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>

            <div className="px-3 py-1.5 bg-orange-50 text-orange-800 rounded-xl font-black border border-orange-200/60">
              صفحة {currentPage.toLocaleString('ar-SA')} من {totalPages.toLocaleString('ar-SA')}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1"
            >
              <span>التالي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="الصفحة الأخيرة"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Driver Trips Modal */}
      {selectedDriverTrips && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] bg-orange-600 px-2 py-0.5 rounded font-mono uppercase">
                  سجل رحلات السائق
                </span>
                <h3 className="text-base font-bold mt-1">
                  {selectedDriverTrips.name} ({selectedDriverTrips.id})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const matched = trips.filter(t => isTripMatchingDriver(t, selectedDriverTrips));
                    printDriverTripsStatement(selectedDriverTrips, matched, settings);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="طباعة كشف رحلات وحسابات السائق كاملاً بدون نقص A4"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة كشف الرحلات A4</span>
                </button>
                <button onClick={() => setSelectedDriverTrips(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {(() => {
                const dTrips = trips.filter(t => isTripMatchingDriver(t, selectedDriverTrips));
                const dPlates: string[] = Array.from(
                  new Set<string>(
                    dTrips
                      .map(t => (t.plateNumber || t.frozenValues?.plateNumber || '').trim())
                      .filter(Boolean)
                  )
                );
                const hasDiscrepancy = 
                  dPlates.length > 0 && 
                  selectedDriverTrips.assignedPlateNumber && 
                  !dPlates.includes(selectedDriverTrips.assignedPlateNumber.trim());

                if (dTrips.length === 0) {
                  return <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">لا توجد رحلات مسجلة لهذا السائق حالياً.</div>;
                }
                return (
                  <div className="space-y-3">
                    {hasDiscrepancy && (
                      <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-950">
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>⚠️</span>
                            <span>عدم تطابق الشاحنة: مسجل بالملف ({selectedDriverTrips.assignedPlateNumber}) بينما رحلاته ({dPlates.join('، ')})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {dPlates.length === 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                StorageService.syncDriverToTripTruck(selectedDriverTrips.id, dPlates[0], currentUser);
                                onRefresh();
                                setSelectedDriverTrips(prev => prev ? { ...prev, assignedPlateNumber: dPlates[0] } : null);
                              }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
                            >
                              اعتماد شاحنة الرحلات ({dPlates[0]})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              StorageService.syncTripsToDriverTruck(selectedDriverTrips.id, selectedDriverTrips.assignedPlateNumber!, currentUser);
                              onRefresh();
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
                          >
                            تعديل الرحلات لتصبح ({selectedDriverTrips.assignedPlateNumber})
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                      {dTrips.map(trip => {
                        const note = (trip.notes || '').trim();
                        return (
                          <div key={trip.id} className="p-3 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 font-mono">{trip.tripNumber}</span>
                                <span className="text-[10px] text-slate-500">({trip.date})</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-800">{trip.status}</span>
                              </div>
                              <div className="text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                                <span>{trip.customerName} • {trip.loadingLocation.split('-')[0]} ➔ {trip.unloadingLocation.split('-')[0]}</span>
                                <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold text-[10px]">
                                  🚛 الشاحنة: {trip.plateNumber || trip.frozenValues?.truckPlateNumber || 'غير محددة'}
                                </span>
                              </div>
                              {note && (
                                <div className="mt-1 inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-950 px-2 py-0.5 rounded text-[11px] font-bold">
                                  <span>📝 ملاحظة: {note}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-left flex flex-row sm:flex-col items-center sm:items-end justify-between gap-1 border-t sm:border-t-0 pt-1 sm:pt-0">
                              <span className="font-bold text-orange-600 block">عهدة: {trip.driverCustody} ر.س</span>
                              <span className="text-[11px] text-slate-500">الإجمالي: {trip.totalAmount} ر.س</span>
                              <span className="text-[11px] font-bold text-amber-700">المتبقي: {trip.remainingAmount} ر.س</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Official Driver Card & Accreditation Modal */}
      {selectedCardDriver && (
        <DriverCardModal
          driver={selectedCardDriver}
          trucks={trucks}
          settings={settings}
          currentUser={currentUser}
          onClose={() => setSelectedCardDriver(null)}
          onEditDriver={(drv) => {
            handleOpenEdit(drv);
          }}
          onRefresh={onRefresh}
        />
      )}

      {/* Delete Driver Confirmation */}
      {deletingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف السائق</h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف السائق <span className="font-bold text-slate-900">{deletingDriver.name}</span>؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingDriver(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Driver File Modal (Driver + Linked Truck + All Trips) */}
      <DriverFileModal
        isOpen={isDriverFileModalOpen}
        onClose={() => setIsDriverFileModalOpen(false)}
        driverToEdit={driverFileToEdit}
        trucks={trucks}
        currentUser={currentUser}
        onSaved={(msg) => {
          showToast(msg);
          onRefresh();
        }}
      />
    </div>
  );
};
