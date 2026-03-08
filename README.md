# Multi Broadcast Discord Bot

بوت إدارة **Multi Broadcast** مع توزيع إرسال الرسائل على كل التوكنات.

## المميزات
- برودكاست لكل الأعضاء (`$bc`).
- `$ob` يرسل لكل أعضاء السيرفر (Online + Offline).
- برودكاست للأعضاء الأونلاين فقط (`$obc`) بحالات: `online` و`idle` و`dnd`.
- توزيع تلقائي للأعضاء على كل التوكنات (مثال: 300 عضو + 6 توكنات = تقريبًا 50 لكل توكن).
- في `$obc` و`$ob` يتم إرسال رسالة فورية فيها التقسيم والعداد Live لعدد ما تم إرساله.
- عند كتابة `$ob` أو `$obc` بدون رسالة، البوت يرد برسالة Components v2: `** Type your message **`.
- أمر `tokenslist` / `$tokenslist` لإرسال روابط دعوة جميع البوتات النشطة.
- إدارة التوكنات والأونرز والتحكم في السرعة.
- أمر `$setdes` لتعديل Description البوتات.

## المتطلبات
- Node.js 18+
- تفعيل **Privileged Intents** (Members + Presence + Message Content).

## الإعداد (بدون .env)
عدّل الملف `data/config.json` وضع توكن الكنترول:

```json
{
  "controlToken": "PUT_CONTROL_BOT_TOKEN_HERE",
  "prefix": "$",
  "owners": [],
  "tokens": [],
  "speed": "medium"
}
```

## التشغيل
```bash
npm install
npm start
```

## الأوامر
- `$bc <message>`
- `$obc <message>`
- `$ob <message>`
- `$tokenslist` أو `tokenslist`
- `$addtoken <token>`
- `$removetoken <token|all>`
- `$listtokens`
- `$count`
- `$addowner <id>`
- `$removeowner <id|all>`
- `$listowners`
- `$renamebots <name>`
- `$setavatars <url>`
- `$setdes <text>`
- `$mix`
- `$setspeed <slow|medium|fast>`
- `$bans`
- `$kicktokens`
- `$help`

> عند كتابة `$ob` أو `$obc` بدون رسالة، البوت يرد Components v2 بالنص: `** Type your message **`.
>
> وعند كتابة `$bc` بدون رسالة، البوت يرد: `type your message`.


> تم تحسين الإرسال لرفع نسبة الوصول: سرعات أعلى + إعادة محاولة تلقائية عند فشل أول إرسال.


> الآن تقرير البث يعرض التوكنات الموجودة خارج السيرفر الحالي + أكثر أسباب الفشل شيوعًا (مثل إغلاق الـ DM).
