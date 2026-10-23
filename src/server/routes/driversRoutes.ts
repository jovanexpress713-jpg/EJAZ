import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth';
import { Driver, AuditLog } from '../../types';

export const driversRouter = Router();

// GET /api/drivers
driversRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  res.json({ success: true, drivers: db.drivers });
});

// POST /api/drivers
driversRouter.post('/', authenticate, requirePermission('canManageDrivers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, nationalId, licenseNumber, licenseExpiry, address, status, notes, assignedTruckId, assignedPlateNumber, assignedTruckNumber } = req.body;
    if (!name || !phone || !nationalId) {
      res.status(400).json({ success: false, error: 'اسم السائق ورقم الجوال ورقم الهوية حقول إجبارية' });
      return;
    }

    const db = Database.get();

    // Check unique nationalId
    const existing = db.drivers.find(d => d.nationalId === String(nationalId).trim());
    if (existing) {
      res.status(400).json({ success: false, error: 'رقم الهوية الوطنية مسجل مسبقاً لسائق آخر' });
      return;
    }

    const newDriver: Driver = {
      ...req.body,
      id: req.body.id || 'drv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: String(name).trim(),
      phone: String(phone).trim(),
      nationalId: String(nationalId).trim(),
      licenseNumber: String(licenseNumber || '').trim(),
      licenseExpiry: licenseExpiry || '',
      address: address || '',
      status: status || 'ACTIVE',
      notes: notes || '',
      assignedTruckId: assignedTruckId || undefined,
      assignedPlateNumber: assignedPlateNumber || undefined,
      assignedTruckNumber: assignedTruckNumber || undefined,
      createdAt: new Date().toISOString(),
    };

    // If a truck is assigned, update that truck to reflect this driver (1-to-1 strict binding)
    if (newDriver.assignedTruckId) {
      // Unbind this truck from any other driver first
      db.drivers.forEach(otherD => {
        if (otherD.assignedTruckId === newDriver.assignedTruckId) {
          otherD.assignedTruckId = undefined;
          otherD.assignedPlateNumber = undefined;
          otherD.assignedTruckNumber = undefined;
        }
      });

      const truck = db.trucks.find(t => t.id === newDriver.assignedTruckId);
      if (truck) {
        truck.assignedDriverId = newDriver.id;
        truck.assignedDriverName = newDriver.name;
        truck.assignedDriverPhone = newDriver.phone;
      }
    }

    db.drivers.unshift(newDriver);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CREATE_DRIVER',
      entityType: 'DRIVER',
      entityId: newDriver.id,
      details: `إضافة سائق جديد [${newDriver.name}] - هوية: [${newDriver.nationalId}] - شاحنة: [${newDriver.assignedPlateNumber || 'غير محددة'}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, driver: newDriver, message: 'تم حفظ بيانات السائق وتحديث ربط الشاحنة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حفظ بيانات السائق' });
  }
});

// PUT /api/drivers/:id
driversRouter.put('/:id', authenticate, requirePermission('canManageDrivers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const driver = db.drivers.find(d => d.id === id);

    if (!driver) {
      res.status(404).json({ success: false, error: 'السائق غير موجود' });
      return;
    }

    const prevTruckId = driver.assignedTruckId;
    Object.assign(driver, req.body, { id: driver.id });

    // Handle 1-to-1 truck binding changes
    if (driver.assignedTruckId && driver.assignedTruckId !== prevTruckId) {
      // Unbind previous truck
      if (prevTruckId) {
        const prevTruck = db.trucks.find(t => t.id === prevTruckId);
        if (prevTruck && prevTruck.assignedDriverId === driver.id) {
          prevTruck.assignedDriverId = undefined;
          prevTruck.assignedDriverName = undefined;
          prevTruck.assignedDriverPhone = undefined;
        }
      }

      // Unbind new truck from any other driver
      db.drivers.forEach(otherD => {
        if (otherD.id !== driver.id && otherD.assignedTruckId === driver.assignedTruckId) {
          otherD.assignedTruckId = undefined;
          otherD.assignedPlateNumber = undefined;
          otherD.assignedTruckNumber = undefined;
        }
      });

      // Bind new truck
      const newTruck = db.trucks.find(t => t.id === driver.assignedTruckId);
      if (newTruck) {
        newTruck.assignedDriverId = driver.id;
        newTruck.assignedDriverName = driver.name;
        newTruck.assignedDriverPhone = driver.phone;
      }
    }

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'UPDATE_DRIVER',
      entityType: 'DRIVER',
      entityId: driver.id,
      details: `تحديث بيانات السائق [${driver.name}] - شاحنة: [${driver.assignedPlateNumber || 'غير محددة'}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, driver, message: 'تم تحديث بيانات السائق بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل تحديث السائق' });
  }
});

// DELETE /api/drivers/:id
driversRouter.delete('/:id', authenticate, requirePermission('canManageDrivers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const driver = db.drivers.find(d => d.id === id);

    if (!driver) {
      res.status(404).json({ success: false, error: 'السائق غير موجود' });
      return;
    }

    // Check if driver has active trips
    const activeTrips = db.trips.filter(t => t.driverId === id && t.status !== 'CANCELLED');
    if (activeTrips.length > 0) {
      driver.status = 'SUSPENDED';
      Database.persist();
      res.json({ success: true, message: `تم إيقاف السائق بدلاً من حذفه لوجود ${activeTrips.length} رحلة مسجلة باسمه` });
      return;
    }

    // Unbind truck if any
    if (driver.assignedTruckId) {
      const truck = db.trucks.find(t => t.id === driver.assignedTruckId);
      if (truck && truck.assignedDriverId === driver.id) {
        truck.assignedDriverId = undefined;
        truck.assignedDriverName = undefined;
        truck.assignedDriverPhone = undefined;
      }
    }

    db.drivers = db.drivers.filter(d => d.id !== id);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'DELETE_DRIVER',
      entityType: 'DRIVER',
      entityId: driver.id,
      details: `حذف السائق [${driver.name}] وفك ربط الشاحنة`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, message: 'تم حذف السائق بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حذف السائق' });
  }
});
