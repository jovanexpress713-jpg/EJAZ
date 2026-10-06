import { Truck } from '../types';

/**
 * تحويل الأرقام العربية (٠١٢٣٤٥٦٧٨٩) إلى أرقام إنجليزية (0123456789)
 * وإزالة المسافات الزائدة لضمان المقارنة الرقمية الدقيقة
 */
export function normalizeTruckNumber(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input).trim();
  
  // Convert Arabic-Indic digits to standard digits
  const standardDigits = str.replace(/[٠-٩]/g, (d) => {
    return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  });

  // Extract pure digits if the user entered numbers with or without letters
  const digitsMatch = standardDigits.match(/\d+/);
  if (digitsMatch) {
    return digitsMatch[0].trim();
  }

  return standardDigits;
}

/**
 * المطابقة الرقمية التامة (Exact Match) لأرقام الشاحنات
 * قاعدة إجبارية:
 * 8 يختلف تماماً عن 18، ويختلف عن 80، ويختلف عن 108
 * 25 يختلف تماماً عن 125، ويختلف عن 250
 * ممنوع استخدام المطابقة الجزئية (includes) أو الأحرف
 */
export function isExactTruckMatch(
  numA: string | number | undefined | null,
  numB: string | number | undefined | null
): boolean {
  const cleanA = normalizeTruckNumber(numA);
  const cleanB = normalizeTruckNumber(numB);
  if (!cleanA || !cleanB) return false;
  return cleanA === cleanB;
}

/**
 * فحص ما إذا كانت الشاحنة تطابق رقماً أو معرّفاً معيناً بمطابقة تامة
 */
export function doesTruckMatchTarget(
  truck: Truck,
  target: { id?: string; truckNumber?: string; plateNumber?: string }
): boolean {
  if (!truck) return false;

  // 1. Exact ID match
  if (target.id && truck.id === target.id) {
    return true;
  }

  // 2. Exact Truck Number match (Strict Exact numeric equality)
  if (target.truckNumber) {
    const candidateNumber = truck.truckNumber || normalizeTruckNumber(truck.plateNumber);
    if (isExactTruckMatch(candidateNumber, target.truckNumber)) {
      return true;
    }
  }

  // 3. Exact Plate Number match
  if (target.plateNumber && truck.plateNumber.trim() === target.plateNumber.trim()) {
    return true;
  }

  return false;
}

/**
 * الحصول على التسمية الموحدة للشاحنة
 */
export function getTruckDisplayTitle(truck?: Truck | null): string {
  if (!truck) return 'شاحنة غير محددة';
  const num = truck.truckNumber || normalizeTruckNumber(truck.plateNumber) || truck.id;
  return `شاحنة رقم (${num}) - لوحة [${truck.plateNumber}] - ${truck.model}`;
}
