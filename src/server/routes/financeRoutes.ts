import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth';
import { 
  CollectionRecord, 
  ExpenseRecord, 
  MaintenanceRecord, 
  DailyHandoverReport, 
  SavePointRecord, 
  AuditLog 
} from '../../types';

export const financeRouter = Router();

// ==================== COLLECTIONS ====================

// GET /api/finance/collections
financeRouter.get('/collections', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  res.json({ success: true, collections: db.collections });
});

// POST /api/finance/collections
financeRouter.post('/collections', authenticate, requirePermission('canManageFinancials'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, customerId, customerName, amount, paymentMethod, referenceNumber, tripId, tripNumber, notes } = req.body;
    if (!customerId || !amount) {
      res.status(400).json({ success: false, error: 'العميل والمبلغ حقول مطلوبة' });
      return;
    }

    const db = Database.get();
    const newCollection: CollectionRecord = {
      id: req.body.id || 'col_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: date || new Date().toISOString().slice(0, 10),
      customerId,
      customerName: customerName || 'عميل',
      amount: Number(amount) || 0,
      paymentMethod: paymentMethod || 'CASH',
      referenceNumber: referenceNumber || '',
      tripId,
      tripNumber,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.id,
      createdByName: req.user!.fullName,
      syncStatus: 'SYNCED',
    };

    // If attached to trip, update trip paid amount
    if (newCollection.tripId) {
      const trip = db.trips.find(t => t.id === newCollection.tripId || t.tripNumber === newCollection.tripNumber);
      if (trip) {
        trip.paidAmount = (trip.paidAmount || 0) + newCollection.amount;
        trip.remainingAmount = Math.max(0, trip.totalAmount - trip.paidAmount);
        trip.paymentStatus = trip.remainingAmount <= 0 ? 'PAID' : 'PARTIAL';
        trip.updatedAt = new Date().toISOString();
      }
    }

    db.collections.unshift(newCollection);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CREATE_COLLECTION',
      entityType: 'COLLECTION',
      entityId: newCollection.id,
      details: `تسجيل سند قبض رقم [${newCollection.referenceNumber || newCollection.id}] بمبلغ [${newCollection.amount} ر.س] من العميل [${newCollection.customerName}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, collection: newCollection, message: 'تم حفظ سند القبض وتحديث رصيد الرحلة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حفظ سند القبض' });
  }
});

// POST /api/finance/collections/:id/approve
financeRouter.post('/collections/:id/approve', authenticate, requirePermission('canApproveOperations'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const col = db.collections.find(c => c.id === id);

    if (!col) {
      res.status(404).json({ success: false, error: 'سند القبض غير موجود' });
      return;
    }

    col.needsApproval = false;
    col.approvedBy = req.user!.id;
    col.approvedByName = req.user!.fullName;
    col.approvedAt = new Date().toISOString();
    col.updatedAt = new Date().toISOString();

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'APPROVE_FINANCIAL',
      entityType: 'COLLECTION',
      entityId: col.id,
      details: `اعتماد سند القبض بمبلغ [${col.amount} ر.س] بواسطة الإدارة`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, collection: col, message: 'تم اعتماد سند القبض بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل الاعتماد' });
  }
});

// ==================== EXPENSES ====================

// GET /api/finance/expenses
financeRouter.get('/expenses', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  res.json({ success: true, expenses: db.expenses });
});

// POST /api/finance/expenses
financeRouter.post('/expenses', authenticate, requirePermission('canManageFinancials'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, category, amount, paymentMethod, description, recipient, tripId, tripNumber } = req.body;
    if (!category || !amount) {
      res.status(400).json({ success: false, error: 'بند المصروف والمبلغ حقول مطلوبة' });
      return;
    }

    const db = Database.get();
    const newExpense: ExpenseRecord = {
      id: req.body.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: date || new Date().toISOString().slice(0, 10),
      category,
      amount: Number(amount) || 0,
      paymentMethod: paymentMethod || 'CASH',
      description: description || '',
      recipient: recipient || '',
      tripId,
      tripNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.id,
      createdByName: req.user!.fullName,
      syncStatus: 'SYNCED',
    };

    // If attached to trip, update trip expenses
    if (newExpense.tripId) {
      const trip = db.trips.find(t => t.id === newExpense.tripId || t.tripNumber === newExpense.tripNumber);
      if (trip) {
        trip.tripExpenses = (trip.tripExpenses || 0) + newExpense.amount;
        trip.netProfit = trip.baseAmount - trip.tripExpenses - (trip.driverCustody || 0);
        trip.updatedAt = new Date().toISOString();
      }
    }

    db.expenses.unshift(newExpense);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CREATE_EXPENSE',
      entityType: 'EXPENSE',
      entityId: newExpense.id,
      details: `تسجيل سند صرف بمبلغ [${newExpense.amount} ر.س] لبند [${newExpense.category}] للمستلم [${newExpense.recipient || 'غير محدد'}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, expense: newExpense, message: 'تم حفظ سند الصرف بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حفظ سند الصرف' });
  }
});

// POST /api/finance/expenses/:id/approve
financeRouter.post('/expenses/:id/approve', authenticate, requirePermission('canApproveOperations'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const exp = db.expenses.find(e => e.id === id);

    if (!exp) {
      res.status(404).json({ success: false, error: 'سند الصرف غير موجود' });
      return;
    }

    exp.needsApproval = false;
    exp.approvedBy = req.user!.id;
    exp.approvedByName = req.user!.fullName;
    exp.approvedAt = new Date().toISOString();
    exp.updatedAt = new Date().toISOString();

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'APPROVE_FINANCIAL',
      entityType: 'EXPENSE',
      entityId: exp.id,
      details: `اعتماد سند الصرف بمبلغ [${exp.amount} ر.س] بواسطة الإدارة`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, expense: exp, message: 'تم اعتماد سند الصرف بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل الاعتماد' });
  }
});

// ==================== MAINTENANCE ====================

// GET /api/finance/maintenance
financeRouter.get('/maintenance', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  res.json({ success: true, maintenance: db.maintenance });
});

// POST /api/finance/maintenance
financeRouter.post('/maintenance', authenticate, requirePermission('canManageMaintenance'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { truckId, plateNumber, date, maintenanceType, amount, nextMaintenanceDate, description, status } = req.body;
    if (!truckId || !maintenanceType) {
      res.status(400).json({ success: false, error: 'الشاحنة ونوع الصيانة حقول مطلوبة' });
      return;
    }

    const db = Database.get();
    const record: MaintenanceRecord = {
      id: req.body.id || 'maint_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      truckId,
      plateNumber: plateNumber || '',
      date: date || new Date().toISOString().slice(0, 10),
      maintenanceType,
      amount: Number(amount) || 0,
      nextMaintenanceDate: nextMaintenanceDate || '',
      description: description || '',
      status: status || 'SCHEDULED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.id,
      createdByName: req.user!.fullName,
      syncStatus: 'SYNCED',
    };

    db.maintenance.unshift(record);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CREATE_MAINTENANCE',
      entityType: 'MAINTENANCE',
      entityId: record.id,
      details: `تسجيل أمر صيانة للشاحنة [${record.plateNumber}] نوع [${record.maintenanceType}] بتكلفة [${record.amount} ر.س]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, maintenance: record, message: 'تم حفظ سجل الصيانة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حفظ سجل الصيانة' });
  }
});

// ==================== DAILY HANDOVERS ====================

// GET /api/finance/handovers
financeRouter.get('/handovers', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  res.json({ success: true, handovers: db.dailyHandovers });
});

// POST /api/finance/handovers
financeRouter.post('/handovers', authenticate, requirePermission('canCloseCashbox'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = Database.get();
    const handover: DailyHandoverReport = {
      id: req.body.id || 'hnd_' + Date.now(),
      reportNumber: req.body.reportNumber || `HND-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(db.dailyHandovers.length + 1).padStart(3, '0')}`,
      date: req.body.date || new Date().toISOString().slice(0, 10),
      handoverTime: req.body.handoverTime || new Date().toLocaleTimeString('ar-SA'),
      officerName: req.user!.fullName,
      recipientName: req.body.recipientName || 'المالك / المدير العام',
      recipientPhone: req.body.recipientPhone || db.settings.ownerPhone || '',
      totalTripsToday: Number(req.body.totalTripsToday) || 0,
      internalTripsCount: Number(req.body.internalTripsCount) || 0,
      spotBrokerTripsCount: Number(req.body.spotBrokerTripsCount) || 0,
      totalCashCollected: Number(req.body.totalCashCollected) || 0,
      totalBankTransfers: Number(req.body.totalBankTransfers) || 0,
      totalCustodyDisbursed: Number(req.body.totalCustodyDisbursed) || 0,
      totalExpensesToday: Number(req.body.totalExpensesToday) || 0,
      totalBrokerageProfitToday: Number(req.body.totalBrokerageProfitToday) || 0,
      netCashToDeliver: Number(req.body.netCashToDeliver) || 0,
      notes: req.body.notes || '',
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
    };

    db.dailyHandovers.unshift(handover);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CLOSE_CASHBOX',
      entityType: 'HANDOVER',
      entityId: handover.id,
      details: `إقفال الصندوق وتسليم وردية نقدية للمالك بمبلغ صافي [${handover.netCashToDeliver} ر.س] - محضر [${handover.reportNumber}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, handover, message: 'تم توثيق محضر التسليم اليومي وإقفال الصندوق بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل توثيق محضر التسليم' });
  }
});
