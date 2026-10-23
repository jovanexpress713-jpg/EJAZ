import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { EjazLogo } from './EjazLogo';
import { SYSTEM_INFO } from '../constants/systemInfo';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2400);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      id="victoria-splash-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050B14] text-white px-6 overflow-hidden select-none"
      dir="rtl"
    >
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.82, y: 22 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center space-y-5 max-w-md"
      >
        <motion.div
          initial={{ rotate: -6, scale: 0.85 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative p-4 bg-[#0B1424]/95 rounded-[2rem] border border-slate-700/70 shadow-2xl"
        >
          <EjazLogo size="xl" variant="icon" />
          <motion.div
            className="absolute inset-x-4 bottom-3 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-full"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.55, duration: 0.7 }}
          />
        </motion.div>

        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.55 }}
            className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans"
            dir="ltr"
          >
            VICTORIA <span className="text-orange-400">Logistics ERP</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.48, duration: 0.55 }}
            className="text-slate-300 text-sm sm:text-base font-semibold"
          >
            نظام إدارة النقل والأسطول والمحاسبة والتقارير
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.45 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300"
          dir="ltr"
        >
          <span className="text-orange-400 font-bold font-mono">ERP</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono">v{SYSTEM_INFO.version}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="flex flex-col items-center gap-3 pt-2 w-full"
        >
          <div className="w-56 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-blue-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
            />
          </div>
          <span className="text-xs text-slate-400 tracking-wider font-mono" dir="ltr">
            sa.ejaz.transport • جاري التحميل...
          </span>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-6 text-center text-xs text-slate-400 font-sans flex flex-col items-center gap-1"
      >
        <span>نظام مؤسسة إيجاز للنقليات</span>
        <span className="text-[11px] text-amber-400/90 font-mono">تطوير وبرمجة: {SYSTEM_INFO.developer.fullName}</span>
      </motion.div>
    </div>
  );
};
