import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth';
import { Customer, AuditLog } from '../../types';

export const customersRouter = Router();

// GET /api/customers
customersRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  res.json({ success: true, customers: db.customers });
});

// POST /api/customers
customersRouter.post('/', authenticate, requirePermission('canManageCustomers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, address, taxNumber, paymentTerms, status, notes } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'اسم العميل حقل إجباري' });
      return;
    }

    const db = Database.get();
    const newCustomer: Customer = {
      id: req.body.id || 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: String(name).trim(),
      phone: String(phone || '').trim(),
      address: String(address || '').trim(),
      taxNumber: String(taxNumber || '').trim(),
      paymentTerms: String(paymentTerms || '').trim(),
      status: status || 'ACTIVE',
      notes: String(notes || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.id,
      createdByName: req.user!.fullName,
      syncStatus: 'SYNCED',
    };

    db.customers.unshift(newCustomer);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CREATE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: newCustomer.id,
      details: `إضافة عميل جديد [${newCustomer.name}] - هاتف: [${newCustomer.phone}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, customer: newCustomer, message: 'تم حفظ بيانات العميل بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حفظ بيانات العميل' });
  }
});

// PUT /api/customers/:id
customersRouter.put('/:id', authenticate, requirePermission('canManageCustomers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const customer = db.customers.find(c => c.id === id);

    if (!customer) {
      res.status(404).json({ success: false, error: 'العميل غير موجود' });
      return;
    }

    Object.assign(customer, req.body, {
      id: customer.id,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user!.id,
      updatedByName: req.user!.fullName,
    });

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'UPDATE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      details: `تحديث بيانات العميل [${customer.name}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, customer, message: 'تم تحديث بيانات العميل بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل تحديث العميل' });
  }
});

// DELETE /api/customers/:id
customersRouter.delete('/:id', authenticate, requirePermission('canManageCustomers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const customer = db.customers.find(c => c.id === id);

    if (!customer) {
      res.status(404).json({ success: false, error: 'العميل غير موجود' });
      return;
    }

    // Check if customer has active trips
    const customerTrips = db.trips.filter(t => t.customerId === id && t.status !== 'CANCELLED');
    if (customerTrips.length > 0) {
      // Soft-deactivate instead of hard delete to preserve relational integrity
      customer.status = 'INACTIVE';
      customer.updatedAt = new Date().toISOString();
      Database.persist();
      res.json({ success: true, message: `تم تعطيل العميل بنجاح مع الاحتفاظ بسجل رحلاته (${customerTrips.length} رحلة)` });
      return;
    }

    db.customers = db.customers.filter(c => c.id !== id);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'DELETE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      details: `حذف العميل [${customer.name}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, message: 'تم حذف العميل بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حذف العميل' });
  }
});
