# Multi Broadcast Discord Bot

بوت إدارة **Multi Broadcast** مشابه للقائمة الظاهرة في الصورة، مع أوامر للتحكم في التوكنات، الأونرز، وسرعة الإرسال.

## المميزات
- برودكاست لكل الأعضاء (`$bc`).
- برودكاست للأعضاء الأونلاين (`$obc` أو `$ob`).
- إدارة التوكنات (إضافة/حذف/عرض).
- إدارة الأونرز.
- تغيير أسماء وصور البوتات.
- التحكم في السرعة (`slow`, `medium`, `fast`).
- توزيع الإرسال تلقائيًا على جميع التوكنات (مثال: 300 عضو مع 6 توكنات ≈ كل توكن 50 عضو).

## المتطلبات
- Node.js 18+
- توكن بوت رئيسي (Control Bot) في متغير البيئة `CONTROL_TOKEN`.
- تفعيل **Privileged Intents** (خصوصًا Presence وMembers) من Discord Developer Portal.

## التشغيل
```bash
npm install
CONTROL_TOKEN=your_control_bot_token npm start
```

## الأوامر
- `$bc <message>`
- `$obc <message>`
- `$ob <message>`
- `$addtoken <token>`
- `$removetoken <token|all>`
- `$listtokens`
- `$count`
- `$addowner <id>`
- `$removeowner <id|all>`
- `$listowners`
- `$renamebots <name>`
- `$setavatars <url>`
- `$mix`
- `$setspeed <slow|medium|fast>`
- `$bans`
- `$kicktokens`
- `$help`

## التخزين
يتم حفظ الإعدادات في:
- `data/config.json`

## ملاحظة مهمة
استخدم البوت ضمن قوانين Discord وشروط الخدمة. أي استخدام مزعج/سبام قد يعرّض التوكنات للحظر.


> عند كتابة `$bc` أو `$obc` أو `$ob` بدون رسالة، البوت يرد: `type your message`.
