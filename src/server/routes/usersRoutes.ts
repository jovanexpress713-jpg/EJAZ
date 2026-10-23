import { Router, Response } from 'express';
import { Database, getDefaultServerPermissions } from '../database';
import { 
  authenticate, 
  requirePermission, 
  requireRole, 
  AuthenticatedRequest, 
  generateSalt, 
  hashPassword 
} from '../auth';
import { User, UserRole, AuditLog } from '../../types';

export const usersRouter = Router();

// GET /api/users
usersRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = Database.get();
  const safeUsers = db.users.map(u => {
    const copy = { ...u };
    delete copy.password;
    delete copy.passwordHash;
    delete copy.passwordSalt;
    return copy;
  });
  res.json({ success: true, users: safeUsers });
});

// POST /api/users
usersRouter.post('/', authenticate, requirePermission('canManageUsers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, username, role, phone, tempPassword, permissions, mustChangePassword } = req.body;
    if (!fullName || !username || !role) {
      res.status(400).json({ success: false, error: 'الاسم واسم المستخدم والدور الوظيفي حقول مطلوبة' });
      return;
    }

    const db = Database.get();
    const existing = db.users.find(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
    if (existing) {
      res.status(400).json({ success: false, error: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر' });
      return;
    }

    const salt = generateSalt();
    const rawPass = tempPassword || '123456';
    const passwordHash = hashPassword(rawPass, salt);

    const newUser: User = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      fullName: String(fullName).trim(),
      username: String(username).trim().toLowerCase(),
      role: role as UserRole,
      phone: String(phone || '').trim(),
      active: true,
      passwordSalt: salt,
      passwordHash: passwordHash,
      mustChangePassword: mustChangePassword !== false,
      permissions: permissions || getDefaultServerPermissions(role as UserRole),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'MANAGE_USERS',
      entityType: 'USER',
      entityId: newUser.id,
      details: `إنشاء مستخدم جديد [${newUser.fullName}] بدور [${newUser.role}] واسم دخول [${newUser.username}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    const safe = { ...newUser };
    delete safe.password;
    delete safe.passwordHash;
    delete safe.passwordSalt;

    res.json({ success: true, user: safe, message: 'تم إنشاء المستخدم بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل إنشاء المستخدم' });
  }
});

// PUT /api/users/:id
usersRouter.put('/:id', authenticate, requirePermission('canManageUsers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, role, active, permissions } = req.body;
    const db = Database.get();
    const user = db.users.find(u => u.id === id);

    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }

    // Protection: Only SUPER_ADMIN can edit SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'لا يمكن لغير المالك تعديل بيانات حساب المالك' });
      return;
    }

    // If changing role to SUPER_ADMIN, only existing SUPER_ADMIN can do that
    if (role === 'SUPER_ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'ترقية الحساب إلى دور المالك مقتصرة على المالك فقط' });
      return;
    }

    if (fullName) user.fullName = String(fullName).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (role && (req.user!.role === 'SUPER_ADMIN' || user.role !== 'SUPER_ADMIN')) {
      user.role = role as UserRole;
    }
    if (typeof active === 'boolean') {
      // Do not allow deactivating the main owner account
      if (user.role === 'SUPER_ADMIN' && !active) {
        res.status(400).json({ success: false, error: 'لا يمكن تعطيل حساب المالك الرئيسي' });
        return;
      }
      user.active = active;
    }
    if (permissions) {
      user.permissions = permissions;
    }

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'MANAGE_USERS',
      entityType: 'USER',
      entityId: user.id,
      details: `تحديث بيانات وصلاحيات المستخدم [${user.fullName}] - الحالة: [${user.active ? 'نشط' : 'معطل'}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    const safe = { ...user };
    delete safe.password;
    delete safe.passwordHash;
    delete safe.passwordSalt;

    res.json({ success: true, user: safe, message: 'تم تحديث بيانات المستخدم بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل تحديث المستخدم' });
  }
});

// POST /api/users/:id/reset-password
usersRouter.post('/:id/reset-password', authenticate, requirePermission('canManageUsers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const db = Database.get();
    const user = db.users.find(u => u.id === id);

    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }

    if (user.role === 'SUPER_ADMIN' && req.user!.id !== user.id && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'غير مصرح بإعادة تعيين كلمة مرور المالك' });
      return;
    }

    const passToSet = newPassword || '123456';
    const salt = generateSalt();
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(passToSet, salt);
    delete user.password;
    user.mustChangePassword = true;

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: user.id,
      details: `إعادة تعيين كلمة مرور المستخدم [${user.fullName}] وإلزام التغيير عند الدخول القادم`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, message: 'تمت إعادة تعيين كلمة المرور بنجاح', tempPassword: passToSet });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل إعادة تعيين كلمة المرور' });
  }
});

// DELETE /api/users/:id (Soft-deactivate user)
usersRouter.delete('/:id', authenticate, requirePermission('canManageUsers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = Database.get();
    const user = db.users.find(u => u.id === id);

    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }

    if (user.role === 'SUPER_ADMIN') {
      res.status(400).json({ success: false, error: 'لا يمكن حذف حساب المالك الرئيسي' });
      return;
    }

    user.active = false;

    const auditEntry: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'MANAGE_USERS',
      entityType: 'USER',
      entityId: user.id,
      details: `تعطيل حساب المستخدم [${user.fullName}]`,
    };
    db.auditLogs.unshift(auditEntry);
    Database.persist();

    res.json({ success: true, message: 'تم تعطيل الحساب بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'فشل تعطيل الحساب' });
  }
});
