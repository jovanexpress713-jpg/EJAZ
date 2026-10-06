/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Share2, 
  CheckCircle2, 
  X, 
  Calendar, 
  DollarSign, 
  Clock, 
  Truck, 
  FileSpreadsheet, 
  Download,
  ShieldCheck,
  Send,
  Building2,
  Check
} from 'lucide-react';
import { safeOpenUrl, safePrintHtml } from '../utils/safeBrowser';
import { User, Trip, DailyHandoverReport, CompanySettings } from '../types';
import { StorageService } from '../services/storage';
import { exportDailyHandoverToExcel } from '../utils/excelExporter';

interface DailyHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  trips: Trip[];
  settings?: CompanySettings;
  onRefresh?: () => void;
}

export const DailyHandoverModal: React.FC<DailyHandoverModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  trips,
  settings,
  onRefresh,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [officerName, setOfficerName] = useState<string>(() => currentUser.fullName || currentUser.username || 'مسؤول العمليات');
  const [recipientName, setRecipientName] = useState<string>(() => settings?.nameAr ? `مالك ${settings.nameAr}` : 'المالك / المدير العام');
  const [ownerPhone, setOwnerPhone] = useState<string>(() => settings?.ownerPhone || settings?.phone || '');
  const [handoverNotes, setHandoverNotes] = useState<string>('تمت مراجعة ومطابقة كافة إيرادات وعهد ومصاريف الوردية وتسليم النقد الفعلي.');
  const [feedback, setFeedback] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'NEW_HANDOVER' | 'ARCHIVE'>('NEW_HANDOVER');

  // Calculate live summary for selected date
  const summary = useMemo(() => {
    return StorageService.calculateTodayHandoverSummary(selectedDate);
  }, [selectedDate, trips]);

  const reportNumber = `HND-${selectedDate.replace(/-/g, '')}-001`;

  if (!isOpen) return null;

  // Handle WhatsApp Share to Mobile
  const handleShareToMobile = () => {
    const orgName = settings?.nameAr || 'مؤسسة إيجاز للنقليات';
    const text = `📋 *محضر التسليم والترحيل النهاري - ${orgName}*
🔢 *رقم المحضر:* ${reportNumber}
📅 *التاريخ:* ${selectedDate}
⏰ *وقت الإعداد:* ${new Date().toLocaleTimeString('ar-SA')}
👤 *مسؤول التسليم:* ${officerName}
👑 *المستلم (المالك):* ${recipientName}

───────────────────
📊 *ملخص أرقام الوردية اليومية:*
• 🚛 إجمالي الرحلات: ${summary.totalTripsToday} رحلة (${summary.internalTripsCount} أسطول داخلي + ${summary.spotBrokerTripsCount} وساطة لحظية)
• 💵 إجمالي النقد المحصل اليوم (كاش): ${summary.totalCashCollected.toLocaleString()} ر.س
• 🏦 إجمالي التحويلات البنكية اليوم: ${summary.totalBankTransfers.toLocaleString()} ر.س
• 💳 إجمالي العهد المنصرفة للسائقين: ${summary.totalCustodyDisbursed.toLocaleString()} ر.س
• ⛽ إجمالي المصاريف التشغيلية اليوم: ${summary.totalExpensesToday.toLocaleString()} ر.س
• 🤝 أرباح الوساطة والرحلات اللحظية (الهامش): ${summary.totalBrokerageProfitToday.toLocaleString()} ر.س

───────────────────
💰 *صافي النقد الفعلي الجاهز للتسليم للمالك:*
★ *${summary.netCashToDeliver.toLocaleString()} ر.س* ★

📝 *ملاحظات:* ${handoverNotes || 'لا توجد'}

تم الإعداد والترحيل إلكترونياً عبر نظام إيجاز للنقليات المعتمد.`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = ownerPhone.replace(/[^\d]/g, '');
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    safeOpenUrl(url);
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    exportDailyHandoverToExcel({
      reportNumber,
      date: selectedDate,
      officerName,
      recipientName,
      totalTripsToday: summary.totalTripsToday,
      internalTripsCount: summary.internalTripsCount,
      spotBrokerTripsCount: summary.spotBrokerTripsCount,
      totalCashCollected: summary.totalCashCollected,
      totalBankTransfers: summary.totalBankTransfers,
      totalCustodyDisbursed: summary.totalCustodyDisbursed,
      totalExpensesToday: summary.totalExpensesToday,
      totalBrokerageProfitToday: summary.totalBrokerageProfitToday,
      netCashToDeliver: summary.netCashToDeliver,
      trips: summary.trips,
    }, settings);
    setFeedback('تم تصدير محضر التسليم النهاري إلى ملف Excel بنجاح!');
  };

  // Handle Print A4
  const handlePrint = () => {
    const orgName = settings?.nameAr || 'مؤسسة إيجاز للنقليات';
    const crNumber = settings?.crNumber || '1010789452';
    const taxNumber = settings?.taxNumber || '310458921100003';

    const rowsHtml = summary.trips.map((t, idx) => {
      const isSpot = t.operationType === 'SUBCONTRACTED_SPOT' || t.isSubcontracted;
      return `
        <tr>
          <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${idx + 1}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; font-family: monospace;">${t.tripNumber}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; color: #b45309; font-weight: bold;">${t.financialCenterCode || 'FIN-' + t.tripNumber.replace('TRP-', '')}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">${isSpot ? '🤝 وساطة لحظية' : '🚛 أسطول داخلي'}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">${t.customerName}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">${t.driverName} (${t.plateNumber})</td>
          <td style="text-align:left; padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${(t.totalAmount || 0).toLocaleString()}</td>
          <td style="text-align:left; padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; color: #047857; font-weight: bold;">${(t.paidAmount || 0).toLocaleString()}</td>
          <td style="text-align:left; padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; color: #b45309; font-weight: bold;">${(t.remainingAmount || 0).toLocaleString()}</td>
          <td style="text-align:left; padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; color: #6d28d9; font-weight: bold;">${isSpot ? (t.brokerageMargin || 0).toLocaleString() : '—'}</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>محضر التسليم والترحيل النهاري للمالك - ${selectedDate}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 6mm 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
    body { padding: 15px; color: #0f172a; line-height: 1.35; font-size: 10pt; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
    .title { font-size: 18pt; font-weight: 900; color: #0f172a; }
    .badge { background: #0f172a; color: #fff; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 11pt; }
    .meta-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 9pt; }
    .grid-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px; text-align: center; }
    .kpi.highlight { background: #0f172a; color: #fff; border-color: #0f172a; }
    .kpi-lbl { font-size: 8.5pt; color: #475569; font-weight: 700; }
    .kpi.highlight .kpi-lbl { color: #f8fafc; }
    .kpi-val { font-size: 13pt; font-weight: 900; font-family: monospace; margin-top: 3px; }
    .kpi.highlight .kpi-val { color: #fb923c; font-size: 15pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5pt; }
    th { background: #0f172a; color: #fff; padding: 5px; text-align: right; font-weight: 800; font-size: 8.5pt; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 25px; text-align: center; }
    .sig-box { border: 1.5px dashed #94a3b8; border-radius: 8px; padding: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${orgName}</div>
      <div style="font-size: 9pt; color: #64748b; font-weight: bold;">س.ت: ${crNumber} | الرقم الضريبي: ${taxNumber}</div>
    </div>
    <div style="text-align: left;">
      <div class="badge">محضر التسليم والترحيل النهاري</div>
      <div style="font-family: monospace; font-size: 9pt; font-weight: bold; margin-top: 4px;">${reportNumber}</div>
    </div>
  </div>

  <div class="meta-box">
    <div><strong>تاريخ الوردية:</strong> ${selectedDate}</div>
    <div><strong>وقت الإعداد:</strong> ${new Date().toLocaleTimeString('ar-SA')}</div>
    <div><strong>مسؤول التسليم:</strong> ${officerName}</div>
    <div><strong>المستلم (المالك):</strong> ${recipientName}</div>
  </div>

  <div class="grid-kpis">
    <div class="kpi">
      <div class="kpi-lbl">إجمالي الرحلات اليوم</div>
      <div class="kpi-val">${summary.totalTripsToday} رحلة</div>
      <div style="font-size: 7.5pt; color: #64748b;">${summary.internalTripsCount} أسطول + ${summary.spotBrokerTripsCount} وساطة</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">إجمالي النقد المحصل (كاش)</div>
      <div class="kpi-val" style="color: #047857;">${summary.totalCashCollected.toLocaleString()} ر.س</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">إجمالي التحويلات البنكية</div>
      <div class="kpi-val" style="color: #1e40af;">${summary.totalBankTransfers.toLocaleString()} ر.س</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">العهد المنصرفة للسائقين</div>
      <div class="kpi-val" style="color: #ea580c;">${summary.totalCustodyDisbursed.toLocaleString()} ر.س</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">المصاريف التشغيلية اليوم</div>
      <div class="kpi-val" style="color: #b91c1c;">${summary.totalExpensesToday.toLocaleString()} ر.س</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">أرباح الوساطة والرحلات اللحظية</div>
      <div class="kpi-val" style="color: #6d28d9;">${summary.totalBrokerageProfitToday.toLocaleString()} ر.س</div>
    </div>
  </div>

  <div class="kpi highlight" style="margin-bottom: 14px;">
    <div class="kpi-lbl">★ صافي النقد الفعلي الجاهز للتسليم للمالك (النقد الفعلي في الصندوق) ★</div>
    <div class="kpi-val">${summary.netCashToDeliver.toLocaleString()} ر.س</div>
  </div>

  <div style="font-weight: 800; font-size: 9.5pt; margin-bottom: 6px; border-right: 4px solid #ea580c; padding-right: 6px;">
    تفاصيل رحلات وعمليات الوردية المرتبطة بالقائم المالي
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 4%;">م</th>
        <th style="width: 14%;">رقم الرحلة</th>
        <th style="width: 14%;">كود القائم المالي</th>
        <th style="width: 12%;">نوع التشغيل</th>
        <th style="width: 16%;">العميل</th>
        <th style="width: 16%;">السائق والشاحنة</th>
        <th style="width: 10%;">الإجمالي</th>
        <th style="width: 10%;">المحصل</th>
        <th style="width: 10%;">المتبقي</th>
        <th style="width: 10%;">هامش الوساطة</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding: 15px;">لا توجد رحلات مسجلة في هذا اليوم.</td></tr>'}
    </tbody>
  </table>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; font-size: 8.5pt;">
    <strong>📌 ملاحظات واعتمادات التسليم:</strong> ${handoverNotes}
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div style="font-weight: bold; margin-bottom: 25px;">توقيع واعتماد مسؤول التسليم</div>
      <div><strong>${officerName}</strong></div>
    </div>
    <div class="sig-box">
      <div style="font-weight: bold; margin-bottom: 25px;">توقيع واستلام المالك / الإدارة</div>
      <div><strong>${recipientName}</strong></div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    }
  </script>
</body>
</html>`;

    safePrintHtml(html);
  };

  // Handle Save Handover
  const handleSave = () => {
    const report: DailyHandoverReport = {
      id: `HND-${Date.now()}`,
      reportNumber,
      date: selectedDate,
      handoverTime: new Date().toLocaleTimeString('ar-SA'),
      officerName,
      recipientName,
      recipientPhone: ownerPhone,
      totalTripsToday: summary.totalTripsToday,
      internalTripsCount: summary.internalTripsCount,
      spotBrokerTripsCount: summary.spotBrokerTripsCount,
      totalCashCollected: summary.totalCashCollected,
      totalBankTransfers: summary.totalBankTransfers,
      totalCustodyDisbursed: summary.totalCustodyDisbursed,
      totalExpensesToday: summary.totalExpensesToday,
      totalBrokerageProfitToday: summary.totalBrokerageProfitToday,
      netCashToDeliver: summary.netCashToDeliver,
      notes: handoverNotes,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    StorageService.saveDailyHandover(report, currentUser);
    setFeedback('تم حفظ واعتماد محضر التسليم النهاري بنجاح في سجلات النظام!');
    if (onRefresh) onRefresh();
  };

  const savedHandovers = StorageService.getDailyHandovers();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">محضر التسليم والترحيل النهاري للمالك</h3>
                <span className="bg-orange-500/20 text-orange-400 font-mono text-[11px] px-2 py-0.5 rounded-full border border-orange-500/30">
                  {reportNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تصفية وتسليم الإيرادات، النقد الفعلي، العهد، أرباح الوساطة، وحسابات الوردية اليومية للمالك مباشرة.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('NEW_HANDOVER')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTab === 'NEW_HANDOVER'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 محضر تسليم اليوم
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ARCHIVE')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTab === 'ARCHIVE'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📁 أرشيف محاضر التسليم السابقة ({savedHandovers.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">تاريخ الوردية:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback('')} className="text-emerald-700 font-bold">✕</button>
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'NEW_HANDOVER' ? (
            <>
              {/* Officer & Recipient Settings */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مسؤول التسليم (المسلّم)</label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={e => setOfficerName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المستلم (المالك / المدير)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم جوال المالك (لإرسال المحضر واتساب)</label>
                  <input
                    type="tel"
                    placeholder="9665XXXXXXXX"
                    value={ownerPhone}
                    onChange={e => setOwnerPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-bold">إجمالي رحلات اليوم</div>
                  <div className="font-mono text-base font-black text-slate-900 mt-1">{summary.totalTripsToday} رحلة</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{summary.internalTripsCount} أسطول | {summary.spotBrokerTripsCount} وساطة</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-[10px] text-emerald-800 font-bold">النقد المحصل (كاش)</div>
                  <div className="font-mono text-base font-black text-emerald-900 mt-1">{summary.totalCashCollected.toLocaleString()} ر.س</div>
                  <div className="text-[9px] text-emerald-700 mt-0.5">جاهز للتسليم الفعلي</div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                  <div className="text-[10px] text-blue-800 font-bold">التحويلات البنكية</div>
                  <div className="font-mono text-base font-black text-blue-900 mt-1">{summary.totalBankTransfers.toLocaleString()} ر.س</div>
                  <div className="text-[9px] text-blue-700 mt-0.5">بحساب المؤسسة</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <div className="text-[10px] text-amber-800 font-bold">العهد المنصرفة</div>
                  <div className="font-mono text-base font-black text-amber-900 mt-1">{summary.totalCustodyDisbursed.toLocaleString()} ر.س</div>
                  <div className="text-[9px] text-amber-700 mt-0.5">سائقين</div>
                </div>

                <div className="bg-red-50 border border-red-200 p-3 rounded-xl">
                  <div className="text-[10px] text-red-800 font-bold">المصاريف التشغيلية</div>
                  <div className="font-mono text-base font-black text-red-900 mt-1">{summary.totalExpensesToday.toLocaleString()} ر.س</div>
                  <div className="text-[9px] text-red-700 mt-0.5">وقود ومصروفات</div>
                </div>

                <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
                  <div className="text-[10px] text-purple-800 font-bold">أرباح الوساطة اللحظية</div>
                  <div className="font-mono text-base font-black text-purple-900 mt-1">{summary.totalBrokerageProfitToday.toLocaleString()} ر.س</div>
                  <div className="text-[9px] text-purple-700 mt-0.5">فارق النولون</div>
                </div>
              </div>

              {/* Main Net Cash Delivery Highlight Box */}
              <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <h4 className="font-black text-base sm:text-lg text-white">صافي النقد الفعلي المسلّم للمالك</h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    (النقد المحصل كاش - العهد والمصاريف النقدية المدفوعة) الواجب تسليمه بيد المالك عند انتهاء الوردية.
                  </p>
                </div>
                <div className="text-left bg-black/40 border border-orange-500/40 px-5 py-3 rounded-xl shrink-0">
                  <div className="text-[10px] text-orange-400 font-bold text-center">المبلغ الصافي للتسليم</div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-orange-400 text-center">
                    {summary.netCashToDeliver.toLocaleString()} <span className="text-sm font-normal">ر.س</span>
                  </div>
                </div>
              </div>

              {/* Trips Table for Today */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>جدول حركات ورحلات الوردية لليوم ({summary.trips.length} رحلة)</span>
                  <span className="text-[11px] text-slate-500">مرتبطة بالقائم المالي</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#0F172A] text-white font-bold">
                      <tr>
                        <th className="p-2.5 w-8 text-center">م</th>
                        <th className="p-2.5">رقم الرحلة</th>
                        <th className="p-2.5">كود القائم المالي</th>
                        <th className="p-2.5">النوع</th>
                        <th className="p-2.5">العميل</th>
                        <th className="p-2.5">السائق والشاحنة</th>
                        <th className="p-2.5">الإجمالي</th>
                        <th className="p-2.5 text-emerald-400">المحصل</th>
                        <th className="p-2.5 text-amber-300">المتبقي</th>
                        <th className="p-2.5 text-purple-300">هامش الوساطة</th>
                        <th className="p-2.5">طريقة السداد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.trips.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-slate-500 text-xs">
                            لا توجد رحلات مسجلة في تاريخ ({selectedDate}). يمكنك تغيير التاريخ أعلاه لعرض وردية أخرى.
                          </td>
                        </tr>
                      ) : (
                        summary.trips.map((t, idx) => {
                          const isSpot = t.operationType === 'SUBCONTRACTED_SPOT' || t.isSubcontracted;
                          return (
                            <tr key={t.id} className="hover:bg-slate-50 transition">
                              <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-bold font-mono text-slate-900">{t.tripNumber}</td>
                              <td className="p-2.5 font-bold font-mono text-amber-800">
                                <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {t.financialCenterCode || 'FIN-' + t.tripNumber.replace('TRP-', '')}
                                </span>
                              </td>
                              <td className="p-2.5">
                                {isSpot ? (
                                  <span className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-200">
                                    🤝 وساطة لحظية
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    🚛 أسطول
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-semibold text-slate-800">{t.customerName}</td>
                              <td className="p-2.5 text-slate-700">{t.driverName} ({t.plateNumber})</td>
                              <td className="p-2.5 font-mono font-bold text-slate-900">{(t.totalAmount || 0).toLocaleString()}</td>
                              <td className="p-2.5 font-mono font-bold text-emerald-700">{(t.paidAmount || 0).toLocaleString()}</td>
                              <td className="p-2.5 font-mono font-bold text-amber-700">{(t.remainingAmount || 0).toLocaleString()}</td>
                              <td className="p-2.5 font-mono font-bold text-purple-700">
                                {isSpot ? `+${(t.brokerageMargin || 0).toLocaleString()}` : '—'}
                              </td>
                              <td className="p-2.5 text-slate-600 text-[11px]">{t.paymentMethod || 'نقدي'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Handover Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات وإقرار التسليم النهائي</label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={e => setHandoverNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  placeholder="اكتب أي ملاحظات على الوردية أو العهد..."
                />
              </div>
            </>
          ) : (
            /* Archive Tab */
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-800">محاضر التسليم النهاري المحفوظة والمعتمدة</h4>
              {savedHandovers.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                  لا توجد محاضر محفوظة سابقة. عند الضغط على "حفظ واعتماد محضر التسليم" سيتم حفظه هنا كأرشيف دائم.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {savedHandovers.map(h => (
                    <div key={h.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 text-sm">{h.reportNumber}</span>
                          <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px]">معتمد ومسلّم</span>
                          <span className="text-slate-400 font-mono">{h.date} - {h.handoverTime}</span>
                        </div>
                        <div className="text-slate-600 mt-1 flex flex-wrap gap-3">
                          <span>المسلّم: <strong>{h.officerName}</strong></span>
                          <span>المستلم: <strong>{h.recipientName}</strong></span>
                          <span>الرحلات: <strong>{h.totalTripsToday} رحلة</strong></span>
                        </div>
                        {h.notes && <div className="text-[11px] text-slate-500 mt-1">📌 {h.notes}</div>}
                      </div>

                      <div className="text-left bg-slate-50 p-2.5 rounded-lg border border-slate-200 shrink-0">
                        <div className="text-[10px] text-slate-500">صافي النقد المسلّم</div>
                        <div className="font-mono font-black text-sm text-emerald-800">{h.netCashToDeliver.toLocaleString()} ر.س</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'NEW_HANDOVER' && (
              <>
                <button
                  type="button"
                  onClick={handleShareToMobile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="إرسال نص التقرير والأرقام إلى جوال المالك عبر واتساب"
                >
                  <Share2 className="w-4 h-4 text-white" />
                  <span>📱 إرسال لجوالي (واتساب)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="تصدير محضر التسليم إلى ملف Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>📊 تصدير Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="طباعة محضر التسليم A4"
                >
                  <Printer className="w-4 h-4 text-orange-400" />
                  <span>🖨️ طباعة A4</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'NEW_HANDOVER' && (
              <button
                type="button"
                onClick={handleSave}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm py-2 px-4 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ واعتماد محضر التسليم</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm py-2 px-4 rounded-xl transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
