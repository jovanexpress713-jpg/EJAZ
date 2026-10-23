/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import { 
  User, 
  Trip, 
  Customer, 
  Driver, 
  Truck, 
  CollectionRecord, 
  ExpenseRecord, 
  MaintenanceRecord, 
  DailyHandoverReport, 
  CompanySettings, 
  AuditLog, 
  SyncOutboxItem 
} from '../types';

const TOKEN_KEY = 'ejaz_auth_token_v1';
const SERVER_URL_KEY = 'ejaz_central_server_url_v1';

export class ApiClient {
  private static cachedToken: string | null = null;
  private static isServerOnline: boolean = true;
  private static lastCheckTime = 0;

  public static getToken(): string | null {
    if (this.cachedToken) return this.cachedToken;
    if (typeof window !== 'undefined') {
      this.cachedToken = localStorage.getItem(TOKEN_KEY);
    }
    return this.cachedToken;
  }

  public static setToken(token: string | null): void {
    this.cachedToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  public static getBaseUrl(): string {
    if (typeof window === 'undefined') return '';
    try {
      const configured = localStorage.getItem(SERVER_URL_KEY);
      if (configured && /^https?:\/\//i.test(configured.trim())) {
        return configured.trim().replace(/\/+$/, '');
      }
      const raw = localStorage.getItem('ejaz_clean_settings_v5');
      if (raw) {
        const parsed = JSON.parse(raw);
        const nestedUrl = parsed?.syncConfig?.serverUrl || parsed?.serverUrl;
        if (nestedUrl && /^https?:\/\//i.test(String(nestedUrl).trim())) {
          return String(nestedUrl).trim().replace(/\/+$/, '');
        }
      }
    } catch {
      // Invalid local configuration is ignored; same-origin web mode remains available.
    }
    return window.location.protocol === 'file:' ? '' : window.location.origin;
  }

  public static setBaseUrl(url: string): void {
    if (typeof window === 'undefined') return;
    const normalized = url.trim().replace(/\/+$/, '');
    if (normalized && !/^https?:\/\//i.test(normalized)) {
      throw new Error('رابط الخادم يجب أن يبدأ بـ http:// أو https://');
    }
    if (normalized) localStorage.setItem(SERVER_URL_KEY, normalized);
    else localStorage.removeItem(SERVER_URL_KEY);
    this.lastCheckTime = 0;
    this.isServerOnline = false;
  }

  public static async isOnline(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    if (!navigator.onLine) {
      this.isServerOnline = false;
      return false;
    }

    // In file:/// protocol without configured server URL, APK is offline-standalone
    if (window.location.protocol === 'file:' && !this.getBaseUrl()) {
      this.isServerOnline = false;
      return false;
    }

    const now = Date.now();
    // Cache online status for 4 seconds
    if (now - this.lastCheckTime < 4000) {
      return this.isServerOnline;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const targetUrl = (this.getBaseUrl() || '') + '/api/sync/status';
      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      this.isServerOnline = res.ok;
      this.lastCheckTime = now;
      return res.ok;
    } catch {
      this.isServerOnline = false;
      this.lastCheckTime = now;
      return false;
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const targetUrl = (this.getBaseUrl() || '') + endpoint;
    const res = await fetch(targetUrl, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Session expired or invalid
      this.setToken(null);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `خطأ في الخادم (${res.status})`);
    }

    return data as T;
  }

  // Auth APIs
  public static async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ success: boolean; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public static async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  public static async getMe(): Promise<User> {
    const res = await this.request<{ success: boolean; user: User }>('/api/auth/me');
    return res.user;
  }

  public static async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  public static async setupOwner(payload: { fullName: string; username: string; phone: string; password: string; setupKey?: string }): Promise<{ user: User; token: string }> {
    const res = await this.request<{ success: boolean; user: User; token: string }>('/api/auth/setup-owner', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  // Users Management
  public static async getUsers(): Promise<User[]> {
    const res = await this.request<{ success: boolean; users: User[] }>('/api/users');
    return res.users;
  }

  public static async createUser(userData: any): Promise<User> {
    const res = await this.request<{ success: boolean; user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return res.user;
  }

  public static async updateUser(id: string, userData: any): Promise<User> {
    const res = await this.request<{ success: boolean; user: User }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return res.user;
  }

  public static async resetUserPassword(id: string, newPassword?: string): Promise<{ tempPassword: string }> {
    return this.request<{ tempPassword: string }>(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  public static async deleteUser(id: string): Promise<void> {
    await this.request(`/api/users/${id}`, { method: 'DELETE' });
  }

  // Trips APIs
  public static async getTrips(params?: Record<string, string>): Promise<Trip[]> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await this.request<{ success: boolean; trips: Trip[] }>(`/api/trips${qs}`);
    return res.trips;
  }

  public static async createTrip(tripData: Partial<Trip>): Promise<Trip> {
    const res = await this.request<{ success: boolean; trip: Trip }>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
    return res.trip;
  }

  public static async updateTrip(id: string, tripData: Partial<Trip>): Promise<Trip> {
    const res = await this.request<{ success: boolean; trip: Trip }>(`/api/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tripData),
    });
    return res.trip;
  }

  public static async approveTrip(id: string): Promise<Trip> {
    const res = await this.request<{ success: boolean; trip: Trip }>(`/api/trips/${id}/approve`, {
      method: 'POST',
    });
    return res.trip;
  }

  public static async deleteTrip(id: string): Promise<void> {
    await this.request(`/api/trips/${id}`, { method: 'DELETE' });
  }

  // Customers APIs
  public static async getCustomers(): Promise<Customer[]> {
    const res = await this.request<{ success: boolean; customers: Customer[] }>('/api/customers');
    return res.customers;
  }

  public static async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const res = await this.request<{ success: boolean; customer: Customer }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return res.customer;
  }

  public static async updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
    const res = await this.request<{ success: boolean; customer: Customer }>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
    return res.customer;
  }

  public static async deleteCustomer(id: string): Promise<void> {
    await this.request(`/api/customers/${id}`, { method: 'DELETE' });
  }

  // Drivers APIs
  public static async getDrivers(): Promise<Driver[]> {
    const res = await this.request<{ success: boolean; drivers: Driver[] }>('/api/drivers');
    return res.drivers;
  }

  public static async createDriver(driverData: Partial<Driver>): Promise<Driver> {
    const res = await this.request<{ success: boolean; driver: Driver }>('/api/drivers', {
      method: 'POST',
      body: JSON.stringify(driverData),
    });
    return res.driver;
  }

  public static async updateDriver(id: string, driverData: Partial<Driver>): Promise<Driver> {
    const res = await this.request<{ success: boolean; driver: Driver }>(`/api/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(driverData),
    });
    return res.driver;
  }

  public static async deleteDriver(id: string): Promise<void> {
    await this.request(`/api/drivers/${id}`, { method: 'DELETE' });
  }

  // Trucks APIs
  public static async getTrucks(): Promise<Truck[]> {
    const res = await this.request<{ success: boolean; trucks: Truck[] }>('/api/trucks');
    return res.trucks;
  }

  public static async createTruck(truckData: Partial<Truck>): Promise<Truck> {
    const res = await this.request<{ success: boolean; truck: Truck }>('/api/trucks', {
      method: 'POST',
      body: JSON.stringify(truckData),
    });
    return res.truck;
  }

  public static async updateTruck(id: string, truckData: Partial<Truck>): Promise<Truck> {
    const res = await this.request<{ success: boolean; truck: Truck }>(`/api/trucks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(truckData),
    });
    return res.truck;
  }

  public static async deleteTruck(id: string): Promise<void> {
    await this.request(`/api/trucks/${id}`, { method: 'DELETE' });
  }

  // Collections APIs
  public static async getCollections(): Promise<CollectionRecord[]> {
    const res = await this.request<{ success: boolean; collections: CollectionRecord[] }>('/api/finance/collections');
    return res.collections;
  }

  public static async createCollection(data: Partial<CollectionRecord>): Promise<CollectionRecord> {
    const res = await this.request<{ success: boolean; collection: CollectionRecord }>('/api/finance/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.collection;
  }

  public static async approveCollection(id: string): Promise<CollectionRecord> {
    const res = await this.request<{ success: boolean; collection: CollectionRecord }>(`/api/finance/collections/${id}/approve`, {
      method: 'POST',
    });
    return res.collection;
  }

  // Expenses APIs
  public static async getExpenses(): Promise<ExpenseRecord[]> {
    const res = await this.request<{ success: boolean; expenses: ExpenseRecord[] }>('/api/finance/expenses');
    return res.expenses;
  }

  public static async createExpense(data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const res = await this.request<{ success: boolean; expense: ExpenseRecord }>('/api/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.expense;
  }

  public static async approveExpense(id: string): Promise<ExpenseRecord> {
    const res = await this.request<{ success: boolean; expense: ExpenseRecord }>(`/api/finance/expenses/${id}/approve`, {
      method: 'POST',
    });
    return res.expense;
  }

  // Maintenance APIs
  public static async getMaintenance(): Promise<MaintenanceRecord[]> {
    const res = await this.request<{ success: boolean; maintenance: MaintenanceRecord[] }>('/api/finance/maintenance');
    return res.maintenance;
  }

  public static async createMaintenance(data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const res = await this.request<{ success: boolean; maintenance: MaintenanceRecord }>('/api/finance/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.maintenance;
  }

  // Handovers
  public static async getHandovers(): Promise<DailyHandoverReport[]> {
    const res = await this.request<{ success: boolean; handovers: DailyHandoverReport[] }>('/api/finance/handovers');
    return res.handovers;
  }

  public static async createHandover(data: Partial<DailyHandoverReport>): Promise<DailyHandoverReport> {
    const res = await this.request<{ success: boolean; handover: DailyHandoverReport }>('/api/finance/handovers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.handover;
  }

  // Audit Logs
  public static async getAuditLogs(params?: Record<string, string>): Promise<AuditLog[]> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await this.request<{ success: boolean; logs: AuditLog[] }>(`/api/audit-logs${qs}`);
    return res.logs;
  }

  // Settings
  public static async getSettings(): Promise<CompanySettings> {
    const res = await this.request<{ success: boolean; settings: CompanySettings }>('/api/settings');
    return res.settings;
  }

  public static async updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    const res = await this.request<{ success: boolean; settings: CompanySettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return res.settings;
  }

  // Sync APIs
  public static async syncPull(sinceSeq = 0, sinceTime?: string): Promise<{
    serverSequence: number;
    serverTime: string;
    data: {
      settings: CompanySettings;
      users: User[];
      customers: Customer[];
      drivers: Driver[];
      trucks: Truck[];
      trips: Trip[];
      maintenance: MaintenanceRecord[];
      collections: CollectionRecord[];
      expenses: ExpenseRecord[];
      notifications: any[];
      dailyHandovers: DailyHandoverReport[];
    };
  }> {
    const params = new URLSearchParams();
    if (sinceSeq) params.set('sinceSeq', String(sinceSeq));
    if (sinceTime) params.set('sinceTime', sinceTime);
    const qs = params.toString() ? '?' + params.toString() : '';
    return this.request(`/api/sync/pull${qs}`);
  }

  public static async syncPush(items: SyncOutboxItem[], deviceId: string, deviceName: string): Promise<{
    processedCount: number;
    newSequence: number;
    appliedIds: string[];
  }> {
    return this.request('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({ items, deviceId, deviceName }),
    });
  }

  public static async getServerStatus(): Promise<{
    online: boolean;
    serverSequence: number;
    lastUpdated: string;
    metrics: Record<string, number>;
  }> {
    return this.request('/api/sync/status');
  }
}
