# Multi Broadcast Discord Bot

بوت إدارة **Multi Broadcast** مع توزيع إرسال الرسائل على كل التوكنات.

## المميزات
- برودكاست لكل الأعضاء (`$bc`).
- برودكاست للأعضاء الأونلاين (`$obc` أو `$ob`).
- توزيع تلقائي للأعضاء على كل التوكنات (مثال: 300 عضو + 6 توكنات = تقريبًا 50 لكل توكن).
- في `$obc` و`$ob` يتم إرسال رسالة فورية فيها التقسيم والعداد Live لعدد ما تم إرساله.
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

> عند كتابة `$bc` أو `$obc` أو `$ob` بدون رسالة، البوت يرد: `type your message`.


> تم تحسين الإرسال لرفع نسبة الوصول: سرعات أعلى + إعادة محاولة تلقائية عند فشل أول إرسال.
