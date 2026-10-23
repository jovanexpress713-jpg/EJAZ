import { Router, Response } from 'express';
import crypto from 'crypto';
import { Database } from '../database';
import { 
  hashPassword, 
  generateSalt, 
  generateToken, 
  authenticate, 
  AuthenticatedRequest 
} from '../auth';
import { AuditLog } from '../../types';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
      return;
    }

    const db = Database.get();
    const user = db.users.find(u => u.username.toLowerCase() === String(username).trim().toLowerCase());

    if (!user) {
      res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }

    if (!user.active) {
      res.status(403).json({ success: false, error: 'هذا الحساب معطل حالياً من قِبل إدارة النظام.' });
      return;
    }

    // Verify Password:
    let passwordValid = false;
    if (user.passwordHash && user.passwordSalt) {
      const computed = hashPassword(password, user.passwordSalt);
      passwordValid = computed === user.passwordHash;
    } else if (user.password) {
      // Legacy or seed check
      passwordValid = user.password === password;
      // Auto-migrate to salted hash on successful login
      if (passwordValid) {
        const salt = generateSalt();
        user.passwordSalt = salt;
        user.passwordHash = hashPassword(password, salt);
        delete user.password;
        Database.persist();
      }
    }

    if (!passwordValid) {
      res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }

    // Update lastLogin
    user.lastLoginAt = new Date().toISOString();

    // Audit log
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.fullName || user.username,
      userRole: user.role,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      details: `تسجيل دخول ناجح للمستخدم [${user.fullName}] بدور [${user.role}]`,
      ipOrOrigin: req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1',
    };
    db.auditLogs.unshift(auditEntry);
    if (db.auditLogs.length > 5000) {
      db.auditLogs = db.auditLogs.slice(0, 5000);
    }
    Database.persist();

    const token = generateToken(user);
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.passwordHash;
    delete safeUser.passwordSalt;

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'خطأ داخلي في الخادم' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const safeUser = { ...req.user! };
  delete safeUser.password;
  delete safeUser.passwordHash;
  delete safeUser.passwordSalt;
  res.json({ success: true, user: safeUser });
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  if (req.user) {
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      userName: req.user.fullName || req.user.username,
      userRole: req.user.role,
      action: 'LOGOUT',
      entityType: 'AUTH',
      entityId: req.user.id,
      details: `تسجيل خروج للمستخدم [${req.user.fullName}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();
  }
  res.json({ success: true });
});

// POST /api/auth/change-password
authRouter.post('/change-password', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'يرجى تقديم كلمة المرور الحالية والجديدة' });
      return;
    }

    if (newPassword.length < 5) {
      res.status(400).json({ success: false, error: 'كلمة المرور الجديدة يجب أن تكون 5 أحرف أو أكثر' });
      return;
    }

    const db = Database.get();
    const user = db.users.find(u => u.id === req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }

    // Verify current
    let valid = false;
    if (user.passwordHash && user.passwordSalt) {
      valid = hashPassword(currentPassword, user.passwordSalt) === user.passwordHash;
    } else if (user.password) {
      valid = user.password === currentPassword;
    }

    if (!valid) {
      res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }

    // Update with fresh salt
    const salt = generateSalt();
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(newPassword, salt);
    delete user.password;
    user.mustChangePassword = false;

    // Audit log
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: user.id,
      details: `تغيير كلمة المرور وتحديث التشفير للمستخدم [${user.fullName}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, message: 'تم تحديث كلمة المرور وتشفيرها بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'خطأ في تغيير كلمة المرور' });
  }
});

// POST /api/auth/setup-owner (First run setup for Owner)
authRouter.post('/setup-owner', (req, res: Response) => {
  try {
    const { fullName, username, phone, password, setupKey } = req.body;
    if (!fullName || !username || !password) {
      res.status(400).json({ success: false, error: 'جميع الحقول المطلوبة لإعداد حساب المالك يجب تعبئتها' });
      return;
    }

    // Central owner setup is a one-time privileged action. Never expose an unauthenticated
    // owner-reset endpoint on a deployed server.
    const expectedSetupKey = process.env.OWNER_SETUP_KEY || '';
    if (!expectedSetupKey) {
      res.status(503).json({ success: false, error: 'تهيئة المالك المركزي معطلة: يجب على مسؤول الخادم ضبط OWNER_SETUP_KEY أولًا' });
      return;
    }
    const suppliedSetupKey = String(setupKey || '');
    const expectedBuffer = Buffer.from(expectedSetupKey, 'utf8');
    const suppliedBuffer = Buffer.from(suppliedSetupKey, 'utf8');
    if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      res.status(403).json({ success: false, error: 'مفتاح تهيئة الخادم غير صحيح' });
      return;
    }

    const db = Database.get();
    let owner = db.users.find(u => u.role === 'SUPER_ADMIN');
    if (owner && (owner.passwordHash || owner.passwordSalt || owner.password !== 'admin')) {
      res.status(409).json({ success: false, error: 'تم إعداد حساب المالك المركزي مسبقًا. استخدم تسجيل الدخول أو إجراء استعادة معتمد.' });
      return;
    }
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    if (owner) {
      owner.fullName = fullName.trim();
      owner.username = username.trim().toLowerCase();
      owner.phone = phone?.trim() || owner.phone;
      owner.passwordSalt = salt;
      owner.passwordHash = passwordHash;
      delete owner.password;
      owner.mustChangePassword = false;
      owner.active = true;
    } else {
      owner = {
        id: 'usr_owner_' + Date.now(),
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        role: 'SUPER_ADMIN',
        phone: phone?.trim() || '',
        active: true,
        passwordSalt: salt,
        passwordHash: passwordHash,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      };
      db.users.unshift(owner);
    }

    if (phone) {
      db.settings.ownerPhone = phone.trim();
    }

    // Audit
    db.auditLogs.unshift({
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: owner.id,
      userName: owner.fullName,
      userRole: 'SUPER_ADMIN',
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: owner.id,
      details: 'إعداد وتأكيد حساب المالك الأول مع التشفير الكامل',
    });

    Database.persist();

    const token = generateToken(owner);
    const safeUser = { ...owner };
    delete safeUser.password;
    delete safeUser.passwordHash;
    delete safeUser.passwordSalt;

    res.json({ success: true, token, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل إعداد حساب المالك' });
  }
});
