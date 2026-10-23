import React, { useMemo, useState } from 'react';
import { Bot, Send, X, Sparkles, Navigation, CircleHelp, WalletCards, BarChart3, ReceiptText, Truck, Users } from 'lucide-react';
import { Trip, Customer, Driver, Truck as TruckType, ExpenseRecord, CollectionRecord } from '../types';

interface Props {
  trips: Trip[];
  customers: Customer[];
  drivers: Driver[];
  trucks: TruckType[];
  expenses: ExpenseRecord[];
  collections: CollectionRecord[];
  onNavigate: (tab: string) => void;
}

const money = (n: number) => Math.round(n || 0).toLocaleString('ar-SA');

export const EjazAssistant: React.FC<Props> = ({ trips, customers, drivers, trucks, expenses, collections, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string; action?: { label: string; tab: string } }[]>([
    { role: 'assistant', text: 'مرحبًا بك في مساعد إيجاز 👋\nأنا مساعد النظام. أستطيع شرح الأقسام، قراءة مؤشراتك الحالية، وتوجيهك للمكان الصحيح بدون تغيير أي بيانات من تلقاء نفسي.' }
  ]);

  const stats = useMemo(() => {
    const revenue = trips.reduce((s, t) => s + Number(t.totalAmount || 0), 0);
    const collected = collections.reduce((s, c) => s + Number(c.amount || 0), 0);
    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { revenue, collected, expensesTotal, remaining: Math.max(0, revenue - collected), profit: revenue - expensesTotal };
  }, [trips, collections, expenses]);

  const answer = (raw: string) => {
    const q = raw.trim().toLowerCase();
    if (!q) return;
    setMessages(prev => [...prev, { role: 'user', text: raw }]);
    let reply = 'أقدر أساعدك في الحسابات، الرحلات، العملاء، السائقين، الشاحنات والتقارير. جرّب: «كم المحصل اليوم؟» أو «افتح المالية».';
    let action: { label: string; tab: string } | undefined;

    if (q.includes('افتح') || q.includes('وين') || q.includes('أين')) {
      if (q.includes('مالي') || q.includes('حساب') || q.includes('قبض') || q.includes('صرف')) { reply = 'هذا قسم المالية. ستجد فيه سندات القبض والصرف والمؤشرات المالية.'; action = { label: 'فتح المالية', tab: 'FINANCIAL' }; }
      else if (q.includes('تقرير')) { reply = 'هذا مركز التقارير. التقارير القديمة محفوظة ولن أحذفها.'; action = { label: 'فتح التقارير', tab: 'REPORTS' }; }
      else if (q.includes('عميل')) { reply = `لديك ${customers.length} عميلًا مسجلًا.`; action = { label: 'فتح العملاء', tab: 'CUSTOMERS' }; }
      else if (q.includes('رحل')) { reply = `لديك ${trips.length} رحلة مسجلة.`; action = { label: 'فتح الرحلات', tab: 'TRIPS' }; }
      else if (q.includes('سائق')) { reply = `لديك ${drivers.length} سائقًا مسجلًا.`; action = { label: 'فتح السائقين', tab: 'DRIVERS' }; }
      else if (q.includes('شاحن')) { reply = `لديك ${trucks.length} شاحنة مسجلة.`; action = { label: 'فتح الشاحنات', tab: 'TRUCKS' }; }
      else if (q.includes('صيانه') || q.includes('صيانة')) { reply = 'هذا قسم الصيانة ويمكنك متابعة سجلات الصيانة من هناك.'; action = { label: 'فتح الصيانة', tab: 'MAINTENANCE' }; }
    } else if (q.includes('إيراد') || q.includes('دخل')) {
      reply = `إجمالي قيمة الرحلات المسجلة حاليًا: ${money(stats.revenue)} ر.س.`; action = { label: 'تفاصيل المالية', tab: 'FINANCIAL' };
    } else if (q.includes('محصل') || q.includes('تحصيل')) {
      reply = `إجمالي التحصيلات المسجلة: ${money(stats.collected)} ر.س. والمتبقي المحسوب من قيمة الرحلات: ${money(stats.remaining)} ر.س.`; action = { label: 'سندات القبض', tab: 'COLLECTIONS' };
    } else if (q.includes('مصروف') || q.includes('صرف')) {
      reply = `إجمالي المصروفات المسجلة: ${money(stats.expensesTotal)} ر.س.`; action = { label: 'سندات الصرف', tab: 'EXPENSES' };
    } else if (q.includes('صافي') || q.includes('ربح')) {
      reply = `الصافي التشغيلي المحسوب من البيانات الحالية: ${money(stats.profit)} ر.س (الإيرادات ناقص المصروفات).`; action = { label: 'فتح المالية', tab: 'FINANCIAL' };
    } else if (q.includes('دين') || q.includes('متبقي') || q.includes('آجل')) {
      reply = `المبالغ المتبقية المحسوبة حاليًا: ${money(stats.remaining)} ر.س. افتح المالية لمراجعة الحركات وكشوف الحساب.`; action = { label: 'مراجعة المديونية', tab: 'FINANCIAL' };
    } else if (q.includes('مساعدة') || q.includes('كيف') || q.includes('ساعد')) {
      reply = 'يمكنني توجيهك للمالية والتقارير والرحلات والعملاء والسائقين والشاحنات والصيانة، وقراءة المؤشرات الموجودة في النظام.';
    }

    window.setTimeout(() => setMessages(prev => [...prev, { role: 'assistant', text: reply, action }]), 180);
    setInput('');
  };

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-50 group flex items-center gap-2 rounded-full bg-[#0b1730] border border-orange-400/40 text-white px-4 py-3 shadow-2xl hover:-translate-y-1 transition-all" aria-label="مساعد إيجاز"><span className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shadow-lg"><Sparkles className="w-4 h-4" /></span><span className="text-xs font-black hidden sm:block">مساعد إيجاز</span><span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0b1730]" /></button>;
  }

  return <div className="fixed bottom-5 left-4 right-4 sm:left-5 sm:right-auto z-50 w-auto sm:w-[390px] rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-2xl animate-[ejaz-pop_.22s_ease-out]" dir="rtl">
    <div className="bg-gradient-to-l from-[#071328] to-[#102544] text-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center"><Bot className="w-5 h-5" /></span><div><b className="block text-sm">مساعد إيجاز</b><span className="text-[10px] text-emerald-300">مساعد النظام • يقرأ بياناتك الحالية</span></div></div>
      <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/10"><X className="w-4 h-4" /></button>
    </div>
    <div className="p-3 max-h-[55vh] overflow-y-auto space-y-2 bg-slate-50">
      {messages.map((m, i) => <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}><div className={`${m.role === 'user' ? 'bg-[#10203a] text-white' : 'bg-white text-slate-700 border border-slate-200'} max-w-[88%] rounded-2xl px-3 py-2.5 text-xs leading-6 whitespace-pre-line shadow-sm`}>{m.text}{m.action && <button onClick={() => onNavigate(m.action!.tab)} className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-orange-600"><Navigation className="w-3.5 h-3.5" />{m.action.label}</button>}</div></div>)}
    </div>
    <div className="p-3 bg-white border-t border-slate-100">
      <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1"><button onClick={() => answer('كم إجمالي الإيرادات؟')} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-100 text-[10px] font-bold">الإيرادات</button><button onClick={() => answer('كم المحصل؟')} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-100 text-[10px] font-bold">التحصيل</button><button onClick={() => answer('كم الصافي؟')} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-100 text-[10px] font-bold">الصافي</button><button onClick={() => answer('كيف أستخدم النظام؟')} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-100 text-[10px] font-bold">مساعدة</button></div>
      <div className="flex items-center gap-2"><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') answer(input); }} placeholder="اسأل مساعد إيجاز..." className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400" /><button onClick={() => answer(input)} className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center"><Send className="w-4 h-4" /></button></div>
      <div className="mt-2 text-[9px] text-slate-400 flex items-center gap-1"><CircleHelp className="w-3 h-3" />لا ينفذ عمليات مالية مباشرة دون تأكيد أو صلاحية.</div>
    </div>
  </div>;
};

export default EjazAssistant;
