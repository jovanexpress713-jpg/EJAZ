import { Trip, CompanySettings } from '../types';
import { safeOpenUrl, safePrintHtml } from './safeBrowser';

/**
 * Format a comprehensive, clean Arabic WhatsApp message for a trip report
 */
export function formatTripReportMessage(trip: Trip, companyName?: string): string {
  const cName = companyName || 'مؤسسة إيجاز للنقليات';
  const tripTypeLabel = trip.tripType || 'رحلة داخلية';
  
  const taxText = (trip.taxAmount && trip.taxAmount > 0) 
    ? `${trip.taxAmount.toLocaleString()} ر.س (${trip.taxRate ?? 0}%)` 
    : '0 ر.س (غير خاضع للضريبة / معفى)';

  return `🚛 *تقرير رحلة نقل رسمي – ${cName}*

📋 *بيانات الرحلة الأساسية:*
• *رقم الرحلة:* ${trip.tripNumber}
• *تاريخ الرحلة:* ${trip.date}
• *نوع الرحلة:* ${tripTypeLabel}
• *حالة الرحلة:* ${trip.status}

👤 *بيانات العميل والشحنة:*
• *العميل:* ${trip.customerName}
• *جوال العميل:* ${trip.customerPhone || 'غير مسجل'}
• *نوع البضاعة/الحمولة:* ${trip.cargoType}
• *موقع التحميل:* ${trip.loadingLocation}
• *موقع التنزيل:* ${trip.unloadingLocation}

🚚 *بيانات السائق والأسطول:*
• *السائق المسؤول:* ${trip.driverName}
• *جوال السائق:* ${trip.driverPhone || 'غير مسجل'}
• *الشاحنة واللوحة:* ${trip.plateNumber} (${trip.truckType})

💰 *البيان المالي والضريبي:*
• *قيمة أجور النقل الأساسية:* ${trip.baseAmount.toLocaleString()} ر.س
• *الضريبة:* ${taxText}
• *الإجمالي شامل الضريبة:* ${trip.totalAmount.toLocaleString()} ر.س
• *المبلغ المسدد:* ${trip.paidAmount.toLocaleString()} ر.س
• *المبلغ المتبقي:* ${trip.remainingAmount.toLocaleString()} ر.س
• *طريقة وحالة السداد:* ${trip.paymentMethod} (${trip.paymentStatus})

📊 *التشغيل والربحية:*
• *مصروفات الرحلة (وقود ورسوم):* ${(trip.tripExpenses || 0).toLocaleString()} ر.س
• *عهدة السائق:* ${(trip.driverCustody || 0).toLocaleString()} ر.س
• *صافي ربح الرحلة:* ${(trip.netProfit || 0).toLocaleString()} ر.س

${trip.notes ? `📝 *الملاحظات وجهة التحصيل:* ${trip.notes}\n` : ''}
✅ *تم الإصدار بواسطة نظام إيجاز للنقليات المعتمد.*`;
}

/**
 * Share trip report via WhatsApp or native device share
 */
export async function shareTripReportViaWhatsApp(trip: Trip, targetPhone?: string, settings?: CompanySettings) {
  const message = formatTripReportMessage(trip, settings?.nameAr);
  
  // 1. Try Native Web Share API first on supported mobile devices
  if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent.toLowerCase())) {
    try {
      await navigator.share({
        title: `تقرير رحلة ${trip.tripNumber} - ${trip.customerName}`,
        text: message,
      });
      return;
    } catch (err) {
      // If user cancelled or failed, fall back to WhatsApp URL
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // 2. Direct WhatsApp URL fallback
  const phone = (targetPhone || trip.customerPhone || '').replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  const waUrl = phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;

  safeOpenUrl(waUrl);
}

export function shareTripViaWhatsApp(trip: Trip, customerPhone?: string) {
  shareTripReportViaWhatsApp(trip, customerPhone);
}

export function printTripWaybill(trip: Trip, settings?: CompanySettings) {
  const companyName = settings?.nameAr || 'مؤسسة إيجاز للنقليات';
  const commercialReg = settings?.crNumber || '1010899234';
  const taxNumber = settings?.taxNumber || '300984729100003';
  const phone = settings?.phone || '+966 50 123 4567';
  const address = settings?.address || 'الرياض - حي الملز، المملكة العربية السعودية';

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بوليصة شحن - ${trip.tripNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', sans-serif; padding: 25px; color: #0f172a; background: #fff; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
    .company-title { font-size: 22px; font-weight: 900; color: #0f172a; }
    .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .doc-badge { background: #f97316; color: #fff; padding: 6px 14px; border-radius: 8px; font-size: 14px; font-weight: 800; text-align: center; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 18px; font-size: 12px; }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 10px; color: #64748b; font-weight: 600; }
    .meta-val { font-weight: 700; color: #0f172a; margin-top: 2px; }
    .section-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 14px 0 8px 0; border-right: 4px solid #f97316; padding-right: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: right; font-weight: 700; font-size: 11px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .totals-box { margin-right: auto; width: 320px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 12px; margin-bottom: 20px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals-row.grand { font-size: 14px; font-weight: 900; color: #0f172a; border-top: 1px solid #94a3b8; margin-top: 4px; padding-top: 6px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-top: 40px; font-size: 11px; }
    .sig-box { border-top: 1px dashed #94a3b8; padding-top: 8px; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    @media print {
      body { padding: 5mm; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-title">${companyName}</div>
      <div class="company-sub">س.ت: ${commercialReg} | الرقم الضريبي: ${taxNumber}</div>
      <div class="company-sub">${address} | هاتف: ${phone}</div>
    </div>
    <div>
      <div class="doc-badge">${trip.operationType === 'SUBCONTRACTED_SPOT' || trip.isSubcontracted ? 'بوليصة شحن - تشغيل لوجستي' : 'بوليصة شحن ونقل بري'}</div>
      <div style="text-align: center; font-size: 12px; font-weight: 800; margin-top: 6px; font-family: monospace;">${trip.tripNumber}</div>
      <div style="text-align: center; font-size: 10px; font-weight: 800; color: #b45309; background: #fffbeb; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a; margin-top: 3px; font-family: monospace;">
        كود المركز: ${trip.financialCenterCode || ('FIN-' + (trip.tripNumber || '').replace('TRP-', ''))}
      </div>
    </div>
  </div>

  <div class="meta-grid" style="grid-template-columns: repeat(4, 1fr);">
    <div class="meta-item"><span class="meta-label">تاريخ الإصدار</span><span class="meta-val">${trip.date}</span></div>
    <div class="meta-item"><span class="meta-label">نوع وتشغيل الرحلة</span><span class="meta-val" style="color: #ea580c;">${trip.operationType === 'SUBCONTRACTED_SPOT' || trip.isSubcontracted ? 'وساطة وتشغيل لحظي' : (trip.tripType || 'رحلة داخلية')}</span></div>
    <div class="meta-item"><span class="meta-label">حالة الرحلة</span><span class="meta-val">${trip.status}</span></div>
    <div class="meta-item"><span class="meta-label">طريقة السداد</span><span class="meta-val">${trip.paymentMethod}</span></div>
  </div>

  <div class="section-title">بيانات أطراف النقل والأسطول</div>
  <table>
    <tr>
      <th style="width: 50%;">العميل (المرسل / المستلم)</th>
      <th style="width: 50%;">${trip.operationType === 'SUBCONTRACTED_SPOT' || trip.isSubcontracted ? 'الناقل والشاحنة المعتمدة (تشغيل ووساطة)' : 'السائق والشاحنة المعتمدة'}</th>
    </tr>
    <tr>
      <td>
        <strong>${trip.customerName}</strong><br>
        الجوال: ${trip.customerPhone || 'غير مسجل'}<br>
        العنوان: ${trip.customerAddress || 'الرياض'}
      </td>
      <td>
        <strong>${trip.externalCarrierName || trip.driverName}</strong> (جوال: ${trip.externalCarrierPhone || trip.driverPhone || 'غير مسجل'})<br>
        لوحة الشاحنة: ${trip.externalTruckPlate || trip.plateNumber} | النوع: ${trip.truckType || 'تريلا'}
        ${trip.operationType === 'SUBCONTRACTED_SPOT' || trip.isSubcontracted ? '<br><span style="font-size: 10px; color: #7e22ce; font-weight: bold;">(تشغيل لوجستي معتمد من قبل مؤسسة إيجاز للنقليات)</span>' : ''}
      </td>
    </tr>
  </table>

  <div class="section-title">تفاصيل المسار والحمولة</div>
  <table>
    <thead>
      <tr>
        <th>موقع التحميل</th>
        <th>موقع التنزيل والتسليم</th>
        <th>نوع البضاعة المنقولة</th>
        <th>وقت التحميل والتسليم</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${trip.loadingLocation}</td>
        <td>${trip.unloadingLocation}</td>
        <td>${trip.cargoType}</td>
        <td>${trip.loadingTime}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">البيان المالي والضريبي</div>
  <div class="totals-box">
    <div class="totals-row"><span>أجور النقل الأساسية:</span><span>${trip.baseAmount.toLocaleString()} ر.س</span></div>
    <div class="totals-row"><span>ضريبة القيمة المضافة (${trip.taxRate ?? 0}%):</span><span>${(trip.taxAmount || 0).toLocaleString()} ر.س</span></div>
    <div class="totals-row grand"><span>الإجمالي المستحق:</span><span>${trip.totalAmount.toLocaleString()} ر.س</span></div>
    <div class="totals-row" style="color: #047857;"><span>المبلغ المسدد:</span><span>${trip.paidAmount.toLocaleString()} ر.س</span></div>
    <div class="totals-row" style="color: #b45309; font-weight: bold;"><span>المتبقي المطلوب:</span><span>${trip.remainingAmount.toLocaleString()} ر.س</span></div>
  </div>

  ${trip.notes ? `<div style="font-size: 12px; background: #fffbeb; border: 1.5px solid #fde68a; padding: 10px 14px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; color: #78350f;"><span style="color: #d97706; font-weight: 900;">📌 الملاحظات وجهة التحصيل:</span> ${trip.notes}</div>` : ''}

  <div class="signatures">
    <div class="sig-box">توقيع وختم المرسل (العميل)</div>
    <div class="sig-box">توقيع واستلام السائق</div>
    <div class="sig-box">توقيع المستلم النهائي</div>
  </div>

  <div class="footer">
    تم إصدار هذه الوثيقة إلكترونيًا عبر نظام إيجاز للنقليات المعتمد © ${new Date().getFullYear()}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    }
  </script>
</body>
</html>
`;

  safePrintHtml(html);
}
