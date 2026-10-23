import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Info, 
  X,
  Share,
  PlusSquare,
  RefreshCw,
  Database
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SyncEngine } from '../services/syncEngine';
import { ApiClient } from '../services/apiClient';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface NetworkStatusIndicatorProps {
  inMenu?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({ inMenu = false }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [serverPing, setServerPing] = useState<number | null>(null);
  const [serverDetails, setServerDetails] = useState<{ sequence?: number; lastUpdated?: string } | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'online' | 'offline' }>({
    text: '',
    type: 'online'
  });

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  // Manual Sync State
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [manualSyncMsg, setManualSyncMsg] = useState<string | null>(null);

  const checkRealServer = async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) {
      setIsOnline(false);
      return;
    }
    const baseUrl = ApiClient.getBaseUrl();
    if (window.location.protocol === 'file:' && !baseUrl) {
      setIsOnline(false);
      return;
    }
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch((baseUrl || '') + '/api/sync/status', { signal: controller.signal });
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsOnline(true);
        setServerPing(latency);
        if (data) {
          setServerDetails({
            sequence: data.serverSequence,
            lastUpdated: data.lastUpdated,
          });
        }
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setManualSyncMsg(null);
    try {
      const res = await SyncEngine.syncWithServer();
      await checkRealServer();
      if (res.success) {
        setManualSyncMsg(`تمت المزامنة بنجاح! تم إرسال ${res.pushedCount} عملية وتحديث السجلات المركزية.`);
      } else {
        setManualSyncMsg(res.error || 'فشلت المزامنة مع الخادم');
      }
    } catch (e: any) {
      setManualSyncMsg(e?.message || 'خطأ في المزامنة');
    } finally {
      setIsManualSyncing(false);
    }
  };

  useEffect(() => {
    checkRealServer();
    const serverPollInterval = setInterval(checkRealServer, 6000);

    // Check if running inside an iframe (like AI Studio preview)
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }
    setIsInIframe(inIframe);

    // Check if running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect OS / Device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    const handleOnline = () => {
      checkRealServer();
      setToastMessage({ text: 'تم استعادة الاتصال بالإنترنت – جميع العمليات متزامنة محلياً', type: 'online' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage({ text: 'أنت في وضع عدم الاتصال (أوفلاين) – التطبيق يعمل بكامل وظائفه ويحفظ بياناتك على الجهاز', type: 'offline' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5500);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearInterval(serverPollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  // Get local storage diagnostics
  const tripsCount = StorageService.getTrips().length;
  const customersCount = StorageService.getCustomers().length;
  const trucksCount = StorageService.getTrucks().length;
  const driversCount = StorageService.getDrivers().length;
  const pendingCount = SyncEngine.getOutbox().filter(i => i.status === 'PENDING').length;

  return (
    <>
      {/* Network & Central Database Sync Trigger */}
      {inMenu ? (
        <button
          id="header-database-sync-pill"
          type="button"
          onClick={() => setShowStatusModal(true)}
          className="w-full text-right p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition flex items-center justify-between cursor-pointer select-none"
          title="فحص حالة الخادم المركزي والمزامنة وقاعدة البيانات"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <Database className="w-4 h-4 shrink-0" />
            </div>
            <div className="flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-slate-800 dark:text-white">الخادم المركزي وقاعدة البيانات</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {isOnline ? `متصل (${serverPing ? serverPing + 'ms' : 'مستقر'})` : 'وضع العمل المحلي (أوفلاين)'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]' : 'bg-rose-500 animate-ping'
            }`} />
            <span className={`text-[11px] font-bold ${
              isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}>
              {isOnline ? 'متصل' : 'غير متصل'}
            </span>
          </div>
        </button>
      ) : (
        <div className="flex items-center">
          <button
            id="header-database-sync-pill"
            type="button"
            onClick={() => setShowStatusModal(true)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer select-none ${
              isOnline 
                ? 'bg-[#0B1528] text-white border-cyan-500/40 hover:border-cyan-400 hover:bg-[#0E1C33] shadow-sm' 
                : 'bg-rose-950/80 text-rose-200 border-rose-600 hover:bg-rose-900/80 animate-pulse'
            }`}
            title={isOnline ? `الخادم المركزي وقاعدة البيانات متصلة (${serverPing ? serverPing + 'ms' : 'مستقر'})` : 'غير متصل بالخادم المركزي (يعمل محلياً بأمان)'}
          >
            {/* Database Stack Icon */}
            <Database className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isOnline ? 'text-sky-400' : 'text-rose-400'}`} />
            
            {/* Status Dot */}
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              isOnline 
                ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]' 
                : 'bg-rose-500 shadow-[0_0_8px_#F43F5E] animate-ping'
            }`} />

            {/* Text Status */}
            <span className={`text-[11px] sm:text-xs font-bold tracking-wide ${
              isOnline ? 'text-emerald-400 dark:text-emerald-300' : 'text-rose-300'
            }`}>
              {isOnline ? 'متصل' : 'غير متصل'}
            </span>

            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black font-mono">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Floating Network Transition Toast */}
      {showToast && (
        <div 
          className={`fixed bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:max-w-md z-50 p-4 rounded-2xl shadow-2xl border flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 duration-300 ${
            toastMessage.type === 'online'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-amber-950 text-amber-100 border-amber-700'
          }`}
          dir="rtl"
        >
          <div className="mt-0.5 shrink-0">
            {toastMessage.type === 'online' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-300" />
            )}
          </div>
          <div className="flex-1 text-xs leading-relaxed">
            <span className="font-bold block mb-0.5">
              {toastMessage.type === 'online' ? '🟢 استعادة الاتصال' : '📴 وضع العمل بدون إنترنت'}
            </span>
            {toastMessage.text}
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-white/70 hover:text-white p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detailed Online/Offline & Sync Diagnostics Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="bg-white text-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <Wifi className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                    <WifiOff className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm">حالة الاتصال والتشغيل (أونلاين / أوفلاين)</h3>
                  <p className="text-[11px] text-slate-400">نظام إدارة النقل والأسطول المستقل</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Current Status Box */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isOnline 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                {isOnline ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sm">
                    {isOnline ? 'أنت متصل بالإنترنت (Online)' : 'أنت في وضع العمل بدون إنترنت (Offline)'}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {isOnline 
                      ? 'جميع العمليات والبيانات محفوظة محلياً على جهازك ومتاحة دائماً للطباعة والتصدير والمشاركة.' 
                      : 'يمكنك الاستمرار في إنشاء الرحلات، تسجيل المصروفات وسندات القبض. يتم حفظ كل شيء بأمان على متصفحك وسيعمل التطبيق بدون أي انقطاع.'}
                  </p>
                </div>
              </div>

              {/* Central Database Sync Box */}
              <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="font-bold text-xs">قاعدة البيانات والمزامنة المركزية</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {pendingCount > 0 ? `${pendingCount} عملية بانتظار الإرسال` : 'جميع العمليات متزامنة'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  يتم ترحيل ومزامنة الرحلات وسندات القبض والمصروفات تلقائياً مع الخادم المركزي، ويمكن للمدير والمالك متابعة جميع السجلات من أي جهاز في نفس اللحظة.
                </p>
                {manualSyncMsg && (
                  <div className="text-[11px] p-2 rounded-lg bg-slate-800 text-amber-300 border border-slate-700">
                    {manualSyncMsg}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isManualSyncing}
                  className="w-full bg-[#F97316] hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing ? 'جاري المزامنة مع الخادم...' : 'مزامنة فورية الآن مع الخادم المركزي'}</span>
                </button>
              </div>

              {/* Local Storage Stats */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-orange-500" />
                    البيانات المخزنة محلياً على هذا الجهاز
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                    محفوظة وآمنة
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[11px] block">الرحلات المسجلة:</span>
                    <strong className="text-slate-900 font-mono text-sm">{tripsCount} رحلة</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[11px] block">سجل العملاء:</span>
                    <strong className="text-slate-900 font-mono text-sm">{customersCount} عميل</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[11px] block">الشاحنات المسجلة:</span>
                    <strong className="text-slate-900 font-mono text-sm">{trucksCount} شاحنة</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[11px] block">السائقين المسجلين:</span>
                    <strong className="text-slate-900 font-mono text-sm">{driversCount} سائق</strong>
                  </div>
                </div>
              </div>

              {/* PWA Install Promotion Box */}
              <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-950">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <span>تثبيت التطبيق على الجوال أو الكمبيوتر</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  قم بتثبيت تطبيق <strong>«إيجاز للنقليات»</strong> كبرنامج مستقل لفتحه مباشرة من شاشة جهازك والعمل به في أي وقت بدون الحاجة لفتح المتصفح حتى مع انقطاع النت.
                </p>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full bg-[#F97316] hover:bg-orange-600 active:scale-98 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalled ? 'التطبيق مثبت بالفعل على جهازك' : 'تثبيت التطبيق الآن'}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">نظام إيجاز v2.4.0 (PWA Ready)</span>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Install Instructions Modal (Android, iOS, PC) */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="bg-white text-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            dir="rtl"
          >
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Smartphone className="w-5 h-5 text-orange-400" />
                <span>طريقة تثبيت التطبيق على جهازك</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Note about preview environment */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>ملاحظة هامة:</strong> المتصفحات (مثل Google Chrome و Safari) تمنع التثبيت المباشر التلقائي من داخل شاشة المعاينة. يمكنك التثبيت عبر الخطوات السريعة التالية:
              </div>

              {/* Android (Chrome) Steps */}
              {(!isIOS || isAndroid) && (
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-800 block text-xs border-b pb-1">
                    📱 لمستخدمي أندرويد و Google Chrome (جوالك الحالي):
                  </span>
                  
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <div>
                      <span className="font-bold text-slate-900">اضغط على زر الخيارات (⋮) أعلى يسار/يمين الشاشة</span>
                      <span className="text-slate-500 block text-[10px] mt-0.5">القائمة المكونة من 3 نقاط رأسية في شريط متصفح كروم.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <div>
                      <span className="font-bold text-slate-900">اختر «تثبيت التطبيق» أو «الإضافة إلى الشاشة الرئيسية»</span>
                      <span className="text-slate-500 block text-[10px] mt-0.5">(Install app أو Add to Home screen)</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <div>
                      <span className="font-bold text-slate-900">اضغط «تثبيت» (Install)</span>
                      <span className="text-slate-500 block text-[10px] mt-0.5">سيتم تنزيل أيقونة تطبيق إيجاز وفتحه كبرنامج مستقل فوراً.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* iOS (iPhone/iPad) Steps */}
              {isIOS && (
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-800 block text-xs border-b pb-1">
                    🍏 لمستخدمي آيفون وآيباد (Safari):
                  </span>
                  
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <div>
                      <span className="font-bold text-slate-900">اضغط على زر المشاركة <Share className="w-3.5 h-3.5 text-blue-600 inline ml-1" /></span>
                      <span className="text-slate-500 block text-[10px]">في أسفل شريط متصفح سفاري.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <div>
                      <span className="font-bold text-slate-900">اختر «إضافة إلى الشاشة الرئيسية» <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline ml-1" /></span>
                      <span className="text-slate-500 block text-[10px]">(Add to Home Screen)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer text-center"
                >
                  فهمت الخطوات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
