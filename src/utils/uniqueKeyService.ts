/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 *
 * Automatic Unique Key Generator & Validation Service
 * صيغة الربط التلقائي الموحد بين (الرحلات، السائق، الشاحنة، والتقارير)
 * لمنع التعارض وتداخل الحسابات في ملفات السائقين
 */

import { Driver, Trip, Truck, User } from '../types';
import { StorageService } from '../services/storage';

/**
 * 1. استخراج كود السائق:
 * يُستخرج من آخر 5 أرقام من رقم الهوية / الإقامة بعد تنظيف أي مسافات أو حروف.
 * مثال: من 2532566599 نأخذ 66599
 */
export function extractDriverCode(nationalId?: string | null): string {
  if (!nationalId) return '00000';
  // تنقية الأرقام فقط
  const cleanDigits = nationalId.replace(/\D/g, '');
  if (cleanDigits.length >= 5) {
    return cleanDigits.slice(-5);
  }
  if (cleanDigits.length > 0) {
    return cleanDigits.padStart(5, '0');
  }
  return '00000';
}

/**
 * 2. استخراج كود الشاحنة:
 * يُستخرج من آخر رقمين فقط من رقم لوحة الشاحنة لتفادي أخطاء الحروف والمسافات.
 * مثال: من اللوحة (أ ط ي 3618) نأخذ 18
 * مثال: من اللوحة (ب د و 9205) نأخذ 05
 */
export function extractTruckCode(plateNumber?: string | null): string {
  if (!plateNumber) return '00';
  // تنقية الأرقام فقط من لوحة الشاحنة (تجاهل الحروف العربية والإنجليزية والرموز)
  const cleanDigits = plateNumber.replace(/\D/g, '');
  if (cleanDigits.length >= 2) {
    return cleanDigits.slice(-2);
  }
  if (cleanDigits.length === 1) {
    return `0${cleanDigits}`;
  }
  return '00';
}

/**
 * 3. توليد كود الرحلة:
 * تنظيف أو اختصار كود الرحلة التسلسلي.
 * مثال: TRIP-101 أو TRP-20260825-0001
 */
export function extractTripCode(tripNumber?: string | null): string {
  if (!tripNumber) return 'TRIP-000';
  return tripNumber.trim();
}

/**
 * 4. معادلة توليد المعرف الفريد (Unique Key):
 * الصيغة: [كود الرحلة]-[آخر 5 أرقام للهوية]-[آخر رقمين للشاحنة]
 * مثال: TRIP-101-66599-18
 */
export function generateTripUniqueKey(
  tripNumber: string,
  driverNationalId?: string | null,
  plateNumber?: string | null
): string {
  const tripCode = extractTripCode(tripNumber);
  const driverCode = extractDriverCode(driverNationalId);
  const truckCode = extractTruckCode(plateNumber);

  return `${tripCode}-${driverCode}-${truckCode}`;
}

export interface DiscrepancyValidationResult {
  isMatching: boolean;
  hasDriver: boolean;
  hasTruck: boolean;
  tripUniqueKey: string;
  driverExpectedKey: string;
  driverCode: string;
  tripTruckCode: string;
  driverTruckCode: string;
  actualTripPlate: string;
  driverRegisteredPlate: string;
  statusText: string;
  severity: 'SUCCESS' | 'WARNING' | 'ERROR';
}

/**
 * 5. كود التحقق المباشر (Validation) لمعالجة حالة عدم التطابق بين:
 * - السيارة المسجلة في ملف السائق
 * - السيارة الفعلية المستخدمة في الرحلة
 */
export function validateDriverTruckMatch(driver?: Driver | null, trip?: Trip | null): DiscrepancyValidationResult {
  if (!trip) {
    return {
      isMatching: false,
      hasDriver: false,
      hasTruck: false,
      tripUniqueKey: '',
      driverExpectedKey: '',
      driverCode: '00000',
      tripTruckCode: '00',
      driverTruckCode: '00',
      actualTripPlate: '',
      driverRegisteredPlate: '',
      statusText: 'بيانات الرحلة غير متوفرة',
      severity: 'ERROR',
    };
  }

  const tripPlate = (trip.plateNumber || trip.frozenValues?.plateNumber || '').trim();
  const driverPlate = (driver?.assignedPlateNumber || '').trim();
  const driverNationalId = driver?.nationalId || trip.frozenValues?.nationalId || '';

  const driverCode = extractDriverCode(driverNationalId);
  const tripTruckCode = extractTruckCode(tripPlate);
  const driverTruckCode = extractTruckCode(driverPlate);

  const tripUniqueKey = generateTripUniqueKey(trip.tripNumber, driverNationalId, tripPlate);
  const driverExpectedKey = generateTripUniqueKey(trip.tripNumber, driverNationalId, driverPlate);

  // حالة عدم وجود سائق مسجل
  if (!driver) {
    return {
      isMatching: false,
      hasDriver: false,
      hasTruck: Boolean(tripPlate),
      tripUniqueKey,
      driverExpectedKey,
      driverCode,
      tripTruckCode,
      driverTruckCode,
      actualTripPlate: tripPlate,
      driverRegisteredPlate: '',
      statusText: 'لم يتم ربط سائق رسمي بالرحلة',
      severity: 'WARNING',
    };
  }

  // حالة عدم وجود شاحنة مسجلة بملف السائق
  if (!driverPlate) {
    return {
      isMatching: false,
      hasDriver: true,
      hasTruck: false,
      tripUniqueKey,
      driverExpectedKey,
      driverCode,
      tripTruckCode,
      driverTruckCode: '00',
      actualTripPlate: tripPlate,
      driverRegisteredPlate: 'غير محددة بملف السائق',
      statusText: `السائق (${driver.name}) لا توجد شاحنة محددة بملفه الرسمي بينما نفذ الرحلة بالشاحنة [${tripPlate}] كود [${tripTruckCode}]`,
      severity: 'WARNING',
    };
  }

  // فحص التطابق التام وتطابق آخر رقمين
  const isExactMatch = tripPlate.replace(/\s+/g, '') === driverPlate.replace(/\s+/g, '');
  const isCodeMatch = tripTruckCode === driverTruckCode;

  if (isExactMatch) {
    return {
      isMatching: true,
      hasDriver: true,
      hasTruck: true,
      tripUniqueKey,
      driverExpectedKey,
      driverCode,
      tripTruckCode,
      driverTruckCode,
      actualTripPlate: tripPlate,
      driverRegisteredPlate: driverPlate,
      statusText: `متطابق 100% – الشاحنة [${driverPlate}] كود الربط: [${tripUniqueKey}]`,
      severity: 'SUCCESS',
    };
  }

  // في حال اختلاف اللوحة
  return {
    isMatching: false,
    hasDriver: true,
    hasTruck: true,
    tripUniqueKey,
    driverExpectedKey,
    driverCode,
    tripTruckCode,
    driverTruckCode,
    actualTripPlate: tripPlate,
    driverRegisteredPlate: driverPlate,
    statusText: `⚠️ عدم تطابق الشاحنة: شاحنة ملف السائق [${driverPlate}] كود [${driverTruckCode}] تختلف عن شاحنة الرحلة الفعلية [${tripPlate}] كود [${tripTruckCode}]. كود الرحلة الحالي: [${tripUniqueKey}]`,
    severity: isCodeMatch ? 'WARNING' : 'ERROR',
  };
}

/**
 * 6. زر المطابقة والتحديث التلقائي الفوري (One-Click Reconciliation):
 * خيارين:
 * - SYNC_DRIVER_TO_TRIP: تحديث شاحنة ملف السائق لتصبح الشاحنة الفعلية للرحلة.
 * - SYNC_TRIP_TO_DRIVER: تحديث شاحنة الرحلة لتطابق شاحنة السائق وإعادة بناء المعرف الفريد.
 */
export function autoReconcileDriverAndTrip(
  driverId: string,
  tripId: string,
  actionType: 'SYNC_DRIVER_TO_TRIP' | 'SYNC_TRIP_TO_DRIVER',
  actor?: User
): { success: boolean; newUniqueKey: string; message: string } {
  const trips = StorageService.getTrips();
  const drivers = StorageService.getDrivers();
  const driver = drivers.find(d => d.id === driverId);
  const trip = trips.find(t => t.id === tripId);

  if (!driver || !trip) {
    return { success: false, newUniqueKey: '', message: 'تعذر العثور على السائق أو الرحلة' };
  }

  if (actionType === 'SYNC_DRIVER_TO_TRIP') {
    // اعتماد شاحنة الرحلة في ملف السائق
    const targetPlate = trip.plateNumber;
    StorageService.syncDriverToTripTruck(driver.id, targetPlate, actor);

    // إعادة تحديث المعرف الفريد للرحلة
    const newKey = generateTripUniqueKey(trip.tripNumber, driver.nationalId, targetPlate);
    trip.uniqueKey = newKey;
    StorageService.saveTrip(trip, actor);

    return {
      success: true,
      newUniqueKey: newKey,
      message: `تم تحديث ملف السائق (${driver.name}) واعتماد الشاحنة (${targetPlate})، المعرف الموحد الجديد: ${newKey}`,
    };
  } else {
    // تعديل شاحنة الرحلة لتطابق ملف السائق
    const targetPlate = driver.assignedPlateNumber || trip.plateNumber;
    const trucks = StorageService.getTrucks();
    const trk = trucks.find(t => t.plateNumber === targetPlate);

    trip.plateNumber = targetPlate;
    if (trk) {
      trip.truckId = trk.id;
      trip.truckType = trk.truckType;
    }
    if (trip.frozenValues) {
      trip.frozenValues.plateNumber = targetPlate;
      if (trk) trip.frozenValues.truckId = trk.id;
    }

    const newKey = generateTripUniqueKey(trip.tripNumber, driver.nationalId, targetPlate);
    trip.uniqueKey = newKey;
    StorageService.saveTrip(trip, actor);

    return {
      success: true,
      newUniqueKey: newKey,
      message: `تم تعديل شاحنة الرحلة (${trip.tripNumber}) لتطابق ملف السائق (${targetPlate})، المعرف الموحد الجديد: ${newKey}`,
    };
  }
}
