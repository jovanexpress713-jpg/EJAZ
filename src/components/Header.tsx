/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import React, { useState } from 'react';
import { 
  Bell, 
  Settings, 
  LogOut, 
  Truck, 
  Users, 
  UserCheck, 
  Wrench, 
  CreditCard, 
  FileText, 
  LayoutDashboard, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X, 
  HardDrive,
  ShieldCheck,
  Smartphone,
  Building2,
  Sun,
  Moon,
  Key,
  Database
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

  const handleTabChange = (tabId: string) => {
    const target = tabId.toUpperCase();
    if (onNavigate) {
      onNavigate(target);
    } else if (setActiveTab) {
      setActiveTab(target);
    }
  };

  const handleQuickAddTrip = () => {
    if (onOpenQuickTripModal) {
      onOpenQuickTripModal();
    } else {
      handleTabChange('TRIPS');
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
    SUPER_ADMIN: '👑 المالك / مدير النظام',
    COMPANY_MANAGER: '🏢 مدير الشركة',
    OPERATIONS: '🚛 مدير العمليات',
    ACCOUNTANT: '💰 المحاسب المالي',
    CASHIER: '🏦 أمين الصندوق',
    AUDITOR: '📋 المراجع والمدقق',
    VIEWER: '👁️ مستخدم متابعة',
  }[currentUser.role] || currentUser.role;

  const currentTabUpper = (activeTab || '').toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-slate-800 shadow-md select-none no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3 relative">
        {/* Right: Company Logo */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => handleTabChange('DASHBOARD')}
            className="cursor-pointer hover:opacity-90 transition flex items-center gap-2 bg-transparent border-0 p-0 text-right"
          >
            <EjazLogo size="sm" variant="white" />
          </button>
        </div>

        {/* Center: Quick Add Button for Operations & Admins */}
        <div className="hidden md:flex items-center gap-2">
          {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'COMPANY_MANAGER' || currentUser.role === 'OPERATIONS') && (
            <button
              id="header-quick-add-trip-btn"
              type="button"
              onClick={handleQuickAddTrip}
              className="bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white text-xs font-bold py-2 px-3.5 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة رحلة جديدة</span>
            </button>
          )}

          {/* Admin Monitor Shortcut Button */}
          {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'COMPANY_MANAGER' || currentUser.role === 'AUDITOR') && (
            <button
              type="button"
              onClick={() => handleTabChange('ADMIN_MONITOR')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                currentTabUpper === 'ADMIN_MONITOR'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-blue-300 border border-blue-500/30'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>رقابة المدير والمزامنة</span>
            </button>
          )}
        </div>

        {/* Left: Theme, Shortcuts, Notifications, Profile, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Dark / Light Mode Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 transition cursor-pointer"
              title={theme === 'dark' ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />}
            </button>
          )}


          {/* Save Points to Mobile Shortcut */}
          {onOpenSavePoints && (
            <button
              id="header-save-points-btn"
              type="button"
              onClick={onOpenSavePoints}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              title="نقاط الحفظ والنسخ الاحتياطي للجوال (QR + واتساب)"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>نقاط الحفظ للجوال</span>
            </button>
          )}

          {/* Daily Handover to Owner Shortcut */}
          {onOpenDailyHandover && (
            <button
              id="header-daily-handover-btn"
              type="button"
              onClick={onOpenDailyHandover}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              title="محضر التسليم والترحيل النهاري للمالك"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>التسليم النهاري</span>
            </button>
          )}

          {/* Online / Offline Status & Install PWA */}
          <NetworkStatusIndicator />

          {/* Notifications Bell */}
          <div className="relative">
            <button
              id="header-notifications-btn"
              type="button"
              onClick={toggleNotifications}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
              title="مركز الإشعارات والتنبيهات"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Modal */}
            {showNotificationsDropdown && (
              <div 
                id="notifications-dropdown-menu"
                className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                dir="rtl"
              >
                <div className="p-3.5 bg-[#0F172A] text-white flex items-center justify-between">
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
                      لا توجد إشعارات أو تنبيهات حالية.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 text-xs transition flex items-start gap-2.5 ${
                          notif.read ? 'bg-white dark:bg-slate-900 opacity-80' : 'bg-orange-50/70 dark:bg-orange-950/40 font-semibold'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'warning' || notif.type === 'danger' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : notif.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Info className="w-4 h-4 text-blue-600" />
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

          {/* Change Password Shortcut */}
          {onOpenChangePassword && (
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="تغيير كلمة المرور وتأمين الحساب"
            >
              <Key className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </button>
          )}

          {/* Settings Shortcut */}
          <button
            id="header-settings-btn"
            type="button"
            onClick={() => handleTabChange('SETTINGS')}
            className={`p-2 rounded-lg transition cursor-pointer ${
              currentTabUpper === 'SETTINGS' 
                ? 'bg-orange-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="الإعدادات وسجل العمليات والمستخدمين"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* About System & Developer Rights Shortcut */}
          {onOpenAbout && (
            <button
              id="header-about-system-btn"
              type="button"
              onClick={onOpenAbout}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="معلومات النظام وحقوق البرمجة (فكتوريا لاين سوفت)"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            </button>
          )}

          {/* User Info Capsule */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {currentUser.fullName ? currentUser.fullName.split(' ')[0] : currentUser.username}
              </span>
              <span className="text-[10px] text-orange-400 font-medium">
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            id="header-logout-btn"
            type="button"
            onClick={onLogout}
            className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/50 transition cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
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
  const isOps = currentUser?.role === 'OPERATIONS';
  const isAccountant = currentUser?.role === 'ACCOUNTANT';
  const isCashier = currentUser?.role === 'CASHIER';

  const tabs = [
    { id: 'DASHBOARD', label: 'لوحة التحكم', icon: LayoutDashboard },
    ...(isSuperAdmin || isCompanyManager || isAuditor ? [
      { id: 'ADMIN_MONITOR', label: 'لوحة متابعة المدير والمزامنة', icon: ShieldCheck }
    ] : []),
    { id: 'TRIPS', label: 'الرحلات', icon: Truck },
    { id: 'CUSTOMERS', label: 'العملاء', icon: Users },
    { id: 'DRIVERS', label: 'السائقون', icon: UserCheck },
    { id: 'DRIVER_TRACKING', label: 'تتبع السائقين (قيم مجمّدة)', icon: ShieldCheck },
    { id: 'TRUCKS', label: 'الشاحنات', icon: Truck },
    { id: 'MAINTENANCE', label: 'الصيانة', icon: Wrench },
    { id: 'FINANCIAL', label: 'المالية والتحصيل', icon: CreditCard },
    { id: 'REPORTS', label: 'التقارير', icon: FileText },
    { id: 'SETTINGS', label: 'الإعدادات والمستخدمين', icon: Settings },
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

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-16 z-20 overflow-x-auto no-scrollbar no-print">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center justify-start sm:justify-center gap-1 sm:gap-2 py-1.5 min-w-max">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTabUpper === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id.toLowerCase()}`}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#0F172A] dark:bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#F97316]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
