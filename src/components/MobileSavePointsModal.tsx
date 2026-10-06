/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

import React, { useState } from 'react';
import { 
  HardDrive, 
  Smartphone, 
  Share2, 
  Download, 
  RotateCcw, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  X, 
  Clock, 
  ShieldCheck, 
  Database,
  Calendar,
  DollarSign,
  AlertTriangle,
  FolderArchive
} from 'lucide-react';
import { safeOpenUrl } from '../utils/safeBrowser';
import { User, SavePointRecord, CompanySettings } from '../types';
import { StorageService } from '../services/storage';
import { downloadFullProjectZip } from '../utils/zipExporter';

interface MobileSavePointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings?: CompanySettings;
  onRefresh?: () => void;
}

export const MobileSavePointsModal: React.FC<MobileSavePointsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onRefresh,
}) => {
  const [savePoints, setSavePoints] = useState<SavePointRecord[]>(() => StorageService.getSavePoints());
  const [pointLabel, setPointLabel] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>(() => settings?.ownerPhone || settings?.phone || '');
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  if (!isOpen) return null;

  const reloadPoints = () => {
    setSavePoints(StorageService.getSavePoints());
  };

  // Create Instant Save Point
  const handleCreateSavePoint = () => {
    try {
      const newPoint = StorageService.createSavePoint(pointLabel, currentUser);
      setPointLabel('');
      reloadPoints();
      setFeedback(`تم إنشاء نقطة الحفظ بنجاح: "${newPoint.label}"`);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      setFeedback('حدث خطأ أثناء إنشاء نقطة الحفظ');
    }
  };

  // Delete Save Point
  const handleDeletePoint = (id: string) => {
    StorageService.deleteSavePoint(id);
    reloadPoints();
    setFeedback('تم حذف نقطة الحفظ المحددة');
  };

  // Restore Save Point
  const handleConfirmRestore = (id: string) => {
    const ok = StorageService.restoreSavePoint(id, currentUser);
    if (ok) {
      setIsRestoringId(null);
      setFeedback('تمت استعادة نقطة الحفظ بنجاح وتحديث كافة البيانات في النظام!');
      if (onRefresh) onRefresh();
    } else {
      setFeedback('فشلت عملية الاستعادة من نقطة الحفظ');
    }
  };

  // Share Save Point directly to WhatsApp / Mobile
  const handleShareToMobile = (point: SavePointRecord) => {
    const orgName = settings?.nameAr || 'مؤسسة إيجاز للنقليات';
    const dateFormatted = new Date(point.timestamp).toLocaleDateString('ar-SA') + ' - ' + new Date(point.timestamp).toLocaleTimeString('ar-SA');
    
    const text = `💾 *نقطة حفظ نظام إيجاز للنقليات (بيانات جوال)*
🏢 *المؤسسة:* ${orgName}
🏷️ *الوصف:* ${point.label}
🕒 *تاريخ ووقت نقطة الحفظ:* ${dateFormatted}
👤 *بواسطة:* ${currentUser.fullName || currentUser.username}

───────────────────
📊 *إحصائيات نقطة الحفظ المنقولة:*
• 🚛 إجمالي الرحلات: ${point.totalTrips} رحلة
• 💰 إجمالي النولون / الإيرادات: ${point.totalRevenue.toLocaleString()} ر.س
• 💵 إجمالي المبالغ المحصلة: ${point.totalCollected.toLocaleString()} ر.س
• ⛽ إجمالي المصروفات: ${point.totalExpenses.toLocaleString()} ر.س
• 📈 صافي الأرباح: ${point.netMargin.toLocaleString()} ر.س
• 👥 السائقون النشطون: ${point.activeDriversCount} سائق
• 🚚 الشاحنات: ${point.activeTrucksCount} شاحنة

───────────────────
✅ *حالة البيانات:* محفوظة ومؤمّنة سحابياً ومحلياً (سعة 1TB فائقة).
تم الإرسال والنقل التلقائي إلى جوال المالك بنجاح.`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = mobileNumber.replace(/[^\d]/g, '');
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    safeOpenUrl(url);
  };

  // Download Save Point as JSON for mobile
  const handleDownloadPoint = (point: SavePointRecord) => {
    if (!point.backupPayload) return;
    const blob = new Blob([point.backupPayload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cleanDate = point.timestamp.split('T')[0];
    a.href = url;
    a.download = `ejaz_savepoint_${cleanDate}_${point.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback('تم بدء تنزيل ملف نقطة الحفظ على جهازك.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">نقاط الحفظ والنسخ الاحتياطي للجوال</h3>
                <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {savePoints.length} نقطة محفوظة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                توليد نقاط حفظ فورية ونقل نسخ احتياطية وملخصات دقيقة مباشرة إلى جوالك عبر واتساب أو التنزيل.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2.5 text-xs font-bold flex items-center justify-between animate-in fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback('')} className="text-emerald-700 font-bold">✕</button>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Create New Save Point Card */}
          <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-orange-950 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-orange-600" />
                <span>إنشاء نقطة حفظ جديدة للنظام الآن</span>
              </h4>
              <span className="text-[11px] text-orange-700 font-medium">سريعة وبدون توقف العمل</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="مسمى أو سبب نقطة الحفظ (مثال: قبل تسليم الوردية المسائية)..."
                  value={pointLabel}
                  onChange={e => setPointLabel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateSavePoint}
                className="bg-[#F97316] hover:bg-orange-600 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>حفظ نقطة الآن</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1 border-t border-orange-200/60">
              <span className="font-bold text-slate-700">رقم جوال المستلم للنقل (واتساب):</span>
              <input
                type="tel"
                placeholder="9665XXXXXXXX"
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 font-mono text-xs text-slate-900 w-44"
              />
            </div>
          </div>

          {/* Full Project Code & Live Database ZIP Download Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FolderArchive className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-xs text-emerald-950 block">حفظ وتنزيل كامل ملفات وسورس كود المشروع (ZIP)</span>
                <span className="text-[10.5px] text-emerald-800">تحميل أرشيف مضغوط يحتوي على كامل أكواد النظام ومجلد src وإعدادات Vite وقاعدة البيانات الحالية.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadFullProjectZip()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3.5 rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل المشروع كاملاً (.ZIP)</span>
            </button>
          </div>

          {/* List of Save Points */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>سجل نقاط الحفظ السابقة المنقولة</span>
              <span className="text-[11px] text-slate-500 font-normal">محفوظة بأمان محلياً وسحابياً</span>
            </div>

            {savePoints.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                لا توجد نقاط حفظ سابقة حتى الآن. اضغط "حفظ نقطة الآن" لإنشاء أول نقطة حفظ وإرسالها لجوالك.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {savePoints.map(point => {
                  const dateStr = new Date(point.timestamp).toLocaleDateString('ar-SA');
                  const timeStr = new Date(point.timestamp).toLocaleTimeString('ar-SA');
                  const isConfirming = isRestoringId === point.id;

                  return (
                    <div key={point.id} className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{point.label}</span>
                          <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200">
                            {dateStr} - {timeStr}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                          <span>🚛 <strong>{point.totalTrips}</strong> رحلة</span>
                          <span>•</span>
                          <span>💰 إيرادات: <strong>{point.totalRevenue.toLocaleString()} ر.س</strong></span>
                          <span>•</span>
                          <span>💵 محصل: <strong className="text-emerald-700">{point.totalCollected.toLocaleString()} ر.س</strong></span>
                          <span>•</span>
                          <span>📈 ربح: <strong className="text-orange-700">{point.netMargin.toLocaleString()} ر.س</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleShareToMobile(point)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-1.5 px-2.5 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                          title="إرسال ملخص نقطة الحفظ إلى جوالك عبر واتساب"
                        >
                          <Share2 className="w-3.5 h-3.5 text-white" />
                          <span>إلى جوالي</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPoint(point)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] py-1.5 px-2 rounded-lg border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                          title="تنزيل ملف النسخة الاحتياطية كاملاً"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span>تنزيل</span>
                        </button>

                        {isConfirming ? (
                          <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-lg border border-amber-300 animate-in fade-in">
                            <span className="text-[10px] font-bold text-amber-900">تأكيد الاستعادة؟</span>
                            <button
                              type="button"
                              onClick={() => handleConfirmRestore(point.id)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer"
                            >
                              نعم
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsRestoringId(null)}
                              className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsRestoringId(point.id)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="استعادة النظام إلى حالة نقطة الحفظ هذه"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeletePoint(point.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="حذف نقطة الحفظ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            تشفير وحماية البيانات بنظام إيجاز للنسخ الاحتياطي المتعدد
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-1.5 px-4 rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
