import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../auth';
import { SyncOutboxItem, AuditLog } from '../../types';

export const syncRouter = Router();

// GET /api/sync/status (Public or authenticated health check)
syncRouter.get('/status', (req, res: Response) => {
  const db = Database.get();
  res.json({
    success: true,
    online: true,
    serverSequence: db.sequence,
    lastUpdated: db.lastUpdated,
    serverTime: new Date().toISOString(),
    metrics: {
      tripsCount: db.trips.length,
      customersCount: db.customers.length,
      driversCount: db.drivers.length,
      trucksCount: db.trucks.length,
      collectionsCount: db.collections.length,
      expensesCount: db.expenses.length,
      usersCount: db.users.length,
    }
  });
});

// GET /api/sync/pull
syncRouter.get('/pull', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = Database.get();
    const sinceSeq = Number(req.query.sinceSeq) || 0;
    const sinceTime = req.query.sinceTime ? String(req.query.sinceTime) : null;

    // Filter helper
    const filterByTime = (items: any[]) => {
      if (!sinceTime) return items;
      return items.filter(i => (i.updatedAt || i.createdAt || '') >= sinceTime);
    };

    const safeUsers = db.users.map(u => {
      const copy = { ...u };
      delete copy.password;
      delete copy.passwordHash;
      delete copy.passwordSalt;
      return copy;
    });

    res.json({
      success: true,
      serverSequence: db.sequence,
      serverTime: new Date().toISOString(),
      isIncremental: sinceSeq > 0 || !!sinceTime,
      data: {
        settings: db.settings,
        users: safeUsers,
        customers: filterByTime(db.customers),
        drivers: filterByTime(db.drivers),
        trucks: filterByTime(db.trucks),
        trips: filterByTime(db.trips),
        maintenance: filterByTime(db.maintenance),
        collections: filterByTime(db.collections),
        expenses: filterByTime(db.expenses),
        notifications: db.notifications.slice(0, 50),
        dailyHandovers: filterByTime(db.dailyHandovers),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل جلب بيانات المزامنة' });
  }
});

// POST /api/sync/push
syncRouter.post('/push', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items, deviceId, deviceName } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.json({ success: true, processedCount: 0, appliedIds: [] });
      return;
    }

    const db = Database.get();
    const appliedIds: string[] = [];

    items.forEach((item: SyncOutboxItem) => {
      if (!item.entityType || !item.entityId) return;

      const actorName = req.user?.fullName || item.authorName || 'مستخدم متزامن';
      const actorId = req.user?.id || item.authorId || 'sync_device';

      switch (item.entityType) {
        case 'TRIP': {
          const existingIdx = db.trips.findIndex(t => t.id === item.entityId);
          if (item.action === 'DELETE') {
            if (existingIdx >= 0) {
              db.trips[existingIdx].status = 'CANCELLED';
              db.trips[existingIdx].updatedAt = item.timestamp || new Date().toISOString();
            }
          } else {
            if (existingIdx >= 0) {
              db.trips[existingIdx] = { ...db.trips[existingIdx], ...item.payload, syncStatus: 'SYNCED' };
            } else {
              db.trips.unshift({ ...item.payload, syncStatus: 'SYNCED' });
            }
          }
          appliedIds.push(item.id);
          break;
        }

        case 'CUSTOMER': {
          const existingIdx = db.customers.findIndex(c => c.id === item.entityId);
          if (item.action === 'DELETE') {
            if (existingIdx >= 0) db.customers.splice(existingIdx, 1);
          } else {
            if (existingIdx >= 0) {
              db.customers[existingIdx] = { ...db.customers[existingIdx], ...item.payload, syncStatus: 'SYNCED' };
            } else {
              db.customers.unshift({ ...item.payload, syncStatus: 'SYNCED' });
            }
          }
          appliedIds.push(item.id);
          break;
        }

        case 'DRIVER': {
          const existingIdx = db.drivers.findIndex(d => d.id === item.entityId);
          if (item.action === 'DELETE') {
            if (existingIdx >= 0) db.drivers.splice(existingIdx, 1);
          } else {
            if (existingIdx >= 0) {
              db.drivers[existingIdx] = { ...db.drivers[existingIdx], ...item.payload };
            } else {
              db.drivers.unshift(item.payload);
            }
          }
          appliedIds.push(item.id);
          break;
        }

        case 'TRUCK': {
          const existingIdx = db.trucks.findIndex(t => t.id === item.entityId);
          if (item.action === 'DELETE') {
            if (existingIdx >= 0) db.trucks.splice(existingIdx, 1);
          } else {
            if (existingIdx >= 0) {
              db.trucks[existingIdx] = { ...db.trucks[existingIdx], ...item.payload };
            } else {
              db.trucks.unshift(item.payload);
            }
          }
          appliedIds.push(item.id);
          break;
        }

        case 'COLLECTION': {
          const existingIdx = db.collections.findIndex(c => c.id === item.entityId);
          if (item.action === 'DELETE') {
            if (existingIdx >= 0) db.collections.splice(existingIdx, 1);
          } else {
            if (existingIdx >= 0) {
              db.collections[existingIdx] = { ...db.collections[existingIdx], ...item.payload, syncStatus: 'SYNCED' };
            } else {
              db.collections.unshift({ ...item.payload, syncStatus: 'SYNCED' });
            }
          }
          appliedIds.push(item.id);
          break;
        }

        case 'EXPENSE': {
          const existingIdx = db.expenses.findIndex(e => e.id === item.entityId);
          if (item.action === 'DELETE') {
            if (existingIdx >= 0) db.expenses.splice(existingIdx, 1);
          } else {
            if (existingIdx >= 0) {
              db.expenses[existingIdx] = { ...db.expenses[existingIdx], ...item.payload, syncStatus: 'SYNCED' };
            } else {
              db.expenses.unshift({ ...item.payload, syncStatus: 'SYNCED' });
            }
          }
          appliedIds.push(item.id);
          break;
        }

        case 'MAINTENANCE': {
          const existingIdx = db.maintenance.findIndex(m => m.id === item.entityId);
          if (item.action === 'DELETE') {
            if (existingIdx >= 0) db.maintenance.splice(existingIdx, 1);
          } else {
            if (existingIdx >= 0) {
              db.maintenance[existingIdx] = { ...db.maintenance[existingIdx], ...item.payload, syncStatus: 'SYNCED' };
            } else {
              db.maintenance.unshift({ ...item.payload, syncStatus: 'SYNCED' });
            }
          }
          appliedIds.push(item.id);
          break;
        }

        default:
          break;
      }
    });

    // Record sync audit
    const syncAudit: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user?.id || 'sync',
      userName: req.user?.fullName || deviceName || 'جهاز متزامن',
      userRole: req.user?.role || 'OPERATIONS',
      action: 'SYNC_OPERATION',
      entityType: 'SYNC',
      entityId: deviceId || 'remote_device',
      details: `استقبال ومزامنة [${appliedIds.length}] عملية من جهاز [${deviceName || deviceId || 'جهاز محمول'}] وتحديث السجلات المركزية`,
    };
    db.auditLogs.unshift(syncAudit);

    Database.persist();

    res.json({
      success: true,
      processedCount: appliedIds.length,
      newSequence: db.sequence,
      serverTime: new Date().toISOString(),
      appliedIds,
      message: `تم تطبيق ${appliedIds.length} عملية بنجاح على قاعدة البيانات المركزية`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل مزامنة العمليات' });
  }
});
