import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth';
import { Truck, AuditLog } from '../../types';

export const trucksRouter = Router();

// GET /api/trucks
trucksRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  res.json({ success: true, trucks: db.trucks });
});

// POST /api/trucks
trucksRouter.post('/', authenticate, requirePermission('canManageTrucks'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plateNumber, truckNumber, truckType, model, year, ownership, status, notes, assignedDriverId } = req.body;
    if (!plateNumber || !truckType) {
      res.status(400).json({ success: false, error: 'رقم اللوحة ونوع الشاحنة حقول مطلوبة' });
      return;
    }

    const db = Database.get();

    // Check unique plateNumber
    const existing = db.trucks.find(t => t.plateNumber.trim() === String(plateNumber).trim());
    if (existing) {
      res.status(400).json({ success: false, error: 'رقم اللوحة مسجل مسبقاً لشاحنة أخرى' });
      return;
    }

    const newTruck: Truck = {
      ...req.body,
      id: req.body.id || 'trk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      plateNumber: String(plateNumber).trim(),
      truckNumber: truckNumber ? String(truckNumber).trim() : undefined,
      truckType,
      model: String(model || '').trim(),
      year: Number(year) || new Date().getFullYear(),
      ownership: ownership || 'COMPANY',
      status: status || 'AVAILABLE',
      notes: notes || '',
      assignedDriverId: assignedDriverId || undefined,
      createdAt: new Date().toISOString(),
    };

    // If driver assigned, bind to driver
    if (newTruck.assignedDriverId) {
      const driver = db.drivers.find(d => d.id === newTruck.assignedDriverId);
      if (driver) {
        newTruck.assignedDriverName = driver.name;
        newTruck.assignedDriverPhone = driver.phone;
        driver.assignedTruckId = newTruck.id;
        driver.assignedPlateNumber = newTruck.plateNumber;
        driver.assignedTruckNumber = newTruck.truckNumber;
      }
    }

    db.trucks.unshift(newTruck);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CREATE_TRUCK',
      entityType: 'TRUCK',
      entityId: newTruck.id,
      details: `إضافة شاحنة جديدة [${newTruck.plateNumber}] - نوع: [${newTruck.truckType}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, truck: newTruck, message: 'تم حفظ بيانات الشاحنة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حفظ الشاحنة' });
  }
});

// PUT /api/trucks/:id
trucksRouter.put('/:id', authenticate, requirePermission('canManageTrucks'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const truck = db.trucks.find(t => t.id === id);

    if (!truck) {
      res.status(404).json({ success: false, error: 'الشاحنة غير موجودة' });
      return;
    }

    const prevDriverId = truck.assignedDriverId;
    Object.assign(truck, req.body, { id: truck.id });

    // Handle 1-to-1 driver binding changes
    if (truck.assignedDriverId && truck.assignedDriverId !== prevDriverId) {
      // Unbind previous driver
      if (prevDriverId) {
        const prevDriver = db.drivers.find(d => d.id === prevDriverId);
        if (prevDriver && prevDriver.assignedTruckId === truck.id) {
          prevDriver.assignedTruckId = undefined;
          prevDriver.assignedPlateNumber = undefined;
          prevDriver.assignedTruckNumber = undefined;
        }
      }

      // Bind new driver
      const newDriver = db.drivers.find(d => d.id === truck.assignedDriverId);
      if (newDriver) {
        truck.assignedDriverName = newDriver.name;
        truck.assignedDriverPhone = newDriver.phone;
        newDriver.assignedTruckId = truck.id;
        newDriver.assignedPlateNumber = truck.plateNumber;
        newDriver.assignedTruckNumber = truck.truckNumber;
      }
    }

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'UPDATE_TRUCK',
      entityType: 'TRUCK',
      entityId: truck.id,
      details: `تحديث بيانات الشاحنة [${truck.plateNumber}] - الحالة: [${truck.status}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, truck, message: 'تم تحديث بيانات الشاحنة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل تحديث الشاحنة' });
  }
});

// DELETE /api/trucks/:id
trucksRouter.delete('/:id', authenticate, requirePermission('canManageTrucks'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const truck = db.trucks.find(t => t.id === id);

    if (!truck) {
      res.status(404).json({ success: false, error: 'الشاحنة غير موجودة' });
      return;
    }

    // Check if truck has trips
    const tripsWithTruck = db.trips.filter(t => t.truckId === id && t.status !== 'CANCELLED');
    if (tripsWithTruck.length > 0) {
      truck.status = 'STOPPED';
      Database.persist();
      res.json({ success: true, message: `تم إيقاف الشاحنة بدلاً من حذفها لاحتفاظها بسجلات ${tripsWithTruck.length} رحلة` });
      return;
    }

    // Unbind driver
    if (truck.assignedDriverId) {
      const driver = db.drivers.find(d => d.id === truck.assignedDriverId);
      if (driver && driver.assignedTruckId === truck.id) {
        driver.assignedTruckId = undefined;
        driver.assignedPlateNumber = undefined;
        driver.assignedTruckNumber = undefined;
      }
    }

    db.trucks = db.trucks.filter(t => t.id !== id);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'DELETE_TRUCK',
      entityType: 'TRUCK',
      entityId: truck.id,
      details: `حذف الشاحنة [${truck.plateNumber}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, message: 'تم حذف الشاحنة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل حذف الشاحنة' });
  }
});
