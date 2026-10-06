/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  PhoneCall, 
  Copy, 
  Check, 
  MessageSquare, 
  Code2, 
  Layers, 
  Lock,
  Building,
  CheckCircle2,
  FolderArchive
} from 'lucide-react';
import { EjazLogo } from './EjazLogo';
import { SYSTEM_INFO } from '../constants/systemInfo';
import { downloadFullProjectZip } from '../utils/zipExporter';

interface AboutSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutSystemModal: React.FC<AboutSystemModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText?.(SYSTEM_INFO.developer.contactNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200 no-print"
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white p-5 sm:p-6 relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-inner">
              <EjazLogo size="md" variant="white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">نظام <span className="text-[#F97316]">إيجـاز</span></h2>
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  v{SYSTEM_INFO.version} {SYSTEM_INFO.edition}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {SYSTEM_INFO.systemNameAr}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Main Developer Highlight Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30">
                <Code2 className="w-4 h-4" />
              </span>
              <span className="text-xs font-black tracking-wide text-orange-400">
                حقوق البرمجة والتطوير
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              {SYSTEM_INFO.developer.fullName}
            </h3>
            <div className="text-[11px] text-slate-300 font-medium mt-1">
              النشاط: {SYSTEM_INFO.developer.activity}
            </div>

            {/* Official Copyright Text Quote Box */}
            <div className="mt-4 p-3.5 bg-slate-950/70 rounded-xl border border-slate-700/80 font-medium text-slate-200 leading-relaxed space-y-1">
              <p className="font-bold text-orange-400 text-xs">
                نظام إيجاز © جميع الحقوق محفوظة
              </p>
              <p className="text-slate-300 text-[11px]">
                تم التصميم والتطوير والبرمجة بواسطة فكتوريا لاين سوفت للأنظمة والبرمجة
              </p>
              <p className="font-mono font-bold text-amber-300 text-xs tracking-wider" dir="ltr">
                {SYSTEM_INFO.developer.contactNumber}
              </p>
            </div>

            {/* Direct Action Contact Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
              <a
                href={SYSTEM_INFO.developer.contactUrl}
                className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>اتصال مباشر: {SYSTEM_INFO.developer.contactNumber}</span>
              </a>

              <a
                href={SYSTEM_INFO.developer.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>

              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-600 transition flex items-center gap-1 cursor-pointer"
                title="نسخ رقم التواصل"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>نسخ الرقم</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* System Specifications & Version Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-slate-500 text-[10px] font-bold">إصدار النظام</div>
              <div className="text-slate-900 font-mono font-black text-xs mt-0.5">
                v{SYSTEM_INFO.version}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-slate-500 text-[10px] font-bold">بناء النظام</div>
              <div className="text-slate-900 font-mono font-black text-xs mt-0.5">
                {SYSTEM_INFO.buildNumber}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="text-slate-500 text-[10px] font-bold">حالة الترخيص</div>
              <div className="text-emerald-700 font-bold text-xs mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{SYSTEM_INFO.license.status}</span>
              </div>
            </div>
          </div>

          {/* Software Protection & Immutability Notice */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-xs text-amber-900">
                حماية حقوق الملكية والبرمجة والتطوير:
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {SYSTEM_INFO.license.protectedNotice}
              </p>
            </div>
          </div>

          {/* Enterprise Technical Platform Highlights */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span>مواصفات المنصة التقنية لنظام إيجاز:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>محرك تخزين متقدم فائق السرعة وقاعدة بيانات محلية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>يعمل بدون إنترنت (Offline-First) ودعم التثبيت PWA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>نظام محاسبي وفوترة ضريبية وإدارة أسطول ورحلات</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>حماية متقدمة للصلاحيات وسجلات الرقابة والتدقيق</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-slate-500">
            فكتوريا لاين سوفت للأنظمة والبرمجة © {SYSTEM_INFO.releaseYear}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadFullProjectZip()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="تحميل أرشيف مضغوط يحتوي على كامل سورس كود وملفات المشروع وقاعدة البيانات"
            >
              <FolderArchive className="w-4 h-4 text-emerald-200" />
              <span>حفظ ملفات المشروع كاملة (ZIP)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
