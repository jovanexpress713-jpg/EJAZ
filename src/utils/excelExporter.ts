/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Trip, Customer, Driver, MaintenanceRecord, CompanySettings } from '../types';
import { SYSTEM_INFO } from '../constants/systemInfo';

export interface ReportExportOptions {
  reportType: 'FINANCIAL' | 'TRIPS' | 'CUSTOMERS' | 'DRIVERS' | 'MAINTENANCE';
  title?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  activeCustomer?: Customer | null;
  activeDriver?: Driver | null;
  trips: Trip[];
  customers?: Customer[];
  drivers?: Driver[];
  maintenance?: MaintenanceRecord[];
  companySettings?: CompanySettings;
}

export function exportReportToExcel(options: ReportExportOptions): void {
  const {
    reportType,
    title,
    startDate,
    endDate,
    activeCustomer,
    activeDriver,
    trips,
    customers = [],
    drivers = [],
    maintenance = [],
    companySettings,
  } = options;

  const orgName = companySettings?.nameAr || companySettings?.nameEn || 'مؤسسة إيجاز للنقليات واللوجستيات';
  const orgTax = companySettings?.taxNumber ? `الرقم الضريبي: ${companySettings.taxNumber}` : '';
  const exportDate = new Date().toLocaleDateString('ar-SA') + ' - ' + new Date().toLocaleTimeString('ar-SA');
  const periodText = (startDate || endDate) 
    ? `الفترة: من ${startDate || 'البداية'} إلى ${endDate || 'اليوم'}`
    : 'الفترة: كافة البيانات المسجلة بالنظام (تقرير شامل)';

  // Calculate totals
  const totalRevenue = trips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalPaid = trips.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
  const totalRemaining = trips.reduce((acc, t) => acc + (t.remainingAmount || 0), 0);
  const totalExpenses = trips.reduce((acc, t) => acc + (t.tripExpenses || 0), 0);
  const totalNetProfit = trips.reduce((acc, t) => acc + (t.netProfit ?? ((t.totalAmount || 0) - (t.tripExpenses || 0))), 0);
  const totalCustody = trips.reduce((acc, t) => acc + (t.driverCustody || 0), 0);

  // Dynamic Report Title
  let reportHeading = title;
  if (!reportHeading) {
    if (activeDriver) {
      reportHeading = `كشف حساب وعمليات السائق: ${activeDriver.name}`;
    } else if (activeCustomer) {
      reportHeading = `كشف حساب ومديونيات العميل: ${activeCustomer.name}`;
    } else {
      switch (reportType) {
        case 'FINANCIAL':
          reportHeading = 'التقرير المالي النهائي والإيرادات والأرباح';
          break;
        case 'TRIPS':
          reportHeading = 'تقرير حركة وتشغيل الرحلات النهائي';
          break;
        case 'CUSTOMERS':
          reportHeading = 'كشف مديونيات وحسابات العملاء النهائي';
          break;
        case 'DRIVERS':
          reportHeading = 'كشف أداء وحسابات السائقين والعهد النهائي';
          break;
        case 'MAINTENANCE':
          reportHeading = 'تقرير الصيانة الدورية ومصروفات الأسطول';
          break;
      }
    }
  }

  // Build rows array (Array of Arrays)
  const rows: any[][] = [];

  // 1. Organization & System Header
  rows.push([orgName, '', '', '', '', '', '', '', '', '']);
  if (orgTax) {
    rows.push([orgTax, '', '', '', '', '', '', '', '', '']);
  }
  rows.push([reportHeading, '', '', '', '', '', '', '', '', '']);
  rows.push([`تاريخ الاستخراج: ${exportDate} | ${periodText}`, '', '', '', '', '', '', '', '', '']);
  rows.push([
    `حقوق البرمجة: ${SYSTEM_INFO.developer.fullName} (${SYSTEM_INFO.developer.contactNumber}) | نظام إيجاز v${SYSTEM_INFO.version}`,
    '', '', '', '', '', '', '', '', ''
  ]);
  rows.push([]); // blank row

  // 2. Summary KPI Card Rows
  rows.push(['--- ملخص الأرقام والمؤشرات المالية للتقرير ---', '', '', '', '', '', '', '', '', '']);
  rows.push([
    'إجمالي عدد الرحلات',
    'إجمالي قيمة النولون / الإيرادات',
    'إجمالي المبالغ المحصلة',
    'إجمالي المبالغ المتبقية',
    'إجمالي عهد السائقين',
    'إجمالي مصاريف التشغيل',
    'صافي الربح التقديري'
  ]);
  rows.push([
    `${trips.length} رحلة`,
    `${totalRevenue.toLocaleString()} ر.س`,
    `${totalPaid.toLocaleString()} ر.س`,
    `${totalRemaining.toLocaleString()} ر.س`,
    `${totalCustody.toLocaleString()} ر.س`,
    `${totalExpenses.toLocaleString()} ر.س`,
    `${totalNetProfit.toLocaleString()} ر.س`
  ]);
  rows.push([]); // blank row

  let colWidths: number[] = [14, 12, 14, 20, 14, 22, 16, 14, 18, 14, 14, 14, 14, 14, 14, 14, 14, 25];

  // 3. Detailed Data Table based on Report Type
  if (reportType === 'CUSTOMERS' && !activeCustomer) {
    // Customers statement list
    rows.push(['--- كشف حساب ومديونيات العملاء التفصيلي ---']);
    rows.push([
      'م',
      'اسم العميل',
      'رقم الجوال',
      'العنوان / المدينة',
      'عدد الرحلات',
      'إجمالي المبالغ (ر.س)',
      'المبالغ المسددة (ر.س)',
      'المتبقي / المديونية (ر.س)',
      'نسبة التحصيل',
      'حالة الحساب'
    ]);

    customers.forEach((c, idx) => {
      const cTrips = trips.filter(t => t.customerId === c.id || t.customerName === c.name);
      const cRev = cTrips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
      const cPaid = cTrips.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
      const cRem = cTrips.reduce((acc, t) => acc + (t.remainingAmount || 0), 0);
      const pct = cRev > 0 ? Math.round((cPaid / cRev) * 100) : 100;
      const status = cRem <= 0 ? 'مسدد بالكامل' : cPaid > 0 ? 'سداد جزئي' : 'غير مسدد';

      rows.push([
        idx + 1,
        c.name,
        c.phone || '-',
        c.address || '-',
        cTrips.length,
        cRev,
        cPaid,
        cRem,
        `${pct}%`,
        status
      ]);
    });

    // Totals row
    rows.push([
      'الإجمالي العام',
      '',
      '',
      '',
      trips.length,
      totalRevenue,
      totalPaid,
      totalRemaining,
      '',
      ''
    ]);

    colWidths = [6, 25, 16, 20, 12, 18, 18, 18, 12, 16];

  } else if (reportType === 'DRIVERS' && !activeDriver) {
    // Drivers summary list
    rows.push(['--- كشف حساب وأداء السائقين والعهد التفصيلي ---']);
    rows.push([
      'م',
      'اسم السائق',
      'رقم الجوال',
      'رقم الهوية / الإقامة',
      'الشاحنة المرتبطة',
      'عدد الرحلات',
      'إجمالي النولون المنفذ (ر.س)',
      'المبالغ المحصلة بواسطة السائق (ر.س)',
      'إجمالي عهد السائق (ر.س)',
      'مصاريف الرحلات (ر.س)',
      'الحالة'
    ]);

    drivers.forEach((d, idx) => {
      const dTrips = trips.filter(t => t.driverId === d.id || t.driverName === d.name);
      const dRev = dTrips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
      const dPaid = dTrips.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
      const dCustody = dTrips.reduce((acc, t) => acc + (t.driverCustody || 0), 0);
      const dExp = dTrips.reduce((acc, t) => acc + (t.tripExpenses || 0), 0);
      const statusLabel = d.status === 'ACTIVE' ? 'نشط على رأس العمل' : d.status === 'VACATION' ? 'إجازة' : 'موقوف';

      rows.push([
        idx + 1,
        d.name,
        d.phone || '-',
        d.nationalId || '-',
        d.assignedPlateNumber || '-',
        dTrips.length,
        dRev,
        dPaid,
        dCustody,
        dExp,
        statusLabel
      ]);
    });

    // Totals row
    rows.push([
      'الإجمالي العام',
      '',
      '',
      '',
      '',
      trips.length,
      totalRevenue,
      totalPaid,
      totalCustody,
      totalExpenses,
      ''
    ]);

    colWidths = [6, 24, 16, 18, 16, 12, 20, 20, 18, 18, 16];

  } else if (reportType === 'MAINTENANCE') {
    // Maintenance Report
    rows.push(['--- جدول سجلات الصيانة ومصروفات الأسطول التفصيلي ---']);
    rows.push([
      'م',
      'رقم العملية',
      'التاريخ',
      'رقم اللوحة / الشاحنة',
      'نوع الصيانة',
      'الورشة / المركز',
      'التكلفة (ر.س)',
      'حالة الصيانة',
      'الضمان / القراءة',
      'ملاحظات الصيانة'
    ]);

    let totalMaintAmount = 0;
    maintenance.forEach((m, idx) => {
      totalMaintAmount += (m.amount || 0);
      rows.push([
        idx + 1,
        m.id,
        m.date,
        m.plateNumber,
        m.maintenanceType || 'صيانة عامة',
        '-',
        m.amount || 0,
        m.status === 'COMPLETED' ? 'مكتملة' : 'قيد التنفيذ',
        m.nextMaintenanceKm ? `${m.nextMaintenanceKm} كم` : '-',
        m.description || '-'
      ]);
    });

    rows.push([
      'إجمالي تكاليف الصيانة',
      '',
      '',
      '',
      '',
      '',
      totalMaintAmount,
      '',
      '',
      ''
    ]);

    colWidths = [6, 14, 12, 16, 18, 20, 16, 14, 16, 28];

  } else {
    // TRIPS / FINANCIAL / ACTIVE DRIVER / ACTIVE CUSTOMER
    rows.push(['--- جدول الرحلات والعمليات التشغيلية والمالية التفصيلي ---']);
    rows.push([
      'م',
      'رقم الرحلة',
      'كود القائم المالي / المركز',
      'التاريخ',
      'نوع الرحلة والتشغيل',
      'اسم العميل',
      'جوال العميل',
      'مسار الرحلة (التحميل ➔ التنزيل)',
      'نوع الحمولة',
      'رقم اللوحة',
      'اسم السائق / الناقل',
      'جوال السائق',
      'قيمة النقل / القائم المالي (ر.س)',
      'المسدد (ر.س)',
      'المتبقي (ر.س)',
      'تكلفة الناقل الخارجي (ر.س)',
      'هامش ربح الوساطة / الصافي (ر.س)',
      'عهدة السائق (ر.س)',
      'مصاريف الرحلة (ر.س)',
      'حالة الدفع',
      'حالة الرحلة',
      'ملاحظات الرحلة'
    ]);

    trips.forEach((t, idx) => {
      const path = `${t.loadingLocation || '-'} ➔ ${t.unloadingLocation || '-'}`;
      const isSpot = t.operationType === 'SUBCONTRACTED_SPOT' || t.isSubcontracted;
      const typeLabel = isSpot ? '🤝 رحلة لحظية / وساطة' : (t.tripType || '🚛 أسطول داخلي');
      const finCode = t.financialCenterCode || `FIN-${t.tripNumber.replace('TRP-', '')}`;
      const extCost = isSpot ? (t.externalCarrierCost || 0) : 0;
      const margin = isSpot 
        ? (t.brokerageMargin ?? Math.max(0, (t.totalAmount || 0) - extCost))
        : (t.netProfit ?? ((t.totalAmount || 0) - (t.tripExpenses || 0)));
      const tripNotes = t.notes || (t.paymentMethod ? `طريقة الدفع: ${t.paymentMethod}` : '-');

      rows.push([
        idx + 1,
        t.tripNumber,
        finCode,
        t.date,
        typeLabel,
        t.customerName,
        t.customerPhone || '-',
        path,
        t.cargoType || '-',
        isSpot ? (t.externalTruckPlate || t.plateNumber) : t.plateNumber,
        isSpot ? (t.externalCarrierName || t.driverName) : t.driverName,
        t.driverPhone || '-',
        t.totalAmount || 0,
        t.paidAmount || 0,
        t.remainingAmount || 0,
        extCost,
        margin,
        t.driverCustody || 0,
        t.tripExpenses || 0,
        t.paymentStatus === 'PAID' ? 'مسدد' : t.paymentStatus === 'PARTIAL' ? 'جزئي' : 'آجل / غير مسدد',
        t.status || 'مكتملة',
        tripNotes
      ]);
    });

    // Summary Totals Row
    rows.push([
      'الإجمالي العام',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `${trips.length} رحلة`,
      totalRevenue,
      totalPaid,
      totalRemaining,
      trips.reduce((acc, t) => acc + (t.externalCarrierCost || 0), 0),
      totalNetProfit,
      totalCustody,
      totalExpenses,
      '',
      '',
      ''
    ]);

    colWidths = [6, 14, 18, 12, 18, 22, 14, 26, 18, 14, 20, 14, 18, 16, 16, 16, 18, 16, 16, 14, 14, 28];
  }

  // 4. Footer Note
  rows.push([]);
  rows.push([
    'تم إصدار وتصدير هذا التقرير النهائي آلياً من نظام إيجاز لإدارة عمليات النقل واللوجستيات والفوترة.',
    '', '', '', '', '', '', '', '', ''
  ]);
  rows.push([
    `تطوير وبرمجة: ${SYSTEM_INFO.developer.fullName} - هاتف: ${SYSTEM_INFO.developer.contactNumber}`,
    '', '', '', '', '', '', '', '', ''
  ]);

  // Create Workbook and Sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set Right-to-Left orientation
  ws['!views'] = [{ rightToLeft: true }];
  
  // Set Column Widths
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  const sheetName = 'التقرير النهائي';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate clean safe file name
  const cleanDate = new Date().toISOString().split('T')[0];
  let fileNamePrefix = 'تقرير_إيجاز_النهائي';
  if (activeDriver) {
    fileNamePrefix = `كشف_حساب_السائق_${activeDriver.name.replace(/[/\\?%*:|"<>]/g, '_')}`;
  } else if (activeCustomer) {
    fileNamePrefix = `كشف_حساب_العميل_${activeCustomer.name.replace(/[/\\?%*:|"<>]/g, '_')}`;
  } else if (reportType === 'FINANCIAL') {
    fileNamePrefix = 'التقرير_المالي_النهائي';
  } else if (reportType === 'TRIPS') {
    fileNamePrefix = 'تقرير_الرحلات_النهائي';
  } else if (reportType === 'CUSTOMERS') {
    fileNamePrefix = 'كشف_مديونيات_العملاء_النهائي';
  } else if (reportType === 'DRIVERS') {
    fileNamePrefix = 'كشف_حساب_السائقين_النهائي';
  } else if (reportType === 'MAINTENANCE') {
    fileNamePrefix = 'تقرير_صيانة_الأسطول_النهائي';
  }

  const finalFileName = `${fileNamePrefix}_${cleanDate}.xlsx`;

  // Write and Save
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
  });
  saveAs(blob, finalFileName);
}

/**
 * Direct exporter specifically for Trips table (e.g. from TripsView)
 */
export function exportTripsTableToExcel(trips: Trip[], filename = 'جدول_الرحلات_المسجلة.xlsx'): void {
  exportReportToExcel({
    reportType: 'TRIPS',
    title: 'جدول رحلات وعمليات النقل واللوجستيات',
    trips,
  });
}

/**
 * Exporter for Daily Shift Handover Report to Owner (محضر التسليم النهاري للمالك)
 */
export function exportDailyHandoverToExcel(
  summary: {
    reportNumber: string;
    date: string;
    officerName: string;
    recipientName: string;
    totalTripsToday: number;
    internalTripsCount: number;
    spotBrokerTripsCount: number;
    totalCashCollected: number;
    totalBankTransfers: number;
    totalCustodyDisbursed: number;
    totalExpensesToday: number;
    totalBrokerageProfitToday: number;
    netCashToDeliver: number;
    trips: Trip[];
  },
  companySettings?: CompanySettings
): void {
  const orgName = companySettings?.nameAr || 'مؤسسة إيجاز للنقليات';
  const rows: any[][] = [];

  rows.push([orgName, '', '', '', '', '']);
  rows.push(['محضر التسليم والترحيل النهاري - كشف الوردية اليومية للمالك', '', '', '', '', '']);
  rows.push([`رقم المحضر: ${summary.reportNumber} | التاريخ: ${summary.date} | وقت الإعداد: ${new Date().toLocaleTimeString('ar-SA')}`, '', '', '', '', '']);
  rows.push([`مسؤول التسليم: ${summary.officerName} | المستلم (المالك): ${summary.recipientName}`, '', '', '', '', '']);
  rows.push([]);

  rows.push(['--- ملخص الأرقام والتسليم المالي لليوم ---']);
  rows.push(['إجمالي الرحلات المنفذة', `${summary.totalTripsToday} رحلة (${summary.internalTripsCount} أسطول داخلي + ${summary.spotBrokerTripsCount} وساطة لحظية)`]);
  rows.push(['إجمالي النقد المحصل اليوم (كاش)', `${summary.totalCashCollected.toLocaleString()} ر.س`]);
  rows.push(['إجمالي التحويلات البنكية اليوم', `${summary.totalBankTransfers.toLocaleString()} ر.س`]);
  rows.push(['إجمالي العهد المنصرفة للسائقين', `${summary.totalCustodyDisbursed.toLocaleString()} ر.س`]);
  rows.push(['إجمالي المصاريف التشغيلية', `${summary.totalExpensesToday.toLocaleString()} ر.س`]);
  rows.push(['إجمالي أرباح الوساطة اللحظية (الهامش)', `${summary.totalBrokerageProfitToday.toLocaleString()} ر.س`]);
  rows.push(['★ صافي النقد الفعلي المسلّم للمالك ★', `${summary.netCashToDeliver.toLocaleString()} ر.س`]);
  rows.push([]);

  rows.push(['--- بيان رحلات وعمليات اليوم ---']);
  rows.push([
    'م',
    'رقم الرحلة',
    'كود القائم المالي',
    'نوع التشغيل',
    'العميل',
    'السائق / الشاحنة',
    'القيمة الإجمالية (ر.س)',
    'المحصل (ر.س)',
    'المتبقي (ر.س)',
    'هامش الوساطة (ر.س)',
    'طريقة الدفع'
  ]);

  summary.trips.forEach((t, idx) => {
    const isSpot = t.operationType === 'SUBCONTRACTED_SPOT' || t.isSubcontracted;
    rows.push([
      idx + 1,
      t.tripNumber,
      t.financialCenterCode || '-',
      isSpot ? 'وساطة لحظية' : 'أسطول داخلي',
      t.customerName,
      `${t.driverName} (${t.plateNumber})`,
      t.totalAmount || 0,
      t.paidAmount || 0,
      t.remainingAmount || 0,
      isSpot ? (t.brokerageMargin || 0) : 0,
      t.paymentMethod || 'CASH'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'محضر التسليم النهاري');

  const finalFileName = `محضر_التسليم_النهاري_${summary.date}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  });
  saveAs(blob, finalFileName);
}
