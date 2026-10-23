import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, optionalAuthenticate, requirePermission, AuthenticatedRequest } from '../auth';

export const settingsRouter = Router();

// GET /api/settings
settingsRouter.get('/', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  res.json({ success: true, settings: db.settings });
});

// PUT /api/settings
settingsRouter.put('/', authenticate, requirePermission('canManageSettings'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = Database.get();
    db.settings = {
      ...db.settings,
      ...req.body,
    };

    db.auditLogs.unshift({
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'UPDATE_SETTINGS',
      entityType: 'SETTINGS',
      entityId: 'company_settings',
      details: `تحديث إعدادات المؤسسة والهوية التجارية بواسطة [${req.user!.fullName}]`,
    });
    Database.persist();

    res.json({ success: true, settings: db.settings, message: 'تم تحديث الإعدادات في الخادم المركزي بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل تحديث الإعدادات' });
  }
});
