import React, { useEffect, useState } from 'react';
import { Database, Wifi, WifiOff, HardDrive, RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { StorageService } from '../services/storage';
import { SyncEngine } from '../services/syncEngine';
import { ApiClient } from '../services/apiClient';

export interface NetworkStatusIndicatorProps { inMenu?: boolean; }

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({ inMenu = false }) => {
  const [serverOnline, setServerOnline] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const checkServer = async () => {
    const baseUrl = ApiClient.getBaseUrl();
    setServerConfigured(Boolean(baseUrl));
    if (!baseUrl || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setServerOnline(false); setPing(null); return;
    }
    const started = performance.now();
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${baseUrl}/api/sync/status`, { signal: controller.signal });
      window.clearTimeout(timer);
      setServerOnline(res.ok);
      setPing(res.ok ? Math.round(performance.now() - started) : null);
    } catch { setServerOnline(false); setPing(null); }
  };

  useEffect(() => {
    checkServer();
    const timer = window.setInterval(checkServer, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const syncNow = async () => {
    if (!serverConfigured) {
      setMessage('الخادم المركزي غير مُهيأ. البيانات المحلية تعمل بشكل طبيعي؛ يلزم إدخال عنوان خادم فعلي للمزامنة بين الأجهزة.');
      return;
    }
    setSyncing(true); setMessage('');
    try {
      const result = await SyncEngine.syncWithServer(StorageService.getCurrentUser());
      setMessage(result.success ? `تمت المزامنة: إرسال ${result.pushedCount} وتحديث ${result.pulledCount}.` : (result.error || 'تعذرت المزامنة.'));
      await checkServer();
    } catch (e: any) { setMessage(e?.message || 'تعذرت المزامنة.'); }
    finally { setSyncing(false); }
  };

  const pending = SyncEngine.getOutbox().filter(x => x.status === 'PENDING').length;
  const counts = { trips: StorageService.getTrips().length, customers: StorageService.getCustomers().length, drivers: StorageService.getDrivers().length, trucks: StorageService.getTrucks().length };
  const label = serverOnline ? 'متصل' : !serverConfigured ? 'محلي' : 'غير متصل';
  const detail = serverOnline ? `الخادم المركزي متصل${ping ? ` · ${ping}ms` : ''}` : !serverConfigured ? 'قاعدة البيانات المحلية تعمل · الخادم المركزي غير مُهيأ' : 'الخادم المركزي غير متاح · العمل المحلي مستمر';

  return <>
    <button type="button" onClick={() => setOpen(true)} className={`${inMenu ? 'w-full p-2.5 rounded-xl justify-between' : 'px-2.5 py-1.5 rounded-full'} bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer`} title={detail}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${serverOnline ? 'bg-emerald-500' : !serverConfigured ? 'bg-amber-400' : 'bg-rose-500'}`} />
      <span className="flex items-center gap-1.5 min-w-0"><Database className={`w-4 h-4 ${serverOnline ? 'text-sky-500' : !serverConfigured ? 'text-amber-500' : 'text-rose-500'}`} /><span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{inMenu ? 'قاعدة البيانات والخادم' : label}</span></span>
      {inMenu && <span className={`text-[10px] font-bold ${serverOnline ? 'text-emerald-500' : !serverConfigured ? 'text-amber-500' : 'text-rose-500'}`}>{label}</span>}
      {pending > 0 && <span className="px-1.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">{pending}</span>}
    </button>

    {open && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between"><div className="flex items-center gap-2"><Database className="w-5 h-5 text-sky-400" /><div><b className="block text-sm">حالة قاعدة البيانات والاتصال</b><span className="text-[10px] text-slate-400">إيجاز للنقليات</span></div></div><button type="button" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button></div>
        <div className="p-4 space-y-3">
          <div className={`p-4 rounded-xl border ${serverOnline ? 'bg-emerald-50 border-emerald-200' : !serverConfigured ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center gap-2 font-black text-sm">{serverOnline ? <Wifi className="w-5 h-5 text-emerald-600" /> : !serverConfigured ? <HardDrive className="w-5 h-5 text-amber-600" /> : <WifiOff className="w-5 h-5 text-rose-600" />}{serverOnline ? 'الخادم المركزي متصل' : !serverConfigured ? 'قاعدة البيانات المحلية تعمل' : 'الخادم المركزي غير متصل'}</div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{serverOnline ? 'المزامنة المركزية متاحة، مع الاحتفاظ بنسخة محلية من البيانات.' : !serverConfigured ? 'هذه النسخة لا تحتوي على عنوان خادم مركزي فعلي. لذلك يظهر الخادم غير مُهيأ، وليس لأن قاعدة البيانات المحلية تالفة. الرحلات والمالية تحفظ محلياً.' : 'تعذر الوصول للخادم حالياً. العمل المحلي مستمر والعمليات المعلقة تنتظر المزامنة.'}</p>
          </div>
          <div className="bg-slate-900 text-white rounded-xl p-4"><div className="flex items-center justify-between"><b className="text-xs">البيانات المحلية على الجهاز</b><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div><div className="grid grid-cols-2 gap-2 mt-3 text-[10px]"><span>الرحلات: <b>{counts.trips}</b></span><span>العملاء: <b>{counts.customers}</b></span><span>السائقون: <b>{counts.drivers}</b></span><span>الشاحنات: <b>{counts.trucks}</b></span></div></div>
          {!serverConfigured && <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>لربط أكثر من جهاز، يجب أولاً توفير خادم API وقاعدة بيانات مركزية ووضع عنوانها في إعدادات النظام. لن أعتبر النظام متصلاً مركزياً بدون ذلك.</span></div>}
          {message && <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-[11px]">{message}</div>}
          <button type="button" onClick={syncNow} disabled={syncing} className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2"><RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'جاري المزامنة...' : 'فحص / مزامنة الآن'}</button>
        </div>
      </div>
    </div>}
  </>;
};
