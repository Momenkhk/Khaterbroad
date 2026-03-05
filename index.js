const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { BotManager } = require('./src/bot-manager');
const { readConfig, updateConfig } = require('./src/storage');

let config = readConfig();
const PREFIX = config.prefix || '$';
const CONTROL_TOKEN = config.controlToken;

if (!CONTROL_TOKEN) {
  throw new Error('ضع controlToken داخل data/config.json');
}

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
    '`$tokenslist` - روابط دعوة البوتات',
    '`$addtoken <token>` - إضافة توكن جديد',
    '`$removetoken <token|all>` - حذف توكن أو كل التوكنات',
    '`$listtokens` - عرض التوكنات (مخفية جزئيًا)',
    '`$count` - عدد التوكنات وحالة الباند',
    '`$addowner <id>` - إضافة أونر جديد',
    '`$removeowner <id|all>` - حذف أونر',
    '`$listowners` - عرض الأونرز',
    '`$renamebots <name>` - تغيير أسماء البوتات',
    '`$setavatars <url>` - تغيير صور البوتات',
    '`$setdes <text>` - تغيير وصف (Description) البوتات',
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

function distributionText(distribution) {
  return distribution.map((item) => `• ${item.bot}: **${item.assigned}**`).join('\n');
}

function progressText({ total, sent, failed, distribution, title }) {
  const dist = distributionText(distribution);
  return [
    `⏳ **${title}**`,
    `المستهدف (متقسم على التوكنات): **${total}**`,
    `تم الإرسال: **${sent}** / **${total}**`,
    `فشل: **${failed}**`,
    '',
    'توزيع التوكنات:',
    dist || 'لا يوجد توزيع.'
  ].join('\n');
}

controller.once(Events.ClientReady, async () => {
  console.log(`Control bot ready as ${controller.user.tag}`);

  if (config.owners.length === 0) {
    config = updateConfig((draft) => {
      draft.owners = [controller.user.id];
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

  if (cmd === `${PREFIX}help`) return void (await message.reply(helpText()));

  if (cmd === `${PREFIX}addtoken`) {
    const token = rest.join(' ').trim();
    if (!token) return void message.reply(`استخدم: \`${PREFIX}addtoken <token>\``);

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

  if (cmd === `${PREFIX}removetoken`) {
    const target = rest.join(' ').trim();
    if (!target) return void message.reply(`استخدم: \`${PREFIX}removetoken <token|all>\``);

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

  if (cmd === `${PREFIX}listtokens`) {
    if (config.tokens.length === 0) return void message.reply('لا توجد توكنات مضافة.');
    await message.reply(config.tokens.map((t, i) => `${i + 1}. ${maskToken(t)}`).join('\n'));
    return;
  }

  if (cmd === `${PREFIX}tokenslist` || cmd === 'tokenslist') {
    const links = manager.getInviteLinks();
    if (!links.length) return void (await message.reply('لا توجد بوتات توكن نشطة حالياً.'));
    await message.reply(links.map((item, i) => `${i + 1}. ${item.bot}\n${item.url}`).join('\n\n'));
    return;
  }

  if (cmd === `${PREFIX}count`) {
    const counts = manager.getCount();
    await message.reply(`التوكنات النشطة: **${counts.total}**\nالمحظورة: **${counts.banned}**\nالسرعة: **${config.speed}**`);
    return;
  }

  if (cmd === `${PREFIX}addowner`) {
    const id = rest[0];
    if (!id) return void message.reply(`استخدم: \`${PREFIX}addowner <id>\``);
    config = updateConfig((draft) => {
      if (!draft.owners.includes(id)) draft.owners.push(id);
      return draft;
    });
    await message.reply('✅ تمت إضافة الأونر.');
    return;
  }

  if (cmd === `${PREFIX}removeowner`) {
    const id = rest[0];
    if (!id) return void message.reply(`استخدم: \`${PREFIX}removeowner <id|all>\``);
    config = updateConfig((draft) => {
      if (id === 'all') draft.owners = [];
      else draft.owners = draft.owners.filter((o) => o !== id);
      return draft;
    });
    await message.reply('✅ تم تحديث قائمة الأونرز.');
    return;
  }

  if (cmd === `${PREFIX}listowners`) {
    await message.reply(config.owners.length ? config.owners.join('\n') : 'لا يوجد أونرز حالياً.');
    return;
  }

  if (cmd === `${PREFIX}renamebots`) {
    const name = rest.join(' ').trim();
    if (!name) return void message.reply(`استخدم: \`${PREFIX}renamebots <name>\``);
    const report = await manager.renameBots(name);
    await message.reply(report.length ? report.join('\n') : 'لا توجد بوتات نشطة.');
    return;
  }

  if (cmd === `${PREFIX}setavatars`) {
    const url = rest[0];
    if (!url) return void message.reply(`استخدم: \`${PREFIX}setavatars <url>\``);
    const report = await manager.setAvatars(url);
    await message.reply(report.length ? report.join('\n') : 'لا توجد بوتات نشطة.');
    return;
  }

  if (cmd === `${PREFIX}setdes`) {
    const description = rest.join(' ').trim();
    if (!description) return void message.reply(`استخدم: \`${PREFIX}setdes <text>\``);
    const report = await manager.setDescriptions(description);
    await message.reply(report.length ? report.join('\n') : 'لا توجد بوتات نشطة.');
    return;
  }

  if (cmd === `${PREFIX}mix`) {
    manager.mixOrder();
    await message.reply('✅ تم خلط ترتيب البوتات.');
    return;
  }

  if (cmd === `${PREFIX}setspeed`) {
    const speed = (rest[0] || '').toLowerCase();
    if (!['slow', 'medium', 'fast'].includes(speed)) {
      return void message.reply(`استخدم: \`${PREFIX}setspeed <slow|medium|fast>\``);
    }

    config = updateConfig((draft) => {
      draft.speed = speed;
      return draft;
    });

    await message.reply(`✅ تم ضبط السرعة على **${speed}**.`);
    return;
  }

  if (cmd === `${PREFIX}bans`) {
    const bans = manager.getBannedTokens();
    await message.reply(bans.length ? bans.map(maskToken).join('\n') : 'لا توجد توكنات محظورة.');
    return;
  }

  if (cmd === `${PREFIX}kicktokens`) {
    await manager.kickTokens();
    await message.reply('✅ تم فصل كل بوتات التوكنات النشطة.');
    return;
  }

  if (cmd === `${PREFIX}bc` || cmd === `${PREFIX}obc` || cmd === `${PREFIX}ob`) {
    const text = rest.join(' ').trim();
    if (!text) return void (await message.reply('type your message'));

    const onlineOnly = cmd === `${PREFIX}obc` || cmd === `${PREFIX}ob`;
    const plan = await manager.buildBroadcastPlan({ guild: message.guild, onlineOnly });

    if (!plan.assignments.length) {
      await message.reply('❌ لا توجد توكنات نشطة للإرسال حالياً.');
      return;
    }

    const title = onlineOnly ? 'بدء Online Broadcast' : 'بدء Broadcast';
    const progressMessage = await message.reply(
      progressText({ total: plan.total, sent: 0, failed: 0, distribution: plan.distribution, title })
    );

    let lastUpdateAt = Date.now();
    const result = await manager.executeBroadcast({
      assignments: plan.assignments,
      content: text,
      speed: config.speed,
      total: plan.total,
      onProgress: async (progress) => {
        const processed = progress.sent + progress.failed;
        const now = Date.now();
        if (processed !== progress.total && processed % 5 !== 0 && now - lastUpdateAt < 1500) {
          return;
        }
        lastUpdateAt = now;

        try {
          await progressMessage.edit(
            progressText({
              total: progress.total,
              sent: progress.sent,
              failed: progress.failed,
              distribution: plan.distribution,
              title
            })
          );
        } catch {}
      }
    });

    await progressMessage.edit(
      `✅ **اكتمل البرودكاست**\n` +
      `المستهدف (متقسم على التوكنات): **${result.total}**\n` +
      `تم الإرسال: **${result.sent}**\n` +
      `فشل: **${result.failed}**\n\n` +
      `توزيع التوكنات:\n${distributionText(plan.distribution) || 'لا يوجد توزيع.'}`
    );
  }
});

controller.login(CONTROL_TOKEN);
