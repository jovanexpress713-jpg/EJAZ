import fs from 'fs';
import path from 'path';
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
  SavePointRecord,
  DailyHandoverReport,
  UserPermissions,
  UserRole
} from '../types';

export interface DatabaseSchema {
  version: number;
  sequence: number;
  lastUpdated: string;
  settings: CompanySettings;
  users: User[];
  customers: Customer[];
  drivers: Driver[];
  trucks: Truck[];
  trips: Trip[];
  maintenance: MaintenanceRecord[];
  collections: CollectionRecord[];
  expenses: ExpenseRecord[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  savePoints: SavePointRecord[];
  dailyHandovers: DailyHandoverReport[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ejaz_database.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

export function getDefaultServerPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'SUPER_ADMIN':
      return {
        canViewDashboard: true,
        canManageTrips: true,
        canManageCustomers: true,
        canManageDrivers: true,
        canManageTrucks: true,
        canManageMaintenance: true,
        canManageFinancials: true,
        canCloseCashbox: true,
        canApproveOperations: true,
        canViewReports: true,
        canExportReports: true,
        canManageUsers: true,
        canManageSettings: true,
        canBackupRestore: true,
        canAccessSyncMonitor: true,
      };
    case 'COMPANY_MANAGER':
      return {
        canViewDashboard: true,
        canManageTrips: true,
        canManageCustomers: true,
        canManageDrivers: true,
        canManageTrucks: true,
        canManageMaintenance: true,
        canManageFinancials: true,
        canCloseCashbox: false,
        canApproveOperations: true,
        canViewReports: true,
        canExportReports: true,
        canManageUsers: false,
        canManageSettings: false,
        canBackupRestore: false,
        canAccessSyncMonitor: true,
      };
    case 'ACCOUNTANT':
      return {
        canViewDashboard: true,
        canManageTrips: false,
        canManageCustomers: true,
        canManageDrivers: false,
        canManageTrucks: false,
        canManageMaintenance: false,
        canManageFinancials: true,
        canCloseCashbox: false,
        canApproveOperations: false,
        canViewReports: true,
        canExportReports: true,
        canManageUsers: false,
        canManageSettings: false,
        canBackupRestore: false,
        canAccessSyncMonitor: false,
      };
    case 'CASHIER':
      return {
        canViewDashboard: true,
        canManageTrips: false,
        canManageCustomers: false,
        canManageDrivers: false,
        canManageTrucks: false,
        canManageMaintenance: false,
        canManageFinancials: true,
        canCloseCashbox: true,
        canApproveOperations: false,
        canViewReports: true,
        canExportReports: false,
        canManageUsers: false,
        canManageSettings: false,
        canBackupRestore: false,
        canAccessSyncMonitor: false,
      };
    case 'OPERATIONS':
      return {
        canViewDashboard: true,
        canManageTrips: true,
        canManageCustomers: true,
        canManageDrivers: true,
        canManageTrucks: true,
        canManageMaintenance: true,
        canManageFinancials: false,
        canCloseCashbox: false,
        canApproveOperations: false,
        canViewReports: true,
        canExportReports: true,
        canManageUsers: false,
        canManageSettings: false,
        canBackupRestore: false,
        canAccessSyncMonitor: false,
      };
    case 'AUDITOR':
      return {
        canViewDashboard: true,
        canManageTrips: false,
        canManageCustomers: false,
        canManageDrivers: false,
        canManageTrucks: false,
        canManageMaintenance: false,
        canManageFinancials: false,
        canCloseCashbox: false,
        canApproveOperations: false,
        canViewReports: true,
        canExportReports: true,
        canManageUsers: false,
        canManageSettings: false,
        canBackupRestore: false,
        canAccessSyncMonitor: true,
      };
    case 'VIEWER':
    default:
      return {
        canViewDashboard: true,
        canManageTrips: false,
        canManageCustomers: false,
        canManageDrivers: false,
        canManageTrucks: false,
        canManageMaintenance: false,
        canManageFinancials: false,
        canCloseCashbox: false,
        canApproveOperations: false,
        canViewReports: true,
        canExportReports: false,
        canManageUsers: false,
        canManageSettings: false,
        canBackupRestore: false,
        canAccessSyncMonitor: false,
      };
  }
}

const DEFAULT_DB_DATA: DatabaseSchema = {
  version: 1,
  sequence: 1,
  lastUpdated: new Date().toISOString(),
  settings: {
    nameAr: 'مؤسسة إيجاز للنقليات',
    nameEn: 'Ejaz Transport',
    phone: '',
    email: '',
    taxNumber: '',
    crNumber: '',
    address: '',
    defaultTaxRate: 15,
    currency: 'ر.س',
    termsAndConditions: 'تخضع كافة أعمال النقل واللوجستيات لضوابط الهيئة العامة للنقل في المملكة العربية السعودية. المؤسسة مسؤولة عن سلامة البضائع طوال فترة الرحلة وفق البوليصة المعتمدة.',
    theme: 'light',
  },
  users: [],
  customers: [],
  drivers: [],
  trucks: [],
  trips: [],
  maintenance: [],
  collections: [],
  expenses: [],
  auditLogs: [
    {
      id: 'log_init',
      timestamp: new Date().toISOString(),
      userId: 'system',
      userName: 'النظام المركزي',
      userRole: 'SUPER_ADMIN',
      action: 'LOGIN',
      entityType: 'SYSTEM',
      entityId: 'central_server',
      details: 'تهيئة وتشغيل قاعدة البيانات المركزية لنظام إيجاز للنقليات',
    }
  ],
  notifications: [],
  savePoints: [],
  dailyHandovers: [],
};

export class Database {
  private static memoryDb: DatabaseSchema | null = null;
  private static isWriting = false;

  public static initialize(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      this.memoryDb = JSON.parse(JSON.stringify(DEFAULT_DB_DATA));
      this.persist();
      console.log('✅ Central database initialized with default schema at', DB_FILE);
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.memoryDb = JSON.parse(raw);
        // Ensure all arrays exist
        this.ensureStructure();
        console.log(`✅ Central database loaded successfully (${this.memoryDb?.trips?.length || 0} trips, ${this.memoryDb?.users?.length || 0} users)`);
      } catch (err) {
        console.error('⚠️ Error reading database, restoring from backup or defaults:', err);
        this.memoryDb = JSON.parse(JSON.stringify(DEFAULT_DB_DATA));
        this.persist();
      }
    }
  }

  private static ensureStructure(): void {
    if (!this.memoryDb) return;
    this.memoryDb.version = this.memoryDb.version || 1;
    this.memoryDb.sequence = this.memoryDb.sequence || 1;
    this.memoryDb.lastUpdated = this.memoryDb.lastUpdated || new Date().toISOString();
    this.memoryDb.settings = this.memoryDb.settings || DEFAULT_DB_DATA.settings;
    this.memoryDb.users = Array.isArray(this.memoryDb.users) ? this.memoryDb.users : DEFAULT_DB_DATA.users;
    this.memoryDb.customers = Array.isArray(this.memoryDb.customers) ? this.memoryDb.customers : [];
    this.memoryDb.drivers = Array.isArray(this.memoryDb.drivers) ? this.memoryDb.drivers : [];
    this.memoryDb.trucks = Array.isArray(this.memoryDb.trucks) ? this.memoryDb.trucks : [];
    this.memoryDb.trips = Array.isArray(this.memoryDb.trips) ? this.memoryDb.trips : [];
    this.memoryDb.maintenance = Array.isArray(this.memoryDb.maintenance) ? this.memoryDb.maintenance : [];
    this.memoryDb.collections = Array.isArray(this.memoryDb.collections) ? this.memoryDb.collections : [];
    this.memoryDb.expenses = Array.isArray(this.memoryDb.expenses) ? this.memoryDb.expenses : [];
    this.memoryDb.auditLogs = Array.isArray(this.memoryDb.auditLogs) ? this.memoryDb.auditLogs : [];
    this.memoryDb.notifications = Array.isArray(this.memoryDb.notifications) ? this.memoryDb.notifications : [];
    this.memoryDb.savePoints = Array.isArray(this.memoryDb.savePoints) ? this.memoryDb.savePoints : [];
    this.memoryDb.dailyHandovers = Array.isArray(this.memoryDb.dailyHandovers) ? this.memoryDb.dailyHandovers : [];
  }

  public static get(): DatabaseSchema {
    if (!this.memoryDb) {
      this.initialize();
    }
    return this.memoryDb!;
  }

  public static persist(): void {
    if (!this.memoryDb) return;
    try {
      this.memoryDb.sequence = (this.memoryDb.sequence || 0) + 1;
      this.memoryDb.lastUpdated = new Date().toISOString();
      const payload = JSON.stringify(this.memoryDb, null, 2);
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, payload, 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to persist central database:', err);
    }
  }

  public static createBackup(): string {
    const db = this.get();
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(db, null, 2), 'utf-8');
    return filepath;
  }

  public static restore(backupData: DatabaseSchema): boolean {
    if (!backupData || !Array.isArray(backupData.users)) {
      throw new Error('بيانات النسخة الاحتياطية غير صالحة');
    }
    this.createBackup(); // Backup current before restore
    this.memoryDb = backupData;
    this.ensureStructure();
    this.persist();
    return true;
  }
}
