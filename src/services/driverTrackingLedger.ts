/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 *
 * Driver Trip Tracking & Immutable Snapshot Ledger Service
 * فصل حساب السائق عن رقم الشاحنة وتثبيت بيانات الرحلة كقيم دائمة لحظة الإدخال
 */

import { Trip, Driver, Truck, User } from '../types';
import { generateTripUniqueKey } from '../utils/uniqueKeyService';

export interface TripSnapshotPayload {
  isFrozen: boolean;
  frozenAt: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  nationalId?: string;
  licenseNumber?: string;
  truckId: string;
  plateNumber: string;
  truckModel?: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  driverCustody: number;
  commissionAmount: number;
  tripExpenses: number;
  driverNetDue: number; // مستحقات السائق الصافية (العمولة - المصروفات/العهد أو حسب سياسة الشركة)
  relayMethod: 'GAS_RELAY' | 'SYSTEM_LOCK';
  relayTimestamp: string;
  relayChecksum: string;
  uniqueKey?: string; // كود الربط التلقائي الموحد
  financialCenterCode?: string; // كود القائم المالي / المركز المالي الموحد
}

export interface DriverStatementSummary {
  driverId: string;
  driverName: string;
  driverPhone: string;
  nationalId: string;
  totalTrips: number;
  totalRevenue: number;
  totalDriverCustody: number;
  totalCommission: number;
  totalExpenses: number;
  netDue: number;
  trucksUsed: { plateNumber: string; count: number }[];
  trips: Trip[];
}

/**
 * Generate a SHA-style quick cryptographic or numerical checksum to lock the immutable record.
 */
export function generateRelayChecksum(trip: Partial<Trip>, driver: Partial<Driver>, truck: Partial<Truck>): string {
  const raw = `${trip.tripNumber || ''}_${driver.id || ''}_${truck.plateNumber || ''}_${trip.totalAmount || 0}_${trip.driverCustody || 0}_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `FROZEN-${Math.abs(hash).toString(16).toUpperCase()}-${Date.now().toString().slice(-6)}`;
}

/**
 * Build an immutable snapshot of a trip with its driver and truck at the exact moment of relay.
 */
export function createImmutableTripSnapshot(
  trip: Partial<Trip>,
  driver?: Driver | null,
  truck?: Truck | null,
  relayMethod: 'GAS_RELAY' | 'SYSTEM_LOCK' = 'GAS_RELAY'
): TripSnapshotPayload {
  const driverId = trip.driverId || driver?.id || 'DRV-UNKNOWN';
  const driverName = trip.driverName || driver?.name || 'سائق غير محدد';
  const truckId = trip.truckId || truck?.id || 'TRK-UNKNOWN';
  const plateNumber = trip.plateNumber || truck?.plateNumber || 'لوحة غير محددة';

  const baseAmount = Number(trip.baseAmount) || 0;
  const taxAmount = Number(trip.taxAmount) || 0;
  const totalAmount = Number(trip.totalAmount) || (baseAmount + taxAmount);
  const driverCustody = Number(trip.driverCustody) || 0;
  const commissionAmount = Number(trip.commissionAmount) || 0;
  const tripExpenses = Number(trip.tripExpenses) || 0;

  // Driver Net Due calculation (العمولة المستحقة للسائق مطروح منها العهد والمصروفات، أو العمولة المباشرة)
  const driverNetDue = commissionAmount > 0 
    ? (commissionAmount - tripExpenses)
    : (driverCustody - tripExpenses);

  const now = new Date().toISOString();
  const checksum = generateRelayChecksum(trip, driver || {}, truck || {});

  return {
    isFrozen: true,
    frozenAt: now,
    driverId,
    driverName,
    driverPhone: trip.driverPhone || driver?.phone || '',
    nationalId: driver?.nationalId || '',
    licenseNumber: driver?.licenseNumber || '',
    truckId,
    plateNumber,
    truckModel: truck?.model || '',
    baseAmount,
    taxAmount,
    totalAmount,
    driverCustody,
    commissionAmount,
    tripExpenses,
    driverNetDue,
    relayMethod,
    relayTimestamp: now,
    relayChecksum: checksum,
    uniqueKey: generateTripUniqueKey(trip.tripNumber || '', driver?.nationalId, plateNumber),
    financialCenterCode: trip.financialCenterCode || (trip.tripNumber ? `FIN-${trip.tripNumber.replace('TRP-', '')}` : 'FIN-GENERAL'),
  };
}

/**
 * Filter and query trips strictly bound to a Driver ID.
 * Resolves truck-sharing safely by using the immutable frozen driverId as the ultimate source of truth.
 */
export function queryDriverIsolatedLedger(
  allTrips: Trip[],
  targetDriverId: string,
  targetDriverName?: string,
  dateRange?: { start?: string; end?: string }
): Trip[] {
  if (!targetDriverId && !targetDriverName) return [];

  return allTrips.filter(trip => {
    // Check immutable frozen snapshot first
    if (trip.frozenValues?.isFrozen) {
      if (targetDriverId && trip.frozenValues.driverId === targetDriverId) {
        return matchesDate(trip.date, dateRange);
      }
      if (targetDriverName && trip.frozenValues.driverName.trim() === targetDriverName.trim()) {
        return matchesDate(trip.date, dateRange);
      }
      return false;
    }

    // Standard fallback: match by driverId strictly, NOT by truck plate number
    if (targetDriverId && trip.driverId === targetDriverId) {
      return matchesDate(trip.date, dateRange);
    }

    // Secondary fallback: match exact driver name if ID is empty
    if (targetDriverName && trip.driverName && trip.driverName.trim() === targetDriverName.trim()) {
      return matchesDate(trip.date, dateRange);
    }

    return false;
  });
}

function matchesDate(tripDate?: string, range?: { start?: string; end?: string }): boolean {
  if (!tripDate || !range) return true;
  if (range.start && tripDate < range.start) return false;
  if (range.end && tripDate > range.end) return false;
  return true;
}

/**
 * Calculate full statement and truck participation for a driver.
 */
export function calculateDriverStatement(
  driver: Driver,
  trips: Trip[],
  dateRange?: { start?: string; end?: string }
): DriverStatementSummary {
  const driverTrips = queryDriverIsolatedLedger(trips, driver.id, driver.name, dateRange);

  const truckCounts: { [plate: string]: number } = {};
  let totalRevenue = 0;
  let totalCustody = 0;
  let totalCommission = 0;
  let totalExpenses = 0;
  let netDue = 0;

  driverTrips.forEach(t => {
    const plate = t.frozenValues?.plateNumber || t.plateNumber || 'غير محدد';
    truckCounts[plate] = (truckCounts[plate] || 0) + 1;

    const rev = t.frozenValues?.totalAmount ?? t.totalAmount ?? 0;
    const custody = t.frozenValues?.driverCustody ?? t.driverCustody ?? 0;
    const comm = t.frozenValues?.commissionAmount ?? t.commissionAmount ?? 0;
    const exp = t.frozenValues?.tripExpenses ?? t.tripExpenses ?? 0;
    const due = t.frozenValues?.driverNetDue ?? (comm > 0 ? (comm - exp) : (custody - exp));

    totalRevenue += rev;
    totalCustody += custody;
    totalCommission += comm;
    totalExpenses += exp;
    netDue += due;
  });

  const trucksUsed = Object.entries(truckCounts).map(([plateNumber, count]) => ({
    plateNumber,
    count
  })).sort((a, b) => b.count - a.count);

  return {
    driverId: driver.id,
    driverName: driver.name,
    driverPhone: driver.phone || '',
    nationalId: driver.nationalId || '',
    totalTrips: driverTrips.length,
    totalRevenue,
    totalDriverCustody: totalCustody,
    totalCommission,
    totalExpenses,
    netDue,
    trucksUsed,
    trips: driverTrips,
  };
}

/**
 * Ready-to-use Google Apps Script Code template for copying or deploying to Google Sheets.
 */
export function generateGoogleAppsScriptCode(): string {
  return `/**
 * ==============================================================================
 * نظام ترحيل وتجميد رحلات السائقين - مؤسسة إيجاز للنقليات
 * Google Apps Script (GAS) Safe Relay & Immutable Ledger Function
 * ==============================================================================
 * الغرض:
 * 1. منع تداخل التقارير وحسابات السائقين عند تشارك أو تبديل الشاحنات.
 * 2. تجميد بيانات الرحلة كقيم ثابتة (Static Values) ومنع الدوال الديناميكية المتغيرة.
 * 3. الربط بمعرف السائق الثابت (Driver ID) حصراً كمرجع مالي مركزي.
 */

function recordDriverTripSafeRelay(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ورقة الإدخال (Form/Input Sheet)
  var inputSheet = ss.getSheetByName("إدخال الرحلات") || ss.getActiveSheet();
  
  // 2. سجل الحركات المركزي المجمد (Central Frozen Master Ledger)
  var masterSheet = ss.getSheetByName("سجل الحركات المركزي (Master Ledger)");
  if (!masterSheet) {
    masterSheet = ss.insertSheet("سجل الحركات المركزي (Master Ledger)");
    masterSheet.appendRow([
      "كود الترحيل الآمن (Relay ID)",
      "تاريخ وتوقيت التجميد",
      "رقم الرحلة",
      "تاريخ الرحلة",
      "معرّف السائق الثابت (Driver ID)",
      "اسم السائق",
      "رقم الشاحنة / اللوحة",
      "نوع الشاحنة",
      "العميل",
      "مسار الشحن (من - إلى)",
      "نوع الشحنة",
      "قيمة النقل الإجمالية",
      "العهدة المسلمة",
      "عمولة السائق",
      "المصروفات",
      "صافي مستحقات السائق",
      "حالة الترحيل",
      "بصمة الحماية (Checksum)"
    ]);
    masterSheet.getRange(1, 1, 1, 18).setBackground("#0F172A").setFontColor("#FFFFFF").setFontWeight("bold");
    masterSheet.setFrozenRows(1);
  }
  
  // قراءة القيم لحظة الضغط على زر الترحيل (باستخدام getValues لمنع نسخ المعادلات المتغيرة)
  // يرجى تعديل نطاقات الخلايا بحسب تصميم شيت الإدخال لديك:
  var tripNumber = inputSheet.getRange("B2").getValue();
  var tripDate = inputSheet.getRange("B3").getValue();
  var driverId = inputSheet.getRange("B4").getValue();
  var driverName = inputSheet.getRange("B5").getValue();
  var truckPlate = inputSheet.getRange("B6").getValue();
  var truckType = inputSheet.getRange("B7").getValue();
  var customerName = inputSheet.getRange("B8").getValue();
  var route = inputSheet.getRange("B9").getValue();
  var cargo = inputSheet.getRange("B10").getValue();
  var totalAmount = Number(inputSheet.getRange("B11").getValue()) || 0;
  var driverCustody = Number(inputSheet.getRange("B12").getValue()) || 0;
  var commission = Number(inputSheet.getRange("B13").getValue()) || 0;
  var expenses = Number(inputSheet.getRange("B14").getValue()) || 0;
  
  // حساب صافي المستحق الثابت
  var netDue = commission > 0 ? (commission - expenses) : (driverCustody - expenses);
  
  if (!driverId || !tripNumber) {
    SpreadsheetApp.getUi().alert("خطأ: يجب إدخال معرّف السائق (Driver ID) ورقم الرحلة قبل الترحيل!");
    return;
  }
  
  var timestamp = Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss");
  var relayId = "GAS-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  var checksum = "VERIFIED-" + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, relayId + driverId + totalAmount)).slice(0, 10);
  
  // إضافة السجل كقيم مجمّدة (Flat Static Values) تماماً دون أي معادلات متغيرة
  masterSheet.appendRow([
    relayId,
    timestamp,
    tripNumber,
    tripDate,
    driverId,
    driverName,
    truckPlate,
    truckType,
    customerName,
    route,
    cargo,
    totalAmount,
    driverCustody,
    commission,
    expenses,
    netDue,
    "مجمّدة وآمنة (LOCKED)",
    checksum
  ]);
  
  // تنسيق الصف المضاف كقيم ثابتة
  var lastRow = masterSheet.getLastRow();
  masterSheet.getRange(lastRow, 1, 1, 18).setNumberFormat("@");
  
  SpreadsheetApp.getUi().alert("✅ تم الترحيل الآمن وتجميد بيانات الرحلة للسائق (" + driverName + ") برقم معرّف (" + driverId + ") بنجاح تام وبدون أي تداخل!");
}
`;
}
