import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  FileText, 
  Calendar, 
  Printer, 
  TrendingUp, 
  AlertCircle,
  X,
  CheckCircle2,
  Share2,
  Edit,
  Trash2,
  Eye,
  Check
} from 'lucide-react';
import { CollectionRecord, ExpenseRecord, Trip, Customer, User, PaymentMethod, ExpenseCategory } from '../types';
import { StorageService } from '../services/storage';

interface FinancialViewProps {
  collections: CollectionRecord[];
  expenses: ExpenseRecord[];
  trips: Trip[];
  customers: Customer[];
  currentUser: User;
  onRefresh: () => void;
}

export const FinancialView: React.FC<FinancialViewProps> = ({
  collections,
  expenses,
  trips,
  customers,
  currentUser,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'COLLECTIONS' | 'EXPENSES'>('COLLECTIONS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Delete modals
  const [deletingCollection, setDeletingCollection] = useState<CollectionRecord | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseRecord | null>(null);

  // View / Print Voucher modal
  const [viewingCollectionVoucher, setViewingCollectionVoucher] = useState<CollectionRecord | null>(null);
  const [viewingExpenseVoucher, setViewingExpenseVoucher] = useState<ExpenseRecord | null>(null);

  // Form states
  const [colForm, setColForm] = useState<Partial<CollectionRecord>>({
    date: new Date().toISOString().split('T')[0],
    tripNumber: '',
    customerId: '',
    customerName: '',
    amount: 1000,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: '',
  });

  const [expForm, setExpForm] = useState<Partial<ExpenseRecord>>({
    date: new Date().toISOString().split('T')[0],
    tripNumber: '',
    category: 'FUEL',
    amount: 350,
    paymentMethod: 'CASH',
    description: 'تعبئة ديزل وقود للشاحنة',
    recipient: 'محطة بترول',
  });

  // Financial Computations
  const totalRevenues = trips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalCollected = collections.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const remainingReceivables = Math.max(0, totalRevenues - totalCollected);
  const totalCommissions = trips.reduce((acc, t) => acc + (t.commissionAmount || 0), 0);
  const totalCustody = trips.reduce((acc, t) => acc + (t.driverCustody || 0), 0);
  
  // Spot Brokerage Margins (فوارق هوامش أرباح الرحلات اللحظية من الشاحنات الخارجية)
  const spotTrips = trips.filter(t => t.operationType === 'SUBCONTRACTED_SPOT' || t.isSubcontracted);
  const totalBrokerageMargin = spotTrips.reduce((acc, t) => {
    const margin = t.brokerageMargin ?? Math.max(0, (t.clientAgreedAmount || t.totalAmount || 0) - (t.externalCarrierCost || 0));
    return acc + margin;
  }, 0);

  const netOperatingProfit = totalRevenues - totalExpenses;

  // Open Collection Modal (New)
  const handleOpenAddCollection = () => {
    setEditingCollectionId(null);
    const defaultCust = customers[0] || { id: '', name: '' };
    setColForm({
      id: `COL-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().split('T')[0],
      tripNumber: trips[0]?.tripNumber || '',
      customerId: defaultCust.id,
      customerName: defaultCust.name,
      amount: 2500,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: `TRF-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: 'سداد دفعة نقدية / بنكية عن رحلة نقل',
    });
    setIsCollectionModalOpen(true);
  };

  // Open Collection Modal (Edit)
  const handleOpenEditCollection = (col: CollectionRecord) => {
    setEditingCollectionId(col.id);
    setColForm({
      id: col.id,
      date: col.date,
      tripId: col.tripId,
      tripNumber: col.tripNumber || '',
      customerId: col.customerId,
      customerName: col.customerName,
      amount: col.amount,
      paymentMethod: col.paymentMethod,
      referenceNumber: col.referenceNumber || '',
      notes: col.notes || '',
    });
    setIsCollectionModalOpen(true);
  };

  // Open Expense Modal (New)
  const handleOpenAddExpense = () => {
    setEditingExpenseId(null);
    setExpForm({
      id: `EXP-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().split('T')[0],
      tripNumber: trips[0]?.tripNumber || '',
      category: 'FUEL',
      amount: 450,
      paymentMethod: 'CASH',
      description: 'وقود ديزل ومصاريف ميزان على الطريق',
      recipient: 'محطة ساسكو',
    });
    setIsExpenseModalOpen(true);
  };

  // Open Expense Modal (Edit)
  const handleOpenEditExpense = (exp: ExpenseRecord) => {
    setEditingExpenseId(exp.id);
    setExpForm({
      id: exp.id,
      date: exp.date,
      tripId: exp.tripId,
      tripNumber: exp.tripNumber || '',
      category: exp.category,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      description: exp.description,
      recipient: exp.recipient || '',
    });
    setIsExpenseModalOpen(true);
  };

  // Save Collection
  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colForm.customerName || !colForm.amount) return;

    const matchedTrip = trips.find(t => t.tripNumber === colForm.tripNumber);

    const targetCol: CollectionRecord = {
      id: colForm.id || `COL-${Date.now().toString().slice(-5)}`,
      date: colForm.date || new Date().toISOString().split('T')[0],
      tripId: matchedTrip?.id || colForm.tripId,
      tripNumber: colForm.tripNumber || undefined,
      customerId: colForm.customerId || '',
      customerName: colForm.customerName || '',
      amount: Number(colForm.amount) || 0,
      paymentMethod: (colForm.paymentMethod as PaymentMethod) || 'BANK_TRANSFER',
      referenceNumber: colForm.referenceNumber || '',
      notes: colForm.notes || '',
      createdAt: new Date().toISOString(),
    };

    StorageService.saveCollection(targetCol, currentUser);
    setIsCollectionModalOpen(false);
    setEditingCollectionId(null);
    onRefresh();
  };

  // Delete Collection
  const handleConfirmDeleteCollection = () => {
    if (!deletingCollection) return;
    StorageService.deleteCollection(deletingCollection.id, currentUser);
    setDeletingCollection(null);
    onRefresh();
  };

  // Save Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.amount || !expForm.description) return;

    const matchedTrip = trips.find(t => t.tripNumber === expForm.tripNumber);

    const targetExp: ExpenseRecord = {
      id: expForm.id || `EXP-${Date.now().toString().slice(-5)}`,
      date: expForm.date || new Date().toISOString().split('T')[0],
      tripId: matchedTrip?.id || expForm.tripId,
      tripNumber: expForm.tripNumber || undefined,
      category: (expForm.category as ExpenseCategory) || 'OTHER',
      amount: Number(expForm.amount) || 0,
      paymentMethod: (expForm.paymentMethod as PaymentMethod) || 'CASH',
      description: expForm.description || '',
      recipient: expForm.recipient || '',
      createdAt: new Date().toISOString(),
    };

    StorageService.saveExpense(targetExp, currentUser);
    setIsExpenseModalOpen(false);
    setEditingExpenseId(null);
    onRefresh();
  };

  // Delete Expense
  const handleConfirmDeleteExpense = () => {
    if (!deletingExpense) return;
    StorageService.deleteExpense(deletingExpense.id, currentUser);
    setDeletingExpense(null);
    onRefresh();
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'FUEL': return 'وقود وديزل';
      case 'TOLLS_AND_WEIGHBRIDGE': return 'رسوم طرق وموازين';
      case 'MAINTENANCE': return 'صيانة وقطع غيار';
      case 'SALARY': return 'رواتب ومكافآت';
      case 'WASH': return 'غسيل ونظافة شاحنات';
      case 'CUSTODY': return 'عهد تشغيلية';
      case 'DRIVER_EXPENSE': return 'مصروفات سائق';
      default: return 'مصروفات عامة';
    }
  };

  const filteredCollections = useMemo(() => {
    return collections.filter(c => 
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.referenceNumber && c.referenceNumber.includes(searchTerm)) ||
      (c.tripNumber && c.tripNumber.includes(searchTerm)) ||
      (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [collections, searchTerm]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.recipient && e.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.tripNumber && e.tripNumber.includes(searchTerm))
    );
  }, [expenses, searchTerm]);

  const canEdit = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ACCOUNTANT';

  // Print function
  const handlePrintVoucher = () => {
    window.print();
  };

  return (
    <div id="ejaz-financial-view" className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h1 className="text-xl font-black text-slate-900">المركز المالي وسندات القبض والصرف</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وتعديل الفواتير وسندات التحصيل، سندات الصرف والوقود، وتحديث المركز المالي للمؤسسة.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              id="fin-add-collection-btn"
              onClick={handleOpenAddCollection}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>سند قبض جديد</span>
            </button>
            <button
              id="fin-add-expense-btn"
              onClick={handleOpenAddExpense}
              className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>سند صرف جديد</span>
            </button>
          </div>
        )}
      </div>

      {/* 8 Automated KPI Formula Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {/* 1. Revenues */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 block">إجمالي الإيرادات</span>
          <div className="text-lg font-black text-slate-900 mt-1">{totalRevenues.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400 font-sans">SAR</span>
        </div>

        {/* 2. Collections */}
        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-900 block">إجمالي المحصل</span>
          <div className="text-lg font-black text-emerald-700 mt-1">{totalCollected.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-600 font-sans">SAR</span>
        </div>

        {/* 3. Receivables */}
        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-900 block">المبالغ المتبقية</span>
          <div className="text-lg font-black text-amber-700 mt-1">{remainingReceivables.toLocaleString()}</div>
          <span className="text-[10px] text-amber-600 font-sans">SAR</span>
        </div>

        {/* 4. Expenses */}
        <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-900 block">إجمالي المصروفات</span>
          <div className="text-lg font-black text-rose-700 mt-1">{totalExpenses.toLocaleString()}</div>
          <span className="text-[10px] text-rose-600 font-sans">SAR</span>
        </div>

        {/* 5. Spot Brokerage Profit Margin */}
        <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-950 block">أرباح الوساطة</span>
            <span className="text-[8.5px] bg-purple-200 text-purple-900 font-bold px-1 rounded">خارجي</span>
          </div>
          <div className="text-lg font-black text-purple-900 mt-1">+{totalBrokerageMargin.toLocaleString()}</div>
          <span className="text-[10px] text-purple-700 font-medium">SAR (هامش)</span>
        </div>

        {/* 6. Commissions */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 block">العمولات</span>
          <div className="text-lg font-black text-slate-900 mt-1">{totalCommissions.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400 font-sans">SAR</span>
        </div>

        {/* 7. Custody */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 block">عهد السائقين</span>
          <div className="text-lg font-black text-orange-600 mt-1">{totalCustody.toLocaleString()}</div>
          <span className="text-[10px] text-orange-400 font-sans">SAR</span>
        </div>

        {/* 8. Net Profit */}
        <div className="bg-[#0F172A] text-white p-3 rounded-xl shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-orange-400 block">صافي الربح</span>
          <div className="text-lg font-black text-white mt-1">{netOperatingProfit.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400 font-sans">SAR</span>
        </div>
      </div>

      {/* Tabs for Collections vs Expenses */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            id="tab-collections-btn"
            onClick={() => setActiveTab('COLLECTIONS')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'COLLECTIONS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>سندات القبض والتحصيلات ({collections.length})</span>
          </button>
          <button
            id="tab-expenses-btn"
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'EXPENSES'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>سندات الصرف والمصروفات ({expenses.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="w-64 hidden sm:block">
          <input
            type="text"
            placeholder="بحث في السجلات..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Collections Table */}
      {activeTab === 'COLLECTIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 min-w-[700px]">
            <thead className="bg-[#0F172A] text-white font-bold">
              <tr>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">سند رقم</th>
                <th className="p-3.5">العميل</th>
                <th className="p-3.5">الرحلة المرتبطة</th>
                <th className="p-3.5">المبلغ المحصل</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">رقم المرجع / التحويل</th>
                <th className="p-3.5">الملاحظات</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد سندات قبض مسجلة حالياً
                  </td>
                </tr>
              ) : (
                filteredCollections.map(col => (
                  <tr key={col.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">{col.date}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">{col.id}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{col.customerName}</td>
                    <td className="p-3.5 font-mono text-slate-600">{col.tripNumber || 'تحصيل عام'}</td>
                    <td className="p-3.5 font-bold text-emerald-700">{col.amount.toLocaleString()} ر.س</td>
                    <td className="p-3.5 text-slate-600">{col.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : 'نقدي'}</td>
                    <td className="p-3.5 font-mono text-slate-500">{col.referenceNumber || '—'}</td>
                    <td className="p-3.5 text-slate-500 max-w-xs truncate">{col.notes}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View / Print Voucher */}
                        <button
                          onClick={() => setViewingCollectionVoucher(col)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title="عرض وطباعة سند القبض"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {/* Edit Button */}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditCollection(col)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="تعديل سند القبض / الفاتورة"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {/* Delete Button */}
                        {canEdit && (
                          <button
                            onClick={() => setDeletingCollection(col)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="حذف سند القبض"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses Table */}
      {activeTab === 'EXPENSES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 min-w-[700px]">
            <thead className="bg-[#0F172A] text-white font-bold">
              <tr>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">سند رقم</th>
                <th className="p-3.5">بند المصروف</th>
                <th className="p-3.5">الرحلة المرتبطة</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">المستلم / المحطة</th>
                <th className="p-3.5">الوصف والبيان</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد سندات صرف مسجلة حالياً
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">{exp.date}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">{exp.id}</td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{exp.tripNumber || 'مصروف عام'}</td>
                    <td className="p-3.5 font-bold text-rose-700">{exp.amount.toLocaleString()} ر.س</td>
                    <td className="p-3.5 text-slate-600">{exp.paymentMethod === 'BANK_TRANSFER' ? 'تحويل' : 'نقدي'}</td>
                    <td className="p-3.5 text-slate-700">{exp.recipient || '—'}</td>
                    <td className="p-3.5 text-slate-600 max-w-xs">{exp.description}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View / Print Voucher */}
                        <button
                          onClick={() => setViewingExpenseVoucher(exp)}
                          className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="عرض وطباعة سند الصرف"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {/* Edit Button */}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditExpense(exp)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="تعديل سند الصرف"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {/* Delete Button */}
                        {canEdit && (
                          <button
                            onClick={() => setDeletingExpense(exp)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="حذف سند الصرف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Collection Modal */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 bg-emerald-500 rounded-full" />
                <h3 className="text-base font-bold">
                  {editingCollectionId ? 'تعديل سند قبض وتحصيل مالي' : 'إصدار سند قبض وتحصيل مالي'}
                </h3>
              </div>
              <button onClick={() => setIsCollectionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCollection} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التحصيل</label>
                  <input
                    type="date"
                    value={colForm.date}
                    onChange={e => setColForm({ ...colForm, date: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المحصل (ر.س)</label>
                  <input
                    type="number"
                    value={colForm.amount}
                    onChange={e => setColForm({ ...colForm, amount: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العميل المسدد</label>
                <select
                  value={colForm.customerId}
                  onChange={e => {
                    const c = customers.find(item => item.id === e.target.value);
                    setColForm({
                      ...colForm,
                      customerId: e.target.value,
                      customerName: c ? c.name : '',
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="">اختر العميل...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرحلة المرتبطة</label>
                  <select
                    value={colForm.tripNumber}
                    onChange={e => setColForm({ ...colForm, tripNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  >
                    <option value="">(تحصيل عام بدون ربط رحلة)</option>
                    {trips.map(t => (
                      <option key={t.id} value={t.tripNumber}>{t.tripNumber} - {t.customerName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={colForm.paymentMethod}
                    onChange={e => setColForm({ ...colForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CASH">نقدي</option>
                    <option value="CHEQUE">شيك مصرفي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم المرجع / الحوالة</label>
                <input
                  type="text"
                  value={colForm.referenceNumber}
                  onChange={e => setColForm({ ...colForm, referenceNumber: e.target.value })}
                  placeholder="TRF-XXXXXX"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان والملاحظات</label>
                <textarea
                  rows={2}
                  value={colForm.notes}
                  onChange={e => setColForm({ ...colForm, notes: e.target.value })}
                  placeholder="بيان سند القبض..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingCollectionId ? 'حفظ التعديلات' : 'حفظ سند القبض'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 bg-rose-500 rounded-full" />
                <h3 className="text-base font-bold">
                  {editingExpenseId ? 'تعديل سند صرف ومصروف' : 'إصدار سند صرف ومصروف تشغيلي'}
                </h3>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الصرف</label>
                  <input
                    type="date"
                    value={expForm.date}
                    onChange={e => setExpForm({ ...expForm, date: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ (ر.س)</label>
                  <input
                    type="number"
                    value={expForm.amount}
                    onChange={e => setExpForm({ ...expForm, amount: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-rose-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بند المصروف</label>
                  <select
                    value={expForm.category}
                    onChange={e => setExpForm({ ...expForm, category: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="FUEL">وقود وديزل</option>
                    <option value="TOLLS_AND_WEIGHBRIDGE">رسوم طرق وموازين</option>
                    <option value="MAINTENANCE">صيانة وورشة</option>
                    <option value="SALARY">رواتب ومكافآت</option>
                    <option value="WASH">غسيل شاحنات</option>
                    <option value="CUSTODY">عهدة تشغيلية</option>
                    <option value="DRIVER_EXPENSE">مصاريف سائق</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرحلة (اختياري)</label>
                  <select
                    value={expForm.tripNumber}
                    onChange={e => setExpForm({ ...expForm, tripNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  >
                    <option value="">(مصروف عام للأسطول)</option>
                    {trips.map(t => (
                      <option key={t.id} value={t.tripNumber}>{t.tripNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المستلم / الجهة</label>
                <input
                  type="text"
                  value={expForm.recipient}
                  onChange={e => setExpForm({ ...expForm, recipient: e.target.value })}
                  placeholder="مثال: محطة ساسكو، ورشة الصيانة..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الوصف والبيان</label>
                <textarea
                  rows={2}
                  value={expForm.description}
                  onChange={e => setExpForm({ ...expForm, description: e.target.value })}
                  required
                  placeholder="تفاصيل المصروف..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingExpenseId ? 'حفظ التعديلات' : 'حفظ سند الصرف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Collection Confirmation Modal */}
      {deletingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تأكيد حذف سند القبض</h3>
                <p className="text-xs text-slate-500">رقم السند: {deletingCollection.id}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من حذف سند القبض بمبلغ <strong className="text-slate-900">{deletingCollection.amount.toLocaleString()} ر.س</strong> للعميل <strong className="text-slate-900">{deletingCollection.customerName}</strong>؟ سيتم تحديث رصيد الرحلة آلياً.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCollection(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCollection}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تأكيد حذف سند الصرف</h3>
                <p className="text-xs text-slate-500">رقم السند: {deletingExpense.id}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من حذف سند الصرف بمبلغ <strong className="text-slate-900">{deletingExpense.amount.toLocaleString()} ر.س</strong> ({deletingExpense.description})؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View / Print Collection Voucher Modal */}
      {viewingCollectionVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0" dir="rtl">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">معاينة وطباعة سند القبض المالي</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintVoucher}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
                <button onClick={() => setViewingCollectionVoucher(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 text-slate-800 bg-white">
              {/* Voucher Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">مؤسسة إيجاز للنقليات</h2>
                  <p className="text-xs text-slate-500">سجل تجاري: 1010895421 | الرقم الضريبي: 310245897600003</p>
                  <p className="text-xs text-slate-500">الرياض – المملكة العربية السعودية | هاتف: 0500000000</p>
                </div>
                <div className="text-left">
                  <div className="inline-block bg-emerald-100 text-emerald-900 px-3 py-1 rounded-lg text-sm font-black mb-1">
                    سند قبض مالي
                  </div>
                  <div className="text-xs font-mono text-slate-600">رقم: {viewingCollectionVoucher.id}</div>
                  <div className="text-xs text-slate-500">التاريخ: {viewingCollectionVoucher.date}</div>
                </div>
              </div>

              {/* Voucher Content */}
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-600">استلمنا من المكرم / السادة:</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingCollectionVoucher.customerName}</span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <span className="font-bold text-emerald-900">مبلغ وقدره:</span>
                  <span className="font-black text-emerald-800 text-base">{viewingCollectionVoucher.amount.toLocaleString()} ريال سعودي</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">طريقة السداد:</span>
                    <span className="font-bold text-slate-900">
                      {viewingCollectionVoucher.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : 'نقدي'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">رقم المرجع / الحوالة:</span>
                    <span className="font-mono font-bold text-slate-900">{viewingCollectionVoucher.referenceNumber || '—'}</span>
                  </div>
                </div>

                {viewingCollectionVoucher.tripNumber && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500">الرحلة المرتبطة:</span>
                    <span className="font-mono font-bold text-slate-900">{viewingCollectionVoucher.tripNumber}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">وذلك عن (البيان والملاحظات):</span>
                  <p className="font-medium text-slate-800">{viewingCollectionVoucher.notes || 'سداد مستحقات نقل بضائع وإرساليات'}</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-700 mb-8">المستلم / المحاسب</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">التوقيع والختم</div>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-8">الدافع / العميل</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">التوقيع</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View / Print Expense Voucher Modal */}
      {viewingExpenseVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0" dir="rtl">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold">معاينة وطباعة سند الصرف المالي</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintVoucher}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
                <button onClick={() => setViewingExpenseVoucher(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 text-slate-800 bg-white">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">مؤسسة إيجاز للنقليات</h2>
                  <p className="text-xs text-slate-500">سجل تجاري: 1010895421 | الرقم الضريبي: 310245897600003</p>
                  <p className="text-xs text-slate-500">الرياض – المملكة العربية السعودية</p>
                </div>
                <div className="text-left">
                  <div className="inline-block bg-rose-100 text-rose-900 px-3 py-1 rounded-lg text-sm font-black mb-1">
                    سند صرف مالي
                  </div>
                  <div className="text-xs font-mono text-slate-600">رقم: {viewingExpenseVoucher.id}</div>
                  <div className="text-xs text-slate-500">التاريخ: {viewingExpenseVoucher.date}</div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-600">يصرف إلى المكرم / الجهة:</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingExpenseVoucher.recipient || 'جهة الصرف'}</span>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex justify-between items-center">
                  <span className="font-bold text-rose-900">مبلغ وقدره:</span>
                  <span className="font-black text-rose-800 text-base">{viewingExpenseVoucher.amount.toLocaleString()} ريال سعودي</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">بند المصروف:</span>
                    <span className="font-bold text-slate-900">{getCategoryLabel(viewingExpenseVoucher.category)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">طريقة الصرف:</span>
                    <span className="font-bold text-slate-900">
                      {viewingExpenseVoucher.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : 'نقدي'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">البيان والوصف:</span>
                  <p className="font-medium text-slate-800">{viewingExpenseVoucher.description}</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-700 mb-8">المحاسب / المدير المالي</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">التوقيع والاعتماد</div>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-8">المستلم</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">التوقيع</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
