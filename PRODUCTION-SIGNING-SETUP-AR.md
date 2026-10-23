# إعداد توقيع الإنتاج — VICTORIA Logistics ERP

هذا الإجراء يُنفّذ مرة واحدة على جهاز موثوق. لا ترسل ملف المفتاح أو كلمات المرور في محادثة، ولا ترفعها إلى GitHub كملفات.

## أ. إنشاء مفتاح التوقيع على Windows
1. ثبّت Android Studio أو JDK 17 حتى يتوفر الأمر `keytool`.
2. افتح PowerShell في مجلد خاص وآمن خارج مجلد المشروع.
3. نفّذ الأمر التالي، واستخدم كلمة مرور طويلة وفريدة عندما يطلبها:
   ```powershell
   keytool -genkeypair -v -keystore victoria-ejaz-release.jks -alias victoria-ejaz -keyalg RSA -keysize 4096 -validity 10000
   ```
4. احتفظ بملف `victoria-ejaz-release.jks` وبياناته في مكانين آمنين، أحدهما نسخة احتياطية مشفرة. فقدان المفتاح قد يمنع نشر تحديثات مستقبلية للتطبيق نفسه.
5. لا تضع ملف JKS داخل مستودع GitHub أو حزمة التسليم العامة.

## ب. إعداد أسرار GitHub Actions
افتح المستودع ثم Settings → Secrets and variables → Actions → New repository secret. أضف هذه الأسرار الأربعة:

- `ANDROID_KEYSTORE_BASE64`: محتوى ملف JKS بصيغة Base64، دون أسطر زائدة.
- `ANDROID_KEYSTORE_PASSWORD`: كلمة مرور ملف JKS.
- `ANDROID_KEY_ALIAS`: في المثال أعلاه `victoria-ejaz`.
- `ANDROID_KEY_PASSWORD`: كلمة مرور المفتاح. إذا استخدمت نفس كلمة مرور الملف، أدخلها هنا أيضًا.

لتحويل الملف إلى Base64 في PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\victoria-ejaz-release.jks")) | Set-Clipboard
```
الصق القيمة المنسوخة مباشرة في قيمة السر `ANDROID_KEYSTORE_BASE64`. لا تضعها في ملف داخل المشروع ولا ترسلها هنا. بعد الحفظ يمكنك حذف قيمة الحافظة إن رغبت.

## ج. بناء نسخة الإنتاج
1. افتح Actions → Build VICTORIA Logistics ERP APK.
2. اختر Run workflow وشغّل الفرع `main`.
3. انتظر نجاح الاختبارات والبناء.
4. إذا كانت الأسرار الأربعة صحيحة، سيظهر Artifact باسم `VICTORIA-Logistics-ERP-RELEASE-SIGNED-v1.2.0`، وسيُنشر GitHub Release موقّع عند حدث push على main.
5. إذا لم تُضبط الأسرار أو كانت خاطئة، سيبني سير العمل APK اختبار Debug فقط أو يفشل بناء Release؛ لا تعتبر Debug إصدار إنتاج.
6. احتفظ بقيمة SHA-256 المرفقة، واستخدمها لمقارنة ملف APK الذي تسلمه.

## د. مهم قبل التسليم
- التوقيع يثبت هوية ناشر الحزمة ولا يثبت خلو البرنامج من الأخطاء.
- اختبر النسخة الموقعة على أجهزة العميل قبل وضع بيانات حقيقية.
- لا تغيّر مفتاح التوقيع بعد توزيع التطبيق؛ يجب استخدام المفتاح نفسه في التحديثات اللاحقة.
- ملف JKS وكلمات المرور ليست جزءًا من APK ولا يجب تسليمها لمستخدم التطبيق العادي.
