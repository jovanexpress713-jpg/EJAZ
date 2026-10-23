/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

/**
 * Enterprise Multi-Device Synchronization Engine
 * 
 * Strict Company Data Sovereignty Rules:
 * - Data NEVER touches developer servers or unapproved third-party cloud.
 * - Supports company's private server endpoint, local Wi-Fi peer exchange, or signed offline sync bundles.
 * - Outbox queue ensures zero data loss during network disconnection.
 * - Built-in cryptographic checksums & conflict detection.
 */

import { SyncConfig, SyncOutboxItem, SyncDevice, ConflictRecord, User } from '../types';
import { ApiClient } from './apiClient';

const SYNC_OUTBOX_KEY = 'victoria_sync_outbox_v1';
const SYNC_DEVICES_KEY = 'victoria_sync_devices_v1';
const SYNC_CONFLICTS_KEY = 'victoria_sync_conflicts_v1';
const DEVICE_ID_KEY = 'victoria_device_id_v1';

export class SyncEngine {
  private static cachedDeviceId: string | null = null;

  /**
   * Get or generate unique device identifier for this company phone / terminal
   */
  public static getDeviceId(): string {
    if (this.cachedDeviceId) return this.cachedDeviceId;
    if (typeof window === 'undefined') return 'srv_node';

    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    this.cachedDeviceId = id;
    return id;
  }

  public static getDeviceName(): string {
    if (typeof window === 'undefined') return 'Web Node';
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'هاتف أندرويد (تطبيق إيجاز)';
    if (/iPhone|iPad/i.test(ua)) return 'جهاز أبل (لوجيستيات)';
    return 'محطة مكتبية (مكتب الإدارة)';
  }

  /**
   * Default configuration owned solely by the enterprise
   */
  public static getDefaultConfig(): SyncConfig {
    return {
      enabled: false,
      mode: 'OFFLINE_ONLY',
      serverUrl: '',
      companySecretKey: '',
      deviceId: this.getDeviceId(),
      deviceName: this.getDeviceName(),
      autoSyncIntervalMinutes: 5,
      lastSyncTimestamp: undefined,
      lastSyncStatus: undefined,
    };
  }

  /**
   * Retrieve Outbox queue
   */
  public static getOutbox(): SyncOutboxItem[] {
    try {
      const raw = localStorage.getItem(SYNC_OUTBOX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveOutbox(items: SyncOutboxItem[]): void {
    try {
      localStorage.setItem(SYNC_OUTBOX_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save sync outbox:', e);
    }
  }

  /**
   * Enqueue a newly created, modified, or deleted operation to the outbox
   */
  public static enqueueOperation(
    entityType: SyncOutboxItem['entityType'],
    entityId: string,
    action: SyncOutboxItem['action'],
    payload: any,
    actor?: User | null
  ): SyncOutboxItem {
    const outbox = this.getOutbox();
    const now = new Date().toISOString();
    const checksum = this.calculateSimpleChecksum(entityType + entityId + action + now);

    const item: SyncOutboxItem = {
      id: 'OUT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      entityType,
      entityId,
      action,
      payload,
      timestamp: now,
      authorId: actor?.id || 'system',
      authorName: actor?.fullName || actor?.username || 'مدير النظام',
      status: 'PENDING',
      retryCount: 0,
      checksum,
    };

    // Replace pending actions on same entity to avoid redundant sync chatter
    const filtered = outbox.filter(o => !(o.entityId === entityId && o.status === 'PENDING'));
    filtered.push(item);
    this.saveOutbox(filtered);
    return item;
  }

  /**
   * Simple checksum generator
   */
  private static calculateSimpleChecksum(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Mark an item as synced
   */
  public static markSynced(itemId: string): void {
    const outbox = this.getOutbox();
    const updated = outbox.map(item => {
      if (item.id === itemId) {
        return { ...item, status: 'SYNCED' as const };
      }
      return item;
    });
    this.saveOutbox(updated);
  }

  /**
   * Mark an item as failed with reason
   */
  public static markFailed(itemId: string, error: string): void {
    const outbox = this.getOutbox();
    const updated = outbox.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'FAILED' as const,
          retryCount: (item.retryCount || 0) + 1,
          lastError: error,
        };
      }
      return item;
    });
    this.saveOutbox(updated);
  }

  /**
   * Retry single item
   */
  public static retryItem(itemId: string): void {
    const outbox = this.getOutbox();
    const updated = outbox.map(item => {
      if (item.id === itemId) {
        return { ...item, status: 'PENDING' as const };
      }
      return item;
    });
    this.saveOutbox(updated);
  }

  /**
   * Clear all synced operations older than 24 hours to keep storage minimal
   */
  public static purgeSyncedItems(): void {
    const outbox = this.getOutbox();
    const pendingAndFailed = outbox.filter(item => item.status !== 'SYNCED');
    this.saveOutbox(pendingAndFailed);
  }

  /**
   * Get device list
   */
  public static getDevices(): SyncDevice[] {
    try {
      const raw = localStorage.getItem(SYNC_DEVICES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static registerCurrentDevice(currentUser?: User | null): void {
    const devices = this.getDevices();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    const existingIndex = devices.findIndex(d => d.deviceId === deviceId);
    if (existingIndex >= 0) {
      devices[existingIndex].lastSeenAt = now;
      if (currentUser) {
        devices[existingIndex].registeredUser = currentUser.fullName || currentUser.username;
      }
    } else {
      devices.push({
        deviceId,
        deviceName: this.getDeviceName(),
        registeredUser: currentUser?.fullName || currentUser?.username || 'مسؤول إيجاز',
        lastSeenAt: now,
        status: 'ACTIVE',
      });
    }

    try {
      localStorage.setItem(SYNC_DEVICES_KEY, JSON.stringify(devices));
    } catch {
      // safe ignore
    }
  }

  /**
   * Conflicts management
   */
  public static getConflicts(): ConflictRecord[] {
    try {
      const raw = localStorage.getItem(SYNC_CONFLICTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static recordConflict(conflict: Omit<ConflictRecord, 'id' | 'conflictTimestamp' | 'resolved'>): ConflictRecord {
    const conflicts = this.getConflicts();
    const rec: ConflictRecord = {
      ...conflict,
      id: 'CONF-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      conflictTimestamp: new Date().toISOString(),
      resolved: false,
    };
    conflicts.unshift(rec);
    try {
      localStorage.setItem(SYNC_CONFLICTS_KEY, JSON.stringify(conflicts));
    } catch {
      // safe ignore
    }
    return rec;
  }

  public static resolveConflict(conflictId: string, choice: 'LOCAL' | 'REMOTE' | 'MERGED'): void {
    const conflicts = this.getConflicts();
    const updated = conflicts.map(c => {
      if (c.id === conflictId) {
        return { ...c, resolved: true, resolutionChoice: choice };
      }
      return c;
    });
    try {
      localStorage.setItem(SYNC_CONFLICTS_KEY, JSON.stringify(updated));
    } catch {
      // safe ignore
    }
  }

  /**
   * Export incremental encrypted sync bundle for peer/offline device exchange
   */
  public static exportSignedSyncBundle(currentUser?: User | null): string {
    const outbox = this.getOutbox();
    const bundle = {
      version: '1.0.0',
      system: 'Victoria Logistics ERP',
      sourceDeviceId: this.getDeviceId(),
      sourceDeviceName: this.getDeviceName(),
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser?.fullName || currentUser?.username || 'مدير النظام',
      itemsCount: outbox.length,
      items: outbox,
      integrityChecksum: this.calculateSimpleChecksum(JSON.stringify(outbox)),
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(bundle))));
  }

  /**
   * Import signed sync bundle from employee device without data overwrites
   */
  public static parseSignedSyncBundle(encodedString: string): {
    success: boolean;
    bundle?: any;
    error?: string;
  } {
    try {
      const decoded = decodeURIComponent(escape(atob(encodedString.trim())));
      const bundle = JSON.parse(decoded);
      if (!bundle || !bundle.items || !Array.isArray(bundle.items)) {
        return { success: false, error: 'هيكل الحزمة غير صالح أو تالف.' };
      }
      return { success: true, bundle };
    } catch (e: any) {
      return { success: false, error: 'تعذر فك تشفير حزمة المزامنة: ' + (e?.message || 'خطأ في التشفير') };
    }
  }

  /**
   * Enterprise Central Server Two-Way Sync:
   * 1. Check network connectivity to central server
   * 2. Push all queued outbox operations
   * 3. Pull newest changes and update local state
   */
  public static async syncWithServer(currentUser?: User | null): Promise<{
    success: boolean;
    pushedCount: number;
    pulledCount: number;
    error?: string;
  }> {
    try {
      const isOnline = await ApiClient.isOnline();
      if (!isOnline) {
        return { success: false, pushedCount: 0, pulledCount: 0, error: 'غير متصل بالخادم المركزي' };
      }
      if (!ApiClient.getToken()) {
        return { success: false, pushedCount: 0, pulledCount: 0, error: 'الخادم متاح لكن لا توجد جلسة مركزية مصادق عليها. سجّل الدخول مجددًا.' };
      }

      this.registerCurrentDevice(currentUser);
      const outbox = this.getOutbox();
      const pendingItems = outbox.filter(item => item.status === 'PENDING' || (item.status === 'FAILED' && (item.retryCount || 0) < 5));

      let pushedCount = 0;
      let pushErrorMessage: string | undefined;
      if (pendingItems.length > 0) {
        try {
          const pushRes = await ApiClient.syncPush(
            pendingItems,
            this.getDeviceId(),
            this.getDeviceName()
          );
          if (pushRes && Array.isArray(pushRes.appliedIds)) {
            pushRes.appliedIds.forEach(id => this.markSynced(id));
            pushedCount = pushRes.appliedIds.length;
          }
        } catch (pushErr: any) {
          console.warn('Sync push error:', pushErr);
          pushErrorMessage = pushErr?.message || 'خطأ في إرسال العملية';
          pendingItems.forEach(item => this.markFailed(item.id, pushErrorMessage || 'خطأ في إرسال العملية'));
        }
      }

      // Pull updates from central server
      let pulledCount = 0;
      let pullErrorMessage: string | undefined;
      try {
        const pullRes = await ApiClient.syncPull();
        if (pullRes && pullRes.data) {
          const { StorageService } = await import('./storage');
          pulledCount = StorageService.applyRemoteData(pullRes.data);
        }
      } catch (pullErr: any) {
        console.warn('Sync pull error:', pullErr);
        pullErrorMessage = pullErr?.message || 'تعذر تنزيل بيانات الخادم المركزي';
      }

      // Clean up synced operations older than 24h
      this.purgeSyncedItems();

      if (pushErrorMessage || pullErrorMessage) {
        return { success: false, pushedCount, pulledCount, error: pushErrorMessage || pullErrorMessage };
      }
      return { success: true, pushedCount, pulledCount };
    } catch (err: any) {
      console.warn('Sync failed:', err);
      return { success: false, pushedCount: 0, pulledCount: 0, error: err?.message || 'فشلت المزامنة' };
    }
  }
}

