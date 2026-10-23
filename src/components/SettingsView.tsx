/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  History, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  Save,
  FileSpreadsheet,
  FolderArchive,
  Wifi,
  Smartphone,
  HardDrive,
  Database,
  Infinity as InfinityIcon,
  RefreshCw,
  Lock,
  Sparkles,
  Layers,
  Server,
  Zap,
  Gauge,
  Check,
  X,
  Clock,
  Loader2,
  FileText,
  Code2,
  PhoneCall,
  MessageSquare,
  Copy,
  Info,
  Edit2,
  KeyRound,
  Search,
  Filter,
  CheckSquare,
  Square,
  UserPlus,
  Sliders,
  Send,
  Eye,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { CompanySettings, AuditLog, User, UserRole, UserPermissions } from '../types';
import { StorageService, getDefaultPermissions } from '../services/storage';
import { SYSTEM_INFO } from '../constants/systemInfo';
import { downloadFullProjectZip } from '../utils/zipExporter';
import { generateTemporaryPassword } from '../services/security';
import { ApiClient } from '../services/apiClient';

export interface PermissionCategory {
  id: string;
  name: string;
  badgeColor: string;
  items: {
    key: keyof UserPermissions;
    label: string;
    desc: string;
  }[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'system',
    name: 'النظام والتحكم الإداري',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200',
    items: [
      { key: 'canViewDashboard', label: 'لوحة التحكم والمؤشرات', desc: 'الاطلاع على الإحصائيات العامة ومؤشرات الأداء التشغيلي والمالي' },
      { key: 'canManageSettings', label: 'إعدادات المؤسسة والضرائب', desc: 'تعديل السجل التجاري، الرقم الضريبي، الهوية، ونسب الضرائب' },
      { key: 'canManageUsers', label: 'إدارة حسابات الموظفين', desc: 'إنشاء وتعديل حسابات المستخدمين وإصدار كلمات المرور المؤقتة' },
      { key: 'canBackupRestore', label: 'النسخ الاحتياطي وإدارة البيانات', desc: 'تصدير واستيراد قواعد البيانات وإجراء النسخ الاحتياطي الدوري' },
      { key: 'canAccessSyncMonitor', label: 'مراقبة المزامنة وسجل الأمان', desc: 'متابعة سجل المزامنة اللحظية والاتصال السحابي وسجل التدقيق' },
    ]
  },
  {
    id: 'operations',
    name: 'العمليات والتشغيل والأسطول',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200',
    items: [
      { key: 'canManageTrips', label: 'إدارة الرحلات وبوالص الشحن', desc: 'إنشاء الرحلات وتحديث حالتها، بوالص الشحن، ومسارات السير' },
      { key: 'canManageCustomers', label: 'سجلات وبيانات العملاء', desc: 'إضافة العملاء، تعديل بيانات الاتصال، والأرقام الضريبية' },
      { key: 'canManageDrivers', label: 'إدارة السائقين والعهد', desc: 'تسجيل السائقين، رخص القيادة، الإقامات، والعهد المالية' },
      { key: 'canManageTrucks', label: 'إدارة الشاحنات والأسطول', desc: 'إدارة الشاحنات، اللوحات، كروت التشغيل، والفحص الدوري' },
      { key: 'canManageMaintenance', label: 'إدارة أوامر وفواتير الصيانة', desc: 'تسجيل أعمال الصيانة، الورش، قطع الغيار، ومصروفات الإصلاح' },
      { key: 'canApproveOperations', label: 'اعتماد العمليات التشغيلية', desc: 'الموافقة على تصفية الرحلات، إغلاق البوالص، والعمليات الحساسة' },
    ]
  },
  {
    id: 'financials',
    name: 'الإدارة المالية والخزينة',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200',
    items: [
      { key: 'canManageFinancials', label: 'السندات والحركات المالية', desc: 'إصدار سندات القبض والصرف، تسجيل المصروفات ومراجعة أرصدة الرحلات' },
      { key: 'canCloseCashbox', label: 'إقفال الصندوق النقدية', desc: 'تنفيذ الإقفال اليومي للصناديق النقدية ومطابقة النقدية الفعلية' },
    ]
  },
  {
    id: 'reports',
    name: 'التقارير والمخرجات',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200',
    items: [
      { key: 'canViewReports', label: 'استعراض التقارير التحليلية', desc: 'عرض كشوفات الحساب، تقارير الأرباح، موازين المراجعة، وتقارير الشاحنات' },
      { key: 'canExportReports', label: 'تصدير وطباعة التقارير', desc: 'تصدير التقارير إلى Excel و PDF وطباعة كشوف الحساب والمستندات' },
    ]
  }
];

export const ROLES_METADATA: {
  role: UserRole;
  title: string;
  typeBadge: string;
  badgeClass: string;
  desc: string;
}[] = [
  { 
    role: 'SUPER_ADMIN', 
    title: 'المالك / مدير النظام', 
    typeBadge: 'صلاحية شاملة',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800', 
    desc: 'إدارة المستخدمين، الأدوار، الصلاحيات، الإعدادات، بيانات الشركة، النسخ الاحتياطية وسجل المراقبة الشامل.' 
  },
  { 
    role: 'COMPANY_MANAGER', 
    title: 'مدير الشركة', 
    typeBadge: 'إداري تنفيذي',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800', 
    desc: 'متابعة العمليات والعملاء والأسطول، التقارير الإدارية، واعتماد العمليات الحساسة دون الوصول لإدارة المستخدمين.' 
  },
  { 
    role: 'OPERATIONS', 
    title: 'مدير العمليات', 
    typeBadge: 'تشغيلي',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800', 
    desc: 'الرحلات وإصدار البوالص، العملاء، السائقون كسجلات تشغيلية، الشاحنات والصيانة ومتابعة خطوط السير.' 
  },
  { 
    role: 'ACCOUNTANT', 
    title: 'المحاسب المالي', 
    typeBadge: 'مالي ومحاسبي',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800', 
    desc: 'متابعة التحصيلات والمصروفات وأرصدة الرحلات وكشوف الحساب والتقارير المالية التشغيلية.' 
  },
  { 
    role: 'CASHIER', 
    title: 'أمين الصندوق', 
    typeBadge: 'خزينة ونقدية',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800', 
    desc: 'سندات القبض والصرف، استلام وتسليم النقدية، حركات الصندوق اليومية ومحاضر إقفال الصندوق.' 
  },
  { 
    role: 'AUDITOR', 
    title: 'المراجع والمدقق', 
    typeBadge: 'رقابة وتدقيق',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800', 
    desc: 'الاطلاع والمراجعة والتدقيق على كافة السجلات والعمليات دون إمكانية التعديل أو الحذف المباشر.' 
  },
  { 
    role: 'VIEWER', 
    title: 'مستعرض', 
    typeBadge: 'اطلاع فقط',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700', 
    desc: 'الاطلاع على لوحة المؤشرات ومتابعة الحالة العامة فقط دون أي صلاحيات تعديل.' 
  },
];

interface SettingsViewProps {
  settings: CompanySettings;
  auditLogs: AuditLog[];
  currentUser: User;
  onRefresh: () => void;
  onOpenAbout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  auditLogs,
  currentUser,
  onRefresh,
  onOpenAbout,
}) => {
  const [centralServerUrl, setCentralServerUrl] = useState(() => ApiClient.getBaseUrl());
  const [centralServerStatus, setCentralServerStatus] = useState<'UNKNOWN' | 'CHECKING' | 'CONNECTED' | 'OFFLINE'>('UNKNOWN');
  const [centralServerMessage, setCentralServerMessage] = useState('');
  const [centralSetupKey, setCentralSetupKey] = useState('');
  const [centralOwnerPassword, setCentralOwnerPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'ROLES' | 'AUDIT' | 'BACKUP' | 'CENTRAL_SERVER' | 'SYSTEM_INFO'>('COMPANY');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [storageDiagnostics, setStorageDiagnostics] = useState<{
    supported: boolean;
    isPersistent: boolean;
    usageFormatted: string;
    quotaFormatted: string;
    usagePercent: number;
    isUnlimited: boolean;
    usageOf1TBPercent?: number;
    remaining1TBFormatted?: string;
    tierLabel?: string;
    tripsCapacityEstimate?: string;
    blobsCount?: number;
    tripsCount: number;
    driversCount: number;
    trucksCount: number;
    customersCount: number;
    logsCount: number;
    collectionsCount: number;
    expensesCount: number;
  } | null>(null);
  const [isVerifyingStorage, setIsVerifyingStorage] = useState(false);
  const [storageMsg, setStorageMsg] = useState<string | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    success: boolean;
    writeSpeedMs: number;
    persisted: boolean;
    message: string;
  } | null>(null);

  // Turbo Import Engine States (Ultra-Fast Responsiveness)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');
  const [importStats, setImportStats] = useState<{
    durationMs: number;
    trips: number;
    drivers: number;
    trucks: number;
    customers: number;
    collections: number;
    expenses: number;
    totalRecords: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // User Management & Roles State
  const [usersList, setUsersList] = useState<User[]>(() => StorageService.getUsers());
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [rolesViewMode, setRolesViewMode] = useState<'USERS' | 'MATRIX'>('USERS');

  // New user form state
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('OPERATIONS');
  const [newPhone, setNewPhone] = useState('');
  const [newTempPass, setNewTempPass] = useState(() => generateTemporaryPassword());
  const [forceFirstChange, setForceFirstChange] = useState(true);
  const [customizingNewPerms, setCustomizingNewPerms] = useState(false);
  const [newPermissions, setNewPermissions] = useState<UserPermissions>(() => getDefaultPermissions('OPERATIONS'));

  // Edit user & granular permissions state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('OPERATIONS');
  const [editPhone, setEditPhone] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(() => getDefaultPermissions('OPERATIONS'));
  const [editMustChangePass, setEditMustChangePass] = useState(false);

  // Reset password modal state
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [activeTempPassword, setActiveTempPassword] = useState('');
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Notifications & alerts
  const [tempPassAlert, setTempPassAlert] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  const refreshUsers = () => {
    setUsersList(StorageService.getUsers());
  };

  const handleRoleChangeForNew = (role: UserRole) => {
    setNewRole(role);
    if (!customizingNewPerms) {
      setNewPermissions(getDefaultPermissions(role));
    }
  };

  const handleToggleNewPermission = (key: keyof UserPermissions) => {
    setNewPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSetAllNewPermissions = (enabled: boolean) => {
    const updated = { ...newPermissions };
    (Object.keys(updated) as (keyof UserPermissions)[]).forEach(k => {
      updated[k] = enabled;
    });
    setNewPermissions(updated);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);

    if (!newFullName.trim() || !newUsername.trim()) {
      setUserActionError('يرجى ملء الاسم واسم المستخدم.');
      return;
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    const existing = StorageService.getUsers();
    if (existing.some(u => u.username.toLowerCase() === cleanUsername)) {
      setUserActionError('اسم المستخدم موجود بالفعل. يرجى اختيار اسم مستخدم آخر.');
      return;
    }

    const effectivePermissions = customizingNewPerms 
      ? newPermissions 
      : getDefaultPermissions(newRole);

    const newUser: User = {
      id: 'usr_' + Date.now().toString(36),
      fullName: newFullName.trim(),
      username: cleanUsername,
      role: newRole,
      phone: newPhone.trim(),
      active: true,
      password: newTempPass,
      mustChangePassword: forceFirstChange,
      permissions: effectivePermissions,
      createdAt: new Date().toISOString(),
    };

    try {
      StorageService.saveUser(newUser, currentUser);
      refreshUsers();
      setShowAddUserModal(false);
      setUserActionSuccess(`تم إنشاء حساب للموظف ${newUser.fullName} بنجاح. كلمة المرور المؤقتة هي: [ ${newTempPass} ]`);
      setTimeout(() => setUserActionSuccess(null), 6000);
      setNewFullName('');
      setNewUsername('');
      setNewPhone('');
      setNewTempPass(generateTemporaryPassword());
      setCustomizingNewPerms(false);
      setNewPermissions(getDefaultPermissions('OPERATIONS'));
    } catch (err: any) {
      setUserActionError(err?.message || 'حدث خطأ أثناء إنشاء الحساب.');
    }
  };

  const handleOpenEditUser = (user: User) => {
    setUserActionError(null);
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditPhone(user.phone || '');
    setEditActive(user.active);
    setEditMustChangePass(!!user.mustChangePassword);

    const baseDefaults = getDefaultPermissions(user.role);
    const existingPerms = user.permissions || {};
    const fullPerms = { ...baseDefaults, ...existingPerms };
    setEditPermissions(fullPerms);
  };

  const handleToggleEditPermission = (key: keyof UserPermissions) => {
    setEditPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleApplyRoleDefaultsToEdit = () => {
    setEditPermissions(getDefaultPermissions(editRole));
  };

  const handleSetAllEditPermissions = (enabled: boolean) => {
    const updated = { ...editPermissions };
    (Object.keys(updated) as (keyof UserPermissions)[]).forEach(k => {
      updated[k] = enabled;
    });
    setEditPermissions(updated);
  };

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserActionError(null);

    if (!editFullName.trim()) {
      setUserActionError('يرجى كتابة الاسم الكامل للموظف.');
      return;
    }

    if (editingUser.role === 'SUPER_ADMIN' && !editActive) {
      const activeSuperAdmins = usersList.filter(u => u.id !== editingUser.id && u.role === 'SUPER_ADMIN' && u.active);
      if (activeSuperAdmins.length === 0) {
        setUserActionError('لا يمكن تعطيل آخر حساب لمدير النظام / المالك.');
        return;
      }
    }

    const updated: User = {
      ...editingUser,
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      role: editRole,
      active: editActive,
      mustChangePassword: editMustChangePass,
      permissions: editPermissions,
    };

    try {
      StorageService.saveUser(updated, currentUser);
      refreshUsers();
      setEditingUser(null);
      setUserActionSuccess(`تم حفظ وتحديث بيانات وصلاحيات الموظف (${updated.fullName}) بنجاح.`);
      setTimeout(() => setUserActionSuccess(null), 4000);
    } catch (err: any) {
      setUserActionError(err?.message || 'فشل حفظ التعديلات.');
    }
  };

  const handleToggleUserActive = (user: User) => {
    setUserActionError(null);
    if (user.role === 'SUPER_ADMIN' && user.active) {
      const activeSuperAdmins = usersList.filter(u => u.id !== user.id && u.role === 'SUPER_ADMIN' && u.active);
      if (activeSuperAdmins.length === 0) {
        setUserActionError('لا يمكن تعطيل آخر حساب لمدير النظام.');
        return;
      }
    }
    const updated = { ...user, active: !user.active };
    StorageService.saveUser(updated, currentUser);
    refreshUsers();
    setUserActionSuccess(`تم ${updated.active ? 'تفعيل' : 'تعطيل'} حساب الموظف (${user.fullName}) بنجاح.`);
    setTimeout(() => setUserActionSuccess(null), 3000);
  };

  const handleDeleteUser = (user: User) => {
    setUserActionError(null);
    if (!confirm(`هل أنت متأكد من حذف حساب المستخدم "${user.fullName}" نهائياً؟`)) return;

    try {
      StorageService.deleteUser(user.id, currentUser);
      refreshUsers();
      setUserActionSuccess(`تم حذف حساب الموظف (${user.fullName}) نهائياً.`);
      setTimeout(() => setUserActionSuccess(null), 3000);
    } catch (err: any) {
      setUserActionError(err?.message || 'حدث خطأ أثناء حذف المستخدم.');
    }
  };

  const handleOpenResetModal = (user: User) => {
    const tempPass = generateTemporaryPassword();
    setResetModalUser(user);
    setActiveTempPassword(tempPass);
    setCopiedCredentials(false);
  };

  const handleConfirmPasswordReset = () => {
    if (!resetModalUser) return;
    try {
      StorageService.resetUserPassword(resetModalUser.id, activeTempPassword, currentUser);
      refreshUsers();
      const userName = resetModalUser.fullName;
      const pass = activeTempPassword;
      setResetModalUser(null);
      setUserActionSuccess(`تمت إعادة تعيين كلمة مرور الموظف ${userName} إلى [ ${pass} ]. سيلتزم بتغييرها فور تسجيل الدخول.`);
      setTimeout(() => setUserActionSuccess(null), 6000);
    } catch (err: any) {
      setUserActionError(err?.message || 'فشل إعادة تعيين كلمة المرور.');
    }
  };

  const handleCopyCredentials = (user: User, pass: string) => {
    const message = `نظام إيجاز للنقليات واللوجستيات
بيانات الدخول لحساب الموظف: ${user.fullName}
اسم المستخدم: ${user.username}
كلمة المرور المؤقتة: ${pass}
(ملاحظة: سيُطلب منك إنشاء كلمة مرور سرية خاصة بك عند أول تسجيل دخول)`;

    navigator.clipboard.writeText(message);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  const handleShareViaWhatsApp = (phone: string, user: User, pass: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `نظام إيجاز للنقليات واللوجستيات
بيانات الدخول لحساب الموظف: ${user.fullName}
اسم المستخدم: ${user.username}
كلمة المرور المؤقتة: ${pass}
(ملاحظة: سيُطلب منك إنشاء كلمة مرور سرية خاصة بك عند أول تسجيل دخول)`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const getActivePermissionsCount = (user: User): number => {
    const perms = { ...getDefaultPermissions(user.role), ...(user.permissions || {}) };
    return Object.values(perms).filter(Boolean).length;
  };

  const handleRequestPersistence = async () => {
    setIsVerifyingStorage(true);
    const granted = await StorageService.requestPersistentStorage();
    const updated = await StorageService.getStorageDiagnostics();
    setStorageDiagnostics(updated);
    setIsVerifyingStorage(false);
    setStorageMsg(granted ? 'تم طلب تفعيل التخزين الدائم؛ السعة الفعلية حسب الجهاز والمتصفح.' : 'التخزين المحلي متاح؛ قد يرفض المتصفح طلب الحفظ الدائم.');
    setTimeout(() => setStorageMsg(null), 4000);
  };

  const handleSyncAndVerify = async () => {
    setIsVerifyingStorage(true);
    await StorageService.hydrateFromUnlimitedStorage();
    const updated = await StorageService.getStorageDiagnostics();
    setStorageDiagnostics(updated);
    setIsVerifyingStorage(false);
    setStorageMsg('تم فحص التخزين المحلي؛ لم يتم إثبات اتصال قاعدة بيانات مركزية.');
    setTimeout(() => setStorageMsg(null), 4000);
    onRefresh();
  };

  const handleBenchmark1TB = async () => {
    setIsVerifyingStorage(true);
    const res = await StorageService.verify1TBCapacity();
    setBenchmarkResult(res);
    const updated = await StorageService.getStorageDiagnostics();
    setStorageDiagnostics(updated);
    setIsVerifyingStorage(false);
  };

  const [formData, setFormData] = useState<CompanySettings>({
    ...settings,
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(formData, currentUser);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    onRefresh();
  };

  const [isExportingProjectZip, setIsExportingProjectZip] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleDownloadProjectZip = async () => {
    setIsExportingProjectZip(true);
    try {
      await downloadFullProjectZip();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (e) {
      console.error(e);
      setStorageMsg('حدث خطأ أثناء تحميل ملفات المشروع، يرجى المحاولة مجدداً');
      setTimeout(() => setStorageMsg(null), 4000);
    } finally {
      setIsExportingProjectZip(false);
    }
  };

  const handleExportBackup = () => {
    const dataStr = StorageService.exportBackupJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ejaz_transport_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    if (!file) return;
    setIsImporting(true);
    setImportProgress(10);
    setImportStage('قراءة وتحليل ملف البيانات بسرعة فائقة...');
    setImportStats(null);
    setImportError(null);
    setImportModalOpen(true);

    try {
      let content = '';
      if (typeof file.text === 'function') {
        content = await file.text();
      } else {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = () => reject(new Error('فشلت قراءة الملف'));
          reader.readAsText(file);
        });
      }

      const result = await StorageService.importFullBackupAsync(
        content,
        currentUser,
        (percent, stage) => {
          setImportProgress(percent);
          setImportStage(stage);
        }
      );

      if (result.success) {
        setImportStats({
          ...result.counts,
          durationMs: result.durationMs,
        });
        const updated = await StorageService.getStorageDiagnostics();
        setStorageDiagnostics(updated);
        onRefresh();
      } else {
        setImportError(result.error || 'فشل استيراد الملف. تأكد من أن الملف بصيغة JSON متوافقة مع نظام إيجاز.');
      }
    } catch (err: any) {
      setImportError(err?.message || 'حدث خطأ غير متوقع أثناء معالجة الملف.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFile(file);
      e.target.value = '';
    }
  };

  const handleExecuteResetData = () => {
    StorageService.resetToDefaults();
    onRefresh();
    setIsResetConfirmOpen(false);
    setStorageMsg('تمت إعادة ضبط بيانات النظام بنجاح إلى الحالة التجريبية المبدئية.');
    setTimeout(() => setStorageMsg(null), 4000);
  };

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN' || !!currentUser.permissions?.canManageUsers;

  return (
    <div id="ejaz-settings-view" className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F97316] rounded-full" />
            <h1 className="text-xl font-black text-slate-900">إعدادات المؤسسة والأمان وسجل التدقيق</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            بيانات الفوترة الضريبية، السجل التجاري، هيكل الصلاحيات والنسخ الاحتياطي للبيانات.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('COMPANY')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'COMPANY' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>بيانات المؤسسة والضرائب</span>
        </button>

        <button
          onClick={() => setActiveTab('ROLES')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'ROLES' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>الأدوار والصلاحيات</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'AUDIT' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل العمليات والرقابة ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BACKUP')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'BACKUP' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-orange-500" />
          <span>النسخ الاحتياطي والاستعادة</span>
        </button>

        <button
          onClick={() => setActiveTab('CENTRAL_SERVER')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'CENTRAL_SERVER' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Server className="w-4 h-4 text-orange-500" />
          <span>الخادم المركزي المحلي</span>
        </button>

        <button
          id="settings-tab-system-info-btn"
          onClick={() => setActiveTab('SYSTEM_INFO')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'SYSTEM_INFO' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4 text-orange-500" />
          <span>معلومات النظام وحقوق البرمجة</span>
        </button>
      </div>

      {/* 1. COMPANY SETTINGS */}
      {activeTab === 'COMPANY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl">
            {savedSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم حفظ إعدادات المؤسسة بنجاح.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المؤسسة التجاري الرسمي</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم السجل التجاري</label>
                <input
                  type="text"
                  value={formData.commercialRegister}
                  onChange={e => setFormData({ ...formData, commercialRegister: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي (15 رقم)</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نسبة ضريبة القيمة المضافة (%)</label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={e => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العملة الافتراضية</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم هاتف الإدارة</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العنوان الرئيسي ومقر العمليات</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            {isSuperAdmin && (
              <div className="pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ إعدادات المؤسسة</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 2. USERS & ROLES MANAGEMENT */}
      {activeTab === 'ROLES' && (() => {
        const filteredUsers = usersList.filter(u => {
          const term = userSearchTerm.trim().toLowerCase();
          const matchesSearch = !term || 
            u.fullName.toLowerCase().includes(term) ||
            u.username.toLowerCase().includes(term) ||
            (u.phone && u.phone.includes(term));

          const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;

          const matchesStatus = 
            userStatusFilter === 'ALL' ||
            (userStatusFilter === 'ACTIVE' && u.active) ||
            (userStatusFilter === 'INACTIVE' && !u.active);

          return matchesSearch && matchesRole && matchesStatus;
        });

        const activeCount = usersList.filter(u => u.active).length;
        const inactiveCount = usersList.filter(u => !u.active).length;

        return (
          <div className="space-y-6">
            {/* Action Alert Banner */}
            {userActionSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">{userActionSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUserActionSuccess(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {userActionError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="font-bold">{userActionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUserActionError(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header & Mode Switcher Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#F97316]" />
                    <span>إدارة الأدوار وهيكل الصلاحيات وحسابات الموظفين</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    التحكم الشامل في حسابات فريق العمل، تخصيص الصلاحيات الدقيقة لكل موظف، إصدار كلمات المرور المؤقتة، ومقارنة مصفوفة الأدوار.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setRolesViewMode('USERS')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        rolesViewMode === 'USERS'
                          ? 'bg-white dark:bg-slate-800 text-[#F97316] shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>حسابات الموظفين ({usersList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRolesViewMode('MATRIX')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        rolesViewMode === 'MATRIX'
                          ? 'bg-white dark:bg-slate-800 text-[#F97316] shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>مصفوفة مقارنة الصلاحيات</span>
                    </button>
                  </div>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUserModal(true);
                        setCustomizingNewPerms(false);
                        setNewPermissions(getDefaultPermissions(newRole));
                        setNewTempPass(generateTemporaryPassword());
                      }}
                      className="px-4 py-2 bg-[#F97316] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ إضافة موظف جديد</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">إجمالي الحسابات:</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{usersList.length}</span>
                </div>
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">الحسابات النشطة:</span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono">{activeCount}</span>
                </div>
                <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">الحسابات المعطلة:</span>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300 font-mono">{inactiveCount}</span>
                </div>
                <div className="bg-orange-50/60 dark:bg-orange-950/20 p-2.5 rounded-xl border border-orange-200/60 dark:border-orange-800/40 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-300">أدوار النظام:</span>
                  <span className="text-xs font-black text-orange-700 dark:text-orange-300 font-mono">7 أدوار معتمدة</span>
                </div>
              </div>
            </div>

            {/* TAB CONTENT: USERS LIST VIEW */}
            {rolesViewMode === 'USERS' && (
              <div className="space-y-4">
                {/* Search & Filter Toolbar */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Search Input */}
                    <div className="sm:col-span-5 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={userSearchTerm}
                        onChange={e => setUserSearchTerm(e.target.value)}
                        placeholder="بحث بالاسم، اسم المستخدم، أو رقم الجوال..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-8 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                      />
                      {userSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setUserSearchTerm('')}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Role Filter */}
                    <div className="sm:col-span-3">
                      <select
                        value={userRoleFilter}
                        onChange={e => setUserRoleFilter(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="ALL">جميع الأدوار الوظيفية ({usersList.length})</option>
                        {ROLES_METADATA.map(r => (
                          <option key={r.role} value={r.role}>
                            {r.title} ({usersList.filter(u => u.role === r.role).length})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="sm:col-span-2">
                      <select
                        value={userStatusFilter}
                        onChange={e => setUserStatusFilter(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="ALL">جميع الحالات</option>
                        <option value="ACTIVE">نشط فقط ({activeCount})</option>
                        <option value="INACTIVE">معطل فقط ({inactiveCount})</option>
                      </select>
                    </div>

                    {/* Reset Filter Button */}
                    <div className="sm:col-span-2 flex items-center justify-end">
                      {(userSearchTerm || userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUserSearchTerm('');
                            setUserRoleFilter('ALL');
                            setUserStatusFilter('ALL');
                          }}
                          className="w-full py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إعادة ضبط ({filteredUsers.length})</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold text-center w-full">
                          عرض {filteredUsers.length} من {usersList.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                        <tr>
                          <th className="p-3.5">الموظف / الحساب</th>
                          <th className="p-3.5">الدور الوظيفي</th>
                          <th className="p-3.5">رقم الجوال والتواصل</th>
                          <th className="p-3.5 text-center">الصلاحيات الممنوحة</th>
                          <th className="p-3.5 text-center">حالة الحساب</th>
                          <th className="p-3.5 text-center">إجراءات الإدارة والأمان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70 text-slate-800 dark:text-slate-200">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                <p className="font-bold">لا يوجد موظفون يطابقون معايير البحث أو التصفية المحددة.</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUserSearchTerm('');
                                    setUserRoleFilter('ALL');
                                    setUserStatusFilter('ALL');
                                  }}
                                  className="text-xs text-[#F97316] font-bold underline hover:text-orange-600 cursor-pointer mt-1"
                                >
                                  مسح الفلاتر وإظهار كافة الحسابات
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(u => {
                            const activePermsCount = getActivePermissionsCount(u);
                            const roleMeta = ROLES_METADATA.find(r => r.role === u.role);
                            const isCurrentUser = u.id === currentUser.id;

                            return (
                              <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                                {/* User Info */}
                                <td className="p-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-[#F97316] font-black text-sm flex items-center justify-center shrink-0 border border-orange-200 dark:border-orange-800">
                                      {u.fullName.charAt(0) || 'م'}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>{u.fullName}</span>
                                        {isCurrentUser && (
                                          <span className="px-1.5 py-0.2 text-[9.5px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                                            حسابك الحالي
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                          @{u.username}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(u.username);
                                            setUserActionSuccess(`تم نسخ اسم المستخدم (${u.username}) إلى الحافظة.`);
                                            setTimeout(() => setUserActionSuccess(null), 2000);
                                          }}
                                          title="نسخ اسم المستخدم"
                                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Role Badge */}
                                <td className="p-3.5">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${roleMeta?.badgeClass || 'bg-slate-100 text-slate-800'}`}>
                                    {roleMeta?.title || u.role}
                                  </span>
                                </td>

                                {/* Phone */}
                                <td className="p-3.5">
                                  {u.phone ? (
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 dir-ltr text-right">
                                        {u.phone}
                                      </span>
                                      <a
                                        href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="مراسلة عبر واتساب"
                                        className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded transition"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">-</span>
                                  )}
                                </td>

                                {/* Permissions count */}
                                <td className="p-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(u)}
                                    title="انقر لتعديل وتخصيص الصلاحيات"
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition cursor-pointer ${
                                      activePermsCount === 14
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                        : activePermsCount > 5
                                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                    }`}
                                  >
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>{activePermsCount} من 14 صلاحية</span>
                                  </button>
                                </td>

                                {/* Status */}
                                <td className="p-3.5 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    u.active 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                  }`}>
                                    {u.active ? 'نشط' : 'معطل'}
                                  </span>
                                </td>

                                {/* Action Buttons */}
                                <td className="p-3.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {isSuperAdmin && (
                                      <>
                                        {/* Edit User & Permissions */}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditUser(u)}
                                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          title="تعديل بيانات وصلاحيات الموظف"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          <span>تعديل والصلاحيات</span>
                                        </button>

                                        {/* Reset Temp Password */}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenResetModal(u)}
                                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          title="إصدار كلمة مرور مؤقتة وتوليد رسالة الاعتماد"
                                        >
                                          <KeyRound className="w-3 h-3" />
                                          <span>كلمة مؤقتة</span>
                                        </button>

                                        {/* Toggle Active */}
                                        {!isCurrentUser && (
                                          <button
                                            type="button"
                                            onClick={() => handleToggleUserActive(u)}
                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                            title={u.active ? 'تعطيل الحساب مؤقتاً' : 'إعادة تنشيط الحساب'}
                                          >
                                            {u.active ? 'تعطيل' : 'تفعيل'}
                                          </button>
                                        )}

                                        {/* Delete User */}
                                        {!isCurrentUser && u.role !== 'SUPER_ADMIN' && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteUser(u)}
                                            className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                            title="حذف حساب الموظف نهائياً"
                                          >
                                            حذف
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
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

            {/* TAB CONTENT: ROLE PERMISSIONS MATRIX VIEW */}
            {rolesViewMode === 'MATRIX' && (
              <div className="space-y-6">
                {/* Intro Banner */}
                <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 p-4 rounded-2xl border border-orange-200 dark:border-slate-700 shadow-xs flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#F97316]" />
                      <span>جدول المقارنة المعياري بين الأدوار الوظيفية والصلاحيات المعتمدة</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      يُظهر الجدول أدناه التوزيع المعياري لكافة الصلاحيات الـ 14 عبر أدوار النظام. كما يمكنك تخصيص الصلاحيات بشكل منفصل لأي موظف من تبويب حسابات الموظفين.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRolesViewMode('USERS')}
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>العودة لإدارة حسابات الموظفين</span>
                  </button>
                </div>

                {/* Matrix Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="p-3.5 min-w-[240px]">الصلاحية والوظيفة بالنظام</th>
                          {ROLES_METADATA.map(r => (
                            <th key={r.role} className="p-3.5 text-center min-w-[110px]">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${r.badgeClass}`}>
                                {r.title}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-800 dark:text-slate-200">
                        {PERMISSION_CATEGORIES.map(cat => (
                          <React.Fragment key={cat.id}>
                            {/* Category Header Row */}
                            <tr className="bg-slate-50/80 dark:bg-slate-900/60 font-black text-slate-700 dark:text-slate-300">
                              <td colSpan={8} className="p-2.5 px-4 text-[11px] flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#F97316] rounded-full" />
                                <span>{cat.name}</span>
                              </td>
                            </tr>

                            {/* Category Permission Items */}
                            {cat.items.map(item => (
                              <tr key={item.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition">
                                <td className="p-3 pr-5">
                                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                                    {item.label}
                                  </div>
                                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                    {item.desc}
                                  </div>
                                </td>

                                {ROLES_METADATA.map(r => {
                                  const defaults = getDefaultPermissions(r.role);
                                  const hasPerm = defaults[item.key];

                                  return (
                                    <td key={r.role} className="p-3 text-center">
                                      {hasPerm ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                          <span>متاح</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                                          <X className="w-3 h-3" />
                                          <span>محجوب</span>
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Role Description Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    بطاقات الأدوار المعتمدة وتوزيع الموظفين الحالي
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {ROLES_METADATA.map(r => {
                      const count = usersList.filter(u => u.role === r.role).length;
                      return (
                        <div
                          key={r.role}
                          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-2.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                                {r.title}
                              </h5>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${r.badgeClass}`}>
                                {r.typeBadge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                              {r.desc}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                              الموظفون المسجلون: <strong className="text-slate-900 dark:text-white font-mono">{count}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setUserRoleFilter(r.role);
                                setRolesViewMode('USERS');
                              }}
                              className="text-xs font-bold text-[#F97316] hover:text-orange-600 transition cursor-pointer flex items-center gap-1"
                            >
                              <span>استعراض</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 1: ADD NEW EMPLOYEE WITH PERMISSIONS CUSTOMIZATION */}
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-[#F97316]" />
                      <span>إنشاء حساب موظف جديد وتعيين الصلاحيات</span>
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => setShowAddUserModal(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form Container (Scrollable) */}
                  <form onSubmit={handleCreateUser} className="space-y-4 overflow-y-auto pr-1 flex-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        اسم الموظف الكامل <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={e => setNewFullName(e.target.value)}
                        placeholder="مثال: عبد الرحمن بن صالح الشهري"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          اسم المستخدم (للدخول) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          placeholder="مثال: alshahri"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          رقم الجوال
                        </label>
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={e => setNewPhone(e.target.value)}
                          placeholder="05xxxxxxxx"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الدور الوظيفي والمسؤوليات
                      </label>
                      <select
                        value={newRole}
                        onChange={e => handleRoleChangeForNew(e.target.value as UserRole)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        {ROLES_METADATA.map(r => (
                          <option key={r.role} value={r.role}>
                            {r.title} ({r.typeBadge})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Temporary Password Field */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        كلمة المرور المؤقتة (تُسلم للموظف)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={newTempPass}
                          onChange={e => setNewTempPass(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setNewTempPass(generateTemporaryPassword())}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>توليد</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="forceFirstChangeCheckNew"
                        checked={forceFirstChange}
                        onChange={e => setForceFirstChange(e.target.checked)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <label htmlFor="forceFirstChangeCheckNew" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        إلزام الموظف بإنشاء كلمة مرور شخصية خاصة به فور أول تسجيل دخول
                      </label>
                    </div>

                    {/* Permissions Customization Section */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => setCustomizingNewPerms(!customizingNewPerms)}
                          className="text-xs font-bold text-[#F97316] hover:text-orange-600 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>
                            {customizingNewPerms 
                              ? 'إخفاء تخصيص الصلاحيات (مخصص حالياً)' 
                              : 'تخصيص الصلاحيات الممنوحة لهذا الحساب بالتفصيل'}
                          </span>
                        </button>

                        {customizingNewPerms && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setNewPermissions(getDefaultPermissions(newRole))}
                              className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                            >
                              الافتراضي للدور
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleSetAllNewPermissions(true)}
                              className="text-[10.5px] font-bold text-emerald-600 hover:underline cursor-pointer"
                            >
                              تحديد الكل
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleSetAllNewPermissions(false)}
                              className="text-[10.5px] font-bold text-red-600 hover:underline cursor-pointer"
                            >
                              إلغاء الكل
                            </button>
                          </div>
                        )}
                      </div>

                      {customizingNewPerms && (
                        <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          {PERMISSION_CATEGORIES.map(cat => (
                            <div key={cat.id} className="space-y-1.5">
                              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                                {cat.name}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {cat.items.map(item => (
                                  <label
                                    key={item.key}
                                    className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-400 transition"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!newPermissions[item.key]}
                                      onChange={() => handleToggleNewPermission(item.key)}
                                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 mt-0.5 cursor-pointer"
                                    />
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                                        {item.label}
                                      </div>
                                      <div className="text-[9.5px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                        {item.desc}
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>حفظ وإنشاء الحساب</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 2: EDIT EMPLOYEE & CUSTOMIZE GRANULAR PERMISSIONS */}
            {editingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8 max-h-[92vh] flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-[#F97316]" />
                        <span>تعديل بيانات وصلاحيات الموظف: {editingUser.fullName}</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        اسم المستخدم: <span className="font-mono text-slate-700 dark:text-slate-300">@{editingUser.username}</span> | 
                        الصلاحيات النشطة: <strong className="text-[#F97316] font-mono">{Object.values(editPermissions).filter(Boolean).length} من 14</strong>
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setEditingUser(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form Container (Scrollable) */}
                  <form onSubmit={handleSaveEditedUser} className="space-y-4 overflow-y-auto pr-1 flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          اسم الموظف الكامل <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editFullName}
                          onChange={e => setEditFullName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          رقم الجوال
                        </label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          placeholder="05xxxxxxxx"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          الدور الوظيفي
                        </label>
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value as UserRole)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {ROLES_METADATA.map(r => (
                            <option key={r.role} value={r.role}>
                              {r.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          حالة الحساب
                        </label>
                        <select
                          value={editActive ? 'ACTIVE' : 'INACTIVE'}
                          onChange={e => setEditActive(e.target.value === 'ACTIVE')}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value="ACTIVE">حساب نشط (مسموح بالدخول)</option>
                          <option value="INACTIVE">حساب معطل (إيقاف الدخول)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="editMustChangePassCheck"
                        checked={editMustChangePass}
                        onChange={e => setEditMustChangePass(e.target.checked)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <label htmlFor="editMustChangePassCheck" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        إلزام الموظف بتغيير كلمة المرور عند تسجيل الدخول القادم
                      </label>
                    </div>

                    {/* Granular Permissions Section */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#F97316]" />
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">
                            تخصيص الصلاحيات الدقيقة ({Object.values(editPermissions).filter(Boolean).length} من 14)
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={handleApplyRoleDefaultsToEdit}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            تطبيق افتراضي الدور
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllEditPermissions(true)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            منح الكل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllEditPermissions(false)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            حجب الكل
                          </button>
                        </div>
                      </div>

                      {/* Categories Accordions */}
                      <div className="space-y-3">
                        {PERMISSION_CATEGORIES.map(cat => (
                          <div
                            key={cat.id}
                            className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-[#F97316] rounded-full" />
                                <span>{cat.name}</span>
                              </span>
                              <span className="text-[10px] font-bold font-mono text-slate-500">
                                {cat.items.filter(i => editPermissions[i.key]).length} / {cat.items.length}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {cat.items.map(item => {
                                const isChecked = !!editPermissions[item.key];
                                return (
                                  <label
                                    key={item.key}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                                      isChecked
                                        ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/60'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleEditPermission(item.key)}
                                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 mt-0.5 cursor-pointer"
                                    />
                                    <div>
                                      <div className={`text-[11px] font-bold ${isChecked ? 'text-orange-950 dark:text-orange-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {item.label}
                                      </div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                        {item.desc}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        <span>حفظ التعديلات والصلاحيات</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 3: TEMPORARY PASSWORD RESET & WHATSAPP SHARING */}
            {resetModalUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-amber-500" />
                      <span>إعادة تعيين كلمة مرور الموظف</span>
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => setResetModalUser(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Warning Notice */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      سيتم تعيين كلمة مرور مؤقتة للموظف <strong>{resetModalUser.fullName}</strong> وإلزامه بتغييرها عند أول تسجيل دخول للنظام.
                    </span>
                  </div>

                  {/* Account Summary */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">اسم المستخدم للدخول:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">@{resetModalUser.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">رقم الجوال:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{resetModalUser.phone || 'غير مسجل'}</span>
                    </div>
                  </div>

                  {/* Generated Password Box */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      كلمة المرور المؤقتة الجديدة:
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-orange-400 dark:border-orange-500/60 rounded-xl p-2.5 text-center font-mono font-black text-base text-[#F97316] tracking-widest select-all">
                        {activeTempPassword}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTempPassword(generateTemporaryPassword())}
                        title="توليد كلمة مرور أخرى"
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sharing Tools */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(resetModalUser, activeTempPassword)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
                        copiedCredentials
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {copiedCredentials ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedCredentials ? 'تم نسخ الرسالة بنجاح!' : 'نسخ رسالة الاعتماد الكاملة'}</span>
                    </button>

                    {resetModalUser.phone && (
                      <button
                        type="button"
                        onClick={() => handleShareViaWhatsApp(resetModalUser.phone, resetModalUser, activeTempPassword)}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>إرسال البيانات عبر واتساب للموظف</span>
                      </button>
                    )}
                  </div>

                  {/* Confirmation Actions */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPasswordReset}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>تأكيد وتفعيل كلمة المرور</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. AUDIT LOG */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase">
              سجل التدقيق والحركات الإدارية (Audit Trail)
            </h3>
            <span className="text-xs text-slate-500 font-mono">{auditLogs.length} حركة مسجلة</span>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-100 font-bold text-slate-800 sticky top-0">
                <tr>
                  <th className="p-3">الوقت والتاريخ</th>
                  <th className="p-3">المستخدم</th>
                  <th className="p-3">نوع العملية</th>
                  <th className="p-3">الوحدة المستهدفة</th>
                  <th className="p-3">التفاصيل والبيان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </td>
                    <td className="p-3 font-bold text-slate-900 font-sans">{log.userName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                        log.action === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{log.entity} ({log.entityId})</td>
                    <td className="p-3 text-slate-700 font-sans max-w-sm">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BACKUP & RESTORE / 1 TERABYTE ENTERPRISE STORAGE */}
      {activeTab === 'BACKUP' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Information & Advanced Diagnostics Link Card */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  محرك التخزين المحلي الآمن وقاعدة البيانات المتقدمة
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  تُحفظ كافة العمليات والبيانات محلياً على جهازك بأعلى درجات الخصوصية والأمان. للاطلاع على المواصفات الفنية وسعة التخزين وإجراء فحص الكفاءة المعياري، تفضل بزيارة قسم «حول النظام».
                </p>
              </div>
            </div>
            {onOpenAbout && (
              <button
                type="button"
                onClick={onOpenAbout}
                className="px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-orange-500" />
                <span>المواصفات الفنية في حول النظام</span>
              </button>
            )}
          </div>

          {/* Offline & PWA Banner */}
          <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
                <Wifi className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900">نظام يعمل أونلاين وأوفلاين (Offline-First Architecture)</h4>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">مفعل 100%</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  تطبيق إيجاز يعمل بتقنية متقدمة تتيح لك تشغيله حتى في حال انقطاع الإنترنت أو أثناء السفر والمواقع الميدانية. جميع الرحلات، السندات، والمصروفات تُحفظ محلياً على جهازك وتعمل دائماً بدون توقف.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                PWA Service Worker Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Full Project Code & Assets Zip Export */}
            <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 space-y-3 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <FolderArchive className="w-5 h-5 text-white" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    كامل السورس كود (ZIP)
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">حفظ وتنزيل ملفات المشروع كاملة (ZIP)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    تحميل أرشيف مضغوط (.zip) يحتوي على كامل ملفات المشروع البرمجية (Source Code)، مجلد src، صفحات النظام، إعدادات Vite و Tailwind، مع قاعدة البيانات الحالية لفتح وتشغيل النظام على أي جهاز كمبيوتر أو استضافة.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isExportingProjectZip}
                onClick={handleDownloadProjectZip}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                {isExportingProjectZip ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ تجميع وضغط ملفات المشروع...</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4 text-emerald-200" />
                    <span>تحميل ملفات المشروع كاملة (.ZIP)</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Backup Export */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">تصدير نسخة احتياطية (JSON)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    تحميل ملف يحتوي على كامل بيانات المؤسسة، الرحلات، سجل السائقين، الشاحنات، الصيانة والمالية.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportBackup}
                className="w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>تحميل ملف البيانات</span>
              </button>
            </div>

            {/* 3. Restore with Turbo Fast Import Engine */}
            <div 
              className={`p-5 rounded-2xl border-2 transition-all space-y-3 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50/80 scale-[1.01]' 
                  : 'border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-slate-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleImportFile(file);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  <Zap className="w-3 h-3 text-blue-600" />
                  Turbo ⚡ فائق الاستجابة
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">استعادة سريعة للبيانات (Turbo Import)</h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  استيراد ومعالجة فائقة السرعة لملف البيانات دون تجميد للشاشة وبكتابة مجمعة في محرك IndexedDB المحلي، بسعة يحددها الجهاز والمتصفح.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-sm">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>استيراد ملف البيانات فورياً</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportBackup} 
                    className="hidden" 
                  />
                </label>

                <div className="text-center text-[10px] text-slate-400 font-medium">
                  أو قم بسحب وإفلات ملف الـ JSON هنا
                </div>
              </div>
            </div>
          </div>

          {/* Reset button */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-rose-900">إعادة تعيين البيانات الافتراضية</div>
              <div className="text-[11px] text-slate-500">استعادة بيانات العرض والتجربة الأولية للمؤسسة.</div>
            </div>
            {isResetConfirmOpen ? (
              <div className="flex items-center gap-2 bg-rose-50 p-2 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-700 font-bold">تأكيد مسح التغييرات والعودة للبيانات الافتراضية؟</span>
                <button
                  type="button"
                  onClick={handleExecuteResetData}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
                >
                  نعم، تأكيد
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط البيانات</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. SYSTEM INFO & COPYRIGHTS (معلومات النظام وحقوق البرمجة) */}
      {activeTab === 'CENTRAL_SERVER' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-orange-100 text-orange-700"><Server className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-900">ربط الأجهزة بالخادم المركزي المحلي</h3>
                <p className="text-sm text-slate-600 mt-1">شغّل الخادم على كمبيوتر دائم التشغيل داخل المكتب، ثم اربط الهواتف والأجهزة بعنوانه على شبكة Wi-Fi نفسها. لا يحتاج الاتصال إلى الإنترنت.</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
              لا تضع localhost أو 127.0.0.1 في الهاتف؛ هذا يشير إلى الهاتف نفسه. استخدم عنوان الكمبيوتر مثل http://192.168.1.10:3000. اسمح بالمنفذ 3000 على الشبكة المحلية فقط.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الخادم</label>
              <input type="url" value={centralServerUrl} onChange={e => setCentralServerUrl(e.target.value)} placeholder="http://192.168.1.10:3000" dir="ltr" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-sm font-mono" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={async () => {
                try {
                  ApiClient.setBaseUrl(centralServerUrl);
                  setCentralServerStatus('CHECKING');
                  setCentralServerMessage('جارٍ اختبار اتصال الخادم وقاعدة البيانات...');
                  const status = await ApiClient.getServerStatus();
                  if (!status || typeof status.serverSequence !== 'number') throw new Error('استجابة الخادم غير مكتملة');
                  setCentralServerStatus('CONNECTED');
                  setCentralServerMessage(`اتصال ناجح — الرحلات: ${status.metrics?.tripsCount ?? 0}، العملاء: ${status.metrics?.customersCount ?? 0}، آخر تحديث: ${status.lastUpdated || 'غير متاح'}`);
                } catch (error: any) {
                  setCentralServerStatus('OFFLINE');
                  setCentralServerMessage(error?.message || 'تعذر الوصول للخادم. تحقق من العنوان والشبكة وجدار الحماية.');
                }
              }} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Wifi className="w-4 h-4" /> اختبار الاتصال وحفظ العنوان
              </button>
              <button type="button" onClick={() => {
                ApiClient.setBaseUrl('');
                setCentralServerUrl('');
                setCentralServerStatus('UNKNOWN');
                setCentralServerMessage('تم مسح عنوان الخادم من هذا الجهاز فقط.');
              }} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">مسح العنوان</button>
            </div>
            {centralServerMessage && (
              <div className={`rounded-xl border p-3 text-xs leading-6 ${centralServerStatus === 'CONNECTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : centralServerStatus === 'OFFLINE' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                {centralServerStatus === 'CHECKING' ? 'جارٍ الاختبار… ' : centralServerStatus === 'CONNECTED' ? 'متصل فعليًا: ' : centralServerStatus === 'OFFLINE' ? 'غير متصل: ' : ''}{centralServerMessage}
              </div>
            )}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">إعداد حساب المالك على الخادم (للتثبيت الموجود مسبقًا)</h4>
              <p className="text-xs text-slate-600 leading-5">استخدم هذا القسم مرة واحدة فقط إذا كان لديك حساب محلي قديم وتحتاج إلى إنشاء الحساب المركزي. إذا تم إنشاء المالك المركزي سابقًا فلن يسمح الخادم بإعادة تهيئته.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مفتاح التهيئة لمرة واحدة</label>
                <input type="password" autoComplete="off" value={centralSetupKey} onChange={e => setCentralSetupKey(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm" placeholder="المفتاح المحفوظ من إعداد الخادم" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة مرور الحساب المركزي</label>
                <input type="password" autoComplete="new-password" value={centralOwnerPassword} onChange={e => setCentralOwnerPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm" placeholder="5 خانات على الأقل" />
              </div>
              <button type="button" onClick={async () => {
                if (!centralServerUrl.trim() || !centralSetupKey.trim() || centralOwnerPassword.length < 5) {
                  setCentralServerStatus('OFFLINE');
                  setCentralServerMessage('أدخل عنوان الخادم ومفتاح التهيئة وكلمة مرور من 5 خانات على الأقل.');
                  return;
                }
                try {
                  ApiClient.setBaseUrl(centralServerUrl);
                  const result = await ApiClient.setupOwner({
                    fullName: currentUser.fullName,
                    username: currentUser.username,
                    phone: currentUser.phone || '',
                    password: centralOwnerPassword,
                    setupKey: centralSetupKey,
                  });
                  setCentralOwnerPassword('');
                  setCentralSetupKey('');
                  setCentralServerStatus('CONNECTED');
                  setCentralServerMessage('تم إنشاء حساب المالك المركزي. سجّل الخروج ثم ادخل مجددًا باستخدام كلمة المرور التي أدخلتها هنا.');
                } catch (error: any) {
                  setCentralServerStatus('OFFLINE');
                  setCentralServerMessage(error?.message || 'تعذر تهيئة حساب المالك المركزي.');
                }
              }} className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold">
                تهيئة حساب المالك المركزي
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-900 text-sm mb-2">متطلبات تشغيل الخادم المحلي</h4>
              <ul className="list-disc pr-5 text-xs text-slate-600 space-y-1.5 leading-6">
                <li>كمبيوتر أو جهاز مخصص يعمل باستمرار، مع Node.js LTS وتثبيت المشروع عليه.</li>
                <li>قاعدة البيانات تحفظ في مجلد data على قرص الكمبيوتر، مع نسخ احتياطية دورية.</li>
                <li>يجب أن تكون الأجهزة على شبكة Wi-Fi/LAN واحدة، وأن يسمح جدار الحماية بالمنفذ 3000.</li>
                <li>نجاح الاختبار يؤكد استجابة الخادم فقط؛ يلزم اختبار المزامنة الفعلية من جهازين قبل إدخال بيانات حقيقية.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SYSTEM_INFO' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner with Badges */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/30 shrink-0">
                  <Code2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black text-white">معلومات النظام وحقوق البرمجة</h3>
                    <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      v{SYSTEM_INFO.version} {SYSTEM_INFO.edition}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    توثيق الملكية الفكرية والبرمجية، وبيانات الشركة المطورة، وترخيص الاستخدام
                  </p>
                </div>
              </div>

              {onOpenAbout && (
                <button
                  type="button"
                  onClick={onOpenAbout}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                  <span>فتح نافذة «حول النظام»</span>
                </button>
              )}
            </div>
          </div>

          {/* Protection Notice (Non-editable guarantee) */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <span>حماية حقوق المطور والملكية البرمجية</span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-md font-bold">محمي ومثبت</span>
              </h4>
              <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                {SYSTEM_INFO.license.protectedNotice}
              </p>
            </div>
          </div>

          {/* Main Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Developer Company Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900">بيانات الشركة المطورة</h4>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                  الشركة المطورة
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold text-[11px]">اسم الشركة:</span>
                  <span className="font-black text-slate-900 text-xs">
                    {SYSTEM_INFO.developer.fullName}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold text-[11px]">النشاط:</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {SYSTEM_INFO.developer.activity}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold text-[11px]">رقم التواصل:</span>
                  <span className="font-mono font-black text-slate-900 text-xs" dir="ltr">
                    {SYSTEM_INFO.developer.contactNumber}
                  </span>
                </div>
              </div>

              {/* Official Proposed Copyright Block */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-700 space-y-1 text-center">
                <div className="text-[10px] text-orange-400 font-black tracking-wide">
                  الصيغة الرسمية المعتمدة لحقوق الملكية والتطوير:
                </div>
                <div className="text-xs font-bold text-slate-100 mt-1">
                  نظام إيجاز © جميع الحقوق محفوظة
                </div>
                <div className="text-[11px] text-slate-300">
                  تم التصميم والتطوير والبرمجة بواسطة فكتوريا لاين سوفت للأنظمة والبرمجة
                </div>
                <div className="font-mono font-black text-amber-400 text-xs tracking-wider" dir="ltr">
                  {SYSTEM_INFO.developer.contactNumber}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={SYSTEM_INFO.developer.contactUrl}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>اتصال: {SYSTEM_INFO.developer.contactNumber}</span>
                </a>

                <a
                  href={SYSTEM_INFO.developer.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText?.(SYSTEM_INFO.developer.contactNumber);
                    setCopiedPhone(true);
                    setTimeout(() => setCopiedPhone(false), 2500);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                  title="نسخ الرقم"
                >
                  {copiedPhone ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>نسخ الرقم</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* System Specs Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900">بيانات ومواصفات النظام</h4>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                  {SYSTEM_INFO.license.status}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold text-[11px]">اسم النظام:</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {SYSTEM_INFO.name} ({SYSTEM_INFO.systemNameEn})
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold text-[11px]">رقم الإصدار (Version):</span>
                  <span className="font-mono font-black text-orange-600 text-xs">
                    v{SYSTEM_INFO.version}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold text-[11px]">رقم البناء (Build):</span>
                  <span className="font-mono font-bold text-slate-700 text-xs">
                    {SYSTEM_INFO.buildNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold text-[11px]">سنة التحديث:</span>
                  <span className="font-mono font-bold text-slate-700 text-xs">
                    {SYSTEM_INFO.releaseYear}م
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold text-[11px]">نوع الترخيص:</span>
                  <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{SYSTEM_INFO.license.type}</span>
                  </span>
                </div>
              </div>

              {/* Technical Features Mini List */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-700 flex items-center gap-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>الميزات التقنية المتكاملة:</span>
                </div>
                <div className="grid grid-cols-1 gap-1 text-[10.5px]">
                  <div>• محرك تخزين محلي متقدم (IndexedDB + LocalStorage)</div>
                  <div>• نظام فواتير وسندات وتقارير مالية تفصيلية ومتابعة رحلات</div>
                  <div>• تصميم سريع وخفيف متجاوب مع كافة الشاشات والأجهزة</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Turbo Import Live Status & Stats Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-[#0F172A] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-md">
                  <Zap className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                    <span>محرك الاستيراد فائق السرعة والاستجابة</span>
                    <span className="text-[10px] font-mono bg-orange-500/30 text-orange-300 border border-orange-400/40 px-2 py-0.5 rounded-full">
                      Turbo Mode ⚡
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">معالجة دفعات للبيانات المحلية؛ المزامنة المركزية تتطلب خادمًا مُعدًا</p>
                </div>
              </div>
              {!isImporting && (
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* If in progress */}
              {isImporting && (
                <div className="space-y-4 py-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                      {importStage || 'جاري استيراد ومعالجة البيانات بسرعة فائقة...'}
                    </span>
                    <span className="font-mono text-orange-600 text-sm font-black">{importProgress}%</span>
                  </div>

                  {/* High speed animated progress bar */}
                  <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 transition-all duration-300 relative overflow-hidden"
                      style={{ width: `${importProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>تقنية الحفظ المجمع: Atomic Batch Transaction</span>
                    <span className="font-mono text-emerald-600 font-bold">زمن استجابة فوري</span>
                  </div>
                </div>
              )}

              {/* If completed with success */}
              {!isImporting && importStats && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <h4 className="text-sm font-black text-emerald-950">اكتمل الاستيراد بنجاح وبسرعة استجابة مذهلة!</h4>
                        <span className="bg-emerald-600 text-white font-mono text-xs font-black px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          {importStats.durationMs} ms
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        اكتملت معالجة ملف البيانات المحلي. يُرجى التحقق من عدد السجلات ومراجعة البيانات المستوردة قبل متابعة العمل.
                      </p>
                    </div>
                  </div>

                  {/* Imported Breakdown Grid */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-orange-500" />
                      <span>تفاصيل السجلات المستوردة بنجاح:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500 font-bold">الرحلات التشغيلية</div>
                        <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{importStats.trips}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500 font-bold">سجلات السائقين</div>
                        <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{importStats.drivers}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500 font-bold">أسطول الشاحنات</div>
                        <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{importStats.trucks}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500 font-bold">ملفات العملاء</div>
                        <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{importStats.customers}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500 font-bold">السندات والمصروفات</div>
                        <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{importStats.collections + importStats.expenses}</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl text-center">
                        <div className="text-[11px] text-orange-800 font-bold">إجمالي السجلات</div>
                        <div className="text-lg font-black text-orange-700 font-mono mt-0.5">{importStats.totalRecords}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* If error occurred */}
              {!isImporting && importError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <div className="p-2 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-950">فشل استيراد الملف</h4>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">{importError}</p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      يرجى التأكد من أن الملف هو ملف JSON تم تصديره من نظام إيجاز أو يحتوي على هيكل بيانات متطابق.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              {!isImporting && (
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>موافق ومتابعة العمل</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
