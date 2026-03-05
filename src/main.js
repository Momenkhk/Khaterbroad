const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { BotManager } = require('./bot-manager');
const { readConfig, updateConfig } = require('./storage');

const PREFIX = '$';
const CONTROL_TOKEN = process.env.CONTROL_TOKEN;

if (!CONTROL_TOKEN) {
  throw new Error('Please define CONTROL_TOKEN in environment variables.');
}

let config = readConfig();

const controller = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel]
});

const manager = new BotManager({
  onTokenBanned: (token) => {
    config = updateConfig((draft) => {
      draft.tokens = draft.tokens.filter((t) => t !== token);
      return draft;
    });
  }
});

function isOwner(userId) {
  return config.owners.includes(userId);
}

function helpText() {
  return [
    '📌 **أوامر البوت**',
    '`$bc <message>` - برودكاست لكل أعضاء السيرفر',
    '`$obc <message>` - برودكاست للأعضاء الأونلاين فقط',
    '`$ob <message>` - اختصار أمر الأونلاين برودكاست',
    '`$addtoken <token>` - إضافة توكن جديد',
    '`$removetoken <token|all>` - حذف توكن أو كل التوكنات',
    '`$listtokens` - عرض التوكنات (مخفية جزئيًا)',
    '`$count` - عدد التوكنات وحالة الباند',
    '`$addowner <id>` - إضافة أونر جديد',
    '`$removeowner <id|all>` - حذف أونر',
    '`$listowners` - عرض الأونرز',
    '`$renamebots <name>` - تغيير أسماء البوتات',
    '`$setavatars <url>` - تغيير صور البوتات',
    '`$mix` - خلط ترتيب البوتات',
    '`$setspeed <slow|medium|fast>` - تحديد سرعة البرودكاست',
    '`$bans` - عرض التوكنات المحظورة',
    '`$kicktokens` - فصل كل بوتات التوكنات',
    '`$help` - عرض هذه القائمة'
  ].join('\n');
}

function maskToken(token) {
  if (token.length <= 12) return `${token.slice(0, 4)}...`;
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

controller.once(Events.ClientReady, async () => {
  console.log(`Control bot ready as ${controller.user.tag}`);

  if (config.owners.length === 0) {
    config = updateConfig((draft) => {
      draft.owners = [controller.application.owner?.id || ''];
      draft.owners = draft.owners.filter(Boolean);
      return draft;
    });
  }

  await manager.attachTokens(config.tokens);
});

controller.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) {
    return;
  }

  const [command, ...rest] = message.content.trim().split(/\s+/);
  const cmd = command.toLowerCase();

  if (!isOwner(message.author.id)) {
    return;
  }

  if (cmd === '$help') {
    await message.reply(helpText());
    return;
  }

  if (cmd === '$addtoken') {
    const token = rest.join(' ').trim();
    if (!token) return void message.reply('استخدم: `$addtoken <token>`');

    try {
      await manager.attachToken(token);
      config = updateConfig((draft) => {
        if (!draft.tokens.includes(token)) draft.tokens.push(token);
        return draft;
      });
      await message.reply('✅ تم إضافة التوكن وتشغيله.');
    } catch (error) {
      await message.reply(`❌ فشل تسجيل التوكن: ${error.message}`);
    }
    return;
  }

  if (cmd === '$removetoken') {
    const target = rest.join(' ').trim();
    if (!target) return void message.reply('استخدم: `$removetoken <token|all>`');

    if (target === 'all') {
      await manager.kickTokens();
      config = updateConfig((draft) => {
        draft.tokens = [];
        return draft;
      });
      await message.reply('✅ تم حذف وفصل كل التوكنات.');
      return;
    }

    await manager.detachToken(target);
    config = updateConfig((draft) => {
      draft.tokens = draft.tokens.filter((t) => t !== target);
      return draft;
    });
    await message.reply('✅ تم حذف التوكن.');
    return;
  }

  if (cmd === '$listtokens') {
    if (config.tokens.length === 0) return void message.reply('لا توجد توكنات مضافة.');
    await message.reply(config.tokens.map((t, i) => `${i + 1}. ${maskToken(t)}`).join('\n'));
    return;
  }

  if (cmd === '$count') {
    const counts = manager.getCount();
    await message.reply(`التوكنات النشطة: **${counts.total}**\nالمحظورة: **${counts.banned}**\nالسرعة: **${config.speed}**`);
    return;
  }

  if (cmd === '$addowner') {
    const id = rest[0];
    if (!id) return void message.reply('استخدم: `$addowner <id>`');

    config = updateConfig((draft) => {
      if (!draft.owners.includes(id)) draft.owners.push(id);
      return draft;
    });
    await message.reply('✅ تمت إضافة الأونر.');
    return;
  }

  if (cmd === '$removeowner') {
    const id = rest[0];
    if (!id) return void message.reply('استخدم: `$removeowner <id|all>`');

    config = updateConfig((draft) => {
      if (id === 'all') draft.owners = [];
      else draft.owners = draft.owners.filter((o) => o !== id);
      return draft;
    });
    await message.reply('✅ تم تحديث قائمة الأونرز.');
    return;
  }

  if (cmd === '$listowners') {
    await message.reply(config.owners.length ? config.owners.join('\n') : 'لا يوجد أونرز حالياً.');
    return;
  }

  if (cmd === '$renamebots') {
    const name = rest.join(' ').trim();
    if (!name) return void message.reply('استخدم: `$renamebots <name>`');

    const report = await manager.renameBots(name);
    await message.reply(report.length ? report.join('\n') : 'لا توجد بوتات نشطة.');
    return;
  }

  if (cmd === '$setavatars') {
    const url = rest[0];
    if (!url) return void message.reply('استخدم: `$setavatars <url>`');

    const report = await manager.setAvatars(url);
    await message.reply(report.length ? report.join('\n') : 'لا توجد بوتات نشطة.');
    return;
  }

  if (cmd === '$mix') {
    manager.mixOrder();
    await message.reply('✅ تم خلط ترتيب البوتات.');
    return;
  }

  if (cmd === '$setspeed') {
    const speed = (rest[0] || '').toLowerCase();
    if (!['slow', 'medium', 'fast'].includes(speed)) {
      return void message.reply('استخدم: `$setspeed <slow|medium|fast>`');
    }

    config = updateConfig((draft) => {
      draft.speed = speed;
      return draft;
    });

    await message.reply(`✅ تم ضبط السرعة على **${speed}**.`);
    return;
  }

  if (cmd === '$bans') {
    const bans = manager.getBannedTokens();
    await message.reply(bans.length ? bans.map(maskToken).join('\n') : 'لا توجد توكنات محظورة.');
    return;
  }

  if (cmd === '$kicktokens') {
    await manager.kickTokens();
    await message.reply('✅ تم فصل كل بوتات التوكنات النشطة.');
    return;
  }

  if (cmd === '$bc' || cmd === '$obc' || cmd === '$ob') {
    const text = rest.join(' ').trim();
    if (!text) {
      await message.reply('type your message');
      return;
    }

    await message.reply('⏳ جاري تنفيذ البرودكاست...');

    const result = await manager.sendBroadcast({
      guild: message.guild,
      content: text,
      onlineOnly: cmd === '$obc' || cmd === '$ob',
      speed: config.speed
    });

    const distributionText = result.distribution
      .map((item) => `• ${item.bot}: **${item.assigned}**`)
      .join('\n');

    await message.reply(`✅ اكتمل البرودكاست\nالعدد المستهدف: **${result.total}**\nتم الإرسال: **${result.sent}**\nفشل: **${result.failed}**${distributionText ? `\n\nتوزيع البث على التوكنات:\n${distributionText}` : ''}`);
    return;
  }
});

controller.login(CONTROL_TOKEN);
