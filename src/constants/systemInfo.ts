/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
 */

export interface SystemInfoMetadata {
  name: string;
  systemNameAr: string;
  systemNameEn: string;
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
  name: 'إيجاز',
  systemNameAr: 'نظام إيجاز لإدارة عمليات النقل واللوجستيات والفوترة',
  systemNameEn: 'Ejaz Transport & Logistics Management System',
  version: '2.6.0',
  buildNumber: '2026.09.03',
  edition: 'Enterprise Pro (إصدار المؤسسات)',
  releaseYear: '2026',
  developer: Object.freeze({
    companyName: 'فكتوريا لاين سوفت',
    fullName: 'فكتوريا لاين سوفت للأنظمة والبرمجة',
    englishName: 'Victoria Line Soft',
    activity: 'للأنظمة والبرمجة',
    contactNumber: '771119726',
    contactUrl: 'tel:771119726',
    whatsappUrl: 'https://wa.me/967771119726',
    officialCopyright: 'نظام إيجاز © جميع الحقوق محفوظة\nتم التصميم والتطوير والبرمجة بواسطة فكتوريا لاين سوفت للأنظمة والبرمجة\n771119726',
    footerCopyright: 'نظام إيجاز © جميع الحقوق محفوظة | تطوير وبرمجة فكتوريا لاين سوفت للأنظمة والبرمجة | 771119726',
  }),
  license: Object.freeze({
    type: 'ترخيص برمجي تجاري معتمد',
    status: 'مرخص ومحمي برمجياً',
    isProtected: true,
    protectedNotice: 'حقوق البرمجة والتطوير والتصميم محفوظة بالكامل لشركة «فكتوريا لاين سوفت للأنظمة والبرمجة». بيانات وحقوق المطور ثابتة ومحمية في شفرة النظام ولا يمكن تعديلها أو إزالتها من لوحة التحكم.',
  }),
});
