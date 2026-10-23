import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth';

export const backupRouter = Router();

// GET /api/backup/export
backupRouter.get('/export', authenticate, requirePermission('canBackupRestore'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = Database.get();
    const backupPayload = JSON.stringify(db, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ejaz_erp_backup_${dateStr}.json"`);
    res.send(backupPayload);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل تصدير النسخة الاحتياطية' });
  }
});

// POST /api/backup/restore
backupRouter.post('/restore', authenticate, requirePermission('canBackupRestore'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const backupData = req.body;
    if (!backupData || !Array.isArray(backupData.users)) {
      res.status(400).json({ success: false, error: 'هيكل ملف النسخة الاحتياطية غير صالح' });
      return;
    }

    Database.restore(backupData);
    const db = Database.get();

    db.auditLogs.unshift({
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'BACKUP_RESTORE',
      entityType: 'SYSTEM',
      entityId: 'backup_restore',
      details: `استعادة نسخة احتياطية كاملة بواسطة [${req.user!.fullName}] تتضمن [${backupData.trips?.length || 0}] رحلة`,
    });
    Database.persist();

    res.json({ success: true, message: 'تمت استعادة النسخة الاحتياطية وتحديث قاعدة البيانات المركزية بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل استعادة النسخة الاحتياطية' });
  }
});
