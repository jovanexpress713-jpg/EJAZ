/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

export interface SystemInfoMetadata {
  name: string;
  systemNameAr: string;
  systemNameEn: string;
  clientNameAr: string;
  clientNameEn: string;
  moduleNameAr: string;
  moduleNameEn: string;
  version: string;
  buildNumber: string;
  edition: string;
  releaseYear: string;
  developer: {
    companyName: string;
    fullName: string;
    englishName: string;
    activity: string;
    contactNumber: string;
    contactUrl: string;
    whatsappUrl: string;
    officialCopyright: string;
    footerCopyright: string;
  };
  license: {
    type: string;
    status: string;
    isProtected: boolean;
    protectedNotice: string;
  };
}

export const SYSTEM_INFO: SystemInfoMetadata = Object.freeze({
  name: 'VICTORIA Logistics ERP',
  systemNameAr: 'نظام فيكتوريا لإدارة العمليات اللوجستية والنقل (VICTORIA Logistics ERP)',
  systemNameEn: 'VICTORIA Logistics ERP - Enterprise Resource Planning',
  clientNameAr: 'مؤسسة إيجاز للنقليات',
  clientNameEn: 'Ejaz Transport',
  moduleNameAr: 'إدارة عمليات أسطول مؤسسة إيجاز للنقليات',
  moduleNameEn: 'Ejaz Transport & Logistics Operations',
  version: '2.7.0',
  buildNumber: '2026.10.23',
  edition: 'Enterprise Pro (إصدار المؤسسات)',
  releaseYear: '2026',
  developer: Object.freeze({
    companyName: 'فكتوريا لاين سوفت',
    fullName: 'فكتوريا لاين سوفت للأنظمة والبرمجة',
    englishName: 'Victoria Line Soft',
    activity: 'للأنظمة والبرمجة',
    contactNumber: '+967771119726',
    contactUrl: 'tel:+967771119726',
    whatsappUrl: 'https://wa.me/967771119726',
    officialCopyright: 'نظام VICTORIA Logistics ERP © جميع الحقوق محفوظة\nتم التصميم والتطوير والبرمجة بواسطة فكتوريا لاين سوفت للأنظمة والبرمجة\n+967771119726',
    footerCopyright: 'مؤسسة إيجاز للنقليات © جميع الحقوق محفوظة | مشغل بنظام VICTORIA Logistics ERP | تطوير وبرمجة فكتوريا لاين سوفت للأنظمة والبرمجة | +967771119726',
  }),
  license: Object.freeze({
    type: 'ترخيص برمجي تجاري معتمد لمؤسسة إيجاز للنقليات',
    status: 'مرخص ومحمي برمجياً',
    isProtected: true,
    protectedNotice: 'حقوق البرمجة والتطوير والتصميم محفوظة بالكامل لشركة «فكتوريا لاين سوفت للأنظمة والبرمجة». تم ترخيص هذا النظام حصرياً لمؤسسة إيجاز للنقليات لإدارة كافة العمليات التشغيلية والمالية وبوالص الشحن.',
  }),
});
