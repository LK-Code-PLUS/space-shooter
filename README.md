# Star Vanguard 🚀

یک بازی شوتر فضایی دوبعدی با گرافیک نئونی، ذرات انفجار، امواج دشمن، پاور-آپ و باس‌فایت — آماده برای تبدیل خودکار به APK اندروید توسط GitHub Actions.

## 🎮 ویژگی‌های بازی
- کنترل با کشیدن انگشت روی صفحه، شلیک خودکار
- افکت‌های نوری، ذرات انفجار، لرزش صفحه (screen shake)
- سه نوع دشمن + باس هر ۵ ویو
- پاور-آپ: سپر، شلیک سریع، شلیک پخش‌شونده، جون اضافه
- ذخیره بهترین امتیاز روی گوشی

## 📦 مرحله ۱: آپلود روی گیت‌هاب
۱. یک ریپازیتوری جدید بساز (مثلاً `star-vanguard`)
۲. تمام فایل‌های این پوشه رو داخلش قرار بده (ساختار زیر رو حفظ کن)
۳. کامیت و پوش کن روی برنچ `main`

```
git init
git add .
git commit -m "Star Vanguard - initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/star-vanguard.git
git push -u origin main
```

## 🤖 مرحله ۲: ساخت خودکار APK
همین که پوش کنی، فایل `.github/workflows/build-apk.yml` به‌صورت خودکار اجرا میشه و:
- پروژه اندروید رو با Capacitor می‌سازه
- APK نسخه دیباگ رو کامپایل می‌کنه
- به‌عنوان **Artifact** آپلودش می‌کنه

برای دانلود:
1. برو به تب **Actions** توی ریپازیتوری گیت‌هابت
2. روی آخرین ران (workflow run) کلیک کن
3. پایین صفحه، بخش **Artifacts** رو باز کن و `star-vanguard-apk` رو دانلود کن
4. فایل zip رو باز کن → `app-debug.apk` رو روی گوشیت بریز و نصب کن

> نکته: ممکنه اندروید بگه "منبع ناشناس" — توی تنظیمات گوشی اجازه نصب از این منبع رو بده.

## 🏷️ ساخت نسخه رسمی (Release) با تگ
اگه بخوای APK به‌صورت یک Release رسمی هم منتشر بشه:

```
git tag v1.0.0
git push origin v1.0.0
```

بعدش توی تب **Releases** ریپازیتوری، فایل APK آماده‌ی دانلوده.

## 🎨 شخصی‌سازی
- تغییر گرافیک/رنگ‌ها و منطق بازی: `www/game.js`
- تغییر ظاهر منو و HUD: `www/style.css`
- تغییر نام و آیکون اپ: `capacitor.config.json` و پوشه‌ی `android/app/src/main/res` (بعد از اولین بیلد)

## 🧪 تست محلی (اختیاری، روی کامپیوتر خودت)
اگه Node.js و Android Studio نصب داری:

```
npm install
npx cap add android
npx cap sync android
npx cap open android
```

و از داخل Android Studio روی Run بزن تا مستقیم روی گوشی/شبیه‌ساز تست کنی.

---
ساخته‌شده با ❤️ و Canvas API — بدون نیاز به هیچ اسپرایت یا فایل گرافیکی خارجی.
