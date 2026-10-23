/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { User } from '../types';
import { StorageService } from '../services/storage';
import { ApiClient } from '../services/apiClient';

interface ChangePasswordModalProps {
  isOpen: boolean;
  currentUser: User;
  isMandatory?: boolean; // Forced first login password change
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  currentUser,
  isMandatory = false,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // If not mandatory, verify current password
    if (!isMandatory && currentUser.password && currentPassword !== currentUser.password) {
      setErrorMsg('كلمة المرور الحالية غير صحيحة.');
      return;
    }

    if (newPassword.length < 5) {
      setErrorMsg('يجب ألا تقل كلمة المرور الجديدة عن 5 خانات أو أحرف.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }

    try {
      StorageService.changeUserPassword(currentUser.id, newPassword);

      // Also call server API if online
      ApiClient.changePassword(currentPassword || currentUser.password || '', newPassword)
        .catch(err => console.warn('Server password sync note:', err));

      setSuccessMsg('تم تحديث كلمة المرور وتأمين حسابك بنجاح!');
      const updatedUser: User = {
        ...currentUser,
        password: newPassword,
        mustChangePassword: false,
      };
      setTimeout(() => {
        onSuccess(updatedUser);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تغيير كلمة المرور.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500/10 text-[#F97316] rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isMandatory ? 'تغيير كلمة المرور المؤقتة (إلزامي)' : 'تحديث كلمة المرور الشخصية'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isMandatory 
                  ? 'يرجى تعيين كلمة مرور شخصية جديدة لتأمين حسابك قبل متابعة استخدام النظام.' 
                  : `المستخدم: ${currentUser.fullName}`}
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isMandatory && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور الحالية
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة مرور قوية (5 خانات على الأقل)..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 pl-9"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="أعد إدخال كلمة المرور للتأكيد..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            {!isMandatory && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>تأكيد وتغيير كلمة المرور</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
