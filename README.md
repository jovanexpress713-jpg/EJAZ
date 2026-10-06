# مشروع إيجاز للنقليات – Ejaz Transport (Android & Web)

نظام متكامل ومتقدم لإدارة أسطول النقل البري واللوجستيات، متوافق كلياً مع الويب وتطبيق Android WebView وبناء APK تلقائياً عبر GitHub Actions.

---

## 🚀 كيفية الرفع إلى GitHub وبناء تطبيق Android (APK) تلقائياً:

### 1️⃣ الخطوة الأولى: رفع المشروع إلى مستودع GitHub
من داخل مجلد المشروع في جهازك:
```bash
git init
git add .
git commit -m "Initial Ejaz project"
git branch -M main
git remote add origin <GITHUB_REPOSITORY_URL>
git push -u origin main
```

---

### 2️⃣ الخطوة الثانية: بناء ملف APK تلقائياً عبر GitHub Actions
1. افتح مستودعك على **GitHub**.
2. انتقل إلى تبويب **Actions**.
3. اختر خط العمل: **Build Ejaz APK**.
4. اضغط على **Run workflow**.
5. بمجرد انتهاء البناء (أقل من دقيقتين)، ستجد ملف **`Ejaz.apk`** جاهزاً للتحميل والتثبيت المباشر على أي هاتف Android من قسم **Artifacts**.

---

## 💻 التشغيل المحلي والتطوير:

### 🌐 تشغيل نسخة الويب:
```bash
npm install
npm run dev
```

### 📱 بناء تطبيق Android محلياً (Android Studio / Gradle):
```bash
npm run build
./gradlew assembleDebug
```
الملف الناتج سيكون في المسار:
`app/build/outputs/apk/debug/app-debug.apk`

---

## 🛡️ الهوية والبيانات:
- **الاسم بالعربية:** إيجاز
- **الاسم بالإنجليزية:** Ejaz
- **المنصة:** React + Vite + Tailwind + TypeScript + Android WebView (Java 17 / SDK 34)
