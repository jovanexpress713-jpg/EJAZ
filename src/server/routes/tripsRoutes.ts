import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth';
import { Trip, AuditLog } from '../../types';

export const tripsRouter = Router();

// GET /api/trips
tripsRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  const { status, driverId, customerId, dateFrom, dateTo, search } = req.query;

  let result = db.trips;

  if (status && status !== 'ALL') {
    result = result.filter(t => t.status === status);
  }
  if (driverId) {
    result = result.filter(t => t.driverId === driverId);
  }
  if (customerId) {
    result = result.filter(t => t.customerId === customerId);
  }
  if (dateFrom) {
    result = result.filter(t => t.date >= String(dateFrom));
  }
  if (dateTo) {
    result = result.filter(t => t.date <= String(dateTo));
  }
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(t => 
      t.tripNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.driverName.toLowerCase().includes(q) ||
      t.plateNumber.toLowerCase().includes(q) ||
      t.cargoType.toLowerCase().includes(q)
    );
  }

  // Sort descending by date
  result = [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, count: result.length, trips: result });
});

// GET /api/trips/:id
tripsRouter.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  const trip = db.trips.find(t => t.id === req.params.id || t.tripNumber === req.params.id);
  if (!trip) {
    res.status(404).json({ success: false, error: 'الرحلة غير موجودة' });
    return;
  }
  res.json({ success: true, trip });
});

// POST /api/trips
tripsRouter.post('/', authenticate, requirePermission('canManageTrips'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = req.body;
    if (!payload.customerId || !payload.driverId || !payload.loadingLocation || !payload.unloadingLocation) {
      res.status(400).json({ success: false, error: 'يرجى استكمال البيانات الأساسية للرحلة (العميل، السائق، مسار الرحلة)' });
      return;
    }

    const db = Database.get();

    // Generate Trip Number if not provided
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const currentDayTrips = db.trips.filter(t => t.tripNumber && t.tripNumber.includes(`TRP-${todayStr}`));
    const seq = String(currentDayTrips.length + 1).padStart(4, '0');
    const tripNumber = payload.tripNumber || `TRP-${todayStr}-${seq}`;

    // Financial calculations validation
    const base = Number(payload.baseAmount) || 0;
    const taxRate = Number(payload.taxRate ?? 15);
    const tax = Number(payload.taxAmount ?? Math.round((base * (taxRate / 100)) * 100) / 100);
    const total = Number(payload.totalAmount ?? (base + tax));
    const paid = Number(payload.paidAmount) || 0;
    const remaining = total - paid;
    const expenses = Number(payload.tripExpenses) || 0;
    const custody = Number(payload.driverCustody) || 0;
    const commission = Number(payload.commissionAmount) || 0;
    const netProfit = base - expenses - custody;

    const newTrip: Trip = {
      ...payload,
      id: payload.id || 'trp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      tripNumber,
      date: payload.date || new Date().toISOString().slice(0, 10),
      status: payload.status || 'NEW',
      baseAmount: base,
      taxRate,
      taxAmount: tax,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      tripExpenses: expenses,
      driverCustody: custody,
      commissionAmount: commission,
      netProfit,
      paymentStatus: remaining <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
      paymentMethod: payload.paymentMethod || 'CASH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.id,
      createdByName: req.user!.fullName,
      syncStatus: 'SYNCED',
    };

    db.trips.unshift(newTrip);

    // Audit Log
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CREATE_TRIP',
      entityType: 'TRIP',
      entityId: newTrip.id,
      details: `إنشاء رحلة جديدة [${newTrip.tripNumber}] للعميل [${newTrip.customerName}] والسائق [${newTrip.driverName}] بقيمة [${newTrip.totalAmount} ر.س]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, trip: newTrip, message: 'تم حفظ الرحلة في قاعدة البيانات المركزية بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حفظ الرحلة' });
  }
});

// PUT /api/trips/:id
tripsRouter.put('/:id', authenticate, requirePermission('canManageTrips'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const db = Database.get();
    const index = db.trips.findIndex(t => t.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, error: 'الرحلة غير موجودة' });
      return;
    }

    const current = db.trips[index];
    const base = Number(payload.baseAmount ?? current.baseAmount) || 0;
    const taxRate = Number(payload.taxRate ?? current.taxRate ?? 15);
    const tax = Number(payload.taxAmount ?? Math.round((base * (taxRate / 100)) * 100) / 100);
    const total = Number(payload.totalAmount ?? (base + tax));
    const paid = Number(payload.paidAmount ?? current.paidAmount) || 0;
    const remaining = total - paid;
    const expenses = Number(payload.tripExpenses ?? current.tripExpenses) || 0;
    const custody = Number(payload.driverCustody ?? current.driverCustody) || 0;
    const netProfit = base - expenses - custody;

    const updatedTrip: Trip = {
      ...current,
      ...payload,
      id: current.id,
      tripNumber: current.tripNumber,
      baseAmount: base,
      taxRate,
      taxAmount: tax,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      tripExpenses: expenses,
      driverCustody: custody,
      netProfit,
      paymentStatus: remaining <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user!.id,
      updatedByName: req.user!.fullName,
      syncStatus: 'SYNCED',
    };

    db.trips[index] = updatedTrip;

    // Audit Log
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'UPDATE_TRIP',
      entityType: 'TRIP',
      entityId: updatedTrip.id,
      details: `تحديث بيانات الرحلة [${updatedTrip.tripNumber}] - الحالة: [${updatedTrip.status}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, trip: updatedTrip, message: 'تم تحديث بيانات الرحلة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل تحديث الرحلة' });
  }
});

// POST /api/trips/:id/approve
tripsRouter.post('/:id/approve', authenticate, requirePermission('canApproveOperations'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const trip = db.trips.find(t => t.id === id);

    if (!trip) {
      res.status(404).json({ success: false, error: 'الرحلة غير موجودة' });
      return;
    }

    trip.needsApproval = false;
    trip.approvedBy = req.user!.id;
    trip.approvedByName = req.user!.fullName;
    trip.approvedAt = new Date().toISOString();
    trip.updatedAt = new Date().toISOString();

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'APPROVE_TRIP',
      entityType: 'TRIP',
      entityId: trip.id,
      details: `اعتماد الرحلة التشغيلية والمالية [${trip.tripNumber}] بواسطة الإدارة`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, trip, message: 'تم اعتماد الرحلة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل اعتماد الرحلة' });
  }
});

// DELETE /api/trips/:id (Cancel trip to protect audit trail and relational integrity)
tripsRouter.delete('/:id', authenticate, requirePermission('canManageTrips'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const trip = db.trips.find(t => t.id === id);

    if (!trip) {
      res.status(404).json({ success: false, error: 'الرحلة غير موجودة' });
      return;
    }

    trip.status = 'CANCELLED';
    trip.updatedAt = new Date().toISOString();
    trip.updatedBy = req.user!.id;
    trip.updatedByName = req.user!.fullName;

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'DELETE_TRIP',
      entityType: 'TRIP',
      entityId: trip.id,
      details: `إلغاء وأرشفة الرحلة [${trip.tripNumber}] للعميل [${trip.customerName}] للحفاظ على السجلات المالية`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, message: 'تم إلغاء الرحلة وأرشفتها بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل إلغاء الرحلة' });
  }
});
