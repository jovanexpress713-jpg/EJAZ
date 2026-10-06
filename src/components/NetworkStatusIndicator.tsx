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
  RefreshCw
} from 'lucide-react';
import { StorageService } from '../services/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
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

  useEffect(() => {
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
      setIsOnline(true);
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

  return (
    <>
      {/* Network Status Capsule (Hidden when online, only shown if offline) */}
      {!isOnline && (
        <div className="flex items-center gap-1.5">
          {/* Status Pill Button (Offline warning only) */}
          <button
            type="button"
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer bg-amber-950/80 text-amber-300 border-amber-700 hover:bg-amber-900/80 animate-pulse"
            title="يعمل بدون إنترنت (Offline Mode)"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>أوفلاين (شغال)</span>
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
