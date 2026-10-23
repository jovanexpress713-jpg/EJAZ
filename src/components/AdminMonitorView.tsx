/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Smartphone, 
  Database, 
  FileCheck, 
  ArrowUpDown, 
  Check, 
  X, 
  Eye, 
  Send, 
  FileText,
  Lock,
  Wifi,
  WifiOff,
  UserCheck,
  UserPlus,
  Key,
  Shield,
  Edit,
  Trash2,
  Copy,
  Save,
  CheckSquare,
  Square,
  Layers,
  Crown
} from 'lucide-react';
import { 
  User, 
  Trip, 
  CollectionRecord, 
  ExpenseRecord, 
  AuditLog, 
  SyncOutboxItem, 
  SyncDevice, 
  CompanySettings,
  UserRole,
  UserPermissions
} from '../types';
import { StorageService, getDefaultPermissions } from '../services/storage';
import { SyncEngine } from '../services/syncEngine';
import { exportToExcel } from '../utils/excelExporter';
import { generateTemporaryPassword } from '../services/security';

export const PERMISSION_DEFINITIONS: {
  key: keyof UserPermissions;
  label: string;
  desc: string;
  category: 'عام' | 'العمليات' | 'الأسطول' | 'المالية' | 'التقارير' | 'الإدارة' | 'الرقابة';
}[] = [
  { key: 'canViewDashboard', label: 'استعراض لوحة التحكم والمؤشرات', desc: 'الاطلاع على الإحصائيات العامة والمخططات والنشاط اللحظي', category: 'عام' },
  { key: 'canManageTrips', label: 'إدارة الرحلات والبوليصات', desc: 'إضافة وتعديل وحذف الرحلات ومتابعة مسارات النقل وإصدار البوليصة', category: 'العمليات' },
  { key: 'canManageCustomers', label: 'إدارة بيانات العملاء والمديونيات', desc: 'تسجيل وتعديل العملاء وكشوفات الحساب وأرصدة المديونيات', category: 'العمليات' },
  { key: 'canManageDrivers', label: 'إدارة ملفات السائقين والوثائق', desc: 'إضافة السائقين، البطاقات المهنية، وفحص انتهاء الرخص والربط بالشاحنات', category: 'الأسطول' },
  { key: 'canManageTrucks', label: 'إدارة الشاحنات والأسطول', desc: 'تسجيل الشاحنات، اللوحات، الأرقام الرقمية، وحالة الفحص والملكية', category: 'الأسطول' },
  { key: 'canManageMaintenance', label: 'أوامر الصيانة الدورية والطارئة', desc: 'جدولة ومتابعة صيانة الشاحنات وتغيير الزيوت وعدادات الكيلومتر', category: 'الأسطول' },
  { key: 'canManageFinancials', label: 'العمليات وسندات الصرف والقبض', desc: 'إصدار سندات القبض، سداد دفعات الرحلات، وتسجيل مصروفات التشغيل', category: 'المالية' },
  { key: 'canCloseCashbox', label: 'إقفال الصندوق وترحيل الورديات', desc: 'توثيق محاضر التسليم والترحيل النقدي للمالك وإقفال اليومية', category: 'المالية' },
  { key: 'canApproveOperations', label: 'اعتماد العمليات المالية والتشغيلية', desc: 'الموافقة الرسمية على الرحلات وسندات الصرف والقبض المعلقة', category: 'الرقابة' },
  { key: 'canViewReports', label: 'استعراض التقارير الشاملة', desc: 'الاطلاع على التقارير المالية والتشغيلية وكشوفات حساب السائقين والعملاء', category: 'التقارير' },
  { key: 'canExportReports', label: 'تصدير التقارير إلى Excel وطباعتها', desc: 'تنزيل ملفات الإكسل (.xlsx) وطباعة الكشوفات الرسمية A4', category: 'التقارير' },
  { key: 'canManageUsers', label: 'إدارة الموظفين وتعديل الصلاحيات', desc: 'إضافة مستخدمين جدد، تعيين الأدوار وتخصيص مصفوفة الصلاحيات الدقيقة', category: 'الإدارة' },
  { key: 'canManageSettings', label: 'إعدادات النظام والهوية والضرائب', desc: 'تعديل بيانات المؤسسة، السجل التجاري، الرقم الضريبي والشروط', category: 'الإدارة' },
  { key: 'canBackupRestore', label: 'النسخ الاحتياطي واستعادة البيانات', desc: 'تصدير واستيراد قواعد البيانات وإجراءات الحماية والتخزين', category: 'الإدارة' },
  { key: 'canAccessSyncMonitor', label: 'شاشة الرقابة والمزامنة المركزية', desc: 'الوصول إلى سجل التدقيق الأمني ومراقبة الأجهزة وطابور المزامنة', category: 'الرقابة' },
];

interface AdminMonitorViewProps {
  currentUser: User;
  trips: Trip[];
  collections: CollectionRecord[];
  expenses: ExpenseRecord[];
  auditLogs: AuditLog[];
  settings: CompanySettings;
  onRefreshData: () => void;
  onNavigateToTrip?: (trip: Trip) => void;
  initialSubTab?: 'ROLES_PERMISSIONS' | 'TIMELINE' | 'PENDING' | 'SYNC' | 'AUDIT';
}

export const AdminMonitorView: React.FC<AdminMonitorViewProps> = ({
  currentUser,
  trips,
  collections,
  expenses,
  auditLogs,
  settings,
  onRefreshData,
  onNavigateToTrip,
  initialSubTab = 'ROLES_PERMISSIONS',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ROLES_PERMISSIONS' | 'TIMELINE' | 'PENDING' | 'SYNC' | 'AUDIT'>(initialSubTab);
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [importBundleText, setImportBundleText] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // User & Granular Permissions State
  const [usersList, setUsersList] = useState<User[]>(() => StorageService.getUsers());
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [tempPassAlert, setTempPassAlert] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [copiedPassText, setCopiedPassText] = useState<string | null>(null);

  // Edit Permissions Modal State
  const [editingUserForPermissions, setEditingUserForPermissions] = useState<User | null>(null);
  const [editPermissionsForm, setEditPermissionsForm] = useState<UserPermissions | null>(null);
  const [editUserRole, setEditUserRole] = useState<UserRole>('OPERATIONS');
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserActive, setEditUserActive] = useState(true);

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('OPERATIONS');
  const [newPhone, setNewPhone] = useState('');
  const [newTempPass, setNewTempPass] = useState(() => generateTemporaryPassword());
  const [forceFirstChange, setForceFirstChange] = useState(true);

  const refreshUsers = () => {
    setUsersList(StorageService.getUsers());
  };

  const handleOpenEditPermissions = (user: User) => {
    setEditingUserForPermissions(user);
    setEditUserFullName(user.fullName);
    setEditUserPhone(user.phone || '');
    setEditUserRole(user.role);
    setEditUserActive(user.active);
    setEditPermissionsForm(user.permissions ? { ...user.permissions } : getDefaultPermissions(user.role));
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    if (!editPermissionsForm) return;
    setEditPermissionsForm({
      ...editPermissionsForm,
      [key]: !editPermissionsForm[key],
    });
  };

  const handleGrantAllPermissions = () => {
    if (!editPermissionsForm) return;
    const allTrue: UserPermissions = {
      canViewDashboard: true,
      canManageTrips: true,
      canManageCustomers: true,
      canManageDrivers: true,
      canManageTrucks: true,
      canManageMaintenance: true,
      canManageFinancials: true,
      canCloseCashbox: true,
      canApproveOperations: true,
      canViewReports: true,
      canExportReports: true,
      canManageUsers: true,
      canManageSettings: true,
      canBackupRestore: true,
      canAccessSyncMonitor: true,
    };
    setEditPermissionsForm(allTrue);
  };

  const handleResetToRoleDefaults = () => {
    setEditPermissionsForm(getDefaultPermissions(editUserRole));
  };

  const handleRevokeAllPermissions = () => {
    if (!editPermissionsForm) return;
    const allFalse: UserPermissions = {
      canViewDashboard: false,
      canManageTrips: false,
      canManageCustomers: false,
      canManageDrivers: false,
      canManageTrucks: false,
      canManageMaintenance: false,
      canManageFinancials: false,
      canCloseCashbox: false,
      canApproveOperations: false,
      canViewReports: false,
      canExportReports: false,
      canManageUsers: false,
      canManageSettings: false,
      canBackupRestore: false,
      canAccessSyncMonitor: false,
    };
    setEditPermissionsForm(allFalse);
  };

  const handleSaveUserPermissions = () => {
    if (!editingUserForPermissions || !editPermissionsForm) return;
    setUserActionError(null);

    const updatedUser: User = {
      ...editingUserForPermissions,
      fullName: editUserFullName.trim() || editingUserForPermissions.fullName,
      phone: editUserPhone.trim(),
      role: editUserRole,
      active: editUserActive,
      permissions: editPermissionsForm,
    };

    StorageService.saveUser(updatedUser, currentUser);
    refreshUsers();
    setEditingUserForPermissions(null);
    setTempPassAlert(`تم حفظ وتحديث مصفوفة صلاحيات الموظف [ ${updatedUser.fullName} ] بنجاح.`);
    setTimeout(() => setTempPassAlert(null), 5000);
    onRefreshData();
  };

  const handleToggleUserActive = (user: User) => {
    setUserActionError(null);
    if (user.role === 'SUPER_ADMIN' && user.active) {
      const activeSuperAdmins = usersList.filter(u => u.id !== user.id && u.role === 'SUPER_ADMIN' && u.active);
      if (activeSuperAdmins.length === 0) {
        setUserActionError('لا يمكن تعطيل حساب المالك أو آخر مدير نظام نشط.');
        return;
      }
    }
    const updated = { ...user, active: !user.active };
    StorageService.saveUser(updated, currentUser);
    refreshUsers();
    onRefreshData();
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);

    if (!newFullName.trim() || !newUsername.trim()) {
      setUserActionError('يرجى إدخال الاسم الكامل واسم المستخدم.');
      return;
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    const existing = StorageService.getUsers();
    if (existing.some(u => u.username.toLowerCase() === cleanUsername)) {
      setUserActionError('اسم المستخدم مسجل مسبقاً. يرجى اختيار اسم مستخدم آخر.');
      return;
    }

    const newUser: User = {
      id: 'usr_' + Date.now().toString(36),
      fullName: newFullName.trim(),
      username: cleanUsername,
      role: newRole,
      phone: newPhone.trim(),
      active: true,
      password: newTempPass,
      mustChangePassword: forceFirstChange,
      permissions: getDefaultPermissions(newRole),
      createdAt: new Date().toISOString(),
    };

    StorageService.saveUser(newUser, currentUser);
    refreshUsers();
    setShowAddUserModal(false);
    setTempPassAlert(`تم إنشاء حساب الموظف [ ${newUser.fullName} ] بنجاح. كلمة المرور المؤقتة هي: [ ${newTempPass} ] — يرجى نسخها وتسليمها له.`);
    setNewFullName('');
    setNewUsername('');
    setNewPhone('');
    setNewTempPass(generateTemporaryPassword());
    onRefreshData();
  };

  const handleResetUserPassword = (user: User) => {
    const tempPass = generateTemporaryPassword();
    try {
      StorageService.resetUserPassword(user.id, tempPass, currentUser);
      refreshUsers();
      setTempPassAlert(`تمت إعادة تعيين كلمة مرور الموظف [ ${user.fullName} ] إلى: [ ${tempPass} ]. سيلتزم بتغييرها فور الدخول.`);
      onRefreshData();
    } catch (err: any) {
      setUserActionError(err?.message || 'فشلت إعادة تعيين كلمة المرور.');
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserActionError(null);
    if (user.role === 'SUPER_ADMIN') {
      setUserActionError('لا يمكن حذف حساب المالك أو مدير النظام العام.');
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف حساب الموظف "${user.fullName}" نهائياً من النظام؟`)) return;

    try {
      StorageService.deleteUser(user.id, currentUser);
      refreshUsers();
      onRefreshData();
    } catch (err: any) {
      setUserActionError(err?.message || 'حدث خطأ أثناء حذف المستخدم.');
    }
  };

  const handleCopyPassword = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPassText(text);
    setTimeout(() => setCopiedPassText(null), 2500);
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
      if (userSearchTerm.trim()) {
        const q = userSearchTerm.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.phone && u.phone.includes(q))
        );
      }
      return true;
    });
  }, [usersList, userRoleFilter, userSearchTerm]);

  // Available users for filtering
  const allUsers = useMemo(() => StorageService.getUsers(), [usersList]);
  const outboxItems = useMemo(() => SyncEngine.getOutbox(), [auditLogs]);
  const connectedDevices = useMemo(() => SyncEngine.getDevices(), [auditLogs]);

  // Operations needing approval
  const pendingTrips = useMemo(() => trips.filter(t => t.needsApproval), [trips]);
  const pendingCollections = useMemo(() => collections.filter(c => c.needsApproval), [collections]);
  const pendingExpenses = useMemo(() => expenses.filter(e => e.needsApproval), [expenses]);
  const totalPendingCount = pendingTrips.length + pendingCollections.length + pendingExpenses.length;

  // Filtered Audit Logs (Employee Timeline)
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Employee filter
      if (employeeFilter !== 'ALL' && log.userId !== employeeFilter && log.userName !== employeeFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'TRIP' && !log.entityType.toLowerCase().includes('trip')) return false;
        if (typeFilter === 'FINANCIAL' && !['collection', 'expense', 'financial'].includes(log.entityType.toLowerCase())) return false;
        if (typeFilter === 'USERS' && !log.entityType.toLowerCase().includes('user')) return false;
      }
      // Date filter
      if (dateFilter && !log.timestamp.startsWith(dateFilter)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchUser = log.userName.toLowerCase().includes(q);
        const matchEntity = log.entityId.toLowerCase().includes(q);
        if (!matchDetails && !matchUser && !matchEntity) return false;
      }
      return true;
    });
  }, [auditLogs, employeeFilter, typeFilter, dateFilter, searchQuery]);

  // Handle Approvals
  const handleApproveTrip = (tripId: string) => {
    StorageService.approveTrip(tripId, currentUser);
    onRefreshData();
  };

  const handleApproveFinancial = (type: 'COLLECTION' | 'EXPENSE', id: string) => {
    StorageService.approveFinancial(type, id, currentUser);
    onRefreshData();
  };

  // Trigger manual sync with Central Server
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback({ message: 'جاري الاتصال بالقاعدة المركزية ومزامنة العمليات...', type: 'info' });

    try {
      const syncResult = await SyncEngine.syncWithServer(currentUser);
      setIsSyncing(false);

      if (syncResult.success) {
        setSyncFeedback({ 
          message: `تمت المزامنة بنجاح! تم إرسال ${syncResult.pushedCount} عملية واستقبال التحديثات من الخادم المركزي.`, 
          type: 'success' 
        });
        onRefreshData();
      } else {
        setSyncFeedback({ 
          message: syncResult.error || 'تعذر الاتصال بالخادم المركزي، التطبيق يعمل في وضع أوفلاين والبيانات محفوظة.', 
          type: 'error' 
        });
      }
    } catch (err: any) {
      setIsSyncing(false);
      setSyncFeedback({ 
        message: `تعذر إتمام المزامنة: ${err?.message || 'خطأ غير متوقع'}`, 
        type: 'error' 
      });
    }
  };

  // Export encrypted bundle for physical/offline handover
  const handleDownloadSyncBundle = () => {
    const bundleStr = SyncEngine.exportSignedSyncBundle(currentUser);
    const blob = new Blob([bundleStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Victoria_ERP_SyncBundle_${new Date().toISOString().slice(0, 10)}.ejaz`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import external sync bundle from an employee
  const handleProcessImportBundle = () => {
    if (!importBundleText.trim()) return;
    const result = SyncEngine.parseSignedSyncBundle(importBundleText);
    if (!result.success || !result.bundle) {
      alert(result.error || 'ملف الحزمة غير صالح.');
      return;
    }

    const { items, sourceDeviceName, exportedBy } = result.bundle;
    let addedCount = 0;
    
    // Process items without destructive overwrite
    items.forEach((item: SyncOutboxItem) => {
      SyncEngine.enqueueOperation(item.entityType, item.entityId, item.action, item.payload, {
        id: item.authorId,
        username: item.authorName,
        fullName: item.authorName,
        role: 'OPERATIONS',
        phone: '',
        active: true,
      });
      addedCount++;
    });

    setShowImportModal(false);
    setImportBundleText('');
    alert(`تم بنجاح استيراد ${addedCount} عملية مرحّلة من جهاز "${sourceDeviceName}" التابع للموظف (${exportedBy}).`);
    onRefreshData();
  };

  // Export audit logs to Excel
  const handleExportAuditExcel = () => {
    const dataToExport = filteredLogs.map((log, idx) => ({
      '#': idx + 1,
      'التاريخ والوقت': log.timestamp,
      'الموظف': log.userName,
      'الدور الوظيفي': log.userRole,
      'نوع العملية': log.action,
      'السجل': log.entityType,
      'المعرف': log.entityId,
      'التفاصيل والبيان': log.details,
    }));
    exportToExcel(dataToExport, `سجل_تدقيق_أعمال_الموظفين_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Page Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                لوحة متابعة مدير النظام ورقابة الأعمال
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                نظام تدقيق ومتابعة أعمال الموظفين اللوجستية والمالية وإدارة المزامنة بين الأجهزة
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة أجهزة الشركة'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>استيراد حزمة موظف</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSyncBundle}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>تصدير حزمة المزامنة</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div 
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            syncFeedback.type === 'success' 
              ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800' 
              : syncFeedback.type === 'error'
              ? 'bg-red-950/60 text-red-200 border-red-800'
              : 'bg-blue-950/60 text-blue-200 border-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : syncFeedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSyncFeedback(null)} 
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Operations */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سجل العمليات</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {auditLogs.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">عملية مدققة ومسجلة</p>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">بانتظار الاعتماد</span>
            <div className={`p-2 rounded-lg ${totalPendingCount > 0 ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {totalPendingCount}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">عمليات مالية أو تشغيلية معلقة</p>
        </div>

        {/* Outbox Pending Sync */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">طابور المزامنة</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {outboxItems.filter(i => i.status === 'PENDING').length}
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">سجلات جاهزة للترحيل الآمن</p>
        </div>

        {/* Connected Devices */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أجهزة المؤسسة</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {Math.max(connectedDevices.length, 1)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">أجهزة مصرح لها بالاتصال</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('ROLES_PERMISSIONS')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'ROLES_PERMISSIONS'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>الصلاحيات وإدارة الأدوار ({usersList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('TIMELINE')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'TIMELINE'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل نشاط الموظفين اليومي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('PENDING')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'PENDING'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>العمليات المعلقة للاعتماد ({totalPendingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('SYNC')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'SYNC'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>مراقبة المزامنة والأجهزة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('AUDIT')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'AUDIT'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>سجل التدقيق الأمني المحمي</span>
        </button>
      </div>

      {/* SubTab 0: Roles & Permissions Matrix and Employee Management */}
      {activeSubTab === 'ROLES_PERMISSIONS' && (
        <div className="space-y-4">
          {/* Action Alerts & Temporary Password Banner */}
          {tempPassAlert && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3.5 flex items-start justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-start gap-2.5 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{tempPassAlert}</span>
              </div>
              <button
                type="button"
                onClick={() => setTempPassAlert(null)}
                className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {userActionError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl p-3.5 flex items-start justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-medium">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{userActionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUserActionError(null)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top Actions & Filters Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Search User Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم أو اسم المستخدم أو الهاتف..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Role filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={userRoleFilter}
                  onChange={e => setUserRoleFilter(e.target.value)}
                  className="bg-transparent border-0 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">جميع الأدوار ({usersList.length})</option>
                  <option value="SUPER_ADMIN">المالك / مدير عام</option>
                  <option value="COMPANY_MANAGER">مدير الشركة</option>
                  <option value="OPERATIONS">مدير العمليات</option>
                  <option value="ACCOUNTANT">محاسب مالي</option>
                  <option value="CASHIER">أمين الصندوق</option>
                  <option value="AUDITOR">مدقق حسابات</option>
                  <option value="VIEWER">مستعرض اطلاع</option>
                </select>
              </div>

              {/* Stats Counters */}
              <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {usersList.filter(u => u.active).length} نشط
                </span>
                {usersList.some(u => !u.active) && (
                  <span className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    {usersList.filter(u => !u.active).length} معطل
                  </span>
                )}
              </div>
            </div>

            {/* Add User Button */}
            <button
              type="button"
              onClick={() => {
                setNewFullName('');
                setNewUsername('');
                setNewPhone('');
                setNewRole('OPERATIONS');
                setNewTempPass(generateTemporaryPassword());
                setForceFirstChange(true);
                setShowAddUserModal(true);
              }}
              className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs">
                لا يوجد موظفون يطابقون خيارات البحث المحددة.
              </div>
            ) : (
              filteredUsers.map(user => {
                const perms = user.permissions || getDefaultPermissions(user.role);
                const activeCount = Object.values(perms).filter(Boolean).length;
                const isSuperAdmin = user.role === 'SUPER_ADMIN';

                return (
                  <div
                    key={user.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl border p-4 shadow-xs transition hover:shadow-md flex flex-col justify-between gap-3 ${
                      !user.active
                        ? 'border-slate-300 dark:border-slate-700 opacity-70 bg-slate-50/50 dark:bg-slate-900/50'
                        : isSuperAdmin
                        ? 'border-amber-400/60 dark:border-amber-500/40'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {/* User Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                            isSuperAdmin
                              ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black'
                              : user.role === 'OPERATIONS'
                              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                              : user.role === 'ACCOUNTANT'
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                              : user.role === 'CASHIER'
                              ? 'bg-gradient-to-tr from-purple-600 to-fuchsia-600'
                              : 'bg-gradient-to-tr from-slate-600 to-slate-800'
                          }`}>
                            {isSuperAdmin ? (
                              <Crown className="w-5 h-5 fill-current" />
                            ) : (
                              <span>{(user.fullName || user.username).charAt(0).toUpperCase()}</span>
                            )}
                            {user.active ? (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
                            ) : (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="text-right">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {user.fullName || user.username}
                              </span>
                              {isSuperAdmin && (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-bold border border-amber-300 dark:border-amber-700">
                                  مالك النظام
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <span>@{user.username}</span>
                              {user.phone && <span>• {user.phone}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          user.active
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        }`}>
                          {user.active ? 'نشط' : 'معطل'}
                        </span>
                      </div>

                      {/* Role & Permissions Level Summary */}
                      <div className="mt-3.5 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">الدور المعتمد:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {user.role === 'SUPER_ADMIN' ? 'المالك / مدير عام' :
                             user.role === 'COMPANY_MANAGER' ? 'مدير الشركة' :
                             user.role === 'OPERATIONS' ? 'مدير العمليات' :
                             user.role === 'ACCOUNTANT' ? 'المحاسب المالي' :
                             user.role === 'CASHIER' ? 'أمين الصندوق' :
                             user.role === 'AUDITOR' ? 'مدقق الحسابات' : 'مستعرض اطلاع'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">مستوى الصلاحيات:</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded-md text-[11px]">
                            {activeCount} من 15 صلاحية مفعلة
                          </span>
                        </div>

                        {/* Micro Progress Bar of Permissions */}
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all"
                            style={{ width: `${(activeCount / 15) * 100}%` }}
                          />
                        </div>

                        {user.mustChangePassword && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-md flex items-center gap-1">
                            <Key className="w-3 h-3 shrink-0" />
                            <span>كلمة مرور مؤقتة — يلزم التغيير عند الدخول</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                      {/* Edit Granular Permissions */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditPermissions(user)}
                        className="col-span-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        title="تخصيص مصفوفة الصلاحيات الـ 15"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                        <span>تخصيص مصفوفة الصلاحيات</span>
                      </button>

                      {/* Reset Temporary Password */}
                      <button
                        type="button"
                        onClick={() => handleResetUserPassword(user)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                        title="توليد كلمة مرور مؤقتة جديدة"
                      >
                        <Key className="w-3 h-3 text-amber-500" />
                        <span>إعادة تعيين المرور</span>
                      </button>

                      {/* Toggle Active / Deactivate */}
                      <button
                        type="button"
                        onClick={() => handleToggleUserActive(user)}
                        disabled={isSuperAdmin && user.active}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 text-[11px] ${
                          isSuperAdmin && user.active
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-700 text-slate-400'
                            : user.active
                            ? 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 cursor-pointer'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 cursor-pointer'
                        }`}
                      >
                        {user.active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      </button>

                      {/* Delete User */}
                      {!isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="col-span-2 px-2.5 py-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف حساب الموظف نهائياً</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SubTab 1: Employees Timeline */}
      {activeSubTab === 'TIMELINE' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Employee selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={employeeFilter}
                  onChange={e => setEmployeeFilter(e.target.value)}
                  className="bg-transparent border-0 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">جميع الموظفين</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-transparent border-0 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">جميع أنواع العمليات</option>
                  <option value="TRIP">رحلات وتشغيل</option>
                  <option value="FINANCIAL">مالية وسندات ومصروفات</option>
                  <option value="USERS">إدارة مستخدمين</option>
                </select>
              </div>

              {/* Date Filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />

              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-xs text-orange-600 hover:underline cursor-pointer"
                >
                  مسح التاريخ
                </button>
              )}
            </div>

            {/* Search Input & Excel */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="بحث في التفاصيل أو المعرف..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 pl-8 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <button
                type="button"
                onClick={handleExportAuditExcel}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                title="تصدير السجل إلى Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Timeline Feed Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <tr>
                    <th className="p-3">الوقت والتاريخ</th>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3">الدور</th>
                    <th className="p-3">نوع العملية</th>
                    <th className="p-3">السجل المستهدف</th>
                    <th className="p-3">تفاصيل التعديل أو العملية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        لا توجد سجلات تطابق الفلترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.slice(0, 100).map(log => {
                      const isCreate = log.action.includes('CREATE');
                      const isDelete = log.action.includes('DELETE');
                      const isApprove = log.action.includes('APPROVE');
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition">
                          <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {log.userName}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {log.userRole}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span 
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isApprove
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                  : isCreate
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : isDelete
                                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {log.entityType} ({log.entityId})
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredLogs.length > 100 && (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                يتم عرض أحدث 100 عملية من أصل {filteredLogs.length}. استخدم الفلترة أو التصدير للاطلاع على الأقدم.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Pending Approvals */}
      {activeSubTab === 'PENDING' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                العمليات التالية أنشأها الموظفون وتحتاج إلى اعتماد المدير المالي أو مدير النظام لتأكيد الترحيل النهائي وتجميد القيود.
              </span>
            </div>
            <span className="font-bold">{totalPendingCount} عملية معلقة</span>
          </div>

          {/* Pending Trips */}
          {pendingTrips.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>رحلات بانتظار الاعتماد ({pendingTrips.length})</span>
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {pendingTrips.map(trip => (
                  <div key={trip.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        رحلة رقم: {trip.tripNumber} — العميل: {trip.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        المبلغ: {trip.totalAmount} {settings.currency} | السائق: {trip.driverName} | أنشأها: {trip.createdByName || 'موظف العمليات'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onNavigateToTrip && (
                        <button
                          type="button"
                          onClick={() => onNavigateToTrip(trip)}
                          className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition cursor-pointer"
                        >
                          معاينة
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleApproveTrip(trip.id)}
                        className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اعتماد الرحلة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Collections */}
          {pendingCollections.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                سندات قبض بانتظار الاعتماد ({pendingCollections.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {pendingCollections.map(col => (
                  <div key={col.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        سند قبض: {col.customerName} — المبلغ: {col.amount} {settings.currency}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        المرجع: {col.referenceNumber || 'بدون'} | طريقة الدفع: {col.paymentMethod} | بواسطة: {col.createdByName || 'أمين الصندوق'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApproveFinancial('COLLECTION', col.id)}
                      className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>اعتماد السند</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Expenses */}
          {pendingExpenses.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                مصروفات تشغيلية بانتظار الاعتماد ({pendingExpenses.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {pendingExpenses.map(exp => (
                  <div key={exp.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        بند: {exp.category} — المبلغ: {exp.amount} {settings.currency}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        البيان: {exp.description} | المستفيد: {exp.recipient || '-'} | أنشأها: {exp.createdByName || 'موظف العمليات'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApproveFinancial('EXPENSE', exp.id)}
                      className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>اعتماد الصرف</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalPendingCount === 0 && (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                جميع العمليات والرحلات المالية معتمدة ومطابقة!
              </p>
              <p className="text-xs text-slate-400 mt-1">لا توجد عمليات معلقة تتطلب موافقة حالية.</p>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Sync & Devices Monitor */}
      {activeSubTab === 'SYNC' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold flex items-center gap-2 text-white">
              <Database className="w-4 h-4 text-orange-400" />
              <span>ميثاق سيادة وأمان بيانات الشركة (Enterprise Data Sovereignty)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              وفق أعلى معايير الخصوصية الرقمية لمؤسسة إيجاز، تبقى كافة البيانات التراكمية وسجلات الرحلات والعملاء والمالية تحت السيادة الحصرية لإدارة الشركة. لا يتم توجيه أي بيانات لخوادم المطور، ويتحكم مدير النظام في استضافة المزامنة سواء عبر خادم المؤسسة الخاص، أو الشبكة المحلية اللاسلكية، أو حزم المزامنة المشفرة.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs font-mono text-slate-300">
              <div>معرف هذا الجهاز: <span className="text-orange-400">{SyncEngine.getDeviceId()}</span></div>
              <div>اسم المحطة: <span className="text-blue-400">{SyncEngine.getDeviceName()}</span></div>
            </div>
          </div>

          {/* Outbox Items List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                قائمة انتظار المزامنة المحلية (Sync Outbox - {outboxItems.length} عنصر)
              </h4>
              <button
                type="button"
                onClick={() => SyncEngine.purgeSyncedItems()}
                className="text-xs text-slate-500 hover:text-orange-600 underline cursor-pointer"
              >
                تنظيف السجلات المرحّلة بنجاح
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {outboxItems.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  قائمة الانتظار فارغة. كافة التعديلات مرحّلة ومزامنة تمامًا.
                </div>
              ) : (
                outboxItems.map(item => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        [{item.action}] {item.entityType} ({item.entityId})
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        بواسطة: {item.authorName} | التاريخ: {item.timestamp} | البصمة: {item.checksum}
                      </div>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'SYNCED'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : item.status === 'FAILED'
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {item.status === 'SYNCED' ? 'تمت المزامنة' : item.status === 'FAILED' ? 'فشلت المزامنة' : 'قيد الانتظار'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SubTab 4: Immutable Audit Trail */}
      {activeSubTab === 'AUDIT' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-orange-500" />
                <span>سجل التدقيق الأمني المحمي غير القابل للحذف</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سجل نظامي مشفر يرصد كافة تسجيلات الدخول والعمليات الحساسة لمنع التلاعب وتثبيت المسؤوليات.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAuditExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>تصدير السجل الكامل</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="p-2.5">الوقت</th>
                  <th className="p-2.5">الموظف</th>
                  <th className="p-2.5">الرتبة</th>
                  <th className="p-2.5">الإجراء</th>
                  <th className="p-2.5">البيان والتفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {auditLogs.slice(0, 150).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-[11px] text-orange-600 dark:text-orange-400 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Import Bundle */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-orange-500" />
                <span>استيراد حزمة مزامنة مشفرة من جهاز موظف</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ألصق نص حزمة المزامنة المستخرجة من هاتف الموظف (أو افتح ملف .ejaz) لدمج العمليات مع قاعدة البيانات المركزية دون تعارض:
            </p>

            <textarea
              rows={6}
              value={importBundleText}
              onChange={e => setImportBundleText(e.target.value)}
              placeholder="ألصق كود حزمة المزامنة هنا..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleProcessImportBundle}
                disabled={!importBundleText.trim()}
                className="px-5 py-2 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                تأكيد دمج السجلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Edit Permissions Matrix and User Account */}
      {editingUserForPermissions && editPermissionsForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 rounded-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>تخصيص مصفوفة الصلاحيات والحساب</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-mono">
                      @{editingUserForPermissions.username}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    التحكم الدقيق بـ 15 مستوى صلاحية تشغيلية ومحاسبية وإدارية للموظف: {editingUserForPermissions.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUserForPermissions(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-right" dir="rtl">
              {/* Basic Info Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    الاسم الكامل للموظف
                  </label>
                  <input
                    type="text"
                    value={editUserFullName}
                    onChange={e => setEditUserFullName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    رقم الهاتف والتواصل
                  </label>
                  <input
                    type="text"
                    value={editUserPhone}
                    onChange={e => setEditUserPhone(e.target.value)}
                    placeholder="77XXXXXXX"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    الدور المعتمد
                  </label>
                  <select
                    value={editUserRole}
                    onChange={e => setEditUserRole(e.target.value as UserRole)}
                    disabled={editingUserForPermissions.role === 'SUPER_ADMIN'}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="SUPER_ADMIN">المالك / مدير عام</option>
                    <option value="COMPANY_MANAGER">مدير الشركة</option>
                    <option value="OPERATIONS">مدير العمليات</option>
                    <option value="ACCOUNTANT">محاسب مالي</option>
                    <option value="CASHIER">أمين الصندوق</option>
                    <option value="AUDITOR">مدقق حسابات</option>
                    <option value="VIEWER">مستعرض اطلاع</option>
                  </select>
                </div>
              </div>

              {/* Presets and Bulk Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">إجراءات سريعة:</span>
                  <button
                    type="button"
                    onClick={handleGrantAllPermissions}
                    className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>منح الكل (15)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToRoleDefaults}
                    className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>افتراضي الدور</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeAllPermissions}
                    className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>إلغاء الكل (0)</span>
                  </button>
                </div>

                <div className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-lg border border-orange-200 dark:border-orange-800">
                  {Object.values(editPermissionsForm).filter(Boolean).length} من أصل 15 صلاحية مفعلة
                </div>
              </div>

              {/* Categorized Permissions Grid */}
              {(['عام', 'العمليات', 'الأسطول', 'المالية', 'الرقابة', 'التقارير', 'الإدارة'] as const).map(categoryName => {
                const groupItems = PERMISSION_DEFINITIONS.filter(p => p.category === categoryName);
                if (groupItems.length === 0) return null;

                return (
                  <div key={categoryName} className="space-y-2.5">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                      <Layers className="w-4 h-4 text-orange-500" />
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {categoryName === 'عام' ? 'لوحة المعلومات والمؤشرات العامة' :
                         categoryName === 'العمليات' ? 'إدارة العمليات والرحلات والعملاء' :
                         categoryName === 'الأسطول' ? 'إدارة الأسطول والشاحنات والسائقين والصيانة' :
                         categoryName === 'المالية' ? 'الإدارة المالية، السندات، وإقفال الصندوق' :
                         categoryName === 'الرقابة' ? 'الرقابة، الاعتمادات، والمزامنة المركزية' :
                         categoryName === 'التقارير' ? 'التقارير واستخراج وطباعة البيانات' : 'إدارة النظام والأمان والنسخ الاحتياطي'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {groupItems.map(item => {
                        const isGranted = Boolean(editPermissionsForm[item.key]);

                        return (
                          <div
                            key={item.key}
                            onClick={() => handleTogglePermission(item.key)}
                            className={`p-3 rounded-xl border transition cursor-pointer select-none flex items-start gap-3 ${
                              isGranted
                                ? 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/80 shadow-2xs'
                                : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              <input
                                type="checkbox"
                                checked={isGranted}
                                onChange={() => handleTogglePermission(item.key)}
                                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                              />
                            </div>
                            <div className="space-y-0.5 text-right flex-1">
                              <div className={`text-xs font-bold leading-tight ${
                                isGranted ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                              }`}>
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {item.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingUserForPermissions(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveUserPermissions}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ مصفوفة الصلاحيات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add New User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">إضافة موظف ومستخدم جديد</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">إنشاء حساب نظام وتعيين الدور والصلاحيات الفورية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل للموظف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="مثال: م. أحمد صالح العمري"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المستخدم للدخول <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="ahmed"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المسمى الوظيفي والدور <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="OPERATIONS">مدير العمليات والتشغيل</option>
                    <option value="ACCOUNTANT">المحاسب المالي</option>
                    <option value="CASHIER">أمين الصندوق والتحصيل</option>
                    <option value="AUDITOR">المراجع والمدقق</option>
                    <option value="COMPANY_MANAGER">مدير الشركة</option>
                    <option value="VIEWER">مستعرض اطلاع فقط</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف (للتواصل وإرسال البيانات)
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="77XXXXXXX"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    كلمة المرور المؤقتة المقترحة
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewTempPass(generateTemporaryPassword())}
                      className="text-[10px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>توليد أخرى</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(newTempPass)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedPassText === newTempPass ? 'تم النسخ!' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={newTempPass}
                  onChange={e => setNewTempPass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-orange-600 dark:text-orange-400 focus:outline-none focus:border-orange-500 text-left"
                  dir="ltr"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="forceChangeCheck"
                  checked={forceFirstChange}
                  onChange={e => setForceFirstChange(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
                <label htmlFor="forceChangeCheck" className="text-xs text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  إلزام الموظف بتغيير كلمة المرور الشخصية فور تسجيل دخوله الأول
                </label>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60">
                ملاحظة: سيتم منح هذا الحساب حزمة الصلاحيات الافتراضية الموصى بها للدور المختار، ويمكنك تخصيص وتعديل أي من الصلاحيات الـ 15 لاحقاً بكل سهولة.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>تأكيد إنشاء الحساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
