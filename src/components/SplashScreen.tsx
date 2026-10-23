import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { EjazLogo } from './EjazLogo';
import { SYSTEM_INFO } from '../constants/systemInfo';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2400);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      id="victoria-splash-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070E1E] text-white px-6 overflow-hidden select-none"
      dir="rtl"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-900/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Logo and Branding Animation - مؤسسة إيجاز للنقليات */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center space-y-5 max-w-md"
      >
        {/* Large Logo Emblem */}
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-slate-700/60 shadow-2xl backdrop-blur-md">
          <EjazLogo size="xl" variant="icon" />
        </div>

        {/* Institution Title - مؤسسة إيجاز للنقليات */}
        <div className="space-y-1.5">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans"
          >
            مؤسسة <span className="text-[#F97316]">إيجـاز</span> للنقليات
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-slate-300 text-sm sm:text-base font-semibold"
          >
            نظام إدارة عمليات النقل والأسطول والفوترة
          </motion.p>
        </div>

        {/* Software System Engine Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300"
        >
          <span className="text-orange-400 font-bold font-mono">VICTORIA Logistics ERP</span>
          <span className="text-slate-500">•</span>
          <span className="text-[11px] text-slate-400 font-mono">v{SYSTEM_INFO.version}</span>
        </motion.div>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="flex flex-col items-center gap-3 pt-2 w-full"
        >
          <div className="w-56 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-blue-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
            />
          </div>
          <span className="text-xs text-slate-400 tracking-wider font-mono">
            sa.ejaz.transport • جاري التحميل...
          </span>
        </motion.div>
      </motion.div>

      {/* Footer: Distinction between operating institution and developing software company */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-6 text-center text-xs text-slate-400 font-sans flex flex-col items-center gap-1"
      >
        <span>مرخص للاستخدام الرسمي: مؤسسة إيجـاز للنقليات – المملكة العربية السعودية</span>
        <span className="text-[11px] text-amber-400/90 font-mono">تطوير وبرمجة: {SYSTEM_INFO.developer.fullName} ({SYSTEM_INFO.developer.contactNumber})</span>
      </motion.div>
    </div>
  );
};
