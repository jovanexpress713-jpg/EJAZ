import JSZip from 'jszip';
import { StorageService } from '../services/storage';

// Helper to trigger browser download safely without external dependencies
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export async function downloadFullProjectZip(): Promise<void> {
  const currentDate = new Date().toISOString().split('T')[0];
  const filename = `ejaz_transport_complete_project_${currentDate}.zip`;

  const zip = new JSZip();

  try {
    const meta = import.meta as any;
    if (typeof meta?.glob === 'function') {
      const srcFiles = meta.glob(
        [
          '/src/**/*.{ts,tsx,css,json}',
          '/public/**/*.{json,svg,js,html,webmanifest}',
          '/index.html',
          '/package.json',
          '/tsconfig.json',
          '/vite.config.ts',
          '/metadata.json',
          '/build.gradle.kts',
          '/settings.gradle.kts',
          '/gradle.properties'
        ],
        { query: '?raw', import: 'default', eager: true }
      );

      for (const [path, content] of Object.entries(srcFiles)) {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        if (typeof content === 'string') {
          zip.file(cleanPath, content);
        }
      }
    }
  } catch (e) {
    console.warn('Zip file collector notice:', e);
  }

  // Also include current live database state in data/latest_database_backup.json
  const liveBackup = StorageService.exportBackupJSON();
  zip.file('data/latest_database_backup.json', liveBackup);
  zip.file('data/initial_database_backup.json', liveBackup);

  // Add a helpful README.md
  zip.file(
    'README.md',
    `# نظام إيجاز للنقليات (Ejaz Transport System)

تطبيق ويب ونظام إدارة نقليات متكامل وسحابي.

## 🚀 طريقة التشغيل على الكمبيوتر:
1. تأكد من تثبيت Node.js
2. افتح مجلد المشروع في الـ Terminal:
\`\`\`bash
npm install
npm run dev
\`\`\`
3. افتح المتصفح على: \`http://localhost:3000\`

## 📱 بيانات تسجيل الدخول الافتراضية:
- المستخدم: admin
- كلمة المرور: admin
`
  );

  // Generate zip file and download
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, filename);
}
