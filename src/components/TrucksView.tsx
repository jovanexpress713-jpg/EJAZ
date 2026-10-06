import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Truck as TruckIcon, 
  Wrench, 
  Edit, 
  Trash2, 
  FileText, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Layers,
  Calendar,
  DollarSign,
  ArrowLeftRight,
  User as UserIcon,
  UserCheck,
  Phone,
  ShieldCheck,
  Zap,
  ChevronRight,
  ChevronLeft,
  Database
} from 'lucide-react';
import { Truck, Trip, MaintenanceRecord, ExpenseRecord, User, TruckType, TruckStatus, OwnershipType, Driver } from '../types';
import { StorageService } from '../services/storage';

interface TrucksViewProps {
  trucks: Truck[];
  drivers?: Driver[];
  trips: Trip[];
  maintenance: MaintenanceRecord[];
  expenses: ExpenseRecord[];
  currentUser: User;
  onRefresh: () => void;
  onNavigateToMaintenance: () => void;
}

export const TrucksView: React.FC<TrucksViewProps> = ({
  trucks,
  drivers = [],
  trips,
  maintenance,
  expenses,
  currentUser,
  onRefresh,
  onNavigateToMaintenance,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(24);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [selectedTruckDetails, setSelectedTruckDetails] = useState<Truck | null>(null);
  const [deletingTruck, setDeletingTruck] = useState<Truck | null>(null);

  // Driver Swapping & Editing State
  const [switchingTruckDriver, setSwitchingTruckDriver] = useState<Truck | null>(null);
  const [selectedNewDriverId, setSelectedNewDriverId] = useState<string>('');
  const [driverSearchTerm, setDriverSearchTerm] = useState('');

  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverFormData, setDriverFormData] = useState<Partial<Driver>>({});

  const [isQuickAddDriverOpen, setIsQuickAddDriverOpen] = useState(false);
  const [quickDriverName, setQuickDriverName] = useState('');
  const [quickDriverPhone, setQuickDriverPhone] = useState('');
  const [quickDriverNationalId, setQuickDriverNationalId] = useState('');

  const [toastFeedback, setToastFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = (message: string, isError = false) => {
    setToastFeedback({ message, isError });
    setTimeout(() => setToastFeedback(null), 4000);
  };

  const [formData, setFormData] = useState<Partial<Truck>>({
    plateNumber: '',
    truckType: 'CURTAIN',
    model: 'مرسيدس أكتروس',
    year: 2023,
    ownership: 'COMPANY',
    status: 'AVAILABLE',
    assignedDriverId: '',
    assignedDriverName: '',
    assignedDriverPhone: '',
    notes: '',
  });

  const handleOpenAdd = () => {
    const nextId = StorageService.generateNextTruckId();
    setFormData({
      id: nextId,
      plateNumber: '',
      truckType: 'CURTAIN',
      model: 'مرسيدس أكتروس',
      year: 2024,
      ownership: 'COMPANY',
      status: 'AVAILABLE',
      assignedDriverId: '',
      assignedDriverName: '',
      assignedDriverPhone: '',
      notes: '',
    });
    setEditingTruck(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setFormData({ ...truck });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plateNumber) return;

    let drvName = formData.assignedDriverName;
    let drvPhone = formData.assignedDriverPhone;
    if (formData.assignedDriverId) {
      const matchedDriver = drivers.find(d => d.id === formData.assignedDriverId);
      if (matchedDriver) {
        drvName = matchedDriver.name;
        drvPhone = matchedDriver.phone;
      }
    }

    // Safety: ensure new truck doesn't overwrite an existing truck if ID collided
    let targetId = editingTruck ? editingTruck.id : formData.id;
    if (!editingTruck) {
      const exists = trucks.some(t => t.id === targetId);
      if (exists || !targetId) {
        targetId = StorageService.generateNextTruckId();
      }
    }

    const truckToSave: Truck = {
      id: targetId || StorageService.generateNextTruckId(),
      plateNumber: formData.plateNumber || '',
      truckType: (formData.truckType as TruckType) || 'CURTAIN',
      model: formData.model || '',
      year: Number(formData.year) || 2023,
      ownership: (formData.ownership as OwnershipType) || 'COMPANY',
      status: (formData.status as TruckStatus) || 'AVAILABLE',
      assignedDriverId: formData.assignedDriverId || undefined,
      assignedDriverName: drvName || undefined,
      assignedDriverPhone: drvPhone || undefined,
      notes: formData.notes || '',
      createdAt: editingTruck ? editingTruck.createdAt : new Date().toISOString().split('T')[0],
    };

    StorageService.saveTruck(truckToSave, currentUser);
    setIsModalOpen(false);
    showToast(editingTruck ? 'تم تحديث بيانات الشاحنة بنجاح' : 'تمت إضافة الشاحنة الجديدة بنجاح للأسطول');
    onRefresh();
  };

  const handleDelete = () => {
    if (!deletingTruck) return;
    StorageService.deleteTruck(deletingTruck.id, currentUser);
    setDeletingTruck(null);
    onRefresh();
  };

  // Driver Assignment / Swapping Handler
  const handleAssignDriver = (truckId: string, driverId: string | null) => {
    const result = StorageService.assignDriverToTruck(truckId, driverId, currentUser);
    if (result.success) {
      showToast(result.message);
      setSwitchingTruckDriver(null);
      setSelectedNewDriverId('');
      onRefresh();
    } else {
      showToast(result.message, true);
    }
  };

  // Driver Edit Modal Handler
  const handleOpenEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverFormData({ ...driver });
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver || !driverFormData.name?.trim() || !driverFormData.phone?.trim()) {
      showToast('يرجى ملء اسم ورقم هاتف السائق', true);
      return;
    }

    const updated: Driver = {
      ...editingDriver,
      name: driverFormData.name.trim(),
      phone: driverFormData.phone.trim(),
      nationalId: driverFormData.nationalId?.trim() || editingDriver.nationalId,
      licenseNumber: driverFormData.licenseNumber?.trim() || editingDriver.licenseNumber,
      licenseExpiry: driverFormData.licenseExpiry || editingDriver.licenseExpiry,
      nationality: driverFormData.nationality?.trim() || editingDriver.nationality,
      bloodType: driverFormData.bloodType || editingDriver.bloodType,
      status: driverFormData.status || editingDriver.status || 'ACTIVE',
      notes: driverFormData.notes || '',
    };

    StorageService.saveDriver(updated, currentUser);

    // Synchronize truck's driver name and phone if currently assigned
    const assignedTruck = trucks.find(t => t.assignedDriverId === updated.id);
    if (assignedTruck) {
      StorageService.saveTruck({
        ...assignedTruck,
        assignedDriverName: updated.name,
        assignedDriverPhone: updated.phone,
      }, currentUser);
    }

    setEditingDriver(null);
    showToast(`تم حفظ وتحديث بيانات السائق (${updated.name}) بنجاح`);
    onRefresh();
  };

  // Quick Add Driver Handler
  const handleQuickAddDriverAndAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDriverName.trim() || !quickDriverPhone.trim() || !switchingTruckDriver) {
      showToast('يرجى إدخال اسم ورقم جوال السائق', true);
      return;
    }

    const newDriverId = StorageService.generateNextDriverId();
    const newDriver: Driver = {
      id: newDriverId,
      name: quickDriverName.trim(),
      phone: quickDriverPhone.trim(),
      nationalId: quickDriverNationalId.trim() || 'غير مسجل',
      licenseNumber: `LIC-${Math.floor(100000 + Math.random() * 900000)}`,
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      nationality: 'سعودي',
      status: 'ACTIVE',
      notes: 'تمت إضافته وربطه بالشاحنة سريعاً',
      createdAt: new Date().toISOString().split('T')[0],
    };

    StorageService.saveDriver(newDriver, currentUser);
    StorageService.assignDriverToTruck(switchingTruckDriver.id, newDriver.id, currentUser);

    setQuickDriverName('');
    setQuickDriverPhone('');
    setQuickDriverNationalId('');
    setIsQuickAddDriverOpen(false);
    setSwitchingTruckDriver(null);
    showToast(`تمت إضافة السائق الجديد (${newDriver.name}) وتعيينه للشاحنة بنجاح`);
    onRefresh();
  };

  const getTruckTypeLabel = (type: TruckType) => {
    switch (type) {
      case 'CURTAIN': return 'تريلا ستارة';
      case 'LOWBED': return 'تريلا لوبد';
      case 'FLATBED': return 'تريلا سطحة';
      case 'TIPPER': return 'قلاب';
      case 'REFRIGERATED': return 'براد شاحنة';
      case 'DYNA': return 'دينا شاحنة';
      case 'TANKER': return 'تانكر / صهريج';
      default: return 'شاحنة نقل';
    }
  };

  const getStatusBadge = (status: TruckStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">متاحة للتحميل</span>;
      case 'IN_TRIP':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">في رحلة على الطريق</span>;
      case 'MAINTENANCE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">في الصيانة / الورشة</span>;
      case 'STOPPED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">متوقفة مؤقتاً</span>;
    }
  };

  const filteredTrucks = useMemo(() => {
    return trucks.filter(t => {
      const matchesSearch = 
        t.plateNumber.includes(searchTerm) ||
        t.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'ALL' || t.truckType === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [trucks, searchTerm, typeFilter, statusFilter]);

  // High capacity pagination calculation
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredTrucks.length / (pageSize as number)));

  const paginatedTrucks = useMemo(() => {
    if (pageSize === 'ALL') return filteredTrucks;
    const size = pageSize as number;
    const start = (currentPage - 1) * size;
    return filteredTrucks.slice(start, start + size);
  }, [filteredTrucks, currentPage, pageSize]);

  const canEdit = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'OPERATIONS';

  return (
    <div id="ejaz-trucks-view" className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h1 className="text-xl font-black text-slate-900">إدارة الأسطول والشاحنات</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200">
              إجمالي: {trucks.length.toLocaleString('ar-SA')} شاحنة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة اللوحات، أنواع التريلات والشاحنات، سجلات الصيانة وتكاليف التشغيل.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
          {canEdit && (
            <button
              id="trucks-add-btn"
              onClick={handleOpenAdd}
              className="bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شاحنة للأسطول</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Page Size */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <input
            id="trucks-search-input"
            type="text"
            placeholder="بحث برقم اللوحة، الموديل، المعرف..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white pl-9 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={e => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700"
          >
            <option value="ALL">جميع أنواع الشاحنات</option>
            <option value="CURTAIN">تريلا ستارة</option>
            <option value="FLATBED">تريلا سطحة</option>
            <option value="LOWBED">تريلا لوبد</option>
            <option value="REFRIGERATED">براد شاحنة</option>
            <option value="DYNA">دينا نقل</option>
            <option value="TIPPER">قلاب</option>
            <option value="TANKER">صهريج / تانكر</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700"
          >
            <option value="ALL">جميع حالات الأسطول</option>
            <option value="AVAILABLE">متاحة للتحميل</option>
            <option value="IN_TRIP">في رحلة على الطريق</option>
            <option value="MAINTENANCE">في الصيانة / الورشة</option>
            <option value="STOPPED">متوقفة مؤقتاً</option>
          </select>
        </div>

        <div>
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
              setPageSize(val as any);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700"
          >
            <option value={24}>عرض 24 شاحنة في الصفحة</option>
            <option value={48}>عرض 48 شاحنة في الصفحة</option>
            <option value={96}>عرض 96 شاحنة في الصفحة</option>
            <option value={250}>عرض 250 شاحنة في الصفحة</option>
            <option value="ALL">عرض كل الشاحنات (بدون تجزئة)</option>
          </select>
        </div>
      </div>

      {/* Trucks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedTrucks.map(truck => {
          const truckTrips = trips.filter(t => t.truckId === truck.id || t.plateNumber === truck.plateNumber);
          const truckMaint = maintenance.filter(m => m.truckId === truck.id || m.plateNumber === truck.plateNumber);
          const maintTotal = truckMaint.reduce((acc, m) => acc + (m.amount || 0), 0);

          return (
            <div
              key={truck.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-orange-300 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {truck.id}
                  </span>
                  {getStatusBadge(truck.status)}
                </div>

                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl font-black text-slate-900 font-mono tracking-wider">
                    {truck.plateNumber}
                  </h3>
                  <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded">
                    {getTruckTypeLabel(truck.truckType)}
                  </span>
                </div>

                <div className="mt-2 text-xs font-semibold text-slate-700">
                  {truck.model} • موديل {truck.year}
                </div>

                {/* Assigned Driver Box & Quick Actions */}
                <div className="mt-2 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-slate-600 text-[11px] font-bold">السائق المعين:</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setSwitchingTruckDriver(truck);
                          setSelectedNewDriverId(truck.assignedDriverId || '');
                        }}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer border border-blue-200/60"
                        title="تبديل أو تعيين سائق للشاحنة"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-blue-600" />
                        <span>تبديل السائق</span>
                      </button>
                    )}
                  </div>

                  {(() => {
                    const assignedDrv = drivers.find(d => d.id === truck.assignedDriverId) || 
                      (truck.assignedDriverName ? { 
                        id: truck.assignedDriverId || `TMP-${truck.id}`, 
                        name: truck.assignedDriverName, 
                        phone: truck.assignedDriverPhone || '',
                        nationalId: 'غير مسجل',
                        licenseNumber: 'غير مسجل',
                        licenseExpiry: '',
                        nationality: 'سعودي',
                        status: 'ACTIVE',
                        notes: '',
                        createdAt: ''
                      } as Driver : null);

                    if (assignedDrv) {
                      return (
                        <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-bold text-slate-800 text-xs truncate">👤 {assignedDrv.name}</span>
                            {assignedDrv.phone && (
                              <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{assignedDrv.phone}</span>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditDriver(assignedDrv)}
                              className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-1 shrink-0 border border-amber-200"
                              title="تعديل معلومات السائق (الاسم، الجوال، الرخصة، الهوية...)"
                            >
                              <Edit className="w-3 h-3 text-amber-600" />
                              <span>تعديل السائق</span>
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-center justify-between gap-2 py-1 text-slate-400 text-xs">
                        <span>لا يوجد سائق مخصص حالياً</span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setSwitchingTruckDriver(truck);
                              setSelectedNewDriverId('');
                            }}
                            className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer"
                          >
                            + تعيين سائق الآن
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-1 text-[11px] text-slate-500">
                  الملكية: {truck.ownership === 'COMPANY' ? 'ملكية المؤسسة' : truck.ownership === 'RENTED' ? 'إيجار' : 'سائق خاص'}
                </div>

                {/* Performance & Maintenance Capsule */}
                <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الرحلات المنفذة:</span>
                    <span className="font-bold text-slate-900">{truckTrips.length} رحلة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">سجلات الصيانة:</span>
                    <span className="font-bold text-slate-900">{truckMaint.length} عملية</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-rose-700 pt-1 border-t border-slate-200">
                    <span>إجمالي تكاليف الصيانة:</span>
                    <span>{maintTotal.toLocaleString()} ر.س</span>
                  </div>
                </div>

                {truck.notes && (
                  <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                    {truck.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedTruckDetails(truck)}
                  className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>السجل الشامل</span>
                </button>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSwitchingTruckDriver(truck);
                        setSelectedNewDriverId(truck.assignedDriverId || '');
                      }}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="تبديل أو تعيين سائق لهذه الشاحنة"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(truck)}
                      className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                      title="تعديل بيانات الشاحنة"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingTruck(truck)}
                      className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTrucks.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <TruckIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-700">لم يتم العثور على شاحنات مطابقة</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            جرب تعديل خيارات التصفية أو البحث، أو قم بإضافة شاحنة جديدة للأسطول عبر زر «إضافة شاحنة للأسطول».
          </p>
        </div>
      )}

      {/* Pagination Controls Bar */}
      {filteredTrucks.length > 0 && pageSize !== 'ALL' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-500 font-medium">
            عرض الشاحنات من{' '}
            <span className="font-bold text-slate-900">
              {((currentPage - 1) * (pageSize as number) + 1).toLocaleString('ar-SA')}
            </span>{' '}
            إلى{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * (pageSize as number), filteredTrucks.length).toLocaleString('ar-SA')}
            </span>{' '}
            من إجمالي{' '}
            <span className="font-black text-orange-600">
              {filteredTrucks.length.toLocaleString('ar-SA')}
            </span>{' '}
            شاحنة
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

      {/* Add / Edit Truck Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 bg-[#F97316] rounded-full" />
                <h3 className="text-base font-bold">
                  {editingTruck ? 'تعديل بيانات الشاحنة' : 'إضافة شاحنة جديدة للأسطول'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم اللوحة / السيارة</label>
                  <input
                    type="text"
                    value={formData.plateNumber}
                    onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
                    required
                    placeholder="مثال: أ ن ب 8942"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الشاحنة / التريلا</label>
                  <select
                    value={formData.truckType}
                    onChange={e => setFormData({ ...formData, truckType: e.target.value as TruckType })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="CURTAIN">تريلا ستارة</option>
                    <option value="FLATBED">تريلا سطحة</option>
                    <option value="LOWBED">تريلا لوبد</option>
                    <option value="REFRIGERATED">براد شاحنة</option>
                    <option value="DYNA">دينا نقل</option>
                    <option value="TIPPER">قلاب</option>
                    <option value="TANKER">صهريج / تانكر</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموديل والماركة</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    required
                    placeholder="مثال: مرسيدس أكتروس 1845"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سنة الصنع</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                    required
                    min={2000}
                    max={2030}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الملكية</label>
                  <select
                    value={formData.ownership}
                    onChange={e => setFormData({ ...formData, ownership: e.target.value as OwnershipType })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="COMPANY">ملكية المؤسسة</option>
                    <option value="RENTED">إيجار تشغيلي</option>
                    <option value="PRIVATE_DRIVER">سائق خاص</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة الجاهزية</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as TruckStatus })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-orange-600"
                  >
                    <option value="AVAILABLE">متاحة للتحميل</option>
                    <option value="IN_TRIP">في رحلة على الطريق</option>
                    <option value="MAINTENANCE">في الصيانة / الورشة</option>
                    <option value="STOPPED">متوقفة مؤقتاً</option>
                  </select>
                </div>
              </div>

              {/* Assigned Driver Selection */}
              <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200">
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>👤 السائق المخصص لهذه الشاحنة (ربط إجباري وتلقائي)</span>
                  {formData.assignedDriverId && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                      مربوط
                    </span>
                  )}
                </label>
                <select
                  value={formData.assignedDriverId || ''}
                  onChange={e => {
                    const drvId = e.target.value;
                    const drv = drivers.find(d => d.id === drvId);
                    setFormData({
                      ...formData,
                      assignedDriverId: drvId,
                      assignedDriverName: drv ? drv.name : '',
                      assignedDriverPhone: drv ? drv.phone : '',
                    });
                  }}
                  className="w-full bg-white border border-orange-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- بدون سائق مخصص (أو اختر السائق لربطه دائماً) --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 عند اختيار هذه الشاحنة في أي رحلة، سيتم جلب هذا السائق وتعبئة بياناته إجبارياً وتلقائياً.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات ومواصفات إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="مواصفات المحاور، الصندوق، أجهزة التتبع..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold shadow-md"
                >
                  {editingTruck ? 'حفظ التعديلات' : 'إضافة الشاحنة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Truck Full Record Details Modal */}
      {selectedTruckDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-orange-600 px-2 py-0.5 rounded font-mono uppercase">
                  السجل الفني والتشغيلي للشاحنة
                </span>
                <h3 className="text-lg font-black mt-1 font-mono">
                  {selectedTruckDetails.plateNumber} ({selectedTruckDetails.model})
                </h3>
              </div>
              <button onClick={() => setSelectedTruckDetails(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Assigned Driver Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4 text-orange-600" />
                    <span>السائق المخصص للشاحنة</span>
                  </h4>
                  {canEdit && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const currentTruck = selectedTruckDetails;
                          setSelectedTruckDetails(null);
                          setSwitchingTruckDriver(currentTruck);
                          setSelectedNewDriverId(currentTruck.assignedDriverId || '');
                        }}
                        className="text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>تبديل السائق</span>
                      </button>
                    </div>
                  )}
                </div>

                {(() => {
                  const assignedDrv = drivers.find(d => d.id === selectedTruckDetails.assignedDriverId) || 
                    (selectedTruckDetails.assignedDriverName ? {
                      id: selectedTruckDetails.assignedDriverId || '',
                      name: selectedTruckDetails.assignedDriverName,
                      phone: selectedTruckDetails.assignedDriverPhone || '',
                      nationalId: 'غير مسجل',
                      licenseNumber: 'غير مسجل',
                      licenseExpiry: '',
                      nationality: 'سعودي',
                      status: 'ACTIVE',
                      notes: '',
                      createdAt: ''
                    } as Driver : null);

                  if (assignedDrv) {
                    return (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{assignedDrv.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">نشط</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                            <span>📞 {assignedDrv.phone || 'بدون هاتف'}</span>
                            <span>🪪 الهوية: {assignedDrv.nationalId || 'غير مسجلة'}</span>
                            <span>📋 الرخصة: {assignedDrv.licenseNumber || 'غير مسجلة'}</span>
                          </div>
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTruckDetails(null);
                              handleOpenEditDriver(assignedDrv);
                            }}
                            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-600" />
                            <span>تعديل معلومات السائق</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white p-3 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500 py-4">
                      <span>لا يوجد سائق معين حالياً لهذه الشاحنة.</span>
                      {canEdit && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const currentTruck = selectedTruckDetails;
                              setSelectedTruckDetails(null);
                              setSwitchingTruckDriver(currentTruck);
                              setSelectedNewDriverId('');
                            }}
                            className="text-xs font-bold text-orange-600 hover:underline"
                          >
                            + تعيين وربط سائق الآن
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Associated trips */}
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  سجل الرحلات المنفذة بالشاحنة
                </h4>
                {(() => {
                  const tTrips = trips.filter(t => t.truckId === selectedTruckDetails.id || t.plateNumber === selectedTruckDetails.plateNumber);
                  if (tTrips.length === 0) return <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">لا توجد رحلات مسجلة.</div>;
                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-100">
                      {tTrips.map(trip => (
                        <div key={trip.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <span className="font-mono font-bold">{trip.tripNumber}</span>
                            <span className="text-slate-500 mx-2">({trip.date})</span>
                            <span className="font-semibold">{trip.loadingLocation.split('-')[0]} ➔ {trip.unloadingLocation.split('-')[0]}</span>
                          </div>
                          <span className="font-bold text-slate-900">{trip.totalAmount.toLocaleString()} ر.س</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Associated Maintenance */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    سجلات الصيانة والورش
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedTruckDetails(null);
                      onNavigateToMaintenance();
                    }}
                    className="text-xs font-bold text-orange-600 hover:underline"
                  >
                    الانتقال لوحدة الصيانة ➔
                  </button>
                </div>
                {(() => {
                  const tMaint = maintenance.filter(m => m.truckId === selectedTruckDetails.id || m.plateNumber === selectedTruckDetails.plateNumber);
                  if (tMaint.length === 0) return <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">لا توجد عمليات صيانة مسجلة.</div>;
                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-100">
                      {tMaint.map(m => (
                        <div key={m.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-900">{m.description}</span>
                            <span className="text-slate-500 mx-2">({m.date})</span>
                          </div>
                          <span className="font-bold text-rose-700">{m.amount.toLocaleString()} ر.س</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف الشاحنة</h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف الشاحنة رقم <span className="font-mono font-bold text-slate-900">{deletingTruck.plateNumber}</span> من أسطول المؤسسة؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingTruck(null)}
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

      {/* Driver Swap / Assign Modal */}
      {switchingTruckDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">تبديل أو تعيين سائق للشاحنة</h3>
                  <p className="text-xs text-slate-400">
                    الشاحنة: <span className="font-mono font-bold text-orange-400">{switchingTruckDriver.plateNumber}</span> ({switchingTruckDriver.model})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSwitchingTruckDriver(null);
                  setSelectedNewDriverId('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Current Driver Status Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">السائق المخصص حالياً:</span>
                  {switchingTruckDriver.assignedDriverId && (
                    <button
                      type="button"
                      onClick={() => handleAssignDriver(switchingTruckDriver.id, null)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition"
                    >
                      إلغاء التعيين (ترك الشاحنة بدون سائق)
                    </button>
                  )}
                </div>
                <div className="mt-2 text-sm font-bold text-slate-900 flex items-center gap-2">
                  {switchingTruckDriver.assignedDriverName || switchingTruckDriver.assignedDriverId ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>{switchingTruckDriver.assignedDriverName || drivers.find(d => d.id === switchingTruckDriver.assignedDriverId)?.name}</span>
                      {switchingTruckDriver.assignedDriverPhone && (
                        <span className="text-xs text-slate-500 font-mono" dir="ltr">({switchingTruckDriver.assignedDriverPhone})</span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 font-normal text-xs">لا يوجد سائق مخصص لهذه الشاحنة حالياً.</span>
                  )}
                </div>
              </div>

              {/* Driver Selection & Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span>اختر السائق الجديد للربط والتبديل:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddDriverOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة سائق جديد للنظام</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={driverSearchTerm}
                    onChange={e => setDriverSearchTerm(e.target.value)}
                    placeholder="ابحث بالاسم أو رقم الجوال أو رقم الهوية..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-semibold"
                  />
                </div>

                {/* Driver Cards List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {drivers
                    .filter(d => 
                      d.name.toLowerCase().includes(driverSearchTerm.toLowerCase()) ||
                      d.phone.includes(driverSearchTerm) ||
                      (d.nationalId && d.nationalId.includes(driverSearchTerm))
                    )
                    .map(driver => {
                      const currentlyDrivingTruck = trucks.find(t => t.assignedDriverId === driver.id && t.id !== switchingTruckDriver.id);
                      const isAssignedToThisTruck = switchingTruckDriver.assignedDriverId === driver.id;
                      const isSelected = selectedNewDriverId === driver.id;

                      return (
                        <div
                          key={driver.id}
                          onClick={() => setSelectedNewDriverId(driver.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500' 
                              : isAssignedToThisTruck
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="selectedDriver"
                              checked={isSelected}
                              onChange={() => setSelectedNewDriverId(driver.id)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-slate-900">{driver.name}</span>
                                {isAssignedToThisTruck ? (
                                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                    السائق الحالي
                                  </span>
                                ) : currentlyDrivingTruck ? (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                    يقود الشاحنة ({currentlyDrivingTruck.plateNumber}) - سيتم التبديل
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    سائق متاح
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>📱 {driver.phone}</span>
                                {driver.licenseNumber && <span>• رخصة: {driver.licenseNumber}</span>}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditDriver(driver);
                            }}
                            className="text-[11px] font-bold text-slate-600 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 px-2 py-1 rounded-lg transition shrink-0"
                            title="تعديل بيانات هذا السائق"
                          >
                            تعديل البيانات
                          </button>
                        </div>
                      );
                    })}

                  {drivers.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl">
                      لا يوجد سائقون مسجلون في النظام حتى الآن.
                    </div>
                  )}
                </div>
              </div>

              {/* Information Note */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  عند اختيار سائق وربطه، سيتم تحديث بيانات الشاحنة والسائق معاً تلقائياً وتسجيل العملية في سجل التدقيق. إذا كان السائق مرتبطاً بشاحنة أخرى، سيتم فك ارتباطه بالشاحنة السابقة ونقله لهذه الشاحنة.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSwitchingTruckDriver(null);
                    setSelectedNewDriverId('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={!selectedNewDriverId || selectedNewDriverId === switchingTruckDriver.assignedDriverId}
                  onClick={() => handleAssignDriver(switchingTruckDriver.id, selectedNewDriverId)}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-md transition"
                >
                  تأكيد تبديل السائق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Edit Modal */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">تعديل معلومات السائق</h3>
                  <p className="text-xs text-slate-400">{editingDriver.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingDriver(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم السائق الكامل *</label>
                  <input
                    type="text"
                    required
                    value={driverFormData.name || ''}
                    onChange={e => setDriverFormData({ ...driverFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    placeholder="مثال: أحمد محمد علي"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={driverFormData.phone || ''}
                    onChange={e => setDriverFormData({ ...driverFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 font-mono"
                    placeholder="05xxxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهوية / الإقامة</label>
                  <input
                    type="text"
                    value={driverFormData.nationalId || ''}
                    onChange={e => setDriverFormData({ ...driverFormData, nationalId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 font-mono"
                    placeholder="10xxxxxxxx أو 2xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجنسية</label>
                  <input
                    type="text"
                    value={driverFormData.nationality || ''}
                    onChange={e => setDriverFormData({ ...driverFormData, nationality: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    placeholder="سعودي / يمني / مصري..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم رخصة القيادة</label>
                  <input
                    type="text"
                    value={driverFormData.licenseNumber || ''}
                    onChange={e => setDriverFormData({ ...driverFormData, licenseNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 font-mono"
                    placeholder="رقم الرخصة"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ انتهاء الرخصة</label>
                  <input
                    type="date"
                    value={driverFormData.licenseExpiry || ''}
                    onChange={e => setDriverFormData({ ...driverFormData, licenseExpiry: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة السائق</label>
                  <select
                    value={driverFormData.status || 'ACTIVE'}
                    onChange={e => setDriverFormData({ ...driverFormData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="ACTIVE">نشط وعلى رأس العمل</option>
                    <option value="VACATION">في إجازة</option>
                    <option value="SUSPENDED">موقوف مؤقتاً</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">فصيلة الدم</label>
                  <input
                    type="text"
                    value={driverFormData.bloodType || ''}
                    onChange={e => setDriverFormData({ ...driverFormData, bloodType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    placeholder="O+, A+, B+..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  value={driverFormData.notes || ''}
                  onChange={e => setDriverFormData({ ...driverFormData, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                  placeholder="أي تفاصيل أو شروط خاصة بالسائق..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md transition"
                >
                  حفظ معلومات السائق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Driver Modal */}
      {isQuickAddDriverOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>إضافة سائق جديد وربطه بالشاحنة</span>
              </h3>
              <button onClick={() => setIsQuickAddDriverOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddDriverAndAssign} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم السائق *</label>
                <input
                  type="text"
                  required
                  value={quickDriverName}
                  onChange={e => setQuickDriverName(e.target.value)}
                  placeholder="مثال: فهد سالم الدوسري"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال *</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={quickDriverPhone}
                  onChange={e => setQuickDriverPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهوية الوطنية / الإقامة</label>
                <input
                  type="text"
                  value={quickDriverNationalId}
                  onChange={e => setQuickDriverNationalId(e.target.value)}
                  placeholder="10xxxxxxxx أو 2xxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddDriverOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                >
                  إضافة السائق وربطه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Feedback */}
      {toastFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce" dir="rtl">
          <div className={`px-4 py-2.5 rounded-xl shadow-xl border flex items-center gap-2 text-xs font-bold ${
            toastFeedback.isError
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : 'bg-emerald-900 text-emerald-100 border-emerald-700'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastFeedback.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
