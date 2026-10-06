import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Upload, 
  User, 
  CreditCard, 
  FileText, 
  Phone, 
  Truck, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  Image as ImageIcon,
  ExternalLink,
  Edit,
  Building2,
  AlertCircle
} from 'lucide-react';
import { Driver, CompanySettings, Truck as TruckTypeObj, User as UserType } from '../types';
import { printDriverOfficialCard, shareDriverViaWhatsApp, formatDriverCardMessage } from '../utils/driverActions';
import { StorageService } from '../services/storage';

interface DriverCardModalProps {
  driver: Driver;
  trucks?: TruckTypeObj[];
  settings?: CompanySettings;
  currentUser: UserType;
  onClose: () => void;
  onEditDriver?: (driver: Driver) => void;
  onRefresh?: () => void;
}

export const DriverCardModal: React.FC<DriverCardModalProps> = ({
  driver,
  trucks = [],
  settings,
  currentUser,
  onClose,
  onEditDriver,
  onRefresh,
}) => {
  const [activeView, setActiveView] = useState<'BADGE' | 'DOCS' | 'LETTER'>('BADGE');
  const [copied, setCopied] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<Driver>(driver);
  const [uploadingDoc, setUploadingDoc] = useState<'photo' | 'license' | 'id' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const matchedTruck = trucks.find(
    t => t.id === currentDriver.assignedTruckId || t.plateNumber === currentDriver.assignedPlateNumber
  );

  const handleCopyData = () => {
    const text = formatDriverCardMessage(currentDriver, settings, matchedTruck);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'license' | 'id') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 4 ميجابايت');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      const updated: Driver = { ...currentDriver };
      if (type === 'photo') updated.photoUrl = base64;
      if (type === 'license') updated.licensePhotoUrl = base64;
      if (type === 'id') updated.idPhotoUrl = base64;

      setCurrentDriver(updated);
      StorageService.saveDriver(updated, currentUser);
      if (onRefresh) onRefresh();
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (type: 'photo' | 'license' | 'id') => {
    const updated: Driver = { ...currentDriver };
    if (type === 'photo') updated.photoUrl = undefined;
    if (type === 'license') updated.licensePhotoUrl = undefined;
    if (type === 'id') updated.idPhotoUrl = undefined;

    setCurrentDriver(updated);
    StorageService.saveDriver(updated, currentUser);
    if (onRefresh) onRefresh();
  };

  const companyNameAr = settings?.nameAr || 'مؤسسة إيجاز للنقليات';
  const companyPhone = settings?.phone || '+966 50 123 4567';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
              🪪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">بطاقة وتفويض السائق الرسمي</h3>
                <span className="bg-orange-500/20 text-orange-400 text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-orange-500/30">
                  {currentDriver.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {companyNameAr} • وثيقة هوية وتفويض معتمدة للطباعة والمشاركة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-700 font-bold flex items-center justify-between shrink-0">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 font-black">✕</button>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="bg-slate-100 p-2 flex items-center gap-2 border-b border-slate-200 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveView('BADGE')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeView === 'BADGE'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <span>🪪</span>
            <span>بطاقة الهوية والاعتماد</span>
          </button>

          <button
            onClick={() => setActiveView('DOCS')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeView === 'DOCS'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-blue-600" />
            <span>الصور والوثائق المرفقة</span>
            {(currentDriver.photoUrl || currentDriver.licensePhotoUrl || currentDriver.idPhotoUrl) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveView('LETTER')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeView === 'LETTER'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>خطاب التفويض الرسمي (A4)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          
          {/* 1. BADGE VIEW (Official ID Card) */}
          {activeView === 'BADGE' && (
            <div className="space-y-4">
              {/* The Official ID Card Widget */}
              <div className="max-w-xl mx-auto bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden relative">
                {/* ID Card Top Header */}
                <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between border-b-4 border-[#F97316]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-orange-500 text-lg">
                      إ
                    </div>
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1.5">
                        <span className="text-orange-500">إيجـاز</span>
                        <span>للنقليات</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans tracking-wider block">
                        EJAZ TRANSPORT • DRIVER ID
                      </span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="font-mono text-xs bg-slate-800 text-orange-400 font-bold px-2.5 py-1 rounded-lg border border-slate-700 block">
                      {currentDriver.id}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold mt-0.5 block">
                      معتمد ونشط ✓
                    </span>
                  </div>
                </div>

                {/* ID Card Body */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
                  {/* Photo Column */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-32 h-40 rounded-2xl border-2 border-slate-200 bg-slate-100 overflow-hidden relative shadow-inner flex items-center justify-center group">
                      {currentDriver.photoUrl ? (
                        <img 
                          src={currentDriver.photoUrl} 
                          alt={currentDriver.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <User className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                          <span className="text-[10px] font-bold mt-1 text-slate-400">لا توجد صورة</span>
                        </div>
                      )}

                      {/* Photo Upload Trigger Overlay */}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold cursor-pointer transition p-2 text-center">
                        <Upload className="w-5 h-5 mb-1 text-orange-400" />
                        <span>تغيير / رفع صورة</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, 'photo')} 
                        />
                      </label>
                    </div>

                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      {currentDriver.nationality || 'سائق معتمد'}
                    </span>
                  </div>

                  {/* Details Column */}
                  <div className="sm:col-span-2 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">اسم السائق الثلاثي</span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        {currentDriver.name}
                      </h4>
                      <span className="text-xs text-orange-600 font-bold block mt-0.5">
                        {currentDriver.jobTitle || 'سائق نقل ثقيل وتريلات'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">الهوية / الإقامة</span>
                        <span className="font-bold text-slate-800 font-mono text-[11px]">{currentDriver.nationalId || '—'}</span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">رقم الجوال</span>
                        <span className="font-bold text-slate-800 font-mono text-[11px]">{currentDriver.phone || '—'}</span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">رقم الرخصة</span>
                        <span className="font-bold text-slate-800 font-mono text-[11px]">{currentDriver.licenseNumber || '—'}</span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">انتهاء الرخصة</span>
                        <span className="font-bold text-slate-800 font-mono text-[11px]">{currentDriver.licenseExpiry || '—'}</span>
                      </div>
                    </div>

                    {/* Linked Truck Banner */}
                    <div className="p-2.5 bg-orange-50/80 border border-orange-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-orange-600" />
                        <div>
                          <span className="text-[10px] text-orange-800 font-bold block">الشاحنة المخصصة:</span>
                          <span className="text-xs font-black text-slate-900 font-mono">
                            {currentDriver.assignedPlateNumber || matchedTruck?.plateNumber || 'مركبة معتمدة'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        تفويض ساري
                      </span>
                    </div>
                  </div>
                </div>

                {/* ID Card Footer with Official Stamp */}
                <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>معتمد رسمياً من عمليات إيجاز للنقليات</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      CR: {settings?.crNumber || '1010899234'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. DOCUMENTS & PHOTOS VIEW */}
          {activeView === 'DOCS' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <ImageIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-950 space-y-1">
                  <h4 className="font-bold">إدارة صور ومستندات السائق الرسمية</h4>
                  <p className="text-blue-800 text-[11px] leading-relaxed">
                    يمكنك هنا رفع أو تغيير الصورة الشخصية للسائق، وصورة رخصة القيادة، وصورة بطاقة الهوية الوطنية أو الإقامة. يتم حفظ الصور محلياً لتكون جاهزة للمشاركة والطباعة في أي وقت.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Driver Personal Photo */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-orange-500" />
                        <span>الصورة الشخصية</span>
                      </h4>
                      {currentDriver.photoUrl && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          مرفقة ✓
                        </span>
                      )}
                    </div>

                    <div className="w-full h-44 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative">
                      {currentDriver.photoUrl ? (
                        <img 
                          src={currentDriver.photoUrl} 
                          alt="صورة السائق" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400 space-y-1">
                          <User className="w-10 h-10 mx-auto stroke-[1.5]" />
                          <span className="text-[11px] block">لم يتم رفع صورة</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <label className="flex-1 py-2 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold text-center cursor-pointer transition flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{currentDriver.photoUrl ? 'تغيير الصورة' : 'رفع صورة'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'photo')} 
                      />
                    </label>

                    {currentDriver.photoUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('photo')}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                        title="حذف الصورة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Driver License Scan */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>صورة رخصة القيادة</span>
                      </h4>
                      {currentDriver.licensePhotoUrl && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          مرفقة ✓
                        </span>
                      )}
                    </div>

                    <div className="w-full h-44 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative">
                      {currentDriver.licensePhotoUrl ? (
                        <img 
                          src={currentDriver.licensePhotoUrl} 
                          alt="صورة الرخصة" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400 space-y-1">
                          <FileText className="w-10 h-10 mx-auto stroke-[1.5]" />
                          <span className="text-[11px] block">لم يتم رفع صورة الرخصة</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <label className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold text-center cursor-pointer transition flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{currentDriver.licensePhotoUrl ? 'تغيير صورة الرخصة' : 'رفع صورة الرخصة'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'license')} 
                      />
                    </label>

                    {currentDriver.licensePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('license')}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                        title="حذف الصورة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. National ID / Iqama Scan */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <span>صورة الهوية / الإقامة</span>
                      </h4>
                      {currentDriver.idPhotoUrl && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          مرفقة ✓
                        </span>
                      )}
                    </div>

                    <div className="w-full h-44 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative">
                      {currentDriver.idPhotoUrl ? (
                        <img 
                          src={currentDriver.idPhotoUrl} 
                          alt="صورة الهوية" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400 space-y-1">
                          <CreditCard className="w-10 h-10 mx-auto stroke-[1.5]" />
                          <span className="text-[11px] block">لم يتم رفع صورة الهوية</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <label className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold text-center cursor-pointer transition flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{currentDriver.idPhotoUrl ? 'تغيير صورة الهوية' : 'رفع صورة الهوية'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'id')} 
                      />
                    </label>

                    {currentDriver.idPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('id')}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                        title="حذف الصورة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. OFFICIAL LETTERHEAD VIEW (A4 Document Preview) */}
          {activeView === 'LETTER' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl mx-auto text-slate-900">
                {/* Letter Header */}
                <div className="flex justify-between items-center border-b-2 border-[#F97316] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#0F172A] text-orange-500 rounded-xl flex items-center justify-center font-black text-xl border border-orange-500">
                      إ
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900">
                        <span className="text-orange-500">إيجـاز </span>
                        <span>للنقليات</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 font-sans">EJAZ TRANSPORT EST.</p>
                    </div>
                  </div>

                  <div className="text-left text-[11px] text-slate-600">
                    <div><strong>السجل التجاري:</strong> {settings?.crNumber || '1010899234'}</div>
                    <div><strong>الرقم الضريبي:</strong> {settings?.taxNumber || '300984729100003'}</div>
                    <div><strong>الهاتف:</strong> {companyPhone}</div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center">
                  <span className="inline-block bg-[#0F172A] text-white text-xs font-black px-6 py-1.5 rounded-full border border-orange-500">
                    شهادة تفويض وبطاقة سائق معتمدة
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">تاريخ الإصدار: {new Date().toISOString().split('T')[0]}</p>
                </div>

                {/* Letter Body & Driver Info */}
                <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                  <p className="font-bold text-slate-900">
                    إلى: السادة / مسؤولي نقاط التفتيش ومواقع التحميل والتنزيل والجهات المختصة المحترمين
                  </p>
                  <p>
                    تحية طيبة وبعد ،،،
                  </p>
                  <p>
                    تشهد إدارة <strong>{companyNameAr}</strong> بأن السائق الموضحة بياناته أدناه يعمل لدينا بمهنة سائق نقل ثقيل ومرخص له نظاماً بقيادة الشاحنة التابعة لأسطولنا لنقل البضائع والمهمات الموكلة إليه:
                  </p>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                    <div><strong>اسم السائق:</strong> {currentDriver.name}</div>
                    <div><strong>رقم الهوية / الإقامة:</strong> {currentDriver.nationalId || '—'}</div>
                    <div><strong>الجنسية:</strong> {currentDriver.nationality || 'غير محدد'}</div>
                    <div><strong>رقم الجوال:</strong> {currentDriver.phone || '—'}</div>
                    <div><strong>رقم الرخصة:</strong> {currentDriver.licenseNumber || '—'}</div>
                    <div><strong>انتهاء الرخصة:</strong> {currentDriver.licenseExpiry || '—'}</div>
                    <div className="col-span-2 text-orange-700">
                      <strong>الشاحنة واللوحة المخصصة:</strong> {currentDriver.assignedPlateNumber || matchedTruck?.plateNumber || 'شاحنة معتمدة'}
                    </div>
                  </div>

                  <p>
                    يرجى التكرم بتقديم كافة التسهيلات النظامية اللازمة لتيسير مهمته في نقل البضائع والشحنات الموكلة إليه.
                  </p>
                </div>

                {/* Signatures & Stamp */}
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 text-center text-xs">
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 block">توقيع السائق</span>
                    <div className="h-10 flex items-center justify-center text-slate-400 font-script">
                      {currentDriver.name}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 block">إدارة العمليات والأسطول</span>
                    <div className="inline-block border-2 border-red-600 rounded-full px-4 py-1 text-red-600 font-bold text-[10px] rotate-[-5deg]">
                      معتمد - إيجاز للنقليات ✓
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="bg-white p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onEditDriver && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditDriver(currentDriver);
                }}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5 text-slate-600" />
                <span>تعديل البيانات</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyData}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ البيانات'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shareDriverViaWhatsApp(currentDriver, undefined, settings, matchedTruck)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة عبر واتساب</span>
            </button>

            <button
              type="button"
              onClick={() => printDriverOfficialCard(currentDriver, settings, matchedTruck, activeView === 'LETTER' ? 'OFFICIAL_LETTER' : 'BADGE_CARD')}
              className="px-5 py-2.5 bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند الرسمي</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
