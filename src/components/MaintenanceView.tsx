import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Edit, 
  Trash2, 
  X,
  Truck,
  DollarSign
} from 'lucide-react';
import { MaintenanceRecord, Truck as TruckType, User, MaintenanceType, MaintenanceStatus } from '../types';
import { StorageService } from '../services/storage';

interface MaintenanceViewProps {
  maintenance: MaintenanceRecord[];
  trucks: TruckType[];
  currentUser: User;
  onRefresh: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  maintenance,
  trucks,
  currentUser,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  const getDefaultNextDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
    truckId: '',
    plateNumber: '',
    date: new Date().toISOString().split('T')[0],
    maintenanceType: 'OIL_CHANGE',
    amount: 850,
    nextMaintenanceDate: getDefaultNextDate(),
    description: 'تغيير زيت المحرك الأصلي والفلتر وفحص السوائل العامة',
    status: 'COMPLETED',
  });

  const handleOpenAdd = () => {
    const defaultTrk = trucks[0] || { id: '', plateNumber: '' };
    setFormData({
      id: `MNT-${Date.now().toString().slice(-4)}`,
      truckId: defaultTrk.id,
      plateNumber: defaultTrk.plateNumber,
      date: new Date().toISOString().split('T')[0],
      maintenanceType: 'OIL_CHANGE',
      amount: 850,
      nextMaintenanceDate: getDefaultNextDate(),
      description: 'تغيير زيت المحرك الأصلي والفلتر وفحص السوائل العامة',
      status: 'COMPLETED',
    });
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: MaintenanceRecord) => {
    setEditingRecord(rec);
    setFormData({ ...rec });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plateNumber || !formData.amount) return;

    const recordToSave: MaintenanceRecord = {
      id: editingRecord ? editingRecord.id : (formData.id || `MNT-${Date.now().toString().slice(-4)}`),
      truckId: formData.truckId || '',
      plateNumber: formData.plateNumber || '',
      date: formData.date || new Date().toISOString().split('T')[0],
      maintenanceType: (formData.maintenanceType as MaintenanceType) || 'GENERAL',
      amount: Number(formData.amount) || 0,
      nextMaintenanceDate: formData.nextMaintenanceDate || '',
      nextMaintenanceKm: formData.nextMaintenanceKm ? Number(formData.nextMaintenanceKm) : undefined,
      description: formData.description || '',
      status: (formData.status as MaintenanceStatus) || 'COMPLETED',
      createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString(),
    };

    StorageService.saveMaintenance(recordToSave, currentUser);
    setIsModalOpen(false);
    onRefresh();
  };

  const handleTruckSelect = (trkId: string) => {
    const trk = trucks.find(t => t.id === trkId);
    if (trk) {
      setFormData(prev => ({
        ...prev,
        truckId: trk.id,
        plateNumber: trk.plateNumber,
      }));
    }
  };

  const getMaintenanceTypeLabel = (type: MaintenanceType) => {
    switch (type) {
      case 'OIL_CHANGE': return 'تغيير زيت وفلاتر';
      case 'TIRES': return 'إطارات وعجلات';
      case 'BRAKES': return 'فرامل ومكابح';
      case 'PERIODIC_INSPECTION': return 'فحص دوري شامل';
      case 'MECHANICAL': return 'ميكانيكا ومحرك';
      case 'ELECTRICAL': return 'كهرباء وحساسات';
      case 'GENERAL': return 'صيانة عامة';
    }
  };

  // Check if upcoming maintenance date is within 15 days
  const isUpcomingAlert = (nextDateStr: string) => {
    if (!nextDateStr) return false;
    const nextDate = new Date(nextDateStr);
    const today = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 15;
  };

  const upcomingMaintenanceRecord = useMemo(() => {
    return maintenance
      .filter(m => m.nextMaintenanceDate && isUpcomingAlert(m.nextMaintenanceDate))
      .sort((a, b) => a.nextMaintenanceDate.localeCompare(b.nextMaintenanceDate))[0] || null;
  }, [maintenance]);

  const filteredList = useMemo(() => {
    return maintenance.filter(m => 
      m.plateNumber.includes(searchTerm) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [maintenance, searchTerm]);

  const totalMaintenanceCost = useMemo(() => {
    return maintenance.reduce((acc, m) => acc + (m.amount || 0), 0);
  }, [maintenance]);

  const canEdit = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'OPERATIONS';

  return (
    <div id="ejaz-maintenance-view" className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h1 className="text-xl font-black text-slate-900">سجل صيانة الأسطول والورش</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة غيارات الزيت، الفرامل، الإطارات، الفحص الدوري وتنبيهات المواعيد القادمة.
          </p>
        </div>

        {canEdit && (
          <button
            id="maintenance-add-btn"
            onClick={handleOpenAdd}
            className="bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل عملية صيانة</span>
          </button>
        )}
      </div>

      {/* Overview Stat Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">إجمالي عمليات الصيانة</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{maintenance.length} عملية</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">إجمالي التكاليف المسجلة</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{totalMaintenanceCost.toLocaleString()} ر.س</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-900">تنبيه المواعيد القادمة</div>
            <div className="text-[11px] text-amber-700 mt-0.5">
              {upcomingMaintenanceRecord
                ? `الشاحنة ${upcomingMaintenanceRecord.plateNumber} موعد صيانتها ${upcomingMaintenanceRecord.nextMaintenanceDate}`
                : 'لا توجد مواعيد صيانة عاجلة مسجلة حالياً'}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <input
            id="maintenance-search-input"
            type="text"
            placeholder="بحث برقم اللوحة، وصف الصيانة، المعرف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white pl-9 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right text-xs text-slate-700">
          <thead className="bg-[#0F172A] text-white font-bold">
            <tr>
              <th className="p-3.5">التاريخ</th>
              <th className="p-3.5">الشاحنة / اللوحة</th>
              <th className="p-3.5">نوع الصيانة</th>
              <th className="p-3.5">الوصف والتفاصيل</th>
              <th className="p-3.5">المبلغ</th>
              <th className="p-3.5">موعد الصيانة القادمة</th>
              <th className="p-3.5 text-center">الحالة</th>
              {canEdit && <th className="p-3.5 text-center">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 8 : 7} className="p-8 text-center text-slate-400">
                  لا توجد سجلات صيانة مسجلة حالياً.
                </td>
              </tr>
            ) : (
              filteredList.map(rec => {
              const isAlert = isUpcomingAlert(rec.nextMaintenanceDate);
              return (
                <tr key={rec.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 text-slate-500 whitespace-nowrap">{rec.date}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-900">{rec.plateNumber}</td>
                  <td className="p-3.5 font-semibold text-slate-800">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {getMaintenanceTypeLabel(rec.maintenanceType)}
                    </span>
                  </td>
                  <td className="p-3.5 max-w-xs">{rec.description}</td>
                  <td className="p-3.5 font-bold text-rose-700">{rec.amount.toLocaleString()} ر.س</td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={isAlert ? 'text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded' : 'text-slate-600'}>
                      {rec.nextMaintenanceDate || '—'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    {rec.status === 'COMPLETED' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">منجزة</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">قيد التنفيذ</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(rec)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 rounded-md"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Maintenance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 bg-[#F97316] rounded-full" />
                <h3 className="text-base font-bold">
                  {editingRecord ? 'تعديل سجل الصيانة' : 'تسجيل عملية صيانة جديدة'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الشاحنة المستهدفة</label>
                  <select
                    value={formData.truckId}
                    onChange={e => handleTruckSelect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  >
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.plateNumber} ({t.model})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الصيانة</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الصيانة</label>
                  <select
                    value={formData.maintenanceType}
                    onChange={e => setFormData({ ...formData, maintenanceType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="OIL_CHANGE">تغيير زيت وفلاتر</option>
                    <option value="TIRES">إطارات وعجلات</option>
                    <option value="BRAKES">فرامل ومكابح</option>
                    <option value="PERIODIC_INSPECTION">فحص دوري شامل</option>
                    <option value="MECHANICAL">ميكانيكا ومحرك</option>
                    <option value="ELECTRICAL">كهرباء وحساسات</option>
                    <option value="GENERAL">صيانة عامة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تكلفة الصيانة (ر.س)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">موعد الصيانة القادمة</label>
                  <input
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={e => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة التنفيذ</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="COMPLETED">منجزة بالكامل</option>
                    <option value="IN_PROGRESS">قيد التنفيذ بالورشة</option>
                    <option value="SCHEDULED">مجدولة لاحقاً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف العمل وقطع الغيار المستبدلة</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="وصف القطع والورشة المنفذة..."
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
                  {editingRecord ? 'حفظ التعديلات' : 'تسجيل الصيانة والمصروف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
