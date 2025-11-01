# خطوات رفع المشروع على GitHub

## ✅ تم إعداد Git بنجاح!

## الخطوات التالية:

### 1. إنشاء Repository على GitHub:
1. اذهب إلى https://github.com
2. سجل دخول (أو أنشئ حساب)
3. اضغط على زر **"+"** في الزاوية العلوية اليمنى
4. اختر **"New repository"**
5. أدخل اسم المستودع (مثال: `attendance-system`)
6. اختر **Public** أو **Private**
7. **لا** تضع علامة على "Initialize this repository with a README"
8. اضغط **"Create repository"**

### 2. ربط المشروع المحلي بـ GitHub:

**بعد إنشاء المستودع على GitHub، ستحصل على رابط مثل:**
```
https://github.com/YOUR_USERNAME/attendance-system.git
```

**شغّل هذه الأوامر في Terminal (استبدل الرابط برابطك):**

```bash
# ربط المستودع البعيد
git remote add origin https://github.com/YOUR_USERNAME/attendance-system.git

# رفع الكود
git branch -M main
git push -u origin main
```

### 3. إذا طلب منك اسم المستخدم وكلمة المرور:
- استخدم **GitHub Personal Access Token** بدلاً من كلمة المرور
- طريقة إنشاء Token:
  1. اذهب إلى GitHub → Settings → Developer settings
  2. Personal access tokens → Tokens (classic)
  3. Generate new token
  4. اختر الصلاحيات: `repo`
  5. انسخ الـ Token واستخدمه ككلمة مرور

### 4. التحقق من النجاح:
- اذهب إلى مستودعك على GitHub
- يجب أن ترى جميع الملفات هناك

---

## ملاحظات مهمة:
- ✅ تم إنشاء `.gitignore` لحماية الملفات الحساسة
- ✅ قاعدة البيانات (`attendance.db`) لن تُرفع (محمية)
- ✅ `node_modules` لن تُرفع

## للمستقبل - رفع التحديثات:
```bash
git add .
git commit -m "وصف التحديثات"
git push
```

