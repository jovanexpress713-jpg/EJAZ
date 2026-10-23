/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Settings, 
  LogOut, 
  Truck, 
  Users, 
  UserCheck, 
  Wrench, 
  FileText, 
  Home, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Key, 
  ChevronDown,
  MapPin,
  TrendingUp,
  BadgeDollarSign,
  User as UserIcon,
  Crown,
  Smartphone,
  Building2
} from 'lucide-react';
import { EjazLogo } from './EjazLogo';
import { User, AppNotification } from '../types';
import { NetworkStatusIndicator } from './NetworkStatusIndicator';

export interface HeaderProps {
  currentUser: User;
  activeTab?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  setActiveTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  notifications?: AppNotification[];
  onOpenNotifications?: () => void;
  onOpenQuickTripModal?: () => void;
  onMarkNotificationsRead?: () => void;
  onOpenAbout?: () => void;
  onOpenSavePoints?: () => void;
  onOpenDailyHandover?: () => void;
  onOpenChangePassword?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab = 'DASHBOARD',
  theme = 'light',
  onToggleTheme,
  setActiveTab,
  onNavigate,
  notifications = [],
  onOpenNotifications,
  onOpenQuickTripModal,
  onMarkNotificationsRead,
  onOpenAbout,
  onOpenSavePoints,
  onOpenDailyHandover,
  onOpenChangePassword,
  onLogout,
}) => {
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsDropdown(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleTabChange = (tabId: string) => {
    const target = tabId.toUpperCase();
    if (onNavigate) {
      onNavigate(target);
    } else if (setActiveTab) {
      setActiveTab(target);
    }
  };

  const toggleNotifications = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
    }
    setShowNotificationsDropdown(prev => !prev);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const roleLabel = {
    SUPER_ADMIN: 'مدير النظام',
    COMPANY_MANAGER: 'مدير الشركة',
    OPERATIONS: 'مدير العمليات',
    ACCOUNTANT: 'المحاسب المالي',
    CASHIER: 'أمين الصندوق',
    AUDITOR: 'المراجع والمدقق',
    VIEWER: 'مستخدم متابعة',
  }[currentUser.role] || currentUser.role;

  const displayName = currentUser.role === 'SUPER_ADMIN' 
    ? 'المالك' 
    : (currentUser.fullName ? currentUser.fullName.split(' ')[0] : currentUser.username);

  const currentTabUpper = (activeTab || '').toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#070E1E] text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800/80 shadow-md select-none no-print transition-colors duration-200">
      {/* Target Selector 1: header > div container */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4 relative" dir="rtl">
        
        {/* RIGHT GROUP: 1. الشعار, 2. زر الوضع الليلي/النهاري, 3. زر الإشعارات */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* 1. شعار إيجاز للنقليات EJAZ TRANSPORT */}
          <button 
            type="button"
            onClick={() => handleTabChange('DASHBOARD')}
            className="cursor-pointer hover:opacity-95 transition flex items-center gap-2 bg-transparent border-0 p-0 text-right shrink-0"
            title="الانتقال إلى لوحة التحكم الرئيسية"
          >
            <EjazLogo size="sm" variant={theme === 'dark' ? 'white' : 'dark'} />
          </button>

          {/* Vertical Separator */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

          {/* 2. زر التبديل بين الوضع الليلي والنهاري */}
          {onToggleTheme && (
            <button
              id="header-theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              className={`relative h-8 w-15 sm:w-16 rounded-full p-1 flex items-center justify-between border transition-all duration-300 cursor-pointer select-none shrink-0 ${
                theme === 'dark'
                  ? 'bg-[#0B1528] border-cyan-500/40 shadow-inner'
                  : 'bg-slate-100 border-slate-300 shadow-inner'
              }`}
              title={theme === 'dark' ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
              aria-label="تبديل الوضع الليلي والنهاري"
            >
              {/* Moon Icon (Left inside RTL) */}
              <Moon className={`w-3.5 h-3.5 transition-colors z-10 ${theme === 'dark' ? 'text-cyan-300' : 'text-slate-400'}`} />

              {/* Sun Icon (Right inside RTL) */}
              <Sun className={`w-3.5 h-3.5 transition-colors z-10 ${theme === 'dark' ? 'text-amber-400/50' : 'text-amber-500 font-bold'}`} />

              {/* Sliding Pill Indicator */}
              <div
                className={`absolute top-0.5 bottom-0.5 w-6 rounded-full transition-all duration-300 flex items-center justify-center shadow-md ${
                  theme === 'dark'
                    ? 'right-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400/40'
                    : 'left-0.5 bg-white border border-amber-300 text-amber-500'
                }`}
              />
            </button>
          )}

          {/* 3. زر الإشعارات والتنبيهات مع شارة العدد عند وجود إشعارات غير مقروءة */}
          <div className="relative shrink-0" ref={notificationsRef}>
            <button
              id="header-notifications-btn"
              type="button"
              onClick={toggleNotifications}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-slate-700/60"
              title="مركز الإشعارات والتنبيهات"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Modal */}
            {showNotificationsDropdown && (
              <div 
                id="notifications-dropdown-menu"
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                dir="rtl"
              >
                <div className="p-3.5 bg-[#070E1E] text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-xs sm:text-sm">مركز التنبيهات ({notifications.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onMarkNotificationsRead && unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkNotificationsRead}
                        className="text-[11px] text-orange-300 hover:text-white underline cursor-pointer"
                      >
                        تحديد الكل كمقروء
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotificationsDropdown(false)}
                      className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      لا توجد إشعارات أو تنبيهات غير مقروءة حالياً.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 text-xs transition flex items-start gap-2.5 ${
                          notif.read ? 'bg-white dark:bg-slate-900 opacity-80' : 'bg-orange-50/80 dark:bg-orange-950/40 font-semibold'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'warning' || notif.type === 'danger' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ) : notif.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Info className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="text-slate-900 dark:text-white font-bold">{notif.title}</div>
                          <div className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">{notif.message}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">{notif.date}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LEFT GROUP: حساب المالك أو مدير النظام (يضم الخادم والصلاحيات والإعدادات وتسجيل الخروج) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* حساب المالك أو مدير النظام مع القائمة المنبثقة المتكاملة */}
          <div className="relative shrink-0" ref={accountMenuRef}>
            <button
              id="header-user-account-btn"
              type="button"
              onClick={() => setShowAccountMenu(prev => !prev)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition cursor-pointer text-right select-none shadow-xs"
              title="قائمة مدير النظام وإدارة العمليات والصلاحيات والحساب"
            >
              {/* Circular Avatar with Glossy Ring and Crown */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-sky-600 via-blue-700 to-indigo-900 border-2 border-white/80 dark:border-white/40 flex items-center justify-center text-white shadow-md">
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'COMPANY_MANAGER') && (
                  <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-xs border border-white">
                    <Crown className="w-2.5 h-2.5 fill-current text-slate-950" />
                  </div>
                )}
              </div>

              {/* Text: Name and Role */}
              <div className="flex flex-col text-right leading-tight">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold truncate max-w-[110px]">
                  {roleLabel}
                </span>
              </div>

              {/* Chevron Down */}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Account Context Menu Dropdown - تضم الخادم المركزي والصلاحيات والإعدادات وتسجيل الخروج */}
            {showAccountMenu && (
              <div 
                className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                dir="rtl"
              >
                {/* Profile Capsule Header */}
                <div className="p-3.5 bg-slate-900 dark:bg-[#070E1E] text-white border-b border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{currentUser.fullName || currentUser.username}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full font-bold">
                      {roleLabel}
                    </span>
                  </div>
                  {currentUser.phone && (
                    <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                      {currentUser.phone}
                    </div>
                  )}
                </div>

                {/* Section: الخادم المركزي وقاعدة البيانات داخل مدير النظام */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                  <NetworkStatusIndicator inMenu={true} />
                </div>

                {/* Operations & System Navigation inside Account Menu */}
                <div className="p-2 space-y-1 text-xs">
                  
                  {/* زر الصلاحيات */}
                  <button
                    id="header-permissions-btn"
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(false);
                      handleTabChange('ADMIN_MONITOR');
                    }}
                    className={`w-full text-right px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer font-medium ${
                      currentTabUpper === 'ADMIN_MONITOR'
                        ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>الصلاحيات والرقابة والمزامنة</span>
                    </div>
                    <span className="text-[10px] text-slate-400">إدارة الأدوار</span>
                  </button>

                  {/* زر الإعدادات */}
                  <button
                    id="header-settings-btn"
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(false);
                      handleTabChange('SETTINGS');
                    }}
                    className={`w-full text-right px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer font-medium ${
                      currentTabUpper === 'SETTINGS'
                        ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>إعدادات النظام وبيانات المؤسسة</span>
                    </div>
                    <span className="text-[10px] text-slate-400">التهيئة والنسخ</span>
                  </button>

                  {/* تغيير كلمة المرور */}
                  {onOpenChangePassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        onOpenChangePassword();
                      }}
                      className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
                    >
                      <Key className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>تغيير كلمة المرور الشخصية</span>
                    </button>
                  )}

                  {/* نقاط الحفظ للجوال */}
                  {onOpenSavePoints && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        onOpenSavePoints();
                      }}
                      className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>نقاط الحفظ والنسخ للجوال</span>
                    </button>
                  )}

                  {/* محضر التسليم النهاري */}
                  {onOpenDailyHandover && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        onOpenDailyHandover();
                      }}
                      className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
                    >
                      <Building2 className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>محضر التسليم والترحيل النهاري</span>
                    </button>
                  )}

                  {/* حول النظام والترخيص */}
                  {onOpenAbout && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        onOpenAbout();
                      }}
                      className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
                    >
                      <Info className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>حول النظام والترخيص البرمجي</span>
                    </button>
                  )}
                </div>

                {/* زر تسجيل الخروج داخل مدير النظام */}
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <button
                    id="header-logout-btn"
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(false);
                      onLogout();
                    }}
                    className="w-full text-right px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition flex items-center justify-between cursor-pointer font-bold text-xs"
                    title="تسجيل الخروج من النظام"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                      <span>تسجيل الخروج من الحساب</span>
                    </div>
                    <span className="text-[10px] text-rose-500/80 font-mono">خروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export interface NavigationTabsProps {
  activeTab: string;
  onSelectTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  currentUser?: User;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ 
  activeTab, 
  onSelectTab, 
  setActiveTab,
  currentUser
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyManager = currentUser?.role === 'COMPANY_MANAGER';
  const isAuditor = currentUser?.role === 'AUDITOR';

  // Strict order matching the client's mandatory visual layout:
  // 1. الرئيسية | 2. الرحلات | 3. العملاء | 4. المصروفات | 5. الإيرادات | 6. التقارير | 7. المواقع
  // Followed by the remaining operational modules:
  // 8. السائقون | 9. الشاحنات | 10. الصيانة | 11. الرقابة (للأدوار المصرحة)
  const tabs = [
    { id: 'DASHBOARD', label: 'الرئيسية', icon: Home },
    { id: 'TRIPS', label: 'الرحلات', icon: Truck },
    { id: 'CUSTOMERS', label: 'العملاء', icon: Users },
    { id: 'EXPENSES', label: 'المصروفات', icon: BadgeDollarSign },
    { id: 'COLLECTIONS', label: 'الإيرادات', icon: TrendingUp },
    { id: 'REPORTS', label: 'التقارير', icon: FileText },
    { id: 'LOCATIONS', label: 'المواقع', icon: MapPin },
    { id: 'DRIVERS', label: 'السائقون', icon: UserCheck },
    { id: 'TRUCKS', label: 'الشاحنات', icon: Truck },
    { id: 'MAINTENANCE', label: 'الصيانة', icon: Wrench },
    ...(isSuperAdmin || isCompanyManager || isAuditor ? [
      { id: 'ADMIN_MONITOR', label: 'الرقابة', icon: ShieldCheck }
    ] : []),
  ];

  const handleTabClick = (tabId: string) => {
    const target = tabId.toUpperCase();
    if (onSelectTab) {
      onSelectTab(target);
    } else if (setActiveTab) {
      setActiveTab(target);
    }
  };

  const currentTabUpper = (activeTab || '').toUpperCase();

  const isCurrentActive = (tabId: string) => {
    if (tabId === 'LOCATIONS') {
      return currentTabUpper === 'LOCATIONS' || currentTabUpper === 'DRIVER_TRACKING';
    }
    if (tabId === 'COLLECTIONS') {
      return currentTabUpper === 'COLLECTIONS' || currentTabUpper === 'FINANCIAL';
    }
    return currentTabUpper === tabId;
  };

  return (
    // Target Selector 2: nav
    <nav className="bg-white dark:bg-[#091122] border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-16 sm:top-18 z-20 overflow-x-auto no-scrollbar no-print transition-colors duration-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-start lg:justify-center gap-0.5 py-1.5 min-w-max">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = isCurrentActive(tab.id);
          return (
            <React.Fragment key={tab.id}>
              {/* Tab Button with Icon on Top & Label below */}
              <button
                id={`nav-tab-${tab.id.toLowerCase()}`}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`group flex flex-col items-center justify-center min-w-[72px] sm:min-w-[84px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer select-none relative ${
                  isActive
                    ? 'bg-orange-50/90 dark:bg-[#0F1E38] text-orange-600 dark:text-white shadow-xs ring-1 ring-[#F97316]/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                  isActive ? 'text-[#F97316]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`} />
                <span className={`mt-0.5 text-[11px] sm:text-xs tracking-tight ${
                  isActive ? 'text-[#F97316] font-extrabold' : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.label}
                </span>

                {/* Active Indicator Underline Bar */}
                {isActive && (
                  <span className="absolute -bottom-1 left-3 right-3 h-0.5 bg-[#F97316] rounded-full shadow-[0_0_8px_#F97316]" />
                )}
              </button>

              {/* Elegant vertical separator divider between items */}
              {idx < tabs.length - 1 && (
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800/80 my-auto shrink-0 mx-0.5" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
