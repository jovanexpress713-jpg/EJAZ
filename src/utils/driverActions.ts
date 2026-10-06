import { Driver, CompanySettings, Truck, Trip } from '../types';
import { generateTripUniqueKey } from './uniqueKeyService';
import { safeOpenUrl, safePrintHtml } from './safeBrowser';

/**
 * Format a comprehensive, clean Arabic WhatsApp / Telegram message for a Driver Card & Accreditation
 */
export function formatDriverCardMessage(driver: Driver, settings?: CompanySettings, truck?: Truck): string {
  const companyName = settings?.nameAr || 'مؤسسة إيجاز للنقليات';
  const companyPhone = settings?.phone || '+966 50 123 4567';
  const truckPlate = driver.assignedPlateNumber || truck?.plateNumber || 'غير مخصص';
  const truckModel = truck ? `${truck.model} (${truck.truckType})` : '';

  return `🪪 *بطاقة تعريف وتفويض سائق رسمي – ${companyName}*
━━━━━━━━━━━━━━━━━━━━━
👤 *البيانات الشخصية للسائق:*
• *الاسم الكامل:* ${driver.name}
• *الرقم التعريفي:* ${driver.id}
• *رقم الجوال:* ${driver.phone || 'غير مسجل'}
• *رقم الهوية / الإقامة:* ${driver.nationalId || 'غير مسجل'}
• *الجنسية:* ${driver.nationality || 'غير محدد'}
• *المسمى الوظيفي:* ${driver.jobTitle || 'سائق نقل ثقيل معتمد'}
${driver.bloodType ? `• *فصيلة الدم:* ${driver.bloodType}\n` : ''}${driver.emergencyContact ? `• *هاتف الطوارئ:* ${driver.emergencyContact}\n` : ''}
📄 *بيانات رخصة القيادة:*
• *رقم الرخصة:* ${driver.licenseNumber || 'غير مسجل'}
• *تاريخ انتهاء الرخصة:* ${driver.licenseExpiry || 'غير مسجل'}
• *حالة السائق:* ${driver.status === 'ACTIVE' ? 'على رأس العمل (نشط)' : driver.status === 'VACATION' ? 'في إجازة' : 'موقوف'}

🚛 *المركبة والشاحنة المخصصة:*
• *رقم اللوحة:* ${truckPlate}
${truckModel ? `• *طراز الشاحنة:* ${truckModel}\n` : ''}
🏢 *بيانات جهة العمل والاعتماد:*
• *المنشأة:* ${companyName}
• *هاتف العمليات والمتابعة:* ${companyPhone}
• *السجل التجاري:* ${settings?.crNumber || '1010899234'}
• *الرقم الضريبي:* ${settings?.taxNumber || '300984729100003'}

${driver.notes ? `📝 *ملاحظات إضافية:* ${driver.notes}\n` : ''}━━━━━━━━━━━━━━━━━━━━━
✅ *هذه البطاقة صادرة ومعتمدة إلكترونياً من نظام إيجاز للنقليات والأسطول.*`;
}

/**
 * Share driver information and official card via WhatsApp or Web Share API
 */
export async function shareDriverViaWhatsApp(driver: Driver, targetPhone?: string, settings?: CompanySettings, truck?: Truck) {
  const message = formatDriverCardMessage(driver, settings, truck);

  // 1. Try Native Web Share API first on mobile
  if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent.toLowerCase())) {
    try {
      await navigator.share({
        title: `بطاقة تفويض السائق: ${driver.name} - إيجاز للنقليات`,
        text: message,
      });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // 2. Direct WhatsApp URL fallback
  const phone = (targetPhone || driver.phone || '').replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  const waUrl = phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;

  safeOpenUrl(waUrl);
}

/**
 * Print Official Driver Accreditation Card & Authorization Sheet (A4 or ID Card)
 */
export function printDriverOfficialCard(
  driver: Driver,
  settings?: CompanySettings,
  truck?: Truck,
  mode: 'BADGE_CARD' | 'OFFICIAL_LETTER' = 'BADGE_CARD'
) {
  const companyNameAr = settings?.nameAr || 'مؤسسة إيجاز للنقليات';
  const companyNameEn = settings?.nameEn || 'EJAZ TRANSPORT EST.';
  const commercialReg = settings?.crNumber || '1010899234';
  const taxNumber = settings?.taxNumber || '300984729100003';
  const phone = settings?.phone || '+966 50 123 4567';
  const email = settings?.email || 'operations@ejaz-transport.sa';
  const address = settings?.address || 'الرياض - الملز، المملكة العربية السعودية';
  
  const truckPlate = driver.assignedPlateNumber || truck?.plateNumber || 'غير محدد';
  const truckModel = truck ? `${truck.model} (${truck.truckType})` : 'شاحنة نقل بضائع';
  const issueDate = new Date().toISOString().split('T')[0];

  // Default driver photo placeholder SVG if none provided
  const driverPhotoHtml = driver.photoUrl 
    ? `<img src="${driver.photoUrl}" alt="${driver.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" />`
    : `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #F1F5F9; color: #64748B; border-radius: 12px;">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span style="font-size: 11px; font-weight: bold; margin-top: 4px;">صورة السائق</span>
      </div>`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بطاقة وتفويض السائق - ${driver.name} - ${companyNameAr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    }
    
    body {
      background: #F8FAFC;
      color: #0F172A;
      padding: 24px;
      font-size: 13px;
    }

    @media print {
      body {
        background: #FFFFFF;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .page-container {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        padding: 15mm !important;
        max-width: 100% !important;
      }
    }

    .no-print-bar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0F172A;
      color: #FFFFFF;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .btn {
      background: #F97316;
      color: #FFFFFF;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #EA580C;
    }
    .btn-secondary {
      background: #334155;
    }
    .btn-secondary:hover {
      background: #475569;
    }

    .page-container {
      max-width: 800px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      position: relative;
    }

    /* Official Letterhead Header */
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px double #F97316;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }

    .company-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo-box {
      width: 60px;
      height: 60px;
      background: #0F172A;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #F97316;
      font-weight: 900;
      font-size: 26px;
      border: 2px solid #F97316;
    }

    .company-title h1 {
      font-size: 20px;
      font-weight: 900;
      color: #0F172A;
      line-height: 1.2;
    }
    .company-title h1 span {
      color: #F97316;
    }
    .company-title p {
      font-size: 11px;
      color: #64748B;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .company-meta {
      text-align: left;
      font-size: 11px;
      color: #475569;
      line-height: 1.5;
    }
    .company-meta strong {
      color: #0F172A;
    }

    /* Title Banner */
    .document-title {
      text-align: center;
      margin-bottom: 24px;
    }
    .document-title h2 {
      display: inline-block;
      background: #0F172A;
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 800;
      padding: 6px 28px;
      border-radius: 30px;
      border: 2px solid #F97316;
      letter-spacing: 0.5px;
    }
    .document-title .sub {
      font-size: 11px;
      color: #64748B;
      margin-top: 6px;
      font-weight: 600;
    }

    /* ID Card Badge Design */
    .card-badge-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 28px;
    }

    .id-badge {
      width: 100%;
      max-width: 650px;
      background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
      border: 2px solid #CBD5E1;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0,0,0,0.06);
      position: relative;
    }

    .id-badge-top {
      background: #0F172A;
      color: #FFFFFF;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #F97316;
    }
    .id-badge-top .badge-header-title {
      font-size: 13px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .id-badge-top .badge-num {
      background: #1E293B;
      color: #F97316;
      font-size: 11px;
      font-family: monospace;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #334155;
    }

    .id-badge-body {
      padding: 20px;
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 20px;
      align-items: start;
    }

    .driver-photo-container {
      width: 130px;
      height: 160px;
      border: 2px solid #E2E8F0;
      border-radius: 14px;
      overflow: hidden;
      background: #FFFFFF;
      padding: 4px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .driver-details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 16px;
      font-size: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
    }
    .detail-label {
      font-size: 10px;
      color: #64748B;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .detail-value {
      font-size: 12px;
      color: #0F172A;
      font-weight: 800;
    }
    .detail-value.highlight {
      color: #C2410C;
    }

    .id-badge-footer {
      background: #F1F5F9;
      border-top: 1px solid #E2E8F0;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    /* Verification & Stamps Section */
    .authorization-block {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 11.5px;
      color: #92400E;
      line-height: 1.6;
    }
    .authorization-block strong {
      color: #78350F;
    }

    .signatures-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E2E8F0;
      text-align: center;
    }

    .sig-box {
      background: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 12px;
      padding: 12px;
      min-height: 90px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sig-title {
      font-size: 11px;
      font-weight: 800;
      color: #334155;
    }
    .sig-line {
      font-size: 10px;
      color: #94A3B8;
      border-top: 1px dotted #CBD5E1;
      padding-top: 4px;
    }

    .stamp-box {
      border: 2px solid #DC2626;
      border-radius: 50%;
      width: 80px;
      height: 80px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #DC2626;
      font-size: 9px;
      font-weight: 900;
      line-height: 1.1;
      transform: rotate(-10deg);
      background: rgba(220, 38, 38, 0.03);
    }

    /* Footer Note */
    .official-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 10px;
      color: #94A3B8;
      border-top: 1px solid #F1F5F9;
      padding-top: 12px;
    }
  </style>
</head>
<body>

  <!-- Print Control Toolbar (hidden during print) -->
  <div class="no-print-bar no-print">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: 800; font-size: 14px; color: #F97316;">إيجاز للنقليات</span>
      <span style="font-size: 12px; color: #94A3B8;">| معاينة وطباعة بطاقة السائق الرسمية</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn" onclick="window.print()">
        🖨️ طباعة المستند الآن
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        إغلاق
      </button>
    </div>
  </div>

  <div class="page-container">
    <!-- Official Letterhead Header -->
    <div class="letterhead">
      <div class="company-brand">
        <div class="brand-logo-box">إ</div>
        <div class="company-title">
          <h1><span>إيجـاز</span> للنقليات</h1>
          <p>${companyNameEn}</p>
        </div>
      </div>

      <div class="company-meta">
        <div><strong>السجل التجاري:</strong> ${commercialReg}</div>
        <div><strong>الرقم الضريبي:</strong> ${taxNumber}</div>
        <div><strong>الهاتف:</strong> ${phone}</div>
        <div><strong>البريد:</strong> ${email}</div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="document-title">
      <h2>بطاقة تعريف وتفويض سائق رسمي</h2>
      <div class="sub">OFFICIAL DRIVER ACCREDITATION & AUTHORIZATION CARD</div>
    </div>

    <!-- ID Badge Display Card -->
    <div class="card-badge-wrapper">
      <div class="id-badge">
        <div class="id-badge-top">
          <div class="badge-header-title">
            <span>🚚</span>
            <span>${companyNameAr} – بطاقة هوية السائق المعتمدة</span>
          </div>
          <div class="badge-num">${driver.id}</div>
        </div>

        <div class="id-badge-body">
          <div class="driver-photo-container">
            ${driverPhotoHtml}
          </div>

          <div class="driver-details-grid">
            <div class="detail-item" style="grid-column: span 2;">
              <span class="detail-label">اسم السائق الثلاثي (Driver Name)</span>
              <span class="detail-value" style="font-size: 15px; color: #0F172A;">${driver.name}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">رقم الهوية / الإقامة (ID / Iqama)</span>
              <span class="detail-value font-mono">${driver.nationalId || '—'}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">الجنسية (Nationality)</span>
              <span class="detail-value">${driver.nationality || 'سعودي / مقيم معتمد'}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">المسمى الوظيفي (Job Title)</span>
              <span class="detail-value">${driver.jobTitle || 'سائق نقل ثقيل'}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">رقم الجوال (Mobile No.)</span>
              <span class="detail-value font-mono">${driver.phone || '—'}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">رقم رخصة القيادة (License No.)</span>
              <span class="detail-value font-mono">${driver.licenseNumber || '—'}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">تاريخ انتهاء الرخصة (Expiry)</span>
              <span class="detail-value font-mono">${driver.licenseExpiry || '—'}</span>
            </div>

            <div class="detail-item" style="grid-column: span 2;">
              <span class="detail-label">الشاحنة / اللوحة المخصصة (Assigned Truck)</span>
              <span class="detail-value highlight">
                ${truckPlate} — (${truckModel})
              </span>
            </div>
          </div>
        </div>

        <div class="id-badge-footer">
          <div>
            <strong>تاريخ الإصدار:</strong> ${issueDate}
          </div>
          <div>
            <strong>حالة الاعتماد:</strong> <span style="color: #16A34A; font-weight: bold;">ساري ومعتمد</span>
          </div>
          <div style="font-size: 10px; color: #64748B;">
            نظام إيجاز للتشغيل
          </div>
        </div>
      </div>
    </div>

    <!-- Official Authorization Statement -->
    <div class="authorization-block">
      <strong>بيان التفويض والمسؤولية:</strong>
      تشهد إدارة شركة <strong>${companyNameAr}</strong> بأن السائق الموضحة بياناته وصورته أعلاه يعمل لديها كسائق نقل ثقيل ومرخص له بقيادة الشاحنة المذكورة لنقل البضائع والمهمات الرسمية وتوصيل الشحنات لعملاء الشركة. يرجى من كافة الجهات المختصة ونقاط التفتيش ومسؤولي المواقع تقديم التسهيلات النظامية اللازمة.
    </div>

    <!-- Signatures & Stamp Section -->
    <div class="signatures-section">
      <div class="sig-box">
        <div class="sig-title">توقيع السائق المفوض</div>
        <div class="sig-line">${driver.name}</div>
      </div>

      <div class="sig-box">
        <div class="sig-title">ختم الاعتماد الرسمي</div>
        <div class="stamp-box">
          <span>إيجاز للنقليات</span>
          <span>معتمد</span>
          <span>OPERATIONS</span>
        </div>
      </div>

      <div class="sig-box">
        <div class="sig-title">إدارة العمليات والحركة</div>
        <div class="sig-line">الختم والتوقيع الرسمي</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="official-footer">
      <div>${companyNameAr} - ${address} - هاتف: ${phone}</div>
      <div>مستند رسمي صادر عبر منظومة إيجاز للنقليات - الرقم المرجعي: ${driver.id}-${issueDate.replace(/-/g, '')}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto open print if requested or user can click
    };
  </script>
</body>
</html>
`;

  safePrintHtml(html);
}

/**
 * Print a comprehensive, high-definition official Driver Trips & Account Statement
 * Guaranteed to print ALL trips across multiple pages without any clipping or row loss
 */
export function printDriverTripsStatement(
  driver: Driver,
  trips: Trip[],
  settings?: CompanySettings,
  dateRange?: { start?: string; end?: string },
  defaultFontSize: 'normal' | 'large' | 'xlarge' | 'huge' = 'large'
) {
  const companyNameAr = settings?.nameAr || 'مؤسسة إيجاز للنقليات';
  const companyNameEn = settings?.nameEn || 'Ejaz Transport Est.';
  const commercialReg = settings?.crNumber || '1010899234';
  const taxNumber = settings?.taxNumber || '300984729100003';
  const phone = settings?.phone || '+966 50 123 4567';
  const address = settings?.address || 'المملكة العربية السعودية';
  const printDate = new Date().toLocaleDateString('ar-SA');
  const printDateEn = new Date().toISOString().split('T')[0];

  // Financial calculations
  const totalTripsCount = trips.length;
  const totalBilled = trips.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const totalPaid = trips.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
  const totalRemaining = trips.reduce((sum, t) => sum + (t.remainingAmount || 0), 0);
  const totalCustody = trips.reduce((sum, t) => sum + (t.driverCustody || 0), 0);

  // Mandatory 1 Driver = 1 Truck Policy:
  // Every driver is strictly bound to ONE official truck. Disallow multi-truck display.
  const tripPlates = Array.from(
    new Set(
      trips
        .map(t => (t.plateNumber || t.frozenValues?.plateNumber || '').trim())
        .filter(Boolean)
    )
  );

  const officialTruckPlate = (
    driver.assignedPlateNumber ||
    (tripPlates.length > 0 ? tripPlates[0] : '') ||
    'غير محددة'
  ).trim();

  const displayTruckPlate = officialTruckPlate;
  const truckSubtext = `<div class="plate-subtext" style="color: #047857; font-size: 8pt; font-weight: 800;">(شاحنة السائق الإلزامية والوحيدة)</div>`;

  const dateFilterText = dateRange?.start || dateRange?.end
    ? `الفترة المحددة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'الآن'}`
    : 'كافة الرحلات المسجلة في النظام (سجل شامل)';

  // Generate trip rows HTML with large, high-legibility classes that dynamically scale
  const rowsHtml = trips.length === 0
    ? `<tr><td colspan="11" class="empty-state">لا توجد رحلات مسجلة لهذا السائق.</td></tr>`
    : trips.map((t, idx) => {
        const note = (t.notes || '').trim();
        const isEjaz = note.includes('إيجاز') || note.includes('الشركة') || note.includes('المؤسسة');
        const isEmployeeOrPerson = note.includes('الموظف') || note.includes('بيد') || note.includes('أبو حسن') || note.includes('ابو حسن') || note.includes('السائق') || note.includes('نقد') || note.includes('كاش');
        
        let collectorDisplay = '🏢 حساب المؤسسة';
        if (note) {
          collectorDisplay = note;
        } else if (t.paidAmount === 0) {
          collectorDisplay = '⏳ لم يحصل بعد';
        }

        const statusLabel = t.status === 'COMPLETED' ? 'مكتملة' :
          t.status === 'DELIVERED' ? 'تم التوصيل' :
          t.status === 'IN_TRANSIT' ? 'جارية' : 'جديدة';

        return `
        <tr>
          <td class="cell-center col-idx">${idx + 1}</td>
          <td>
            <div class="trip-num">${t.tripNumber}</div>
            <div class="trip-date">${t.date}</div>
            <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px;">
              <div style="font-size: 7.5pt; font-family: monospace; font-weight: 800; color: #1e40af; background: #eff6ff; padding: 1px 4px; border-radius: 4px; border: 1px solid #bfdbfe; display: inline-block;">
                🔑 ${t.uniqueKey || generateTripUniqueKey(t.tripNumber, driver.nationalId, t.plateNumber)}
              </div>
              <div style="font-size: 7.5pt; font-family: monospace; font-weight: 800; color: #b45309; background: #fffbeb; padding: 1px 4px; border-radius: 4px; border: 1px solid #fde68a; display: inline-block;">
                🏦 ${t.financialCenterCode || 'FIN-' + t.tripNumber.replace('TRP-', '')}
              </div>
            </div>
          </td>
          <td>
            <div class="cust-name">${t.customerName}</div>
          </td>
          <td>
            <div class="route-loc">${(t.loadingLocation || '').split('-')[0]} ➔ ${(t.unloadingLocation || '').split('-')[0]}</div>
            <div class="route-cargo">${t.cargoType || 'بضائع عامة'}</div>
          </td>
          <td class="cell-center cell-plate">${officialTruckPlate || t.plateNumber || '—'}</td>
          <td class="cell-num">${(t.totalAmount || 0).toLocaleString()}</td>
          <td class="cell-num text-green">${(t.paidAmount || 0).toLocaleString()}</td>
          <td class="cell-num ${t.remainingAmount > 0 ? 'text-amber' : 'text-green'}">
            ${(t.remainingAmount || 0).toLocaleString()}
          </td>
          <td>
            <div class="collector-text ${isEmployeeOrPerson ? 'text-amber' : isEjaz ? 'text-green' : ''}">
              ${collectorDisplay}
            </div>
          </td>
          <td class="cell-num text-orange">${(t.driverCustody || 0).toLocaleString()}</td>
          <td class="cell-center">
            <span class="status-badge">
              ${statusLabel}
            </span>
          </td>
        </tr>
      `;
      }).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف حساب ورحلات السائق - ${driver.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      line-height: 1.35;
      padding: 16px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Screen Toolbar */
    .no-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      margin-bottom: 16px;
      border-radius: 12px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .font-size-ctrl {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #1e293b;
      padding: 3px 6px;
      border-radius: 8px;
      border: 1px solid #334155;
    }

    .font-btn {
      background: #334155;
      color: #ffffff;
      border: 1px solid transparent;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }

    .font-btn:hover {
      background: #475569;
    }

    .font-btn.active {
      background: #ea580c;
      color: #ffffff;
      border-color: #f97316;
      box-shadow: 0 1px 4px rgba(234, 88, 12, 0.4);
    }

    .zoom-btn {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #475569;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      font-family: inherit;
    }
    .zoom-btn:hover {
      background: #334155;
    }

    .btn-action {
      background: #ea580c;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-weight: 900;
      font-size: 13.5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
      box-shadow: 0 2px 8px rgba(234, 88, 12, 0.4);
      transition: background 0.15s;
    }

    .btn-action:hover {
      background: #c2410c;
    }

    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12.5px;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-secondary:hover {
      background: #475569;
    }

    /* Document Sheet */
    .sheet {
      background: #ffffff;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 24px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      transform-origin: top center;
    }

    /* ====================================================
       DYNAMIC FONT SIZE PRESETS (SCREEN & PRINT)
       ==================================================== */
    
    /* 1. Normal Size */
    .sheet.font-normal {
      --tbl-font: 13.5px;
      --tbl-sub: 12px;
      --tbl-head: 13px;
      --val-font: 15px;
      --lbl-font: 11.5px;
      --metric-val: 18px;
      --metric-lbl: 11.5px;
      --cell-pad: 7px 6px;
    }

    /* 2. Large Size */
    .sheet.font-large {
      --tbl-font: 15.5px;
      --tbl-sub: 13.5px;
      --tbl-head: 15px;
      --val-font: 17.5px;
      --lbl-font: 13px;
      --metric-val: 21px;
      --metric-lbl: 13px;
      --cell-pad: 8px 7px;
    }

    /* 3. Extra Large Size (DEFAULT - Super clear and prominent) */
    .sheet.font-xlarge {
      --tbl-font: 17.5px;
      --tbl-sub: 15px;
      --tbl-head: 16.5px;
      --val-font: 19.5px;
      --lbl-font: 14px;
      --metric-val: 24px;
      --metric-lbl: 14px;
      --cell-pad: 10px 8px;
    }

    /* 4. Huge Size (For maximum readability) */
    .sheet.font-huge {
      --tbl-font: 19.5px;
      --tbl-sub: 16.5px;
      --tbl-head: 18px;
      --val-font: 22px;
      --lbl-font: 15px;
      --metric-val: 27px;
      --metric-lbl: 15.5px;
      --cell-pad: 12px 9px;
    }

    /* Official Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }

    .company-name {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.2px;
    }

    .company-sub {
      font-size: 12.5px;
      color: #475569;
      margin-top: 2px;
      font-weight: 700;
    }

    .report-badge {
      background: #0f172a;
      color: #ffffff;
      font-size: 15px;
      font-weight: 900;
      padding: 6px 18px;
      border-radius: 8px;
      text-align: center;
      border-right: 5px solid #ea580c;
    }

    .report-date {
      font-size: 12.5px;
      color: #475569;
      font-weight: 700;
      text-align: left;
      margin-top: 4px;
    }

    /* Driver Info Banner */
    .driver-banner {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-right: 6px solid #ea580c;
      border-radius: 10px;
      padding: 10px 16px;
      margin-bottom: 10px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: var(--lbl-font, 13px);
      color: #475569;
      font-weight: 800;
    }

    .info-value {
      font-size: var(--val-font, 18px);
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }

    .plate-subtext {
      font-size: 10px;
      font-weight: 700;
      margin-top: 1px;
    }

    /* Financial Metrics Row */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    .metric-card {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px 10px;
      text-align: center;
    }

    .metric-card.highlight {
      background: #fff7ed;
      border-color: #fdba74;
    }

    .metric-card.success {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .metric-card.total {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }

    .metric-label {
      font-size: var(--metric-lbl, 13px);
      color: #475569;
      font-weight: 800;
      display: block;
    }

    .metric-card.total .metric-label {
      color: #cbd5e1;
    }

    .metric-val {
      font-size: var(--metric-val, 22px);
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
      font-family: monospace;
    }

    .metric-card.total .metric-val {
      color: #fb923c;
    }

    /* Statement Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: var(--tbl-font, 16px);
    }

    th {
      background: #0f172a;
      color: #ffffff;
      padding: var(--cell-pad, 9px 6px);
      text-align: right;
      font-weight: 900;
      font-size: var(--tbl-head, 15px);
      border: 1px solid #0f172a;
      white-space: nowrap;
    }

    td {
      padding: var(--cell-pad, 9px 6px);
      border-bottom: 1.5px solid #cbd5e1;
      border-right: 1px solid #e2e8f0;
      border-left: 1px solid #e2e8f0;
      vertical-align: middle;
      font-size: var(--tbl-font, 16px);
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    tfoot td {
      background: #f1f5f9 !important;
      font-weight: 900;
      border-top: 2.5px solid #0f172a;
      border-bottom: 2.5px solid #0f172a;
      padding: var(--cell-pad, 10px 6px);
      font-size: var(--tbl-font, 16px);
    }

    /* Cell Component Styling */
    .cell-center {
      text-align: center;
    }
    .col-idx {
      font-weight: 900;
      font-family: monospace;
      font-size: var(--tbl-font);
    }
    .trip-num {
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
      font-size: var(--tbl-font);
      white-space: nowrap;
    }
    .trip-date {
      font-size: var(--tbl-sub);
      color: #475569;
      font-weight: 700;
      margin-top: 2px;
      white-space: nowrap;
    }
    .cust-name {
      font-weight: 800;
      color: #0f172a;
      font-size: var(--tbl-font);
      line-height: 1.3;
    }
    .route-loc {
      font-size: var(--tbl-font);
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
    }
    .route-cargo {
      font-size: var(--tbl-sub);
      color: #475569;
      font-weight: 700;
      margin-top: 2px;
    }
    .cell-plate {
      font-family: monospace;
      font-weight: 900;
      font-size: var(--tbl-font);
      color: #047857;
      background: #f0fdf4;
      white-space: nowrap;
    }
    .cell-num {
      text-align: left;
      font-weight: 900;
      font-family: monospace;
      font-size: var(--tbl-font);
      white-space: nowrap;
    }
    .text-green {
      color: #047857 !important;
    }
    .text-amber {
      color: #b45309 !important;
    }
    .text-orange {
      color: #ea580c !important;
    }
    .text-slate {
      color: #64748b !important;
    }
    .collector-text {
      font-size: var(--tbl-sub);
      font-weight: 800;
      color: #0f172a;
      line-height: 1.35;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: var(--tbl-sub);
      font-weight: 800;
      background: #f1f5f9;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      white-space: nowrap;
    }
    .empty-state {
      text-align: center;
      padding: 25px;
      color: #64748b;
      font-weight: 800;
      font-size: var(--tbl-font);
    }

    /* Signatures */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 14px;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1.5px solid #cbd5e1;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sig-box {
      border: 1.5px dashed #94a3b8;
      border-radius: 8px;
      padding: 8px 12px;
      background: #fafafa;
    }

    .sig-title {
      font-weight: 900;
      color: #0f172a;
      font-size: 13.5px;
      margin-bottom: 12px;
    }

    .sig-line {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 700;
    }
    .sig-name {
      margin-top: 12px;
      font-weight: 900;
      font-size: 13px;
      color: #0f172a;
    }

    /* ====================================================
       PRINT RULES (LANDSCAPE A4 OPTIMIZED)
       ==================================================== */
    @media print {
      @page {
        size: A4 landscape;
        margin: 3mm 5mm;
      }

      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        color: #000000 !important;
        height: auto !important;
        overflow: visible !important;
      }

      .no-print-toolbar {
        display: none !important;
      }

      .sheet {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }

      /* Print typography forced sizes calibrated for standard A4 */
      .sheet.font-normal {
        --tbl-font: 9pt !important;
        --tbl-sub: 8pt !important;
        --tbl-head: 9.5pt !important;
        --val-font: 11.5pt !important;
        --lbl-font: 8.5pt !important;
        --metric-val: 13pt !important;
        --metric-lbl: 8.5pt !important;
        --cell-pad: 4px 4px !important;
      }

      .sheet.font-large {
        --tbl-font: 10pt !important;
        --tbl-sub: 8.5pt !important;
        --tbl-head: 10.5pt !important;
        --val-font: 12.5pt !important;
        --lbl-font: 9.5pt !important;
        --metric-val: 14.5pt !important;
        --metric-lbl: 9.5pt !important;
        --cell-pad: 5px 4.5px !important;
      }

      .sheet.font-xlarge {
        --tbl-font: 11.5pt !important;
        --tbl-sub: 9.5pt !important;
        --tbl-head: 11.5pt !important;
        --val-font: 13.5pt !important;
        --lbl-font: 10.5pt !important;
        --metric-val: 16pt !important;
        --metric-lbl: 10.5pt !important;
        --cell-pad: 6px 5px !important;
      }

      .sheet.font-huge {
        --tbl-font: 13pt !important;
        --tbl-sub: 11pt !important;
        --tbl-head: 13pt !important;
        --val-font: 15pt !important;
        --lbl-font: 11.5pt !important;
        --metric-val: 18pt !important;
        --metric-lbl: 11.5pt !important;
        --cell-pad: 7px 5.5px !important;
      }

      .header {
        margin-bottom: 4px !important;
        padding-bottom: 4px !important;
      }

      .company-name {
        font-size: 19pt !important;
      }

      .report-badge {
        font-size: 13pt !important;
        padding: 4px 14px !important;
      }

      .driver-banner {
        margin-bottom: 5px !important;
        padding: 5px 12px !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .metrics-row {
        margin-bottom: 5px !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .metric-card {
        padding: 4px 6px !important;
      }

      table {
        page-break-inside: auto !important;
        margin-bottom: 5px !important;
      }

      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      thead {
        display: table-header-group !important;
      }

      tfoot {
        display: table-footer-group !important;
      }

      .signatures {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-top: 6px !important;
        padding-top: 4px !important;
      }

      .sig-box {
        padding: 4px 8px !important;
      }

      .sig-title {
        font-size: 11.5pt !important;
        margin-bottom: 6px !important;
      }
      .sig-name {
        margin-top: 6px !important;
        font-size: 11pt !important;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Toolbar with Font Size Controls -->
  <div class="no-print-toolbar">
    <div class="toolbar-group">
      <span style="font-weight: 900; font-size: 15px;">🖨️ طباعة كشف حساب السائق</span>
      <span style="background: #ea580c; color: #fff; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 900;">
        ${totalTripsCount} رحلة مسجلة
      </span>
    </div>

    <!-- Font Size Switcher -->
    <div class="toolbar-group">
      <span style="font-size: 12.5px; font-weight: 800; color: #cbd5e1;">حجم الخط عند الطباعة:</span>
      <div class="font-size-ctrl">
        <button type="button" id="btn-normal" class="font-btn" onclick="setFontSize('normal')">عادي (11pt)</button>
        <button type="button" id="btn-large" class="font-btn" onclick="setFontSize('large')">كبير (13pt)</button>
        <button type="button" id="btn-xlarge" class="font-btn active" onclick="setFontSize('xlarge')">🔍 كبير جداً (15pt) ★</button>
        <button type="button" id="btn-huge" class="font-btn" onclick="setFontSize('huge')">🔍🔍 ضخم عريض (17pt)</button>
      </div>
    </div>

    <div class="toolbar-group">
      <button type="button" class="btn-action" onclick="window.print()">
        <span>🖨️ طباعة الآن (Ctrl+P)</span>
      </button>
      <button type="button" class="btn-secondary" onclick="window.close()">
        <span>إغلاق النافذة</span>
      </button>
    </div>
  </div>

  <!-- Document Sheet (Defaults to extra-large for maximum clarity) -->
  <div id="print-sheet" class="sheet font-xlarge">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="company-name">${companyNameAr} – ${companyNameEn}</div>
        <div class="company-sub">سجل تجاري: ${commercialReg} | الرقم الضريبي: ${taxNumber} | هاتف: ${phone}</div>
        <div class="company-sub">${address}</div>
      </div>
      <div style="text-align: left;">
        <div class="report-badge">كشف حساب ورحلات السائق الرسمي</div>
        <div class="report-date">تاريخ الإصدار: ${printDate} (${printDateEn})</div>
        <div style="font-size: 11.5px; color: #ea580c; font-weight: 800; margin-top: 2px;">${dateFilterText}</div>
      </div>
    </div>

    <!-- Driver Info Banner -->
    <div class="driver-banner">
      <div class="info-item">
        <span class="info-label">اسم السائق:</span>
        <span class="info-value">${driver.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">رقم الهوية / الإقامة:</span>
        <span class="info-value" style="font-family: monospace;">${driver.nationalId || 'غير مسجل'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">رقم الجوال:</span>
        <span class="info-value" style="font-family: monospace;">${driver.phone || 'غير مسجل'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">الشاحنة / لوحة المشاوير:</span>
        <span class="info-value" style="color: #047857; font-family: monospace;">${displayTruckPlate}</span>
        ${truckSubtext}
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="metrics-row">
      <div class="metric-card total">
        <span class="metric-label">إجمالي الرحلات</span>
        <div class="metric-val">${totalTripsCount} رحلة</div>
      </div>
      <div class="metric-card">
        <span class="metric-label">إجمالي النقل المفوتر</span>
        <div class="metric-val">${totalBilled.toLocaleString()} ر.س</div>
      </div>
      <div class="metric-card success">
        <span class="metric-label">إجمالي المبالغ المحصلة</span>
        <div class="metric-val" style="color: #047857;">${totalPaid.toLocaleString()} ر.س</div>
      </div>
      <div class="metric-card highlight">
        <span class="metric-label">المبالغ غير المحصلة</span>
        <div class="metric-val" style="color: #b45309;">${totalRemaining.toLocaleString()} ر.س</div>
      </div>
      <div class="metric-card highlight">
        <span class="metric-label">إجمالي العهد المسلمة</span>
        <div class="metric-val" style="color: #ea580c;">${totalCustody.toLocaleString()} ر.س</div>
      </div>
    </div>

    <!-- Trips Table (All Rows, No Clipping) -->
    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th style="min-width: 100px;">رقم وتاريخ الرحلة</th>
          <th style="min-width: 120px;">العميل</th>
          <th style="min-width: 140px;">خط السير والحمولة</th>
          <th style="min-width: 80px; text-align: center;">الشاحنة</th>
          <th style="min-width: 90px; text-align: left;">إجمالي الرحلة</th>
          <th style="min-width: 85px; text-align: left;">المحصل</th>
          <th style="min-width: 85px; text-align: left;">المتبقي</th>
          <th style="min-width: 130px;">من المحصل / الملاحظة</th>
          <th style="min-width: 80px; text-align: left;">العهدة</th>
          <th style="min-width: 70px; text-align: center;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      ${trips.length > 0 ? `
      <tfoot>
        <tr>
          <td colspan="5" style="text-align: right;">
            الإجمالي العام لكافة رحلات السائق (${totalTripsCount} رحلة معتمدة):
          </td>
          <td style="text-align: left; font-family: monospace;">${totalBilled.toLocaleString()} ر.س</td>
          <td style="text-align: left; font-family: monospace; color: #047857;">${totalPaid.toLocaleString()} ر.س</td>
          <td style="text-align: left; font-family: monospace; color: #b45309;">${totalRemaining.toLocaleString()} ر.س</td>
          <td></td>
          <td style="text-align: left; font-family: monospace; color: #ea580c;">${totalCustody.toLocaleString()} ر.س</td>
          <td></td>
        </tr>
      </tfoot>
      ` : ''}
    </table>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-box">
        <div class="sig-title">إقرار وتوقيع السائق</div>
        <div class="sig-line">أقر بصحة بيانات الرحلات والعهد الواردة أعلاه</div>
        <div class="sig-name">${driver.name}</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">المحاسبة والمراجعة المالية</div>
        <div class="sig-line">تمت مطابقة القيود والعهد والمتحصلات المالية</div>
        <div class="sig-name">قسم الحسابات</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">اعتماد إدارة العمليات والنقليات</div>
        <div class="sig-line">مؤسسة إيجاز للنقليات – معتمد رسمياً</div>
        <div class="sig-name" style="color: #ea580c;">الختم والتوقيع</div>
      </div>
    </div>
  </div>

  <script>
    function setFontSize(size) {
      document.querySelectorAll('.font-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      var btn = document.getElementById('btn-' + size);
      if (btn) btn.classList.add('active');
      var sheet = document.getElementById('print-sheet');
      if (sheet) {
        sheet.classList.remove('font-normal', 'font-large', 'font-xlarge', 'font-huge');
        sheet.classList.add('font-' + size);
      }
      try {
        localStorage.setItem('ejaz_driver_report_font_size', size);
      } catch(e) {}
    }

    try {
      var saved = localStorage.getItem('ejaz_driver_report_font_size') || '${defaultFontSize}';
      if (saved) setFontSize(saved);
    } catch(e) {}

    // Auto-focus window for printing
    window.focus();
  </script>
</body>
</html>`;

  safePrintHtml(html);
}
