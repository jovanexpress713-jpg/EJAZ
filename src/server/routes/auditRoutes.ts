import { Router, Response } from 'express';
import { Database } from '../database';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth';

export const auditRouter = Router();

// GET /api/audit-logs
auditRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  const { userId, action, entityType, dateFrom, dateTo, search, limit } = req.query;

  let logs = db.auditLogs;

  if (userId && userId !== 'ALL') {
    logs = logs.filter(l => l.userId === userId || l.userName === userId);
  }
  if (action && action !== 'ALL') {
    logs = logs.filter(l => l.action === action);
  }
  if (entityType && entityType !== 'ALL') {
    logs = logs.filter(l => l.entityType.toLowerCase() === String(entityType).toLowerCase());
  }
  if (dateFrom) {
    logs = logs.filter(l => l.timestamp >= String(dateFrom));
  }
  if (dateTo) {
    logs = logs.filter(l => l.timestamp <= String(dateTo));
  }
  if (search) {
    const q = String(search).toLowerCase();
    logs = logs.filter(l => 
      l.details.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      l.entityId.toLowerCase().includes(q)
    );
  }

  const max = Number(limit) || 500;
  res.json({ success: true, count: logs.length, logs: logs.slice(0, max) });
});
