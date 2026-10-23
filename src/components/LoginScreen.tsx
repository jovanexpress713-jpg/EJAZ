/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowLeft, Info, Sparkles, Key } from 'lucide-react';
import { EjazLogo } from './EjazLogo';
import { StorageService } from '../services/storage';
import { SyncEngine } from '../services/syncEngine';
import { ApiClient } from '../services/apiClient';
import { User } from '../types';
import { SYSTEM_INFO } from '../constants/systemInfo';
import { AboutSystemModal } from './AboutSystemModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { FirstRunSetupModal } from './FirstRunSetupModal';

interface LoginScreenProps {
  onLoginSuccess?: (user: User) => void;
  onLogin?: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  
  // Modals for first-run owner setup and temporary password change
  const [showFirstRunModal, setShowFirstRunModal] = useState(() => {
    const owner = StorageService.getUsers().find(u => u.role === 'SUPER_ADMIN');
    return !owner || (owner.username.toLowerCase() === 'admin' && owner.password === 'admin');
  });
  const [userPendingPasswordChange, setUserPendingPasswordChange] = useState<User | null>(null);

  const handleProceedLogin = (matched: User) => {
    StorageService.setCurrentUser(matched);
    if (onLoginSuccess) {
      onLoginSuccess(matched);
    }
    if (onLogin) {
      onLogin(matched);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      // 1. Attempt online server authentication first
      const isOnline = await ApiClient.isOnline();
      if (isOnline) {
        try {
          const authRes = await ApiClient.login(username.trim(), password);
          if (authRes && authRes.user) {
            // Trigger background sync to pull latest data for this authenticated session
            SyncEngine.syncWithServer(authRes.user).catch(() => {});
            setIsLoading(false);
            handleProceedLogin(authRes.user);
            return;
          }
        } catch (serverErr: any) {
          // If server explicitly returned invalid credentials or deactivated account, show message
          if (serverErr.message && !serverErr.message.includes('Failed to fetch')) {
            setErrorMsg(serverErr.message);
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Fallback to local authentication when offline
      const users = StorageService.getUsers();
      const matched = users.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
      );

      if (matched) {
        if (!matched.active) {
          setErrorMsg('هذا الحساب معطل حالياً من قِبل إدارة النظام.');
          setIsLoading(false);
          return;
        }

        if (matched.mustChangePassword) {
          setIsLoading(false);
          setUserPendingPasswordChange(matched);
          return;
        }

        setIsLoading(false);
        handleProceedLogin(matched);
      } else {
        setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التحقق من البيانات.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تسجيل الدخول');
      setIsLoading(false);
    }
  };

  return (
    <div
      id="ejaz-login-screen"
      className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-slate-100 p-4 sm:p-6 select-none relative overflow-hidden font-cairo"
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
        {/* Header Branding - مؤسسة إيجاز للنقليات */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 mb-3 shadow-inner">
            <EjazLogo size="lg" variant="icon" />
          </div>
          <h2 className="text-2xl font-black text-white">
            مؤسسة <span className="text-[#F97316]">إيجـاز</span> للنقليات
          </h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            بوابة الدخول الموحدة لإدارة أسطول النقل والعمليات
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] text-slate-400 font-mono">
            <span className="text-orange-400 font-bold">VICTORIA Logistics ERP</span>
            <span className="opacity-50">•</span>
            <span>نظام التشغيل المعتمد</span>
          </div>
        </div>

        {/* First Run Owner Setup Banner Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowFirstRunModal(true)}
            className="w-full py-2 px-3 bg-gradient-to-r from-orange-600/20 via-amber-600/20 to-blue-600/20 hover:from-orange-600/30 hover:to-blue-600/30 border border-orange-500/40 rounded-xl text-xs font-bold text-orange-300 transition flex items-center justify-between cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>تهيئة وتخصيص حساب المالك الأول</span>
            </div>
            <span className="text-[10px] bg-orange-500/30 px-2 py-0.5 rounded text-orange-200">
              تأمين الحساب
            </span>
          </button>
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

      {/* Mandatory Change Password Modal */}
      {userPendingPasswordChange && (
        <ChangePasswordModal
          isOpen={true}
          currentUser={userPendingPasswordChange}
          isMandatory={true}
          onClose={() => setUserPendingPasswordChange(null)}
          onSuccess={(updated) => {
            setUserPendingPasswordChange(null);
            handleProceedLogin(updated);
          }}
        />
      )}

      {/* First Run Master Setup Modal */}
      <FirstRunSetupModal
        isOpen={showFirstRunModal}
        onClose={() => setShowFirstRunModal(false)}
        onSetupComplete={(owner) => {
          handleProceedLogin(owner);
        }}
      />

      {/* About System Modal */}
      <AboutSystemModal 
        isOpen={showAboutModal} 
        onClose={() => setShowAboutModal(false)} 
      />
    </div>
  );
};
