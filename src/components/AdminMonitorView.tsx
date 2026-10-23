/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Smartphone, 
  Database, 
  FileCheck, 
  ArrowUpDown, 
  Check, 
  X, 
  Eye, 
  Send, 
  FileText,
  Lock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { 
  User, 
  Trip, 
  CollectionRecord, 
  ExpenseRecord, 
  AuditLog, 
  SyncOutboxItem, 
  SyncDevice, 
  CompanySettings 
} from '../types';
import { StorageService } from '../services/storage';
import { SyncEngine } from '../services/syncEngine';
import { exportToExcel } from '../utils/excelExporter';

interface AdminMonitorViewProps {
  currentUser: User;
  trips: Trip[];
  collections: CollectionRecord[];
  expenses: ExpenseRecord[];
  auditLogs: AuditLog[];
  settings: CompanySettings;
  onRefreshData: () => void;
  onNavigateToTrip?: (trip: Trip) => void;
}

export const AdminMonitorView: React.FC<AdminMonitorViewProps> = ({
  currentUser,
  trips,
  collections,
  expenses,
  auditLogs,
  settings,
  onRefreshData,
  onNavigateToTrip,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'TIMELINE' | 'PENDING' | 'SYNC' | 'AUDIT'>('TIMELINE');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [importBundleText, setImportBundleText] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Available users for filtering
  const allUsers = useMemo(() => StorageService.getUsers(), []);
  const outboxItems = useMemo(() => SyncEngine.getOutbox(), [auditLogs]);
  const connectedDevices = useMemo(() => SyncEngine.getDevices(), [auditLogs]);

  // Operations needing approval
  const pendingTrips = useMemo(() => trips.filter(t => t.needsApproval), [trips]);
  const pendingCollections = useMemo(() => collections.filter(c => c.needsApproval), [collections]);
  const pendingExpenses = useMemo(() => expenses.filter(e => e.needsApproval), [expenses]);
  const totalPendingCount = pendingTrips.length + pendingCollections.length + pendingExpenses.length;

  // Filtered Audit Logs (Employee Timeline)
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Employee filter
      if (employeeFilter !== 'ALL' && log.userId !== employeeFilter && log.userName !== employeeFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'TRIP' && !log.entityType.toLowerCase().includes('trip')) return false;
        if (typeFilter === 'FINANCIAL' && !['collection', 'expense', 'financial'].includes(log.entityType.toLowerCase())) return false;
        if (typeFilter === 'USERS' && !log.entityType.toLowerCase().includes('user')) return false;
      }
      // Date filter
      if (dateFilter && !log.timestamp.startsWith(dateFilter)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchUser = log.userName.toLowerCase().includes(q);
        const matchEntity = log.entityId.toLowerCase().includes(q);
        if (!matchDetails && !matchUser && !matchEntity) return false;
      }
      return true;
    });
  }, [auditLogs, employeeFilter, typeFilter, dateFilter, searchQuery]);

  // Handle Approvals
  const handleApproveTrip = (tripId: string) => {
    StorageService.approveTrip(tripId, currentUser);
    onRefreshData();
  };

  const handleApproveFinancial = (type: 'COLLECTION' | 'EXPENSE', id: string) => {
    StorageService.approveFinancial(type, id, currentUser);
    onRefreshData();
  };

  // Trigger manual sync with Central Server
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback({ message: 'جاري الاتصال بالقاعدة المركزية ومزامنة العمليات...', type: 'info' });

    try {
      const syncResult = await SyncEngine.syncWithServer(currentUser);
      setIsSyncing(false);

      if (syncResult.success) {
        setSyncFeedback({ 
          message: `تمت المزامنة بنجاح! تم إرسال ${syncResult.pushedCount} عملية واستقبال التحديثات من الخادم المركزي.`, 
          type: 'success' 
        });
        onRefreshData();
      } else {
        setSyncFeedback({ 
          message: syncResult.error || 'تعذر الاتصال بالخادم المركزي، التطبيق يعمل في وضع أوفلاين والبيانات محفوظة.', 
          type: 'error' 
        });
      }
    } catch (err: any) {
      setIsSyncing(false);
      setSyncFeedback({ 
        message: `تعذر إتمام المزامنة: ${err?.message || 'خطأ غير متوقع'}`, 
        type: 'error' 
      });
    }
  };

  // Export encrypted bundle for physical/offline handover
  const handleDownloadSyncBundle = () => {
    const bundleStr = SyncEngine.exportSignedSyncBundle(currentUser);
    const blob = new Blob([bundleStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Victoria_ERP_SyncBundle_${new Date().toISOString().slice(0, 10)}.ejaz`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import external sync bundle from an employee
  const handleProcessImportBundle = () => {
    if (!importBundleText.trim()) return;
    const result = SyncEngine.parseSignedSyncBundle(importBundleText);
    if (!result.success || !result.bundle) {
      alert(result.error || 'ملف الحزمة غير صالح.');
      return;
    }

    const { items, sourceDeviceName, exportedBy } = result.bundle;
    let addedCount = 0;
    
    // Process items without destructive overwrite
    items.forEach((item: SyncOutboxItem) => {
      SyncEngine.enqueueOperation(item.entityType, item.entityId, item.action, item.payload, {
        id: item.authorId,
        username: item.authorName,
        fullName: item.authorName,
        role: 'OPERATIONS',
        phone: '',
        active: true,
      });
      addedCount++;
    });

    setShowImportModal(false);
    setImportBundleText('');
    alert(`تم بنجاح استيراد ${addedCount} عملية مرحّلة من جهاز "${sourceDeviceName}" التابع للموظف (${exportedBy}).`);
    onRefreshData();
  };

  // Export audit logs to Excel
  const handleExportAuditExcel = () => {
    const dataToExport = filteredLogs.map((log, idx) => ({
      '#': idx + 1,
      'التاريخ والوقت': log.timestamp,
      'الموظف': log.userName,
      'الدور الوظيفي': log.userRole,
      'نوع العملية': log.action,
      'السجل': log.entityType,
      'المعرف': log.entityId,
      'التفاصيل والبيان': log.details,
    }));
    exportToExcel(dataToExport, `سجل_تدقيق_أعمال_الموظفين_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Page Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                لوحة متابعة مدير النظام ورقابة الأعمال
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                نظام تدقيق ومتابعة أعمال الموظفين اللوجستية والمالية وإدارة المزامنة بين الأجهزة
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة أجهزة الشركة'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>استيراد حزمة موظف</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSyncBundle}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>تصدير حزمة المزامنة</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div 
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            syncFeedback.type === 'success' 
              ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800' 
              : syncFeedback.type === 'error'
              ? 'bg-red-950/60 text-red-200 border-red-800'
              : 'bg-blue-950/60 text-blue-200 border-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : syncFeedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSyncFeedback(null)} 
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Operations */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سجل العمليات</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {auditLogs.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">عملية مدققة ومسجلة</p>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">بانتظار الاعتماد</span>
            <div className={`p-2 rounded-lg ${totalPendingCount > 0 ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {totalPendingCount}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">عمليات مالية أو تشغيلية معلقة</p>
        </div>

        {/* Outbox Pending Sync */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">طابور المزامنة</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {outboxItems.filter(i => i.status === 'PENDING').length}
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">سجلات جاهزة للترحيل الآمن</p>
        </div>

        {/* Connected Devices */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أجهزة المؤسسة</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {Math.max(connectedDevices.length, 1)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">أجهزة مصرح لها بالاتصال</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('TIMELINE')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'TIMELINE'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل نشاط الموظفين اليومي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('PENDING')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'PENDING'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>العمليات المعلقة للاعتماد ({totalPendingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('SYNC')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'SYNC'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>مراقبة المزامنة والأجهزة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('AUDIT')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'AUDIT'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>سجل التدقيق الأمني المحمي</span>
        </button>
      </div>

      {/* SubTab 1: Employees Timeline */}
      {activeSubTab === 'TIMELINE' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Employee selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={employeeFilter}
                  onChange={e => setEmployeeFilter(e.target.value)}
                  className="bg-transparent border-0 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">جميع الموظفين</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-transparent border-0 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">جميع أنواع العمليات</option>
                  <option value="TRIP">رحلات وتشغيل</option>
                  <option value="FINANCIAL">مالية وسندات ومصروفات</option>
                  <option value="USERS">إدارة مستخدمين</option>
                </select>
              </div>

              {/* Date Filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />

              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-xs text-orange-600 hover:underline cursor-pointer"
                >
                  مسح التاريخ
                </button>
              )}
            </div>

            {/* Search Input & Excel */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="بحث في التفاصيل أو المعرف..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 pl-8 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <button
                type="button"
                onClick={handleExportAuditExcel}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                title="تصدير السجل إلى Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Timeline Feed Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <tr>
                    <th className="p-3">الوقت والتاريخ</th>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3">الدور</th>
                    <th className="p-3">نوع العملية</th>
                    <th className="p-3">السجل المستهدف</th>
                    <th className="p-3">تفاصيل التعديل أو العملية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        لا توجد سجلات تطابق الفلترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.slice(0, 100).map(log => {
                      const isCreate = log.action.includes('CREATE');
                      const isDelete = log.action.includes('DELETE');
                      const isApprove = log.action.includes('APPROVE');
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition">
                          <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {log.userName}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {log.userRole}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span 
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isApprove
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                  : isCreate
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : isDelete
                                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {log.entityType} ({log.entityId})
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredLogs.length > 100 && (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                يتم عرض أحدث 100 عملية من أصل {filteredLogs.length}. استخدم الفلترة أو التصدير للاطلاع على الأقدم.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Pending Approvals */}
      {activeSubTab === 'PENDING' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                العمليات التالية أنشأها الموظفون وتحتاج إلى اعتماد المدير المالي أو مدير النظام لتأكيد الترحيل النهائي وتجميد القيود.
              </span>
            </div>
            <span className="font-bold">{totalPendingCount} عملية معلقة</span>
          </div>

          {/* Pending Trips */}
          {pendingTrips.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>رحلات بانتظار الاعتماد ({pendingTrips.length})</span>
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {pendingTrips.map(trip => (
                  <div key={trip.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        رحلة رقم: {trip.tripNumber} — العميل: {trip.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        المبلغ: {trip.totalAmount} {settings.currency} | السائق: {trip.driverName} | أنشأها: {trip.createdByName || 'موظف العمليات'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onNavigateToTrip && (
                        <button
                          type="button"
                          onClick={() => onNavigateToTrip(trip)}
                          className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition cursor-pointer"
                        >
                          معاينة
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleApproveTrip(trip.id)}
                        className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اعتماد الرحلة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Collections */}
          {pendingCollections.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                سندات قبض بانتظار الاعتماد ({pendingCollections.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {pendingCollections.map(col => (
                  <div key={col.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        سند قبض: {col.customerName} — المبلغ: {col.amount} {settings.currency}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        المرجع: {col.referenceNumber || 'بدون'} | طريقة الدفع: {col.paymentMethod} | بواسطة: {col.createdByName || 'أمين الصندوق'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApproveFinancial('COLLECTION', col.id)}
                      className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>اعتماد السند</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Expenses */}
          {pendingExpenses.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                مصروفات تشغيلية بانتظار الاعتماد ({pendingExpenses.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {pendingExpenses.map(exp => (
                  <div key={exp.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        بند: {exp.category} — المبلغ: {exp.amount} {settings.currency}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        البيان: {exp.description} | المستفيد: {exp.recipient || '-'} | أنشأها: {exp.createdByName || 'موظف العمليات'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApproveFinancial('EXPENSE', exp.id)}
                      className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>اعتماد الصرف</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalPendingCount === 0 && (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                جميع العمليات والرحلات المالية معتمدة ومطابقة!
              </p>
              <p className="text-xs text-slate-400 mt-1">لا توجد عمليات معلقة تتطلب موافقة حالية.</p>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Sync & Devices Monitor */}
      {activeSubTab === 'SYNC' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold flex items-center gap-2 text-white">
              <Database className="w-4 h-4 text-orange-400" />
              <span>ميثاق سيادة وأمان بيانات الشركة (Enterprise Data Sovereignty)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              وفق أعلى معايير الخصوصية الرقمية لمؤسسة إيجاز، تبقى كافة البيانات التراكمية وسجلات الرحلات والعملاء والمالية تحت السيادة الحصرية لإدارة الشركة. لا يتم توجيه أي بيانات لخوادم المطور، ويتحكم مدير النظام في استضافة المزامنة سواء عبر خادم المؤسسة الخاص، أو الشبكة المحلية اللاسلكية، أو حزم المزامنة المشفرة.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs font-mono text-slate-300">
              <div>معرف هذا الجهاز: <span className="text-orange-400">{SyncEngine.getDeviceId()}</span></div>
              <div>اسم المحطة: <span className="text-blue-400">{SyncEngine.getDeviceName()}</span></div>
            </div>
          </div>

          {/* Outbox Items List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                قائمة انتظار المزامنة المحلية (Sync Outbox - {outboxItems.length} عنصر)
              </h4>
              <button
                type="button"
                onClick={() => SyncEngine.purgeSyncedItems()}
                className="text-xs text-slate-500 hover:text-orange-600 underline cursor-pointer"
              >
                تنظيف السجلات المرحّلة بنجاح
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {outboxItems.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  قائمة الانتظار فارغة. كافة التعديلات مرحّلة ومزامنة تمامًا.
                </div>
              ) : (
                outboxItems.map(item => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        [{item.action}] {item.entityType} ({item.entityId})
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        بواسطة: {item.authorName} | التاريخ: {item.timestamp} | البصمة: {item.checksum}
                      </div>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'SYNCED'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : item.status === 'FAILED'
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {item.status === 'SYNCED' ? 'تمت المزامنة' : item.status === 'FAILED' ? 'فشلت المزامنة' : 'قيد الانتظار'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SubTab 4: Immutable Audit Trail */}
      {activeSubTab === 'AUDIT' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-orange-500" />
                <span>سجل التدقيق الأمني المحمي غير القابل للحذف</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سجل نظامي مشفر يرصد كافة تسجيلات الدخول والعمليات الحساسة لمنع التلاعب وتثبيت المسؤوليات.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAuditExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>تصدير السجل الكامل</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="p-2.5">الوقت</th>
                  <th className="p-2.5">الموظف</th>
                  <th className="p-2.5">الرتبة</th>
                  <th className="p-2.5">الإجراء</th>
                  <th className="p-2.5">البيان والتفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {auditLogs.slice(0, 150).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-[11px] text-orange-600 dark:text-orange-400 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Import Bundle */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-orange-500" />
                <span>استيراد حزمة مزامنة مشفرة من جهاز موظف</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ألصق نص حزمة المزامنة المستخرجة من هاتف الموظف (أو افتح ملف .ejaz) لدمج العمليات مع قاعدة البيانات المركزية دون تعارض:
            </p>

            <textarea
              rows={6}
              value={importBundleText}
              onChange={e => setImportBundleText(e.target.value)}
              placeholder="ألصق كود حزمة المزامنة هنا..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleProcessImportBundle}
                disabled={!importBundleText.trim()}
                className="px-5 py-2 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                تأكيد دمج السجلات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
