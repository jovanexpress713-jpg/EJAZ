import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  MapPin, 
  FileText, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  X,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { Customer, Trip, User } from '../types';
import { StorageService } from '../services/storage';

interface CustomersViewProps {
  customers: Customer[];
  trips: Trip[];
  currentUser: User;
  onRefresh: () => void;
  onViewTrip: (trip: Trip) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  trips,
  currentUser,
  onRefresh,
  onViewTrip,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    address: 'الرياض',
    taxNumber: '',
    paymentTerms: 'آجل 30 يومًا',
    status: 'ACTIVE',
    notes: '',
  });

  const handleOpenAdd = () => {
    const nextId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    setFormData({
      id: nextId,
      name: '',
      phone: '',
      address: 'الرياض',
      taxNumber: '300000000000003',
      paymentTerms: 'آجل 30 يومًا من تاريخ الفاتورة',
      status: 'ACTIVE',
      notes: '',
    });
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const customerToSave: Customer = {
      id: editingCustomer ? editingCustomer.id : (formData.id || `CUST-${Date.now().toString().slice(-4)}`),
      name: formData.name || '',
      phone: formData.phone || '',
      address: formData.address || '',
      taxNumber: formData.taxNumber || '',
      paymentTerms: formData.paymentTerms || '',
      status: (formData.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      notes: formData.notes || '',
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString().split('T')[0],
    };

    StorageService.saveCustomer(customerToSave, currentUser);
    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = () => {
    if (!deletingCustomer) return;
    StorageService.deleteCustomer(deletingCustomer.id, currentUser);
    setDeletingCustomer(null);
    onRefresh();
  };

  // Compute customer stats
  const customerStatsMap = useMemo(() => {
    const map = new Map<string, { tripsCount: number; totalBilled: number; totalPaid: number; remaining: number }>();
    customers.forEach(c => {
      const custTrips = trips.filter(t => t.customerId === c.id || t.customerName === c.name);
      const totalBilled = custTrips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
      const totalPaid = custTrips.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
      map.set(c.id, {
        tripsCount: custTrips.length,
        totalBilled,
        totalPaid,
        remaining: Math.max(0, totalBilled - totalPaid),
      });
    });
    return map;
  }, [customers, trips]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.taxNumber.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const canEdit = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'OPERATIONS' || currentUser.role === 'ACCOUNTANT';

  // Customer Statement of Account
  const statementTrips = useMemo(() => {
    if (!selectedCustomerForStatement) return [];
    return trips.filter(t => t.customerId === selectedCustomerForStatement.id || t.customerName === selectedCustomerForStatement.name);
  }, [selectedCustomerForStatement, trips]);

  // Render note and collector badge in customer statement
  const renderCollectorBadge = (trip: Trip) => {
    const note = (trip.notes || '').trim();
    const paid = trip.paidAmount || 0;

    if (paid === 0 && !note) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
          ⏳ لم يُحصل
        </span>
      );
    }

    const isEjaz = note.includes('إيجاز') || note.includes('الشركة') || note.includes('المؤسسة');
    const isEmployeeOrPerson = note.includes('الموظف') || note.includes('بيد') || note.includes('أبو حسن') || note.includes('السائق') || note.includes('نقد');

    return (
      <div className={`p-1 rounded text-[10px] leading-tight font-bold border break-words ${
        isEjaz 
          ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
          : isEmployeeOrPerson 
          ? 'bg-amber-50 text-amber-950 border-amber-300'
          : note 
          ? 'bg-slate-50 text-slate-900 border-slate-200'
          : 'bg-emerald-50 text-emerald-950 border-emerald-200'
      }`}>
        <div className="text-[9px] font-black text-slate-700">
          {isEjaz ? '🏢 مؤسسة إيجاز' : isEmployeeOrPerson ? '👤 المحصل / الموظف' : note ? '📝 جهة التحصيل' : '🏢 مؤسسة إيجاز (بنك)'}
        </div>
        {note ? (
          <div className="text-slate-900 font-bold">{note}</div>
        ) : (
          <div className="text-emerald-800">تم التحصيل للمؤسسة</div>
        )}
      </div>
    );
  };

  return (
    <div id="ejaz-customers-view" className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h1 className="text-xl font-black text-slate-900">سجل العملاء وحسابات النقل</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة بيانات الشركات والعملاء، متابعة المديونيات، شروط السداد وكشوفات الحساب.
          </p>
        </div>

        {canEdit && (
          <button
            id="customers-add-btn"
            onClick={handleOpenAdd}
            className="bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <input
            id="customers-search-input"
            type="text"
            placeholder="بحث باسم العميل، رقم الجوال، الرقم الضريبي، العنوان..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white pl-9 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const stats = customerStatsMap.get(customer.id) || { tripsCount: 0, totalBilled: 0, totalPaid: 0, remaining: 0 };
          return (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-orange-300 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {customer.id}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    customer.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {customer.status === 'ACTIVE' ? 'نشط ومستمر' : 'موقوف'}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {customer.name}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.phone || 'غير مسجل'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{customer.address || 'الرياض'}</span>
                  </div>
                  {customer.taxNumber && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      الرقم الضريبي: {customer.taxNumber}
                    </div>
                  )}
                </div>

                {/* Financial Overview Capsule */}
                <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">عدد الرحلات:</span>
                    <span className="font-bold text-slate-900">{stats.tripsCount} رحلة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">إجمالي المفوتر:</span>
                    <span className="font-bold text-slate-900">{stats.totalBilled.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المسدد / المحصل:</span>
                    <span className="font-bold text-emerald-700">{stats.totalPaid.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold">
                    <span className="text-slate-700">الرصيد المتبقي:</span>
                    <span className={stats.remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                      {stats.remaining.toLocaleString()} ر.س
                    </span>
                  </div>
                </div>

                {customer.paymentTerms && (
                  <div className="mt-2 text-[11px] text-slate-500 bg-amber-50/70 p-2 rounded-lg border border-amber-100">
                    <span className="font-bold text-amber-900">شروط السداد:</span> {customer.paymentTerms}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedCustomerForStatement(customer)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>كشف الحساب</span>
                </button>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(customer)}
                      className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      title="تعديل بيانات العميل"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCustomer(customer)}
                      className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="حذف العميل"
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 bg-[#F97316] rounded-full" />
                <h3 className="text-base font-bold">
                  {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل / الشركة</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="مثال: شركة الأفق للمقاولات"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال / الهاتف</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي (15 رقم)</label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                    placeholder="3XXXXXXXXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان / المدينة</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="الرياض - حي الملز"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة الحساب</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold"
                  >
                    <option value="ACTIVE">نشط ومستمر</option>
                    <option value="INACTIVE">موقوف مؤقتاً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شروط السداد والائتمان</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="مثال: آجل 30 يومًا، أو نقدي عند الاستلام"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات حول طبيعة الشحنات المفضلة..."
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
                  {editingCustomer ? 'حفظ التعديلات' : 'إضافة العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Statement of Account Drawer/Modal */}
      {selectedCustomerForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-orange-600 px-2 py-0.5 rounded font-mono uppercase">
                  كشف حساب عميل معتمد
                </span>
                <h3 className="text-base sm:text-lg font-black mt-1">
                  {selectedCustomerForStatement.name} ({selectedCustomerForStatement.id})
                </h3>
              </div>
              <button onClick={() => setSelectedCustomerForStatement(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Financial summary for customer */}
              {(() => {
                const stats = customerStatsMap.get(selectedCustomerForStatement.id) || { tripsCount: 0, totalBilled: 0, totalPaid: 0, remaining: 0 };
                return (
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold">إجمالي المفوتر</div>
                      <div className="text-lg font-black text-slate-900 mt-0.5">{stats.totalBilled.toLocaleString()} ر.س</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold">المسدد والمحصل</div>
                      <div className="text-lg font-black text-emerald-700 mt-0.5">{stats.totalPaid.toLocaleString()} ر.س</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold">الرصيد المستحق (المتبقي)</div>
                      <div className={`text-lg font-black mt-0.5 ${stats.remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {stats.remaining.toLocaleString()} ر.س
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* List of customer trips */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  سجل رحلات العميل ({statementTrips.length} رحلة)
                </h4>

                {statementTrips.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                    لا توجد رحلات مسجلة لهذا العميل حتى الآن.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#0F172A] text-white font-bold text-[11px]">
                        <tr>
                          <th className="p-2.5 whitespace-nowrap">رقم وتاريخ الرحلة</th>
                          <th className="p-2.5">المسار والحمولة</th>
                          <th className="p-2.5 whitespace-nowrap">إجمالي الرحلة</th>
                          <th className="p-2.5 whitespace-nowrap text-emerald-400">المحصل</th>
                          <th className="p-2.5 whitespace-nowrap text-amber-300 font-bold">المبلغ المتبقي</th>
                          <th className="p-2.5 min-w-[140px] text-orange-300 font-bold">من المحصل</th>
                          <th className="p-2.5 text-center whitespace-nowrap">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {statementTrips.map(trip => (
                          <tr key={trip.id} className="hover:bg-slate-50">
                            <td className="p-2.5 whitespace-nowrap">
                              <div className="font-mono font-bold text-slate-900">{trip.tripNumber}</div>
                              <div className="text-[10px] text-slate-500">{trip.date}</div>
                            </td>
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-800">
                                {trip.loadingLocation.split('-')[0]} ➔ {trip.unloadingLocation.split('-')[0]}
                              </div>
                              <div className="text-[10px] text-slate-500">{trip.cargoType}</div>
                            </td>
                            <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{trip.totalAmount.toLocaleString()} ر.س</td>
                            <td className="p-2.5 text-emerald-700 font-bold whitespace-nowrap">{(trip.paidAmount || 0).toLocaleString()} ر.س</td>
                            <td className="p-2.5 font-bold whitespace-nowrap">
                              {trip.remainingAmount > 0 ? (
                                <span className="text-amber-700 font-black">{trip.remainingAmount.toLocaleString()} ر.س</span>
                              ) : (
                                <span className="text-emerald-700 font-bold text-[10px]">مسدد 0 ر.س</span>
                              )}
                            </td>
                            <td className="p-2.5 min-w-[140px]">
                              {renderCollectorBadge(trip)}
                            </td>
                            <td className="p-2.5 text-center font-semibold text-[11px] whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                                {trip.status === 'COMPLETED' ? 'مكتملة' : trip.status === 'DELIVERED' ? 'تم التوصيل' : trip.status === 'IN_TRANSIT' ? 'جارية' : 'جديدة'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-200">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-orange-400" />
                  <span>طباعة كشف الحساب</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف العميل</h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف العميل <span className="font-bold text-slate-900">{deletingCustomer.name}</span>؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingCustomer(null)}
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
    </div>
  );
};
