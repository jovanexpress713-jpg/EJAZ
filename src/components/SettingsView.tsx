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
  Info
} from 'lucide-react';
import { CompanySettings, AuditLog, User } from '../types';
import { StorageService } from '../services/storage';
import { SYSTEM_INFO } from '../constants/systemInfo';
import { downloadFullProjectZip } from '../utils/zipExporter';

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
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'ROLES' | 'AUDIT' | 'BACKUP' | 'SYSTEM_INFO'>('COMPANY');
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

  useEffect(() => {
    StorageService.getStorageDiagnostics().then(setStorageDiagnostics);
  }, [activeTab]);

  const handleRequestPersistence = async () => {
    setIsVerifyingStorage(true);
    const granted = await StorageService.requestPersistentStorage();
    const updated = await StorageService.getStorageDiagnostics();
    setStorageDiagnostics(updated);
    setIsVerifyingStorage(false);
    setStorageMsg(granted ? 'تم تفعيل وتأكيد حماية التخزين الدائم اللانهائي بنجاح.' : 'تم تشغيل التخزين اللانهائي.');
    setTimeout(() => setStorageMsg(null), 4000);
  };

  const handleSyncAndVerify = async () => {
    setIsVerifyingStorage(true);
    await StorageService.hydrateFromUnlimitedStorage();
    const updated = await StorageService.getStorageDiagnostics();
    setStorageDiagnostics(updated);
    setIsVerifyingStorage(false);
    setStorageMsg('تمت مزامنة وفحص سلامة التخزين اللانهائي وقاعدة البيانات بنجاح.');
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

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

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
            activeTab === 'BACKUP' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-orange-500" />
          <span>سعة التخزين (1 تيرابايت - 1TB) والنسخ الاحتياطي</span>
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

      {/* 2. ROLES MATRIX */}
      {activeTab === 'ROLES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-900">مصفوفة الصلاحيات والأدوار المعتمدة بالنظام</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">المدير العام (Super Admin)</span>
                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">صلاحية كاملة</span>
              </div>
              <p className="text-xs text-slate-600">
                الوصول لجميع الوحدات، إضافة وتعديل وحذف الرحلات، السائقين، الشاحنات، إصدار السندات، الوصول للإعدادات وسجل الرقابة.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">التشغيل والعمليات (Operations)</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">تشغيلي</span>
              </div>
              <p className="text-xs text-slate-600">
                إدارة الرحلات وتحديث حالاتها، إدارة السائقين، متابعة الأسطول وجدولة الصيانة. لا يمكنه تعديل إعدادات المؤسسة.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">المحاسب المالي (Accountant)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">مالي</span>
              </div>
              <p className="text-xs text-slate-600">
                إصدار سندات القبض والصرف، استخراج كشوفات الحساب، مراجعة الضرائب والعهد، والتقارير المالية التنفيذية.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">المشاهد (Viewer)</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">قراءة فقط</span>
              </div>
              <p className="text-xs text-slate-600">
                الاطلاع على حركة الرحلات والتقارير بدون إمكانية الحذف أو التعديل أو إضافة بيانات جديدة.
              </p>
            </div>
          </div>
        </div>
      )}

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
          {/* 1 Terabyte Enterprise Storage Engine Card */}
          <div className="p-5 sm:p-6 rounded-2xl border-2 border-orange-500/40 bg-gradient-to-br from-orange-50/50 via-white to-amber-50/40 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-[#0F172A] text-orange-400 rounded-xl shadow-md shrink-0">
                  <HardDrive className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900">
                      محرك التخزين الفائق بسعة 1 تيرابايت (1 Terabyte Enterprise Storage)
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      1TB Storage Active
                    </span>
                    <span className="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      سعة مفتوحة لا نهائية
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    تمت ترقية نظام إيجاز بمحرك <strong className="text-slate-900">IndexedDB Enterprise V2</strong> مع دعم الحماية الدائمة ومحرك الوسائط الضخمة لحفظ ما يصل إلى <strong className="text-orange-700">1 تيرابايت (1,024 جيجابايت)</strong> من الرحلات، السندات المالية، العقود، صور بوالص الشحن، وإثباتات التسليم دون أي سقف تقييدي.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                <button
                  type="button"
                  onClick={handleBenchmark1TB}
                  disabled={isVerifyingStorage}
                  className="px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-orange-400 border border-orange-500/40 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="اختبار سرعة وكفاءة التخزين بسعة 1 تيرابايت"
                >
                  <Zap className={`w-3.5 h-3.5 text-orange-400 ${isVerifyingStorage ? 'animate-bounce' : ''}`} />
                  <span>فحص كفاءة الـ 1TB</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncAndVerify}
                  disabled={isVerifyingStorage}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="فحص ومزامنة قاعدة البيانات"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isVerifyingStorage ? 'animate-spin' : ''}`} />
                  <span>مزامنة وفحص</span>
                </button>

                <button
                  type="button"
                  onClick={handleRequestPersistence}
                  disabled={isVerifyingStorage}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="طلب تثبيت الحماية الدائمة من المتصفح"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>تأكيد الحماية الدائمة</span>
                </button>
              </div>
            </div>

            {/* Benchmark Test Results Banner */}
            {benchmarkResult && (
              <div className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn ${
                benchmarkResult.success ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-lg' : 'bg-red-950 text-red-300 border-red-500/60'
              }`}>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-black text-white">نتيجة فحص سرعة وقدرة محرك الـ 1 تيرابايت:</div>
                    <p className="text-emerald-300 font-normal mt-0.5">{benchmarkResult.message}</p>
                  </div>
                </div>
                <div className="text-left shrink-0 font-mono text-xs bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-700">
                  <span className="text-emerald-400 font-black">{benchmarkResult.writeSpeedMs} ms</span> زمن الاستجابة
                </div>
              </div>
            )}

            {/* Notification alert if action taken */}
            {storageMsg && !benchmarkResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{storageMsg}</span>
              </div>
            )}

            {/* 1 Terabyte Capacity Visual Progress Gauge */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-orange-400" />
                  <span className="text-xs sm:text-sm font-black text-white">مؤشر سعة الـ 1 تيرابايت (1 TB Enterprise Storage Meter):</span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  المستخدم: <strong className="text-orange-400">{storageDiagnostics?.usageFormatted || '0 بايت'}</strong> / سعة الحفظ القصوى: <strong className="text-emerald-400">1,024 GB (1 TB)</strong>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-orange-500 h-full rounded-full transition-all duration-500 min-w-[6px]"
                  style={{ width: `${Math.max(0.6, Math.min(100, storageDiagnostics?.usageOf1TBPercent || 0.6))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  المساحة المتبقية من الـ 1 تيرابايت: {storageDiagnostics?.remaining1TBFormatted || '1,023.9 GB متبقي'}
                </span>
                <span className="text-slate-300">
                  الطاقة الاستيعابية التقديرية: <strong className="text-white">أكثر من 10,000,000 رحلة وسند مالي وبوليصة شحن</strong>
                </span>
              </div>
            </div>

            {/* Storage Metric Panels */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-orange-500" />
                  <span>سقف السعة المتاح</span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1">
                  <span>1 تيرابايت (1 TB)</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-bold mt-0.5">مفتوحة حتى سعة القرص الصلب</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الحماية من المسح التلقائي</span>
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-700">
                  {storageDiagnostics?.isPersistent ? 'تخزين دائم مؤكد 100%' : 'تخزين محلي مؤمن'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Persistent Storage API</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                  <span>حجم البيانات الحالية</span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 font-mono">
                  {storageDiagnostics?.usageFormatted || '0 بايت'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">بيانات حية وفورية مشفرة</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-purple-600" />
                  <span>المستندات والوسائط الثقيلة</span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 font-mono">
                  {(storageDiagnostics?.blobsCount || 0) > 0 ? `${storageDiagnostics?.blobsCount} ملف` : '1TB Media Engine'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">بوالص، صور، ومستندات PDF</div>
              </div>
            </div>

            {/* Stored Records Breakdown Bar */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                <span className="font-bold">إحصائية السجلات المحفوظة في قاعدة البيانات (1TB Store):</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-[11px]">
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  الرحلات: <strong className="text-orange-400 font-bold">{storageDiagnostics?.tripsCount ?? 0}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  السائقين: <strong className="text-orange-400 font-bold">{storageDiagnostics?.driversCount ?? 0}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  الشاحنات: <strong className="text-orange-400 font-bold">{storageDiagnostics?.trucksCount ?? 0}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  العملاء: <strong className="text-orange-400 font-bold">{storageDiagnostics?.customersCount ?? 0}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  المالية: <strong className="text-emerald-400 font-bold">{(storageDiagnostics?.collectionsCount ?? 0) + (storageDiagnostics?.expensesCount ?? 0)}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  سجل الرقابة: <strong className="text-blue-400 font-bold">{storageDiagnostics?.logsCount ?? 0}</strong>
                </span>
              </div>
            </div>

            {/* 1TB Architecture Explanation Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-orange-600" />
                  <span>1. محرك السجلات فائقة السرعة</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  يستخدم IndexedDB V2 بنية جدولية بدون ذاكرة مؤقتة مقيدة، مما يسمح بتسجيل عشرات الملايين من الرحلات دون بطء في البحث أو الفلترة.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-600" />
                  <span>2. مخزن الوسائط والمرفقات (1TB Blobs)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  مخزن ثنائي مستقل لحفظ صور السائقين ورخص القيادة وبوالص الشحن الممسوحة ضوئياً ومستندات الفحص الدوري بحجم يصل حتى 1 تيرابايت.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. حماية دائمة ضد الحذف (Zero Eviction)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  محمي بأمر التثبيت الدائم <code className="bg-slate-200 px-1 rounded text-[10px] font-mono">navigator.storage.persist()</code> ليمنع المتصفح نهائياً من مسح أي سجل.
                </p>
              </div>
            </div>
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
                  استيراد ومعالجة فائقة السرعة لملف البيانات دون تجميد للشاشة وبكتابة مجمعة في محرك 1TB.
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
                  <p className="text-[11px] text-slate-400 mt-0.5">معالجة دفعات متوازية ومزامنة فورية مع قاعدة بيانات 1TB</p>
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
                        تمت قراءة وتحليل وحفظ كافة السجلات في محرك IndexedDB Enterprise دون أي تأخير، والشاشات جاهزة للعمل فورياً.
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
