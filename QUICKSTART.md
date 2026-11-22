# 🚀 دليل البدء السريع — Telemedicine Platform

## تشغيل المشروع محلياً (بعد ما تسحبه من GitHub)

### 1. المتطلبات
- Node.js 18 أو أحدث
- PostgreSQL شغّال

### 2. الأوامر بالترتيب

```bash
# انسخ المشروع
git clone <repo-url>
cd telemedicine-platform

# نزّل المكتبات
npm install

# اعمل ملف البيئة
cp .env.example .env
# ثم عدّل DATABASE_URL لو محتاج

# طبّق قاعدة البيانات
npx drizzle-kit push

# شغّل المشروع
npm run dev
```

### 3. املأ قاعدة البيانات ببيانات تجريبية
```bash
curl -X POST http://localhost:3000/api/seed
```

وبعدين افتح: **http://localhost:3000**

## 👤 حسابات تجريبية

| النوع | الإيميل | الباسورد |
|-------|---------|----------|
| مريض | patient@example.com | password123 |
| طبيب (قلب) | cardio@example.com | password123 |
| طبيب (جلدية) | derma@example.com | password123 |
| طبيب (أعصاب) | neuro@example.com | password123 |

## ✅ سيناريو الاختبار

1. سجّل دخول كمريض → `Login`
2. اضغط `Search Doctors`
3. اختار طبيب → اضغط `View & Book`
4. اختار موعد → اضغط `Confirm Appointment`
5. شوف مواعيدك في `View All Appointments`
6. جرّب تلغي الموعد بـ `Cancel`
