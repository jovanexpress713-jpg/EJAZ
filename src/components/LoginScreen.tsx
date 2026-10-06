/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowLeft, Truck, Info } from 'lucide-react';
import { EjazLogo } from './EjazLogo';
import { StorageService } from '../services/storage';
import { User, UserRole } from '../types';
import { SYSTEM_INFO } from '../constants/systemInfo';
import { AboutSystemModal } from './AboutSystemModal';

interface LoginScreenProps {
  onLoginSuccess?: (user: User) => void;
  onLogin?: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const users = StorageService.getUsers();
      const matched = users.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase() && (u.password === password || (!u.password && password === '123456'))
      );

      if (matched) {
        if (!matched.active) {
          setErrorMsg('هذا الحساب معطل حالياً من قِبل إدارة النظام.');
          setIsLoading(false);
          return;
        }
        StorageService.setCurrentUser(matched);
        if (onLoginSuccess) {
          onLoginSuccess(matched);
        }
        if (onLogin) {
          onLogin(matched);
        }
      } else {
        setErrorMsg('رمز الدخول أو كلمة المرور غير صحيحة. يرجى المحاولة مجددًا.');
        setIsLoading(false);
      }
    }, 400);
  };

  const handleQuickRoleSelect = (role: UserRole) => {
    const users = StorageService.getUsers();
    const target = users.find(u => u.role === role);
    if (target) {
      setUsername(target.username);
      setPassword(target.password || '123456');
      setErrorMsg('');
    }
  };

  return (
    <div
      id="ejaz-login-screen"
      className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-slate-100 p-4 sm:p-6 select-none relative overflow-hidden"
      dir="rtl"
    >
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-700/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-800/90 rounded-2xl border border-slate-700/70 shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10"
      >
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 mb-3 shadow-inner">
            <EjazLogo size="lg" variant="icon" />
          </div>
          <h2 className="text-2xl font-black text-white">
            مؤسسة <span className="text-[#F97316]">إيجـاز</span> للنقليات
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            بوابة الدخول للنظام الإداري والتشغيلي الموحد
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اسم المستخدم / رمز الدخول
            </label>
            <div className="relative">
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                placeholder="مثال: admin"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition pl-10"
              />
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition pl-10"
              />
              <button
                type="button"
                id="toggle-password-visibility-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="submit-login-btn"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-[#F97316] hover:bg-orange-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="text-sm">جاري التحقق والدخول...</span>
            ) : (
              <>
                <span>دخول النظام</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Role Tester Bar */}
        <div className="mt-6 pt-5 border-t border-slate-700/60">
          <p className="text-[11px] text-slate-400 text-center mb-2.5 font-medium">
            اختيار حساب تجريبي سريع للاختبار الفوري:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="role-select-admin-btn"
              onClick={() => handleQuickRoleSelect('SUPER_ADMIN')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700/80 rounded-lg text-xs text-orange-300 border border-slate-700 text-center font-medium transition cursor-pointer"
            >
              👑 مدير النظام
            </button>
            <button
              type="button"
              id="role-select-ops-btn"
              onClick={() => handleQuickRoleSelect('OPERATIONS')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700/80 rounded-lg text-xs text-blue-300 border border-slate-700 text-center font-medium transition cursor-pointer"
            >
              🚛 مسؤول العمليات
            </button>
            <button
              type="button"
              id="role-select-acc-btn"
              onClick={() => handleQuickRoleSelect('ACCOUNTANT')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700/80 rounded-lg text-xs text-emerald-300 border border-slate-700 text-center font-medium transition cursor-pointer"
            >
              💰 المحاسب المالي
            </button>
            <button
              type="button"
              id="role-select-staff-btn"
              onClick={() => handleQuickRoleSelect('VIEWER')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700/80 rounded-lg text-xs text-slate-300 border border-slate-700 text-center font-medium transition cursor-pointer"
            >
              👁️ مشرف المتابعة
            </button>
          </div>
        </div>

        {/* Footer Info & Development Copyright */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 text-center space-y-1.5">
          <div className="text-[10px] text-slate-400 font-mono">
            هاتف العمليات والمتابعة: 009665394417755
          </div>
          <div className="text-[10.5px] text-slate-400 font-medium leading-relaxed">
            <span>نظام إيجاز © جميع الحقوق محفوظة</span>
            <span className="mx-1 text-slate-600">|</span>
            <span>تطوير وبرمجة: </span>
            <span className="text-orange-400 font-bold">{SYSTEM_INFO.developer.fullName}</span>
            <span className="mx-1 text-slate-600">|</span>
            <a 
              href={SYSTEM_INFO.developer.contactUrl} 
              className="font-mono text-slate-300 font-bold hover:text-orange-400 transition inline-block"
              dir="ltr"
            >
              {SYSTEM_INFO.developer.contactNumber}
            </a>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="text-[10px] text-slate-400 hover:text-orange-400 underline transition inline-flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3 h-3 text-orange-400" />
              <span>حول النظام والترخيص البرمجي</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* About System Modal */}
      <AboutSystemModal 
        isOpen={showAboutModal} 
        onClose={() => setShowAboutModal(false)} 
      />
    </div>
  );
};
