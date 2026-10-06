/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

import { 
  Trip, 
  Customer, 
  Driver, 
  Truck, 
  MaintenanceRecord, 
  CollectionRecord, 
  ExpenseRecord, 
  AuditLog, 
  User, 
  CompanySettings, 
  AppNotification,
  UserRole,
  AuditAction,
  TripStatus,
  TruckType,
  TruckStatus,
  PaymentStatus,
  PaymentMethod,
  SavePointRecord,
  DailyHandoverReport
} from '../types';
import { UnlimitedStorage } from './unlimitedStorage';
import { createImmutableTripSnapshot } from './driverTrackingLedger';
import { generateTripUniqueKey } from '../utils/uniqueKeyService';
import { isExactTruckMatch, normalizeTruckNumber } from '../utils/truckUtils';

export interface CompleteDriverTripInput {
  id?: string;
  tripNumber: string;
  date: string;
  loadingLocation: string;
  unloadingLocation: string;
  cargoType: string;
  cargoDescription?: string;
  baseAmount: number;
  tripExpenses: number;
  netProfit?: number;
  status: TripStatus;
  notes?: string;
  truckId?: string; // If already saved previously, preserves historical truck!
  truckNumber?: string;
  plateNumber?: string;
}

export interface CompleteDriverFileInput {
  driver: {
    id?: string;
    name: string;
    phone: string;
    nationalId: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    address?: string;
    status: 'ACTIVE' | 'VACATION' | 'SUSPENDED';
    notes?: string;
    photoUrl?: string;
    licensePhotoUrl?: string;
    idPhotoUrl?: string;
    nationality?: string;
    jobTitle?: string;
    bloodType?: string;
    emergencyContact?: string;
  };
  truck: {
    isNewTruck: boolean;
    existingTruckId?: string;
    truckNumber: string; // Exact numeric truck number e.g. "25", "35", "108"
    plateNumber: string; // e.g. "أ ب ج 25" or "25"
    truckType: TruckType;
    model: string;
    status: TruckStatus;
    notes?: string;
  };
  trips: CompleteDriverTripInput[];
  actor?: User;
}

const STORAGE_KEYS = {
  SETTINGS: 'ejaz_clean_settings_v5',
  USERS: 'ejaz_clean_users_v5',
  CURRENT_USER: 'ejaz_clean_current_user_v5',
  CUSTOMERS: 'ejaz_clean_customers_v5',
  DRIVERS: 'ejaz_clean_drivers_v5',
  TRUCKS: 'ejaz_clean_trucks_v5',
  TRIPS: 'ejaz_clean_trips_v5',
  MAINTENANCE: 'ejaz_clean_maintenance_v5',
  COLLECTIONS: 'ejaz_clean_collections_v5',
  EXPENSES: 'ejaz_clean_expenses_v5',
  AUDIT_LOGS: 'ejaz_clean_audit_logs_v5',
  NOTIFICATIONS: 'ejaz_clean_notifications_v5',
  SAVE_POINTS: 'ejaz_clean_save_points_v5',
  DAILY_HANDOVERS: 'ejaz_clean_daily_handovers_v5',
};

// Initial Seed Data
const DEFAULT_SETTINGS: CompanySettings = {
  nameAr: 'مؤسسة إيجاز للنقليات',
  nameEn: 'Ejaz Transport',
  phone: '009665394417755',
  email: 'info@ejaz-transport.sa',
  taxNumber: '310458921100003',
  crNumber: '1010789452',
  address: 'المملكة العربية السعودية - الرياض - حي المناخ - طريق الدائري الجنوبي',
  defaultTaxRate: 15,
  currency: 'ر.س',
  termsAndConditions: 'تخضع كافة أعمال النقل واللوجستيات لضوابط الهيئة العامة للنقل في المملكة العربية السعودية. المؤسسة مسؤولة عن سلامة البضائع طوال فترة الرحلة وفق البوليصة المعتمدة.',
};

const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    fullName: 'عبد الله القرني (المدير العام)',
    role: 'SUPER_ADMIN',
    phone: '05394417755',
    active: true,
    password: 'admin',
  },
  {
    id: 'usr_ops',
    username: 'ops',
    fullName: 'محمد السبيعي (مسؤول العمليات)',
    role: 'OPERATIONS',
    phone: '0501122334',
    active: true,
    password: '123',
  },
  {
    id: 'usr_acc',
    username: 'acc',
    fullName: 'فهد الدوسري (المحاسب المالي)',
    role: 'ACCOUNTANT',
    phone: '0559988776',
    active: true,
    password: '123',
  },
  {
    id: 'usr_staff',
    username: 'staff',
    fullName: 'عمر الشهري (مشرف المتابعة)',
    role: 'VIEWER',
    phone: '0543322110',
    active: true,
    password: '123',
  },
];

const DEFAULT_CUSTOMERS: Customer[] = [];
const DEFAULT_DRIVERS: Driver[] = [];
const DEFAULT_TRUCKS: Truck[] = [];
const DEFAULT_TRIPS: Trip[] = [];
const DEFAULT_MAINTENANCE: MaintenanceRecord[] = [];
const DEFAULT_COLLECTIONS: CollectionRecord[] = [];
const DEFAULT_EXPENSES: ExpenseRecord[] = [];
const DEFAULT_AUDIT_LOGS: AuditLog[] = [];
const DEFAULT_NOTIFICATIONS: AppNotification[] = [];

// In-memory store fallback if localStorage is blocked (e.g. cross-origin iframe security or quota exceeded)
const inMemoryStore: Record<string, string> = {};

function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__test_storage__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = isStorageAvailable();

// Helper to get from storage safely with multi-tiered fallback
function getItem<T>(key: string, defaultValue: T): T {
  try {
    // 1. Primary: If in-memory store has this key, it is always the most up-to-date and complete (0ms latency)
    if (inMemoryStore[key] !== undefined && inMemoryStore[key] !== null) {
      return JSON.parse(inMemoryStore[key]) as T;
    }
    // 2. Secondary: If not yet loaded in memory, try reading from localStorage
    if (storageAvailable) {
      const raw = localStorage.getItem(key);
      if (raw) {
        inMemoryStore[key] = raw; // populate inMemory cache
        return JSON.parse(raw) as T;
      }
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

function hasItem(key: string): boolean {
  try {
    if (inMemoryStore[key] !== undefined && inMemoryStore[key] !== null) {
      return true;
    }
    if (storageAvailable) {
      const raw = localStorage.getItem(key);
      return raw !== null && raw !== undefined;
    }
    return false;
  } catch {
    return false;
  }
}

let snapshotTimer: any = null;
function scheduleAutoSnapshot(): void {
  if (typeof window === 'undefined') return;
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    try {
      StorageService.createAutoSnapshot();
    } catch {
      // safe ignore
    }
  }, 2500);
}

function setItem<T>(key: string, value: T, writeToUnlimited: boolean = true): void {
  try {
    const str = JSON.stringify(value);
    // 1. Always keep memory store updated immediately so React components see all items (5000+) instantly
    inMemoryStore[key] = str;

    // 2. Attempt localStorage caching, catching 5MB quota exceptions gracefully without corrupting data
    if (storageAvailable) {
      try {
        localStorage.setItem(key, str);
      } catch {
        // Quota exceeded (expected when storing thousands of drivers/trucks) - safely handled by UnlimitedStorage
      }
    }

    // 3. Asynchronously write to UnlimitedStorage (IndexedDB has gigabytes/1TB open capacity)
    if (writeToUnlimited) {
      UnlimitedStorage.setItem(key, value);
      scheduleAutoSnapshot();
    }
  } catch (e) {
    console.warn('Storage set error:', e);
  }
}

function removeItem(key: string): void {
  try {
    if (storageAvailable) {
      try {
        localStorage.removeItem(key);
      } catch {
        // safe ignore
      }
    }
    delete inMemoryStore[key];
    UnlimitedStorage.removeItem(key);
  } catch (e) {
    console.warn('Storage remove error:', e);
  }
}

function clearAllStorage(): void {
  try {
    if (storageAvailable) {
      try {
        localStorage.clear();
      } catch {
        // safe ignore
      }
    }
    Object.keys(inMemoryStore).forEach(k => delete inMemoryStore[k]);
    UnlimitedStorage.clearAll();
  } catch (e) {
    console.warn('Storage clear error:', e);
  }
}

export class StorageService {
  // Initialize default data only in memory if not present, NEVER overwriting IndexedDB
  static init(): void {
    // Purge legacy keys if present
    try {
      const legacyKeys = [
        'ejaz_settings_v1', 'ejaz_users_v1', 'ejaz_current_user_v1', 'ejaz_customers_v1',
        'ejaz_drivers_v1', 'ejaz_trucks_v1', 'ejaz_trips_v1', 'ejaz_maintenance_v1',
        'ejaz_collections_v1', 'ejaz_expenses_v1', 'ejaz_audit_logs_v1', 'ejaz_notifications_v1'
      ];
      legacyKeys.forEach(k => removeItem(k));
    } catch (e) {
      console.warn('Storage purge warning', e);
    }

    try {
      if (!hasItem(STORAGE_KEYS.SETTINGS)) {
        setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS, false);
      }
      if (!hasItem(STORAGE_KEYS.USERS)) {
        setItem(STORAGE_KEYS.USERS, DEFAULT_USERS, false);
      }
      if (!hasItem(STORAGE_KEYS.CUSTOMERS)) {
        setItem(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS, false);
      }
      if (!hasItem(STORAGE_KEYS.DRIVERS)) {
        setItem(STORAGE_KEYS.DRIVERS, DEFAULT_DRIVERS, false);
      }
      if (!hasItem(STORAGE_KEYS.TRUCKS)) {
        setItem(STORAGE_KEYS.TRUCKS, DEFAULT_TRUCKS, false);
      }
      if (!hasItem(STORAGE_KEYS.TRIPS)) {
        setItem(STORAGE_KEYS.TRIPS, DEFAULT_TRIPS, false);
      }
      if (!hasItem(STORAGE_KEYS.MAINTENANCE)) {
        setItem(STORAGE_KEYS.MAINTENANCE, DEFAULT_MAINTENANCE, false);
      }
      if (!hasItem(STORAGE_KEYS.COLLECTIONS)) {
        setItem(STORAGE_KEYS.COLLECTIONS, DEFAULT_COLLECTIONS, false);
      }
      if (!hasItem(STORAGE_KEYS.EXPENSES)) {
        setItem(STORAGE_KEYS.EXPENSES, DEFAULT_EXPENSES, false);
      }
      if (!hasItem(STORAGE_KEYS.AUDIT_LOGS)) {
        setItem(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS, false);
      }
      if (!hasItem(STORAGE_KEYS.NOTIFICATIONS)) {
        setItem(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS, false);
      }
      // Default current user if not logged in
      if (!hasItem(STORAGE_KEYS.CURRENT_USER)) {
        setItem(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0], false);
      }
    } catch (e) {
      console.warn('StorageService init safe warning:', e);
    }

    // Automatically trigger unlimited storage hydration & persistence lock
    this.hydrateFromUnlimitedStorage();
    UnlimitedStorage.autoRequestPersistence();
  }

  // Settings
  static getSettings(): CompanySettings {
    return getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  static updateSettings(settings: CompanySettings, user?: User): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
    if (user) {
      this.addAuditLog(user, 'UPDATE_SETTINGS', 'Settings', 'COMPANY', 'تحديث بيانات وهوية المؤسسة الإدارية');
    }
  }

  static saveSettings(settings: CompanySettings, user?: User): void {
    this.updateSettings(settings, user);
  }

  // Users & Auth
  static getUsers(): User[] {
    return getItem(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  static getCurrentUser(): User | null {
    return getItem(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
  }

  static setCurrentUser(user: User | null): void {
    if (user) {
      setItem(STORAGE_KEYS.CURRENT_USER, user);
      this.addAuditLog(user, 'LOGIN', 'User', user.id, `تسجيل الدخول للمستخدم ${user.fullName} (${user.role})`);
    } else {
      const prevUser = this.getCurrentUser();
      if (prevUser) {
        this.addAuditLog(prevUser, 'LOGOUT', 'User', prevUser.id, `تسجيل خروج المستخدم ${prevUser.fullName}`);
      }
      removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  static saveUser(user: User, actor?: User): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    setItem(STORAGE_KEYS.USERS, users);
    if (actor) {
      this.addAuditLog(actor, 'MANAGE_USERS', 'User', user.id, `حفظ بيانات المستخدم ${user.fullName} (${user.role})`);
    }
  }

  static deleteUser(userId: string, actor?: User): void {
    const users = this.getUsers().filter(u => u.id !== userId);
    setItem(STORAGE_KEYS.USERS, users);
    if (actor) {
      this.addAuditLog(actor, 'MANAGE_USERS', 'User', userId, `حذف المستخدم معرف ${userId}`);
    }
  }

  // Customers
  static getCustomers(): Customer[] {
    return getItem(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
  }

  static saveCustomer(customer: Customer, actor?: User): void {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    const isNew = idx < 0;
    if (isNew) {
      customers.unshift(customer);
    } else {
      customers[idx] = customer;
    }
    setItem(STORAGE_KEYS.CUSTOMERS, customers);
    if (actor) {
      this.addAuditLog(
        actor,
        isNew ? 'CREATE_CUSTOMER' : 'UPDATE_CUSTOMER',
        'Customer',
        customer.id,
        `${isNew ? 'إضافة عميل جديد' : 'تعديل بيانات عميل'}: ${customer.name}`
      );
    }
  }

  static deleteCustomer(id: string, actor?: User): void {
    const customers = this.getCustomers().filter(c => c.id !== id);
    setItem(STORAGE_KEYS.CUSTOMERS, customers);
    if (actor) {
      this.addAuditLog(actor, 'DELETE_CUSTOMER', 'Customer', id, `حذف العميل معرف ${id}`);
    }
  }

  // Drivers
  static getDrivers(): Driver[] {
    return getItem(STORAGE_KEYS.DRIVERS, DEFAULT_DRIVERS);
  }

  // Safe unique ID generator for drivers (supports 5,000+ drivers without collision)
  static generateNextDriverId(): string {
    const drivers = this.getDrivers();
    let maxNum = 0;
    drivers.forEach(d => {
      const match = d.id?.match(/DRV-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextNum = Math.max(maxNum + 1, drivers.length + 1);
    return `DRV-${String(nextNum).padStart(4, '0')}`;
  }

  static saveDriver(driver: Driver, actor?: User): void {
    const drivers = this.getDrivers();
    const idx = drivers.findIndex(d => d.id === driver.id);
    const isNew = idx < 0;
    if (isNew) {
      drivers.unshift(driver);
    } else {
      drivers[idx] = driver;
    }
    setItem(STORAGE_KEYS.DRIVERS, drivers);

    // Sync with assigned truck if specified
    if (driver.assignedTruckId) {
      const trucks = this.getTrucks();
      // Remove this driver from any other truck
      trucks.forEach(t => {
        if (t.assignedDriverId === driver.id && t.id !== driver.assignedTruckId) {
          t.assignedDriverId = undefined;
          t.assignedDriverName = undefined;
          t.assignedDriverPhone = undefined;
        }
      });
      // Assign to the selected truck
      const targetTruck = trucks.find(t => t.id === driver.assignedTruckId);
      if (targetTruck) {
        targetTruck.assignedDriverId = driver.id;
        targetTruck.assignedDriverName = driver.name;
        targetTruck.assignedDriverPhone = driver.phone;
      }
      setItem(STORAGE_KEYS.TRUCKS, trucks);
    }

    if (actor) {
      this.addAuditLog(
        actor,
        isNew ? 'CREATE_DRIVER' : 'UPDATE_DRIVER',
        'Driver',
        driver.id,
        `${isNew ? 'إضافة سائق جديد' : 'تعديل بيانات سائق'}: ${driver.name}`
      );
    }
  }

  // Save batch of drivers (supports 5,000+ drivers instantaneously via high-capacity engine)
  static saveDriversBatch(newDrivers: Driver[], actor?: User): void {
    if (!newDrivers.length) return;
    const existing = this.getDrivers();
    const existingMap = new Map(existing.map(d => [d.id, d]));
    
    for (const d of newDrivers) {
      existingMap.set(d.id, d);
    }
    const merged = Array.from(existingMap.values());
    setItem(STORAGE_KEYS.DRIVERS, merged);

    if (actor) {
      this.addAuditLog(
        actor,
        'CREATE_DRIVER',
        'Driver',
        'BATCH',
        `إضافة دفعة مجمعة من السائقين (${newDrivers.length} سائق) ليصبح الإجمالي ${merged.length} سائق`
      );
    }
  }

  static deleteDriver(id: string, actor?: User): void {
    const drivers = this.getDrivers().filter(d => d.id !== id);
    setItem(STORAGE_KEYS.DRIVERS, drivers);

    // Unlink any truck assigned to this driver
    const trucks = this.getTrucks();
    let modified = false;
    trucks.forEach(t => {
      if (t.assignedDriverId === id) {
        t.assignedDriverId = undefined;
        t.assignedDriverName = undefined;
        t.assignedDriverPhone = undefined;
        modified = true;
      }
    });
    if (modified) {
      setItem(STORAGE_KEYS.TRUCKS, trucks);
    }

    if (actor) {
      this.addAuditLog(actor, 'DELETE_DRIVER', 'Driver', id, `حذف السائق معرف ${id}`);
    }
  }

  // Trucks
  static getTrucks(): Truck[] {
    const raw = getItem(STORAGE_KEYS.TRUCKS, DEFAULT_TRUCKS);
    return raw.map(t => {
      if (!t.truckNumber) {
        t.truckNumber = normalizeTruckNumber(t.plateNumber) || t.id.replace('TRK-', '');
      }
      return t;
    });
  }

  // Exact Match lookup for trucks based on full numeric truck number
  static getTruckByExactNumber(truckNum: string | number): Truck | undefined {
    const trucks = this.getTrucks();
    return trucks.find(t => isExactTruckMatch(t.truckNumber || normalizeTruckNumber(t.plateNumber), truckNum));
  }

  // Safe unique ID generator for trucks (supports 5,000+ trucks without collision)
  static generateNextTruckId(): string {
    const trucks = this.getTrucks();
    let maxNum = 0;
    trucks.forEach(t => {
      const match = t.id?.match(/TRK-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextNum = Math.max(maxNum + 1, trucks.length + 1);
    return `TRK-${String(nextNum).padStart(4, '0')}`;
  }

  static saveTruck(truck: Truck, actor?: User): void {
    const trucks = this.getTrucks();
    const idx = trucks.findIndex(t => t.id === truck.id);
    const isNew = idx < 0;
    if (isNew) {
      trucks.unshift(truck);
    } else {
      trucks[idx] = truck;
    }
    setItem(STORAGE_KEYS.TRUCKS, trucks);

    // Sync with assigned driver if specified
    const drivers = this.getDrivers();
    if (truck.assignedDriverId) {
      // Remove this truck from any other driver
      drivers.forEach(d => {
        if (d.assignedTruckId === truck.id && d.id !== truck.assignedDriverId) {
          d.assignedTruckId = undefined;
          d.assignedPlateNumber = undefined;
        }
      });
      // Assign to the selected driver
      const targetDriver = drivers.find(d => d.id === truck.assignedDriverId);
      if (targetDriver) {
        targetDriver.assignedTruckId = truck.id;
        targetDriver.assignedPlateNumber = truck.plateNumber;
      }
      setItem(STORAGE_KEYS.DRIVERS, drivers);
    } else {
      // If truck has no assigned driver, clear assignedTruckId from any driver previously linked to it
      let driversModified = false;
      drivers.forEach(d => {
        if (d.assignedTruckId === truck.id) {
          d.assignedTruckId = undefined;
          d.assignedPlateNumber = undefined;
          driversModified = true;
        }
      });
      if (driversModified) {
        setItem(STORAGE_KEYS.DRIVERS, drivers);
      }
    }

    if (actor) {
      this.addAuditLog(
        actor,
        isNew ? 'CREATE_TRUCK' : 'UPDATE_TRUCK',
        'Truck',
        truck.id,
        `${isNew ? 'إضافة شاحنة جديدة' : 'تعديل بيانات شاحنة'}: ${truck.plateNumber} (${truck.model})`
      );
    }
  }

  // Save batch of trucks (supports 5,000+ trucks instantaneously via high-capacity engine)
  static saveTrucksBatch(newTrucks: Truck[], actor?: User): void {
    if (!newTrucks.length) return;
    const existing = this.getTrucks();
    const existingMap = new Map(existing.map(t => [t.id, t]));
    
    for (const t of newTrucks) {
      existingMap.set(t.id, t);
    }
    const merged = Array.from(existingMap.values());
    setItem(STORAGE_KEYS.TRUCKS, merged);

    if (actor) {
      this.addAuditLog(
        actor,
        'CREATE_TRUCK',
        'Truck',
        'BATCH',
        `إضافة دفعة مجمعة من الشاحنات (${newTrucks.length} شاحنة) ليصبح الإجمالي ${merged.length} شاحنة`
      );
    }
  }

  // Switch or assign/unassign a driver to a truck directly
  static assignDriverToTruck(truckId: string, driverId: string | null, actor?: User): { success: boolean; message: string } {
    const trucks = this.getTrucks();
    const targetTruck = trucks.find(t => t.id === truckId);
    if (!targetTruck) {
      return { success: false, message: 'الشاحنة غير موجودة' };
    }

    const drivers = this.getDrivers();

    if (!driverId) {
      // Unassign driver
      const prevDriverName = targetTruck.assignedDriverName || 'السائق السابق';
      targetTruck.assignedDriverId = undefined;
      targetTruck.assignedDriverName = undefined;
      targetTruck.assignedDriverPhone = undefined;
      setItem(STORAGE_KEYS.TRUCKS, trucks);

      // Clear from drivers
      drivers.forEach(d => {
        if (d.assignedTruckId === truckId) {
          d.assignedTruckId = undefined;
          d.assignedPlateNumber = undefined;
        }
      });
      setItem(STORAGE_KEYS.DRIVERS, drivers);

      if (actor) {
        this.addAuditLog(actor, 'UPDATE_TRUCK', 'Truck', targetTruck.id, `إلغاء ربط السائق (${prevDriverName}) من الشاحنة ${targetTruck.plateNumber}`);
      }

      return { success: true, message: `تم إلغاء ربط السائق من الشاحنة ${targetTruck.plateNumber}` };
    }

    const newDriver = drivers.find(d => d.id === driverId);
    if (!newDriver) {
      return { success: false, message: 'السائق المحدد غير موجود بالنظام' };
    }

    // Unassign old driver from this truck
    drivers.forEach(d => {
      if (d.assignedTruckId === truckId && d.id !== driverId) {
        d.assignedTruckId = undefined;
        d.assignedPlateNumber = undefined;
      }
      // Also unassign new driver from any other truck they were linked to
      if (d.id === driverId) {
        d.assignedTruckId = targetTruck.id;
        d.assignedPlateNumber = targetTruck.plateNumber;
      }
    });

    // Update truck
    targetTruck.assignedDriverId = newDriver.id;
    targetTruck.assignedDriverName = newDriver.name;
    targetTruck.assignedDriverPhone = newDriver.phone;

    // Clear any other truck that had this driver
    trucks.forEach(t => {
      if (t.id !== truckId && t.assignedDriverId === driverId) {
        t.assignedDriverId = undefined;
        t.assignedDriverName = undefined;
        t.assignedDriverPhone = undefined;
      }
    });

    setItem(STORAGE_KEYS.TRUCKS, trucks);
    setItem(STORAGE_KEYS.DRIVERS, drivers);

    if (actor) {
      this.addAuditLog(
        actor,
        'UPDATE_TRUCK',
        'Truck',
        targetTruck.id,
        `تبديل وتعيين السائق (${newDriver.name}) للشاحنة (${targetTruck.plateNumber})`
      );
    }

    return { 
      success: true, 
      message: `تم ربط وتبديل السائق بنجاح: تم تعيين (${newDriver.name}) للشاحنة (${targetTruck.plateNumber})` 
    };
  }

  static deleteTruck(id: string, actor?: User): void {
    const trucks = this.getTrucks().filter(t => t.id !== id);
    setItem(STORAGE_KEYS.TRUCKS, trucks);

    // Unlink any driver assigned to this truck
    const drivers = this.getDrivers();
    let modified = false;
    drivers.forEach(d => {
      if (d.assignedTruckId === id) {
        d.assignedTruckId = undefined;
        d.assignedPlateNumber = undefined;
        modified = true;
      }
    });
    if (modified) {
      setItem(STORAGE_KEYS.DRIVERS, drivers);
    }

    if (actor) {
      this.addAuditLog(actor, 'DELETE_TRUCK', 'Truck', id, `حذف الشاحنة معرف ${id}`);
    }
  }

  // Bind Driver and Truck Permanently
  static bindDriverAndTruck(driverId: string, truckId: string, actor?: User): void {
    const drivers = this.getDrivers();
    const trucks = this.getTrucks();

    const driver = drivers.find(d => d.id === driverId);
    const truck = trucks.find(t => t.id === truckId);

    if (driver && truck) {
      // Unlink any previous associations
      drivers.forEach(d => {
        if (d.assignedTruckId === truck.id && d.id !== driver.id) {
          d.assignedTruckId = undefined;
          d.assignedPlateNumber = undefined;
        }
      });
      trucks.forEach(t => {
        if (t.assignedDriverId === driver.id && t.id !== truck.id) {
          t.assignedDriverId = undefined;
          t.assignedDriverName = undefined;
          t.assignedDriverPhone = undefined;
        }
      });

      // Bind them together
      driver.assignedTruckId = truck.id;
      driver.assignedPlateNumber = truck.plateNumber;
      driver.assignedTruckNumber = truck.truckNumber || normalizeTruckNumber(truck.plateNumber);

      truck.assignedDriverId = driver.id;
      truck.assignedDriverName = driver.name;
      truck.assignedDriverPhone = driver.phone;

      setItem(STORAGE_KEYS.DRIVERS, drivers);
      setItem(STORAGE_KEYS.TRUCKS, trucks);

      // MANDATORY 1-to-1: Automatically synchronize and unify all trips of this driver to this bound truck
      this.syncTripsToDriverTruck(driver.id, truck.plateNumber, actor);

      if (actor) {
        this.addAuditLog(
          actor,
          'UPDATE_DRIVER',
          'Driver',
          driver.id,
          `ربط إجباري وتثبيت السائق ${driver.name} بالشاحنة رقم ${truck.plateNumber} وتوحيد كافة رحلاته`
        );
      }
    }
  }

  // Synchronize Driver Profile Truck to Match His Actual Recorded Trips
  static syncDriverToTripTruck(driverId: string, targetPlate: string, actor?: User): boolean {
    const drivers = this.getDrivers();
    const driver = drivers.find(d => d.id === driverId);
    if (!driver || !targetPlate) return false;

    const cleanPlate = targetPlate.trim();
    const trucks = this.getTrucks();
    let targetTruck = trucks.find(t => t.plateNumber.trim() === cleanPlate);

    if (!targetTruck) {
      targetTruck = {
        id: `TRK-${Date.now().toString().slice(-4)}`,
        plateNumber: cleanPlate,
        model: 'شاحنة نقل بضائع',
        year: 2023,
        status: 'AVAILABLE',
        truckType: 'CURTAIN',
        ownership: 'COMPANY',
        notes: 'تمت إضافتها آلياً من سجلات الرحلات',
        assignedDriverId: driver.id,
        assignedDriverName: driver.name,
        assignedDriverPhone: driver.phone,
        createdAt: new Date().toISOString().split('T')[0],
      };
      trucks.push(targetTruck);
    } else {
      targetTruck.assignedDriverId = driver.id;
      targetTruck.assignedDriverName = driver.name;
      targetTruck.assignedDriverPhone = driver.phone;
    }

    // Unlink this driver from any other trucks
    trucks.forEach(t => {
      if (t.id !== targetTruck?.id && t.assignedDriverId === driver.id) {
        t.assignedDriverId = undefined;
        t.assignedDriverName = undefined;
        t.assignedDriverPhone = undefined;
      }
    });

    driver.assignedTruckId = targetTruck.id;
    driver.assignedPlateNumber = targetTruck.plateNumber;

    setItem(STORAGE_KEYS.DRIVERS, drivers);
    setItem(STORAGE_KEYS.TRUCKS, trucks);

    if (actor) {
      this.addAuditLog(
        actor,
        'UPDATE_DRIVER',
        'Driver',
        driver.id,
        `مطابقة وتحديث شاحنة السائق ${driver.name} لتصبح ${cleanPlate} مطابقة لرحلاته الفعلية`
      );
    }

    return true;
  }

  // Synchronize All Driver's Trips to Match His Assigned Truck
  static syncTripsToDriverTruck(driverId: string, targetPlate: string, actor?: User): number {
    const trips = this.getTrips();
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const driver = drivers.find(d => d.id === driverId);

    const cleanPlate = targetPlate.trim();
    const targetTruck = trucks.find(t => t.plateNumber.trim() === cleanPlate);
    let updatedCount = 0;

    trips.forEach(t => {
      const match = t.driverId === driverId || 
        (driver && ((t.driverPhone && t.driverPhone === driver.phone) || (t.driverName && t.driverName.trim() === driver.name.trim())));
      if (match) {
        t.plateNumber = cleanPlate;
        if (targetTruck) {
          t.truckId = targetTruck.id;
          t.truckType = targetTruck.truckType;
          t.truckNumber = targetTruck.truckNumber || normalizeTruckNumber(cleanPlate);
        } else {
          t.truckNumber = normalizeTruckNumber(cleanPlate);
        }
        if (t.frozenValues) {
          t.frozenValues.plateNumber = cleanPlate;
          if (targetTruck) {
            t.frozenValues.truckId = targetTruck.id;
          }
        }
        t.uniqueKey = generateTripUniqueKey(t.tripNumber, driver?.nationalId || t.frozenValues?.nationalId, cleanPlate);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      setItem(STORAGE_KEYS.TRIPS, trips);
      if (actor && driver) {
        this.addAuditLog(
          actor,
          'UPDATE_TRIP',
          'Trip',
          driverId,
          `تحديث ومطابقة لوحة الشاحنة في ${updatedCount} رحلة للسائق ${driver.name} لتصبح ${cleanPlate}`
        );
      }
    }

    return updatedCount;
  }

  // Enforce Mandatory 1-to-1 Driver to Truck Binding Across All System Records
  // Scans all drivers and guarantees that every driver is strictly tied to ONE truck,
  // and all their past & current trips are consolidated to that exact truck.
  static enforceStrictOneDriverOneTruckBinding(actor?: User): { fixedTripsCount: number; fixedDriversCount: number } {
    const drivers = this.getDrivers();
    const trucks = this.getTrucks();
    const trips = this.getTrips();
    let fixedTripsCount = 0;
    let fixedDriversCount = 0;
    let driversModified = false;
    let trucksModified = false;
    let tripsModified = false;

    drivers.forEach(driver => {
      let officialPlate = (driver.assignedPlateNumber || '').trim();
      let assignedTruck = trucks.find(t => t.id === driver.assignedTruckId || (officialPlate && t.plateNumber.trim() === officialPlate));

      // If driver has no assigned truck yet, look at his trips to adopt the most recent truck
      if (!officialPlate || !assignedTruck) {
        const driverTrips = trips.filter(t => t.driverId === driver.id || (t.driverName && t.driverName.trim() === driver.name.trim()));
        if (driverTrips.length > 0) {
          const firstPlate = (driverTrips[0].plateNumber || driverTrips[0].frozenValues?.plateNumber || '').trim();
          if (firstPlate) {
            officialPlate = firstPlate;
            assignedTruck = trucks.find(t => t.plateNumber.trim() === officialPlate);
            if (!assignedTruck) {
              assignedTruck = {
                id: `TRK-${Date.now().toString().slice(-4)}`,
                plateNumber: officialPlate,
                truckNumber: normalizeTruckNumber(officialPlate),
                model: 'شاحنة نقل بضائع',
                year: 2023,
                truckType: 'CURTAIN',
                status: 'AVAILABLE',
                ownership: 'COMPANY',
                notes: 'تمت إضافتها آلياً لتأكيد ربط السائق بالشاحنة',
                assignedDriverId: driver.id,
                assignedDriverName: driver.name,
                assignedDriverPhone: driver.phone,
                createdAt: new Date().toISOString().split('T')[0],
              };
              trucks.push(assignedTruck);
              trucksModified = true;
            }
            driver.assignedTruckId = assignedTruck.id;
            driver.assignedPlateNumber = officialPlate;
            driver.assignedTruckNumber = assignedTruck.truckNumber;
            driversModified = true;
            fixedDriversCount++;
          }
        }
      }

      if (officialPlate && assignedTruck) {
        // Enforce 1-to-1 exclusivity: truck is strictly assigned to this driver
        if (assignedTruck.assignedDriverId !== driver.id) {
          assignedTruck.assignedDriverId = driver.id;
          assignedTruck.assignedDriverName = driver.name;
          assignedTruck.assignedDriverPhone = driver.phone;
          trucksModified = true;
        }

        // Unify all trips belonging to this driver to this ONE official truck
        trips.forEach(t => {
          const isDriverTrip = t.driverId === driver.id || 
            (driver.phone && t.driverPhone && t.driverPhone === driver.phone) ||
            (t.driverName && t.driverName.trim() === driver.name.trim());
          
          if (isDriverTrip) {
            const currentPlate = (t.plateNumber || '').trim();
            if (currentPlate !== officialPlate || t.truckId !== assignedTruck?.id) {
              t.plateNumber = officialPlate;
              t.truckId = assignedTruck?.id || t.truckId;
              t.truckType = assignedTruck?.truckType || t.truckType;
              t.truckNumber = assignedTruck?.truckNumber || normalizeTruckNumber(officialPlate);
              if (t.frozenValues) {
                t.frozenValues.plateNumber = officialPlate;
                if (assignedTruck) t.frozenValues.truckId = assignedTruck.id;
              }
              t.uniqueKey = generateTripUniqueKey(t.tripNumber, driver.nationalId || t.frozenValues?.nationalId, officialPlate);
              tripsModified = true;
              fixedTripsCount++;
            }
          }
        });
      }
    });

    if (driversModified) setItem(STORAGE_KEYS.DRIVERS, drivers);
    if (trucksModified) setItem(STORAGE_KEYS.TRUCKS, trucks);
    if (tripsModified) setItem(STORAGE_KEYS.TRIPS, trips);

    if (actor && (fixedTripsCount > 0 || fixedDriversCount > 0)) {
      this.addAuditLog(
        actor,
        'UPDATE_SETTINGS',
        'System',
        'ENFORCE_1TO1_BINDING',
        `تطبيق نظام الربط الإجباري (سائق واحد = شاحنة واحدة): تم توحيد ${fixedTripsCount} رحلة وتأكيد شاحنات ${fixedDriversCount} سائق`
      );
    }

    return { fixedTripsCount, fixedDriversCount };
  }

  // Unify Driver Profile and Trips with an explicit truck plate
  static unifyDriverAndTripsTruck(driverId: string, targetPlate: string, actor?: User): { driverUpdated: boolean; tripsUpdatedCount: number } {
    const driverUpdated = this.syncDriverToTripTruck(driverId, targetPlate, actor);
    const tripsUpdatedCount = this.syncTripsToDriverTruck(driverId, targetPlate, actor);
    return { driverUpdated, tripsUpdatedCount };
  }

  // Trips
  static getTrips(): Trip[] {
    const trips = getItem(STORAGE_KEYS.TRIPS, DEFAULT_TRIPS);
    const drivers = this.getDrivers();
    let hasMissingData = false;
    const enriched = trips.map(t => {
      if (!t.uniqueKey) {
        hasMissingData = true;
        const drv = drivers.find(d => d.id === t.driverId || d.name === t.driverName);
        t.uniqueKey = generateTripUniqueKey(t.tripNumber, drv?.nationalId || t.frozenValues?.nationalId, t.plateNumber);
      }
      if (!t.financialCenterCode) {
        hasMissingData = true;
        t.financialCenterCode = this.generateFinancialCenterCode(t.tripNumber);
      }
      if (!t.operationType) {
        t.operationType = t.isSubcontracted ? 'SUBCONTRACTED_SPOT' : 'INTERNAL';
      }
      if (t.isSubcontracted || t.operationType === 'SUBCONTRACTED_SPOT') {
        const clientVal = t.totalAmount || t.clientAgreedAmount || t.baseAmount || 0;
        const carrierCost = t.externalCarrierCost || 0;
        if (t.brokerageMargin === undefined) {
          t.brokerageMargin = Math.max(0, clientVal - carrierCost);
          t.netProfit = t.brokerageMargin;
          hasMissingData = true;
        }
      }
      return t;
    });
    if (hasMissingData) {
      setItem(STORAGE_KEYS.TRIPS, enriched);
    }
    return enriched;
  }

  // Get all trips belonging to a specific driver by driverId
  static getTripsByDriverId(driverId: string): Trip[] {
    const trips = this.getTrips();
    return trips.filter(t => t.driverId === driverId);
  }

  // Atomic Transaction: Save Complete Driver File (Driver + Linked Truck + All Trips)
  static saveCompleteDriverFile(input: CompleteDriverFileInput): {
    success: boolean;
    driver: Driver;
    truck: Truck;
    trips: Trip[];
    message: string;
  } {
    const { driver: dInput, truck: tInput, trips: tripsInput, actor } = input;

    // 1. Mandatory Validation: Must pass before modifying any record
    if (!dInput.name || !dInput.name.trim()) {
      throw new Error('اسم السائق إجباري.');
    }
    if (!dInput.phone || !dInput.phone.trim()) {
      throw new Error('رقم هاتف السائق إجباري.');
    }
    if (!dInput.nationalId || !dInput.nationalId.trim()) {
      throw new Error('رقم هوية السائق إجباري.');
    }

    const drivers = this.getDrivers();
    const trucks = this.getTrucks();
    const allTrips = this.getTrips();

    // Check duplicate driver
    const isNewDriver = !dInput.id;
    const targetDriverId = dInput.id || this.generateNextDriverId();

    const existingDriverWithSameIdOrNat = drivers.find(d => 
      d.id !== targetDriverId && (
        (d.nationalId && d.nationalId.trim() === dInput.nationalId.trim()) ||
        (d.name.trim() === dInput.name.trim() && d.phone.trim() === dInput.phone.trim())
      )
    );
    if (existingDriverWithSameIdOrNat) {
      throw new Error(`هذا السائق موجود بالفعل في النظام (رقم الهوية: ${dInput.nationalId}).`);
    }

    // Check truck validation & exact match
    const cleanTruckNumber = normalizeTruckNumber(tInput.truckNumber);
    if (!cleanTruckNumber && !tInput.plateNumber) {
      throw new Error('رقم الشاحنة أو رقم اللوحة إجباري.');
    }

    let targetTruck: Truck;
    if (tInput.isNewTruck) {
      // Check duplicate truck by exact numeric truckNumber or exact plateNumber
      const existingDuplicateTruck = trucks.find(t => 
        (cleanTruckNumber && isExactTruckMatch(t.truckNumber || normalizeTruckNumber(t.plateNumber), cleanTruckNumber)) ||
        (tInput.plateNumber && t.plateNumber.trim() === tInput.plateNumber.trim())
      );
      if (existingDuplicateTruck) {
        throw new Error(`هذه الشاحنة موجودة بالفعل في الأسطول (رقم الشاحنة: ${cleanTruckNumber || tInput.plateNumber}). يرجى اختيارها من قائمة الشاحنات الموجودة.`);
      }

      targetTruck = {
        id: this.generateNextTruckId(),
        truckNumber: cleanTruckNumber || normalizeTruckNumber(tInput.plateNumber),
        plateNumber: tInput.plateNumber.trim() || cleanTruckNumber,
        truckType: tInput.truckType || 'CURTAIN',
        model: tInput.model.trim() || 'شاحنة نقل',
        year: 2024,
        ownership: 'COMPANY',
        status: tInput.status || 'AVAILABLE',
        notes: tInput.notes || '',
        assignedDriverId: targetDriverId,
        assignedDriverName: dInput.name.trim(),
        assignedDriverPhone: dInput.phone.trim(),
        createdAt: new Date().toISOString().split('T')[0],
      };
    } else {
      const foundTruck = trucks.find(t => 
        (tInput.existingTruckId && t.id === tInput.existingTruckId) ||
        (cleanTruckNumber && isExactTruckMatch(t.truckNumber || normalizeTruckNumber(t.plateNumber), cleanTruckNumber))
      );
      if (!foundTruck) {
        throw new Error('الشاحنة المحددة غير موجودة في الأسطول.');
      }
      targetTruck = {
        ...foundTruck,
        truckNumber: foundTruck.truckNumber || cleanTruckNumber || normalizeTruckNumber(foundTruck.plateNumber),
        assignedDriverId: targetDriverId,
        assignedDriverName: dInput.name.trim(),
        assignedDriverPhone: dInput.phone.trim(),
      };
    }

    // Check trip numbers uniqueness
    const tripNumberSet = new Set<string>();
    for (const trp of tripsInput) {
      const num = trp.tripNumber.trim();
      if (!num) {
        throw new Error('رقم الرحلة إجباري لجميع الرحلات.');
      }
      if (tripNumberSet.has(num)) {
        throw new Error(`يوجد تكرار في أرقام الرحلات المدخلة: (${num}).`);
      }
      tripNumberSet.add(num);

      // Check against global trips in system (excluding this trip if it was already saved)
      const existingTripInDb = allTrips.find(t => t.tripNumber === num && (!trp.id || t.id !== trp.id));
      if (existingTripInDb) {
        throw new Error(`رقم الرحلة (${num}) مستخدم بالفعل في النظام.`);
      }
    }

    // 2. Execution phase (Atomic save)
    // Update or create Driver
    const finalDriver: Driver = {
      id: targetDriverId,
      name: dInput.name.trim(),
      phone: dInput.phone.trim(),
      nationalId: dInput.nationalId.trim(),
      licenseNumber: dInput.licenseNumber?.trim() || '',
      licenseExpiry: dInput.licenseExpiry || '2028-12-31',
      address: dInput.address?.trim() || '',
      status: dInput.status || 'ACTIVE',
      notes: dInput.notes?.trim() || '',
      assignedTruckId: targetTruck.id,
      assignedTruckNumber: targetTruck.truckNumber,
      assignedPlateNumber: targetTruck.plateNumber,
      photoUrl: dInput.photoUrl,
      licensePhotoUrl: dInput.licensePhotoUrl,
      idPhotoUrl: dInput.idPhotoUrl,
      nationality: dInput.nationality || 'سعودي',
      jobTitle: dInput.jobTitle || 'سائق نقل ثقيل',
      bloodType: dInput.bloodType,
      emergencyContact: dInput.emergencyContact,
      createdAt: isNewDriver ? new Date().toISOString().split('T')[0] : (drivers.find(d => d.id === targetDriverId)?.createdAt || new Date().toISOString().split('T')[0]),
    };

    // Unassign this truck from any other driver
    drivers.forEach(d => {
      if (d.assignedTruckId === targetTruck.id && d.id !== finalDriver.id) {
        d.assignedTruckId = undefined;
        d.assignedTruckNumber = undefined;
        d.assignedPlateNumber = undefined;
      }
    });

    // Save driver to drivers list
    const dIdx = drivers.findIndex(d => d.id === finalDriver.id);
    if (dIdx >= 0) {
      drivers[dIdx] = finalDriver;
    } else {
      drivers.unshift(finalDriver);
    }

    // Unassign driver from any other truck
    trucks.forEach(t => {
      if (t.id !== targetTruck.id && t.assignedDriverId === finalDriver.id) {
        t.assignedDriverId = undefined;
        t.assignedDriverName = undefined;
        t.assignedDriverPhone = undefined;
      }
    });

    // Save truck to trucks list
    const tIdx = trucks.findIndex(t => t.id === targetTruck.id);
    if (tIdx >= 0) {
      trucks[tIdx] = targetTruck;
    } else {
      trucks.unshift(targetTruck);
    }

    // 3. Process Trips
    // Preserve history rule:
    // If a trip already existed in the DB, it keeps its original truckId/truckNumber/plateNumber!
    // If it's a new trip, it gets assigned the current targetTruck!
    const processedTrips: Trip[] = [];

    // Filter out any trips belonging to this driver that were explicitly removed in the edit form
    const currentInputTripIds = new Set(tripsInput.map(t => t.id).filter(Boolean));
    const finalAllTrips = allTrips.filter(t => {
      if (t.driverId === finalDriver.id && !currentInputTripIds.has(t.id)) {
        return false;
      }
      return true;
    });

    for (const trpInput of tripsInput) {
      const existingInDb = allTrips.find(t => t.id === trpInput.id || t.tripNumber === trpInput.tripNumber);
      
      let tripTruckId = targetTruck.id;
      let tripTruckNumber = targetTruck.truckNumber;
      let tripPlateNumber = targetTruck.plateNumber;
      let tripTruckType = targetTruck.truckType;

      if (existingInDb) {
        // RULE 13: PRESERVE HISTORICAL TRUCK FOR PAST TRIPS
        // If the trip already had a truck registered, keep that truck intact!
        tripTruckId = trpInput.truckId || existingInDb.truckId || targetTruck.id;
        tripTruckNumber = trpInput.truckNumber || existingInDb.truckNumber || targetTruck.truckNumber;
        tripPlateNumber = trpInput.plateNumber || existingInDb.plateNumber || targetTruck.plateNumber;
        tripTruckType = existingInDb.truckType || targetTruck.truckType;
      }

      const tripId = trpInput.id || `TRP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const base = Number(trpInput.baseAmount) || 0;
      const expenses = Number(trpInput.tripExpenses) || 0;
      const net = base - expenses;

      const fullTrip: Trip = {
        id: tripId,
        tripNumber: trpInput.tripNumber.trim(),
        date: trpInput.date,
        status: trpInput.status || 'COMPLETED',
        customerId: existingInDb?.customerId || 'CUST-GEN',
        customerName: existingInDb?.customerName || 'عميل نقليات عام',
        customerPhone: existingInDb?.customerPhone || '',
        customerAddress: existingInDb?.customerAddress || '',
        driverId: finalDriver.id,
        driverName: finalDriver.name,
        driverPhone: finalDriver.phone,
        truckId: tripTruckId,
        truckNumber: tripTruckNumber,
        plateNumber: tripPlateNumber,
        truckType: tripTruckType,
        cargoType: trpInput.cargoType || 'بضائع عامة',
        cargoDescription: trpInput.cargoDescription || '',
        loadingLocation: trpInput.loadingLocation || '',
        unloadingLocation: trpInput.unloadingLocation || '',
        loadingTime: existingInDb?.loadingTime || '08:00',
        estimatedArrival: existingInDb?.estimatedArrival || '18:00',
        baseAmount: base,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: base,
        paidAmount: existingInDb?.paidAmount || base,
        remainingAmount: 0,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        commissionAmount: 0,
        driverCustody: 0,
        custodyMethod: '',
        tripExpenses: expenses,
        netProfit: net,
        notes: trpInput.notes || '',
        createdAt: existingInDb?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uniqueKey: generateTripUniqueKey(trpInput.tripNumber.trim(), finalDriver.nationalId, tripPlateNumber),
      };

      processedTrips.push(fullTrip);

      // Update in finalAllTrips
      const existingIdx = finalAllTrips.findIndex(t => t.id === fullTrip.id);
      if (existingIdx >= 0) {
        finalAllTrips[existingIdx] = fullTrip;
      } else {
        finalAllTrips.unshift(fullTrip);
      }
    }

    // Atomic write to storage
    setItem(STORAGE_KEYS.DRIVERS, drivers);
    setItem(STORAGE_KEYS.TRUCKS, trucks);
    setItem(STORAGE_KEYS.TRIPS, finalAllTrips);

    // Audit Log
    if (actor) {
      this.addAuditLog(
        actor,
        isNewDriver ? 'CREATE_DRIVER' : 'UPDATE_DRIVER',
        'Driver',
        finalDriver.id,
        `${isNewDriver ? 'إنشاء وحفظ ملف سائق متكامل' : 'تحديث ملف سائق متكامل'}: السائق (${finalDriver.name}) - الشاحنة (${targetTruck.truckNumber || targetTruck.plateNumber}) - عدد الرحلات (${processedTrips.length})`
      );
    }

    return {
      success: true,
      driver: finalDriver,
      truck: targetTruck,
      trips: processedTrips,
      message: `تم حفظ ملف السائق (${finalDriver.name}) بنجاح مع الشاحنة (${targetTruck.truckNumber || targetTruck.plateNumber}) و ${processedTrips.length} رحلة.`,
    };
  }

  static generateTripNumber(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `TRP-${yyyy}${mm}${dd}`;
    
    const trips = this.getTrips();
    const todayTrips = trips.filter(t => t.tripNumber.startsWith(datePrefix));
    const nextSeq = String(todayTrips.length + 1).padStart(4, '0');
    return `${datePrefix}-${nextSeq}`;
  }

  // Generate Unique Financial Center Code (كود القائم المالي / المركز المالي)
  static generateFinancialCenterCode(tripNumber?: string): string {
    if (tripNumber) {
      const clean = tripNumber.replace(/^TRP-/, '');
      return `FIN-${clean}`;
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `FIN-${yyyy}${mm}${dd}-${rnd}`;
  }

  // Validate Trip Data & Fixed Driver-Truck Binding
  static validateTrip(trip: Partial<Trip>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!trip.customerName || !trip.customerName.trim()) {
      errors.push('يجب تحديد اسم العميل.');
    }

    const isSpot = trip.operationType === 'SUBCONTRACTED_SPOT' || trip.isSubcontracted;

    if (isSpot) {
      if (!trip.externalCarrierName && !trip.driverName) {
        errors.push('يجب تحديد اسم السائق أو الناقل الخارجي للرحلة اللحظية.');
      }
      if (!trip.externalTruckPlate && !trip.plateNumber) {
        errors.push('يجب تحديد رقم لوحة الشاحنة الخارجية.');
      }
      return {
        isValid: errors.length === 0,
        errors,
      };
    }

    if (!trip.driverId && !trip.driverName) {
      errors.push('يجب تحديد السائق لهذه الرحلة.');
    }

    if (!trip.truckId && !trip.plateNumber) {
      errors.push('يجب تحديد الشاحنة / رقم اللوحة لهذه الرحلة.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static saveTrip(trip: Trip, actor?: User): void {
    const validation = this.validateTrip(trip);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' | '));
    }

    // Ensure Financial Center Code is strictly linked
    if (!trip.financialCenterCode) {
      trip.financialCenterCode = this.generateFinancialCenterCode(trip.tripNumber);
    }

    const isSpot = trip.operationType === 'SUBCONTRACTED_SPOT' || trip.isSubcontracted;

    let currentDriver: Driver | undefined;
    let currentTruck: Truck | undefined;

    if (isSpot) {
      // Subcontracted / Instant Broker Trip (رحلة لحظية وساطة وتشغيل خارجي)
      trip.operationType = 'SUBCONTRACTED_SPOT';
      trip.isSubcontracted = true;
      trip.driverName = trip.externalCarrierName || trip.driverName || 'سائق خارجي';
      trip.driverPhone = trip.externalCarrierPhone || trip.driverPhone || '';
      trip.plateNumber = trip.externalTruckPlate || trip.plateNumber || 'شاحنة خارجية';
      trip.driverId = trip.driverId || 'EXT_SPOT_DRIVER';
      trip.truckId = trip.truckId || 'EXT_SPOT_TRUCK';

      const clientVal = Number(trip.totalAmount || trip.clientAgreedAmount || trip.baseAmount || 0);
      const carrierCost = Number(trip.externalCarrierCost || 0);
      const margin = Math.max(0, clientVal - carrierCost);

      trip.clientAgreedAmount = clientVal;
      trip.externalCarrierCost = carrierCost;
      trip.brokerageMargin = margin;
      trip.netProfit = margin;
      trip.tripExpenses = carrierCost;
      trip.baseAmount = clientVal;
      trip.totalAmount = clientVal;
    } else {
      // Internal Fleet Trip (أسطول داخلي مع الربط الإلزامي)
      trip.operationType = 'INTERNAL';
      trip.isSubcontracted = false;

      const drivers = this.getDrivers();
      const trucks = this.getTrucks();

      currentDriver = drivers.find(d => d.id === trip.driverId || (trip.driverName && d.name.trim() === trip.driverName.trim()));
      currentTruck = trucks.find(t => t.id === trip.truckId || (trip.plateNumber && t.plateNumber.trim() === trip.plateNumber.trim()));

      if (currentDriver && (currentDriver.assignedPlateNumber || currentDriver.assignedTruckId)) {
        const boundTruck = trucks.find(t => t.id === currentDriver.assignedTruckId || (currentDriver.assignedPlateNumber && t.plateNumber === currentDriver.assignedPlateNumber));
        trip.plateNumber = currentDriver.assignedPlateNumber || boundTruck?.plateNumber || trip.plateNumber;
        if (boundTruck) {
          trip.truckId = boundTruck.id;
          trip.truckType = boundTruck.truckType;
          trip.truckNumber = boundTruck.truckNumber;
          currentTruck = boundTruck;
        }
      } else if (currentTruck && currentTruck.assignedDriverId) {
        const boundDriver = drivers.find(d => d.id === currentTruck.assignedDriverId);
        if (boundDriver) {
          trip.driverId = boundDriver.id;
          trip.driverName = boundDriver.name;
          trip.driverPhone = boundDriver.phone;
          currentDriver = boundDriver;
        }
      }
    }

    // Capture immutable static snapshot at the moment of entry/relay (تثبيت كقيم دائمة تمنع الدوال المتغيرة)
    const calculatedUniqueKey = generateTripUniqueKey(
      trip.tripNumber,
      currentDriver?.nationalId || trip.frozenValues?.nationalId,
      trip.plateNumber || currentTruck?.plateNumber
    );

    const tripWithFrozenValues: Trip = {
      ...trip,
      uniqueKey: trip.uniqueKey || calculatedUniqueKey,
      frozenValues: trip.frozenValues?.isFrozen 
        ? { ...trip.frozenValues, uniqueKey: trip.frozenValues.uniqueKey || calculatedUniqueKey }
        : createImmutableTripSnapshot(trip, currentDriver, currentTruck, 'SYSTEM_LOCK'),
    };

    const trips = this.getTrips();
    const idx = trips.findIndex(t => t.id === tripWithFrozenValues.id);
    const isNew = idx < 0;
    if (isNew) {
      trips.unshift(tripWithFrozenValues);
    } else {
      trips[idx] = tripWithFrozenValues;
    }
    setItem(STORAGE_KEYS.TRIPS, trips);

    // Auto-bind driver and truck permanently only for internal fleet
    if (!isSpot && trip.driverId && trip.truckId) {
      this.bindDriverAndTruck(trip.driverId, trip.truckId);
    }

    // If trip has collection, update or create collection record
    if (isNew && trip.paidAmount > 0) {
      const newCol: CollectionRecord = {
        id: `COL-${Date.now().toString().slice(-6)}`,
        date: trip.date,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        customerId: trip.customerId,
        customerName: trip.customerName,
        amount: trip.paidAmount,
        paymentMethod: trip.paymentMethod,
        referenceNumber: `REC-${trip.tripNumber}`,
        notes: `تحصيل دفعة عند إنشاء الرحلة ${trip.tripNumber}`,
        createdAt: new Date().toISOString(),
      };
      this.saveCollection(newCol);
    }

    if (actor) {
      this.addAuditLog(
        actor,
        isNew ? 'CREATE_TRIP' : 'UPDATE_TRIP',
        'Trip',
        trip.tripNumber,
        `${isNew ? 'إضافة رحلة جديدة' : 'تحديث رحلة'}: ${trip.tripNumber} (${trip.customerName} - ${trip.loadingLocation} إلى ${trip.unloadingLocation})`
      );
    }
  }

  static deleteTrip(id: string, actor?: User): void {
    const trips = this.getTrips();
    const target = trips.find(t => t.id === id);
    const filtered = trips.filter(t => t.id !== id);
    setItem(STORAGE_KEYS.TRIPS, filtered);
    if (actor && target) {
      this.addAuditLog(actor, 'DELETE_TRIP', 'Trip', target.tripNumber, `حذف الرحلة رقم ${target.tripNumber}`);
    }
  }

  static deleteTrips(ids: string[], actor?: User): void {
    if (!ids.length) return;
    const trips = this.getTrips();
    const idSet = new Set(ids);
    const filtered = trips.filter(t => !idSet.has(t.id));
    setItem(STORAGE_KEYS.TRIPS, filtered);
    if (actor) {
      this.addAuditLog(actor, 'DELETE_TRIP', 'Trip', 'BATCH', `حذف دفعة رحلات (${ids.length} رحلة)`);
    }
  }

  // Maintenance
  static getMaintenance(): MaintenanceRecord[] {
    return getItem(STORAGE_KEYS.MAINTENANCE, DEFAULT_MAINTENANCE);
  }

  static saveMaintenance(record: MaintenanceRecord, actor?: User): void {
    const list = this.getMaintenance();
    const idx = list.findIndex(m => m.id === record.id);
    const isNew = idx < 0;
    if (isNew) {
      list.unshift(record);
    } else {
      list[idx] = record;
    }
    setItem(STORAGE_KEYS.MAINTENANCE, list);

    // If maintenance completed or created, record as an expense
    if (isNew && record.amount > 0) {
      const exp: ExpenseRecord = {
        id: `EXP-MNT-${Date.now().toString().slice(-5)}`,
        date: record.date,
        category: 'MAINTENANCE',
        amount: record.amount,
        paymentMethod: 'BANK_TRANSFER',
        description: `صيانة شاحنة ${record.plateNumber}: ${record.description}`,
        createdAt: new Date().toISOString(),
      };
      this.saveExpense(exp);
    }

    if (actor) {
      this.addAuditLog(
        actor,
        isNew ? 'CREATE_MAINTENANCE' : 'UPDATE_MAINTENANCE',
        'Maintenance',
        record.id,
        `${isNew ? 'تسجيل صيانة' : 'تحديث صيانة'} للشاحنة ${record.plateNumber} بقيمة ${record.amount} ر.س`
      );
    }
  }

  // Collections
  static getCollections(): CollectionRecord[] {
    return getItem(STORAGE_KEYS.COLLECTIONS, DEFAULT_COLLECTIONS);
  }

  static saveCollection(col: CollectionRecord, actor?: User): void {
    const list = this.getCollections();
    const idx = list.findIndex(c => c.id === col.id);
    const isNew = idx < 0;
    if (isNew) {
      list.unshift(col);
    } else {
      list[idx] = col;
    }
    setItem(STORAGE_KEYS.COLLECTIONS, list);

    // Update trip paidAmount if linked to trip
    if (col.tripId) {
      const trips = this.getTrips();
      const trip = trips.find(t => t.id === col.tripId || t.tripNumber === col.tripNumber);
      if (trip) {
        // recalculate trip collections
        const allTripCols = list.filter(c => c.tripId === trip.id || c.tripNumber === trip.tripNumber);
        const totalPaid = allTripCols.reduce((acc, c) => acc + c.amount, 0);
        trip.paidAmount = totalPaid;
        trip.remainingAmount = Math.max(0, trip.totalAmount - totalPaid);
        trip.paymentStatus = trip.remainingAmount === 0 ? 'PAID' : trip.paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
        setItem(STORAGE_KEYS.TRIPS, trips);
      }
    }

    if (actor) {
      this.addAuditLog(
        actor,
        isNew ? 'CREATE_COLLECTION' : 'UPDATE_COLLECTION' as any,
        'Collection',
        col.id,
        `${isNew ? 'سند قبض / تحصيل' : 'تعديل سند قبض'} بقيمة ${col.amount} ر.س من العميل ${col.customerName}`
      );
    }
  }

  static deleteCollection(id: string, actor?: User): void {
    const list = this.getCollections();
    const target = list.find(c => c.id === id);
    const filtered = list.filter(c => c.id !== id);
    setItem(STORAGE_KEYS.COLLECTIONS, filtered);

    // Recalculate trip payments if linked
    if (target?.tripId) {
      const trips = this.getTrips();
      const trip = trips.find(t => t.id === target.tripId || t.tripNumber === target.tripNumber);
      if (trip) {
        const remainingTripCols = filtered.filter(c => c.tripId === trip.id || c.tripNumber === trip.tripNumber);
        const totalPaid = remainingTripCols.reduce((acc, c) => acc + c.amount, 0);
        trip.paidAmount = totalPaid;
        trip.remainingAmount = Math.max(0, trip.totalAmount - totalPaid);
        trip.paymentStatus = trip.remainingAmount === 0 ? 'PAID' : trip.paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
        setItem(STORAGE_KEYS.TRIPS, trips);
      }
    }

    if (actor && target) {
      this.addAuditLog(
        actor,
        'DELETE_COLLECTION' as any,
        'Collection',
        target.id,
        `حذف سند القبض رقم ${target.id} بقيمة ${target.amount} ر.س للعميل ${target.customerName}`
      );
    }
  }

  // Expenses
  static getExpenses(): ExpenseRecord[] {
    return getItem(STORAGE_KEYS.EXPENSES, DEFAULT_EXPENSES);
  }

  static saveExpense(exp: ExpenseRecord, actor?: User): void {
    const list = this.getExpenses();
    const idx = list.findIndex(e => e.id === exp.id);
    const isNew = idx < 0;
    if (isNew) {
      list.unshift(exp);
    } else {
      list[idx] = exp;
    }
    setItem(STORAGE_KEYS.EXPENSES, list);

    if (actor) {
      this.addAuditLog(
        actor,
        isNew ? 'CREATE_EXPENSE' : 'UPDATE_EXPENSE' as any,
        'Expense',
        exp.id,
        `${isNew ? 'سند صرف / مصروف' : 'تعديل سند صرف'} بقيمة ${exp.amount} ر.س (${exp.description})`
      );
    }
  }

  static deleteExpense(id: string, actor?: User): void {
    const list = this.getExpenses();
    const target = list.find(e => e.id === id);
    const filtered = list.filter(e => e.id !== id);
    setItem(STORAGE_KEYS.EXPENSES, filtered);

    if (actor && target) {
      this.addAuditLog(
        actor,
        'DELETE_EXPENSE' as any,
        'Expense',
        target.id,
        `حذف سند الصرف رقم ${target.id} بقيمة ${target.amount} ر.س (${target.description})`
      );
    }
  }

  // Notifications
  static getNotifications(): AppNotification[] {
    return getItem(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  }

  static markNotificationAsRead(id: string): void {
    const notifs = this.getNotifications();
    const target = notifs.find(n => n.id === id);
    if (target) {
      target.read = true;
      setItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
  }

  static markAllNotificationsRead(): void {
    const notifs = this.getNotifications().map(n => ({ ...n, read: true }));
    setItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  static markAllNotificationsAsRead(): void {
    this.markAllNotificationsRead();
  }

  // Audit Logs
  static getAuditLogs(): AuditLog[] {
    return getItem(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);
  }

  static addAuditLog(
    actor: User,
    action: AuditAction,
    entityType: string,
    entityId: string,
    details: string
  ): void {
    const logs = this.getAuditLogs();
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newLog: AuditLog = {
      id: `AUD-${Date.now()}`,
      timestamp,
      userId: actor.id,
      userName: actor.fullName,
      userRole: actor.role,
      action,
      entityType,
      entityId,
      details,
    };
    logs.unshift(newLog);
    // keep up to 5000 audit logs with unlimited storage
    if (logs.length > 5000) logs.pop();
    setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  /**
   * Hydrate in-memory and local cache from UnlimitedStorage (IndexedDB)
   */
  static async hydrateFromUnlimitedStorage(): Promise<void> {
    try {
      const records = await UnlimitedStorage.getAllRecords();
      let hasUpdates = false;

      // Iterate through all application storage keys
      (Object.values(STORAGE_KEYS) as string[]).forEach((key) => {
        if (records[key] !== undefined && records[key] !== null) {
          const dbVal = records[key];
          let finalVal = dbVal;

          // If inMemoryStore had newly added items before hydration finished, merge arrays safely
          if (inMemoryStore[key]) {
            try {
              const memVal = JSON.parse(inMemoryStore[key]);
              if (Array.isArray(memVal) && Array.isArray(dbVal)) {
                if (memVal.length > dbVal.length) {
                  const dbIds = new Set(dbVal.map((item: any) => item.id || JSON.stringify(item)));
                  const nonDuplicateMemItems = memVal.filter((item: any) => !dbIds.has(item.id || JSON.stringify(item)));
                  if (nonDuplicateMemItems.length > 0) {
                    finalVal = [...dbVal, ...nonDuplicateMemItems];
                    UnlimitedStorage.setItem(key, finalVal);
                  }
                }
              }
            } catch {
              // ignore parse errors
            }
          }

          const strVal = JSON.stringify(finalVal);
          if (inMemoryStore[key] !== strVal) {
            inMemoryStore[key] = strVal;
            hasUpdates = true;
            try {
              if (storageAvailable) {
                localStorage.setItem(key, strVal);
              }
            } catch {
              // LocalStorage quota might be exceeded, but IndexedDB safely holds data
            }
          }
        } else if (inMemoryStore[key]) {
          // If IndexedDB didn't have this key yet, sync from memory to IndexedDB
          try {
            const parsed = JSON.parse(inMemoryStore[key]);
            UnlimitedStorage.setItem(key, parsed);
          } catch {
            // Ignore parsing issue
          }
        }
      });

      if (hasUpdates) {
        UnlimitedStorage.notifyHydrated();
      }
    } catch (e) {
      console.warn('Hydration from UnlimitedStorage error:', e);
    }
  }

  /**
   * Storage diagnostics and usage statistics
   */
  static async getStorageDiagnostics() {
    const estimate = await UnlimitedStorage.getStorageEstimate();
    const tripsCount = this.getTrips().length;
    const driversCount = this.getDrivers().length;
    const trucksCount = this.getTrucks().length;
    const customersCount = this.getCustomers().length;
    const logsCount = this.getAuditLogs().length;
    const collectionsCount = this.getCollections().length;
    const expensesCount = this.getExpenses().length;

    return {
      ...estimate,
      tripsCount,
      driversCount,
      trucksCount,
      customersCount,
      logsCount,
      collectionsCount,
      expensesCount,
    };
  }

  /**
   * Explicitly request permanent persistent browser storage
   */
  static async requestPersistentStorage(): Promise<boolean> {
    return await UnlimitedStorage.autoRequestPersistence();
  }

  /**
   * Test 1TB storage capability and throughput
   */
  static async verify1TBCapacity() {
    return await UnlimitedStorage.verify1TBCapacity();
  }

  /**
   * Register a listener when IndexedDB hydration finishes
   */
  static onDataHydrated(callback: () => void): () => void {
    return UnlimitedStorage.onHydrated(callback);
  }

  // Full System Export & Restore
  static exportFullBackup(): string {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      appName: 'Ejaz Transport ERP',
      settings: this.getSettings(),
      users: this.getUsers(),
      customers: this.getCustomers(),
      drivers: this.getDrivers(),
      trucks: this.getTrucks(),
      trips: this.getTrips(),
      maintenance: this.getMaintenance(),
      collections: this.getCollections(),
      expenses: this.getExpenses(),
      auditLogs: this.getAuditLogs(),
      notifications: this.getNotifications(),
    };
    return JSON.stringify(data, null, 2);
  }

  static exportBackupJSON(): string {
    return this.exportFullBackup();
  }

  /**
   * Directly download full backup JSON to user's device
   */
  static downloadBackupFile(): boolean {
    try {
      const dataStr = this.exportFullBackup();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      a.href = url;
      a.download = `ejaz_transport_complete_backup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Download backup failed:', e);
      return false;
    }
  }

  /**
   * Create an automated background snapshot of the system state in unlimited storage
   */
  static createAutoSnapshot(): void {
    try {
      const backupJson = this.exportFullBackup();
      UnlimitedStorage.setItem('ejaz_auto_snapshot_latest', {
        timestamp: new Date().toISOString(),
        backup: backupJson,
      });
    } catch (e) {
      console.warn('Auto snapshot error:', e);
    }
  }

  /**
   * Ultra-Fast Async Batch Import with Non-Blocking Processing & Live Speed Metrics (Turbo Mode)
   */
  static async importFullBackupAsync(
    jsonString: string,
    actor?: User,
    onProgress?: (percent: number, stage: string) => void
  ): Promise<{
    success: boolean;
    durationMs: number;
    counts: {
      trips: number;
      drivers: number;
      trucks: number;
      customers: number;
      collections: number;
      expenses: number;
      totalRecords: number;
    };
    error?: string;
  }> {
    const startTime = performance.now();
    const yieldThread = () => new Promise((resolve) => setTimeout(resolve, 0));

    try {
      onProgress?.(15, 'قراءة وفك تشفير ملف البيانات...');
      await yieldThread();

      const data = JSON.parse(jsonString);

      onProgress?.(35, 'فحص تطابق البيانات وهيكلية الجداول...');
      await yieldThread();

      const batchEntries: Record<string, any> = {};
      let totalRecords = 0;

      if (data.settings) batchEntries[STORAGE_KEYS.SETTINGS] = data.settings;
      if (data.users) batchEntries[STORAGE_KEYS.USERS] = data.users;
      if (data.customers) {
        batchEntries[STORAGE_KEYS.CUSTOMERS] = data.customers;
        totalRecords += Array.isArray(data.customers) ? data.customers.length : 0;
      }
      if (data.drivers) {
        batchEntries[STORAGE_KEYS.DRIVERS] = data.drivers;
        totalRecords += Array.isArray(data.drivers) ? data.drivers.length : 0;
      }
      if (data.trucks) {
        batchEntries[STORAGE_KEYS.TRUCKS] = data.trucks;
        totalRecords += Array.isArray(data.trucks) ? data.trucks.length : 0;
      }
      if (data.trips) {
        batchEntries[STORAGE_KEYS.TRIPS] = data.trips;
        totalRecords += Array.isArray(data.trips) ? data.trips.length : 0;
      }
      if (data.maintenance) {
        batchEntries[STORAGE_KEYS.MAINTENANCE] = data.maintenance;
        totalRecords += Array.isArray(data.maintenance) ? data.maintenance.length : 0;
      }
      if (data.collections) {
        batchEntries[STORAGE_KEYS.COLLECTIONS] = data.collections;
        totalRecords += Array.isArray(data.collections) ? data.collections.length : 0;
      }
      if (data.expenses) {
        batchEntries[STORAGE_KEYS.EXPENSES] = data.expenses;
        totalRecords += Array.isArray(data.expenses) ? data.expenses.length : 0;
      }
      if (data.auditLogs) batchEntries[STORAGE_KEYS.AUDIT_LOGS] = data.auditLogs;
      if (data.notifications) batchEntries[STORAGE_KEYS.NOTIFICATIONS] = data.notifications;

      onProgress?.(60, 'تحديث الذاكرة الفورية (In-Memory Engine)...');
      await yieldThread();

      // 1. Instant update to inMemoryStore so React components see data in 0ms
      for (const [key, val] of Object.entries(batchEntries)) {
        try {
          const str = JSON.stringify(val);
          inMemoryStore[key] = str;
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem(key, str);
            } catch {
              // localStorage quota exceeded is expected for large data, safe to ignore
            }
          }
        } catch (e) {
          console.warn(`Memory update warning for ${key}:`, e);
        }
      }

      onProgress?.(80, 'الحفظ المجمع فائق السرعة في قاعدة بيانات 1TB (Turbo Batch Write)...');
      await yieldThread();

      // 2. High-speed single atomic transaction in IndexedDB
      await UnlimitedStorage.setMultipleItems(batchEntries);

      onProgress?.(95, 'تسجيل العملية وتحديث فهارس النظام...');
      await yieldThread();

      if (actor) {
        this.addAuditLog(
          actor,
          'BACKUP_RESTORE',
          'System',
          'ALL',
          `استعادة سريعة لقاعدة البيانات (${totalRecords} سجل) بنجاح`
        );
      }

      // Schedule background snapshot
      scheduleAutoSnapshot();

      const durationMs = Math.round(performance.now() - startTime);
      onProgress?.(100, `تم الاستيراد بنجاح في ${durationMs} مللي ثانية ⚡`);

      return {
        success: true,
        durationMs,
        counts: {
          trips: Array.isArray(data.trips) ? data.trips.length : 0,
          drivers: Array.isArray(data.drivers) ? data.drivers.length : 0,
          trucks: Array.isArray(data.trucks) ? data.trucks.length : 0,
          customers: Array.isArray(data.customers) ? data.customers.length : 0,
          collections: Array.isArray(data.collections) ? data.collections.length : 0,
          expenses: Array.isArray(data.expenses) ? data.expenses.length : 0,
          totalRecords,
        },
      };
    } catch (e: any) {
      console.error('Fast import failed:', e);
      return {
        success: false,
        durationMs: Math.round(performance.now() - startTime),
        counts: {
          trips: 0,
          drivers: 0,
          trucks: 0,
          customers: 0,
          collections: 0,
          expenses: 0,
          totalRecords: 0,
        },
        error: e?.message || 'خطأ في معالجة ملف البيانات',
      };
    }
  }

  static importFullBackup(jsonString: string, actor?: User): boolean {
    try {
      const data = JSON.parse(jsonString);
      const batch: Record<string, any> = {};
      if (data.settings) batch[STORAGE_KEYS.SETTINGS] = data.settings;
      if (data.users) batch[STORAGE_KEYS.USERS] = data.users;
      if (data.customers) batch[STORAGE_KEYS.CUSTOMERS] = data.customers;
      if (data.drivers) batch[STORAGE_KEYS.DRIVERS] = data.drivers;
      if (data.trucks) batch[STORAGE_KEYS.TRUCKS] = data.trucks;
      if (data.trips) batch[STORAGE_KEYS.TRIPS] = data.trips;
      if (data.maintenance) batch[STORAGE_KEYS.MAINTENANCE] = data.maintenance;
      if (data.collections) batch[STORAGE_KEYS.COLLECTIONS] = data.collections;
      if (data.expenses) batch[STORAGE_KEYS.EXPENSES] = data.expenses;
      if (data.auditLogs) batch[STORAGE_KEYS.AUDIT_LOGS] = data.auditLogs;
      if (data.notifications) batch[STORAGE_KEYS.NOTIFICATIONS] = data.notifications;

      for (const [key, val] of Object.entries(batch)) {
        setItem(key, val, false);
      }
      UnlimitedStorage.setMultipleItems(batch);
      scheduleAutoSnapshot();

      if (actor) {
        this.addAuditLog(actor, 'BACKUP_RESTORE', 'System', 'ALL', 'استعادة قاعدة البيانات بالكامل من ملف نسخة احتياطية');
      }
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  static importBackupJSON(jsonString: string, actor?: User): boolean {
    return this.importFullBackup(jsonString, actor);
  }

  // ==========================================
  // SAVE POINTS & MOBILE BACKUP (نقاط الحفظ للجوال)
  // ==========================================
  static getSavePoints(): SavePointRecord[] {
    return getItem(STORAGE_KEYS.SAVE_POINTS, []);
  }

  static createSavePoint(label?: string, actor?: User): SavePointRecord {
    const trips = this.getTrips();
    const drivers = this.getDrivers();
    const trucks = this.getTrucks();
    const expenses = this.getExpenses();

    const totalRevenue = trips.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalCollected = trips.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0) + trips.reduce((sum, t) => sum + (t.tripExpenses || 0), 0);
    const netMargin = trips.reduce((sum, t) => sum + (t.netProfit ?? ((t.totalAmount || 0) - (t.tripExpenses || 0))), 0);

    const now = new Date();
    const timeFormatted = now.toLocaleDateString('ar-SA') + ' ' + now.toLocaleTimeString('ar-SA');
    const autoLabel = label?.trim() || `نقطة حفظ بتاريخ ${timeFormatted}`;

    const newPoint: SavePointRecord = {
      id: `SP-${Date.now()}`,
      timestamp: now.toISOString(),
      label: autoLabel,
      totalTrips: trips.length,
      totalRevenue,
      totalCollected,
      totalExpenses,
      netMargin,
      activeDriversCount: drivers.length,
      activeTrucksCount: trucks.length,
      backupPayload: this.exportFullBackup(),
    };

    const points = this.getSavePoints();
    points.unshift(newPoint);
    const trimmed = points.slice(0, 30);
    setItem(STORAGE_KEYS.SAVE_POINTS, trimmed);

    if (actor) {
      this.addAuditLog(actor, 'BACKUP_RESTORE', 'SavePoint', newPoint.id, `إنشاء نقطة حفظ جديدة: ${newPoint.label}`);
    }

    return newPoint;
  }

  static deleteSavePoint(id: string): void {
    const points = this.getSavePoints().filter(p => p.id !== id);
    setItem(STORAGE_KEYS.SAVE_POINTS, points);
  }

  static restoreSavePoint(id: string, actor?: User): boolean {
    const points = this.getSavePoints();
    const target = points.find(p => p.id === id);
    if (!target || !target.backupPayload) return false;
    return this.importFullBackup(target.backupPayload, actor);
  }

  // ==========================================
  // DAILY SHIFT HANDOVER REPORTS (محاضر التسليم النهاري للمالك)
  // ==========================================
  static getDailyHandovers(): DailyHandoverReport[] {
    return getItem(STORAGE_KEYS.DAILY_HANDOVERS, []);
  }

  static saveDailyHandover(report: DailyHandoverReport, actor?: User): void {
    const handovers = this.getDailyHandovers();
    const idx = handovers.findIndex(h => h.id === report.id);
    if (idx >= 0) {
      handovers[idx] = report;
    } else {
      handovers.unshift(report);
    }
    setItem(STORAGE_KEYS.DAILY_HANDOVERS, handovers);

    if (actor) {
      this.addAuditLog(actor, 'BACKUP_RESTORE', 'DailyHandover', report.id, `حفظ محضر التسليم النهاري رقم: ${report.reportNumber} للمستلم (${report.recipientName})`);
    }
  }

  static calculateTodayHandoverSummary(targetDateStr?: string) {
    const targetDate = targetDateStr || new Date().toISOString().split('T')[0];
    const trips = this.getTrips().filter(t => t.date === targetDate);
    const collections = this.getCollections().filter(c => c.date === targetDate);
    const expenses = this.getExpenses().filter(e => e.date === targetDate);

    const internalTrips = trips.filter(t => t.operationType !== 'SUBCONTRACTED_SPOT' && !t.isSubcontracted);
    const spotTrips = trips.filter(t => t.operationType === 'SUBCONTRACTED_SPOT' || t.isSubcontracted);

    const totalCashCollected = collections
      .filter(c => c.paymentMethod === 'CASH')
      .reduce((sum, c) => sum + (c.amount || 0), 0) +
      trips.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + (t.paidAmount || 0), 0);

    const totalBankTransfers = collections
      .filter(c => c.paymentMethod === 'BANK_TRANSFER')
      .reduce((sum, c) => sum + (c.amount || 0), 0) +
      trips.filter(t => t.paymentMethod === 'BANK_TRANSFER').reduce((sum, t) => sum + (t.paidAmount || 0), 0);

    const totalCustodyDisbursed = trips.reduce((sum, t) => sum + (t.driverCustody || 0), 0);
    const totalExpensesToday = expenses.reduce((sum, e) => sum + (e.amount || 0), 0) + trips.reduce((sum, t) => sum + (t.tripExpenses || 0), 0);
    const totalBrokerageProfitToday = spotTrips.reduce((sum, t) => sum + (t.brokerageMargin || t.netProfit || 0), 0);

    const netCashToDeliver = Math.max(0, totalCashCollected - totalCustodyDisbursed);

    return {
      date: targetDate,
      totalTripsToday: trips.length,
      internalTripsCount: internalTrips.length,
      spotBrokerTripsCount: spotTrips.length,
      totalCashCollected,
      totalBankTransfers,
      totalCustodyDisbursed,
      totalExpensesToday,
      totalBrokerageProfitToday,
      netCashToDeliver,
      trips,
    };
  }

  static resetToDefault(actor?: User): void {
    clearAllStorage();
    this.init();
    if (actor) {
      this.addAuditLog(actor, 'BACKUP_RESTORE', 'System', 'RESET', 'إعادة ضبط قاعدة البيانات للبيانات الافتراضية');
    }
  }

  static resetToDefaults(actor?: User): void {
    this.resetToDefault(actor);
  }
}

// Auto init on import
StorageService.init();
