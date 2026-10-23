/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import React, { useState } from 'react';
import { ShieldCheck, User as UserIcon, Phone, Key, Lock, Copy, Check, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { StorageService, getDefaultPermissions } from '../services/storage';
import { generateRecoveryKey, generateSalt } from '../services/security';
import { ApiClient } from '../services/apiClient';

interface FirstRunSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: (ownerUser: User) => void;
}

export const FirstRunSetupModal: React.FC<FirstRunSetupModalProps> = ({
  isOpen,
  onClose,
  onSetupComplete,
}) => {
  const [fullName, setFullName] = useState('عبد الله القرني (المالك)');
  const [username, setUsername] = useState('admin');
  const [phone, setPhone] = useState('05394417755');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string>(() => generateRecoveryKey());
  const [copiedKey, setCopiedKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const handleCopyRecoveryKey = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleProceedToKey = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !username.trim()) {
      setErrorMsg('يرجى إدخال اسم المالك واسم المستخدم.');
      return;
    }
    if (password.length < 5) {
      setErrorMsg('كلمة المرور يجب أن لا تقل عن 5 خانات.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }

    setStep(2);
  };

  const handleFinalizeSetup = () => {
    try {
      const users = StorageService.getUsers();
      let owner = users.find(u => u.role === 'SUPER_ADMIN');
      
      if (owner) {
        owner.fullName = fullName.trim();
        owner.username = username.trim().toLowerCase();
        owner.phone = phone.trim();
        owner.password = password;
        owner.mustChangePassword = false;
        owner.passwordSalt = generateSalt();
      } else {
        owner = {
          id: 'usr_owner_' + Date.now(),
          fullName: fullName.trim(),
          username: username.trim().toLowerCase(),
          role: 'SUPER_ADMIN',
          phone: phone.trim(),
          active: true,
          password: password,
          mustChangePassword: false,
          passwordSalt: generateSalt(),
          permissions: getDefaultPermissions('SUPER_ADMIN'),
        };
      }

      StorageService.saveUser(owner);
      StorageService.setCurrentUser(owner);

      // Also sync to central server if online
      ApiClient.setupOwner({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        password: password,
      }).catch(err => console.warn('Server owner sync note:', err));

      // Also update settings owner phone
      const settings = StorageService.getSettings();
      settings.ownerPhone = phone.trim();
      StorageService.saveSettings(settings, owner);

      onSetupComplete(owner);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ حساب المالك.');
      setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              تهيئة حساب المالك / مدير النظام الأول
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تجهيز حساب الإدارة العليا الحصري مع مفتاح الاستعادة الآمن بدون أطراف ثالثة
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleProceedToKey} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                الاسم الكامل للمالك / المدير العام
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white pl-8 focus:outline-none focus:border-orange-500"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المستخدم (للدخول)
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم جوال المالك المعتمد
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white pl-8 focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة مرور المالك الدائمة
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="كلمة مرور قوية..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>المتابعة إلى مفتاح الاستعادة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <span>مفتاح الاستعادة الآمن لحساب المالك (Zero-Knowledge Key):</span>
              </div>
              <p className="leading-relaxed">
                هذا المفتاح ينشأ محليًا على هذا الجهاز فقط ولا يُرسل لأي مطور أو طرف خارجي. احتفظ به في مكان آمن لاستخدامه في استعادة الحساب عند نسيان كلمة المرور دون الحاجة لأي دعم فني.
              </p>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-between">
              <span className="font-mono text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-widest">
                {recoveryKey}
              </span>
              <button
                type="button"
                onClick={handleCopyRecoveryKey}
                className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-50 rounded-lg text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'تم النسخ' : 'نسخ المفتاح'}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                العودة للتعديل
              </button>
              <button
                type="button"
                onClick={handleFinalizeSetup}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>حفظ وتفعيل حساب المالك والدخول</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
