import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Database } from './database';
import { User, UserRole, UserPermissions } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-change-me');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before starting the server in production.');
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): { userId: string; username: string; role: UserRole } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.expiresAt && payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'غير مصرح: يرجى تسجيل الدخول' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
    return;
  }

  const db = Database.get();
  const user = db.users.find(u => u.id === payload.userId && u.active);
  if (!user) {
    res.status(401).json({ success: false, error: 'المستخدم غير موجود أو الحساب معطل' });
    return;
  }

  req.user = user;
  next();
}

export function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      const db = Database.get();
      const user = db.users.find(u => u.id === payload.userId && u.active);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: `غير مصرح لك بتنفيذ هذه العملية. هذه الصلاحية مخصصة للأدوار: ${allowedRoles.join('، ')}` 
      });
      return;
    }
    next();
  };
}

export function requirePermission(permissionKey: keyof UserPermissions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    // SUPER_ADMIN has master override
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const perms = req.user.permissions;
    if (perms && perms[permissionKey]) {
      next();
      return;
    }

    res.status(403).json({ 
      success: false, 
      error: 'لا تمتلك الصلاحية الكافية لإتمام هذا الإجراء في النظام.' 
    });
  };
}
