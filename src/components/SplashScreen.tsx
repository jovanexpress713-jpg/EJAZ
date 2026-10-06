import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { EjazLogo } from './EjazLogo';

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
      id="ejaz-splash-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F172A] text-white px-6 overflow-hidden select-none"
      dir="rtl"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Logo and Branding Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center space-y-6 max-w-sm"
      >
        {/* Large Logo Emblem */}
        <div className="p-4 bg-slate-800/80 rounded-3xl border border-slate-700/50 shadow-2xl backdrop-blur-md">
          <EjazLogo size="xl" variant="icon" />
        </div>

        {/* Company Title */}
        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-serif"
          >
            مؤسسة <span className="text-[#F97316]">إيجـاز</span> للنقليات
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-slate-300 text-base sm:text-lg font-medium"
          >
            نظام إدارة النقل والأسطول اللوجستي
          </motion.p>
        </div>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="flex flex-col items-center gap-3 pt-6"
        >
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
            />
          </div>
          <span className="text-xs text-slate-400 tracking-wider font-mono">
            com.ejaz.transport • v1.0.0
          </span>
        </motion.div>
      </motion.div>

      {/* Footer Tagline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 text-center text-xs text-slate-400 font-sans"
      >
        حلول النقل البري الذكية والآمنة بالمملكة العربية السعودية
      </motion.div>
    </div>
  );
};
