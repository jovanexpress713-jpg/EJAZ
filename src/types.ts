/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

export type UserRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'ACCOUNTANT' | 'VIEWER';

export type TripStatus = 'NEW' | 'LOADING' | 'IN_TRANSIT' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

export type TripType = 'رحلة داخلية' | 'رحلة دولية' | 'رحلة خارجية';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';

export type TruckType = 
  | 'CURTAIN' // تريلا ستارة
  | 'LOWBED' // تريلا لوبد
  | 'FLATBED' // تريلا سطحة
  | 'TIPPER' // قلاب
  | 'REFRIGERATED' // براد
  | 'DYNA' // دينا
  | 'TANKER' // تانكر
  | 'OTHER'; // أخرى

export type TruckStatus = 'AVAILABLE' | 'IN_TRIP' | 'MAINTENANCE' | 'STOPPED';

export type OwnershipType = 'COMPANY' | 'RENTED' | 'PRIVATE_DRIVER';

export type MaintenanceType = 
  | 'OIL_CHANGE'
  | 'TIRES'
  | 'BRAKES'
  | 'PERIODIC_INSPECTION'
  | 'MECHANICAL'
  | 'ELECTRICAL'
  | 'GENERAL';

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

export type ExpenseCategory = 
  | 'FUEL'
  | 'TOLLS_AND_WEIGHBRIDGE'
  | 'MAINTENANCE'
  | 'SALARY'
  | 'WASH'
  | 'CUSTODY'
  | 'DRIVER_EXPENSE'
  | 'OTHER';

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_TRIP'
  | 'UPDATE_TRIP'
  | 'DELETE_TRIP'
  | 'CREATE_CUSTOMER'
  | 'UPDATE_CUSTOMER'
  | 'DELETE_CUSTOMER'
  | 'CREATE_DRIVER'
  | 'UPDATE_DRIVER'
  | 'DELETE_DRIVER'
  | 'CREATE_TRUCK'
  | 'UPDATE_TRUCK'
  | 'DELETE_TRUCK'
  | 'CREATE_COLLECTION'
  | 'CREATE_EXPENSE'
  | 'CREATE_MAINTENANCE'
  | 'UPDATE_MAINTENANCE'
  | 'BACKUP_RESTORE'
  | 'UPDATE_SETTINGS'
  | 'MANAGE_USERS';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone: string;
  active: boolean;
  password?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  taxNumber: string;
  paymentTerms: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  licenseNumber: string;
  licenseExpiry: string; // YYYY-MM-DD
  address?: string; // العنوان
  status: 'ACTIVE' | 'VACATION' | 'SUSPENDED';
  notes: string;
  assignedTruckId?: string; // معرف الشاحنة المرتبطة إجبارياً
  assignedTruckNumber?: string; // رقم الشاحنة الرقمي الكامل
  assignedPlateNumber?: string; // رقم لوحة الشاحنة المرتبطة
  createdAt: string;

  // Driver Photo, Documents & Official Accreditation Fields
  photoUrl?: string; // الصورة الشخصية للسائق
  licensePhotoUrl?: string; // صورة رخصة القيادة
  idPhotoUrl?: string; // صورة الهوية / الإقامة
  nationality?: string; // الجنسية
  bloodType?: string; // فصيلة الدم
  jobTitle?: string; // المسمى الوظيفي
  emergencyContact?: string; // رقم هاتف الطوارئ
  dateOfBirth?: string; // تاريخ الميلاد
  contractDate?: string; // تاريخ المباشرة / التعيين
}

export interface Truck {
  id: string;
  truckNumber?: string; // رقم الشاحنة الرقمي الكامل (e.g. 8, 18, 25, 35, 80, 108) - Exact Match
  plateNumber: string; // e.g. أ ب ج 1234 أو 25
  truckType: TruckType;
  model: string; // e.g. مرسيدس أكتروس
  year: number;
  ownership: OwnershipType;
  status: TruckStatus;
  notes: string;
  assignedDriverId?: string; // معرف السائق المخصص إجبارياً
  assignedDriverName?: string; // اسم السائق المخصص
  assignedDriverPhone?: string; // رقم جوال السائق
  createdAt: string;
}

export interface DriverVehicleAssignment {
  id: string;
  driverId: string;
  driverName: string;
  truckId: string;
  truckNumber: string;
  plateNumber: string;
  assignedAt: string;
  unassignedAt?: string;
  notes?: string;
}

export interface Trip {
  id: string;
  tripNumber: string; // e.g. TRP-20260825-0001
  date: string; // YYYY-MM-DD
  tripType?: TripType; // نوع الرحلة: رحلة داخلية | رحلة دولية | رحلة خارجية
  status: TripStatus;
  
  // Customer info
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  
  // Driver info
  driverId: string;
  driverName: string;
  driverPhone: string;
  
  // Truck info
  truckId: string;
  truckNumber?: string; // رقم الشاحنة الرقمي الكامل وقت تنفيذ الرحلة (يحفظ التاريخ التشغيلي)
  plateNumber: string;
  truckType: TruckType;
  
  // Cargo & Location
  cargoType: string;
  cargoDescription?: string; // وصف الحمولة التفصيلي
  loadingLocation: string;
  unloadingLocation: string;
  loadingTime: string;
  estimatedArrival: string;
  actualArrival?: string;
  
  // Financials & Cost Center (القائم المالي / المركز المالي)
  financialCenterCode?: string; // كود القائم المالي / المركز المالي الموحد (e.g. FIN-2026-0001)
  financialCenterName?: string; // مسمى القائم المالي / مركز التكلفة
  baseAmount: number; // قيمة الرحلة الأساسية (القائم المالي)
  taxRate: number; // e.g. 15%
  taxAmount: number; // قيمة الضريبة
  totalAmount: number; // الإجمالي
  paidAmount: number; // المدفوع
  remainingAmount: number; // المتبقي
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  
  // Operation Type & Subcontracting / Spot Trips (رحلات لحظية / وساطة وتشغيل خارجي)
  operationType?: 'INTERNAL' | 'SUBCONTRACTED_SPOT'; // نمط التشغيل: أسطول داخلي | رحلة لحظية وساطة
  isSubcontracted?: boolean; // هل هي رحلة لحظية / وساطة لناقل خارجي
  externalCarrierName?: string; // اسم السائق / الناقل الخارجي
  externalCarrierPhone?: string; // رقم جوال السائق الخارجي
  externalTruckPlate?: string; // رقم لوحة الشاحنة الخارجية
  externalCompany?: string; // اسم مؤسسة أو شركة النقل الخارجية
  externalCarrierCost?: number; // تكلفة السائق / الشاحنة الخارجية (مثلاً 300 ريال)
  clientAgreedAmount?: number; // قيمة الرحلة المتفق عليها مع العميل اللحظي (مثلاً 400 ريال)
  brokerageMargin?: number; // هامش ربح الوساطة الفارق (مثلاً 100 ريال = 400 - 300)
  externalCarrierPaymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID'; // حالة سداد الناقل الخارجي

  // Commission & Custody
  commissionAmount: number; // العمولة
  driverCustody: number; // عهدة السائق
  custodyMethod: string; // طريقة العهدة
  tripExpenses: number; // مصروفات الرحلة
  netProfit: number; // صافي الربح
  
  notes: string;
  photoUrl?: string; // base64 or storage url
  createdAt: string;
  updatedAt: string;

  // Driver Trip Isolation & Immutable Snapshot Tracking (منع تداخل التقارير وتجميد القيم)
  frozenValues?: {
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
    driverNetDue: number; // المستحق الصافي للسائق
    relayMethod?: 'GAS_RELAY' | 'SYSTEM_LOCK'; // طريقة الترحيل والتجميد
    relayTimestamp?: string;
    relayChecksum?: string; // بصمة التحقق لمنع التعديل
    uniqueKey?: string; // كود الربط التلقائي الموحد [كود الرحلة]-[آخر 5 أرقام للهوية]-[آخر رقمين للشاحنة]
  };
  uniqueKey?: string; // كود الربط التلقائي الموحد [كود الرحلة]-[آخر 5 أرقام للهوية]-[آخر رقمين للشاحنة]
}

export interface MaintenanceRecord {
  id: string;
  truckId: string;
  plateNumber: string;
  date: string;
  maintenanceType: MaintenanceType;
  amount: number;
  nextMaintenanceDate: string;
  nextMaintenanceKm?: number;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
}

export interface CollectionRecord {
  id: string;
  date: string;
  tripId?: string;
  tripNumber?: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  tripId?: string;
  tripNumber?: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  recipient?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details: string;
}

export interface CompanySettings {
  nameAr: string;
  nameEn: string;
  phone: string;
  ownerPhone?: string; // جوال المالك المعتمد لتلقي نقاط الحفظ ومحاضر التسليم
  email: string;
  taxNumber: string;
  crNumber: string;
  address: string;
  defaultTaxRate: number;
  currency: string;
  termsAndConditions: string;
}

export interface SavePointRecord {
  id: string;
  timestamp: string;
  label: string;
  totalTrips: number;
  totalRevenue: number;
  totalCollected: number;
  totalExpenses: number;
  netMargin: number;
  activeDriversCount: number;
  activeTrucksCount: number;
  backupPayload?: string;
}

export interface DailyHandoverReport {
  id: string;
  reportNumber: string; // e.g. HND-20261001-001
  date: string; // YYYY-MM-DD
  handoverTime: string;
  officerName: string; // اسم مسؤول التسليم
  recipientName: string; // اسم المالك / المستلم
  recipientPhone?: string; // جوال المالك
  totalTripsToday: number;
  internalTripsCount: number;
  spotBrokerTripsCount: number;
  totalCashCollected: number;
  totalBankTransfers: number;
  totalCustodyDisbursed: number;
  totalExpensesToday: number;
  totalBrokerageProfitToday: number;
  netCashToDeliver: number; // صافي النقد الفعلي المسلّم للمالك
  notes: string;
  status: 'DELIVERED' | 'CONFIRMED';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  date: string;
  read: boolean;
  linkTab?: string;
  linkId?: string;
}
