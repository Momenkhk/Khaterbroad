const { Client, GatewayIntentBits, Events, ActivityType } = require('discord.js');

const SPEED_MS = {
  slow: 650,
  medium: 180,
  fast: 60
};

class BotManager {
  constructor({ onTokenBanned }) {
    this.clients = new Map();
    this.badTokens = new Set();
    this.onTokenBanned = onTokenBanned;
  }

  async attachTokens(tokens) {
    const uniqueTokens = [...new Set(tokens)];
    await Promise.allSettled(uniqueTokens.map((token) => this.attachToken(token)));

    for (const token of this.clients.keys()) {
      if (!uniqueTokens.includes(token)) {
        await this.detachToken(token);
      }
    }
  }

  async attachToken(token) {
    if (this.clients.has(token) || this.badTokens.has(token)) return;

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
      ]
    });

    client.once(Events.ClientReady, () => {
      client.user.setActivity('Multi Broadcast', { type: ActivityType.Watching }).catch(() => {});
      this.clients.set(token, client);
      console.log(`[TOKEN READY] ${client.user.tag}`);
    });

    client.on(Events.Error, (error) => {
      console.error(`[CLIENT ERROR] ${error.message}`);
    });

    try {
      await client.login(token);
    } catch (error) {
      this.badTokens.add(token);
      this.onTokenBanned?.(token, error.message);
      try {
        client.destroy();
      } catch {}
      throw error;
    }
  }

  async detachToken(token) {
    const client = this.clients.get(token);
    if (!client) return;

    try {
      await client.destroy();
    } finally {
      this.clients.delete(token);
    }
  }

  async buildBroadcastPlan({ guild, onlineOnly = false }) {
    const members = await guild.members.fetch();
    const targets = members.filter((member) => {
      if (member.user.bot) return false;
      if (!onlineOnly) return true;
      if (!member.presence) return false;
      return ['online', 'idle', 'dnd'].includes(member.presence.status);
    });

    const activeClients = [...this.clients.values()].filter((client) => client.guilds.cache.has(guild.id));
    const unavailableClients = this.clients.size - activeClients.length;

    if (activeClients.length === 0) {
      return {
        total: targets.size,
        assignments: [],
        distribution: [],
        meta: { unavailableClients }
      };
    }

    const membersArray = [...targets.values()];
    const chunkSize = Math.ceil(membersArray.length / activeClients.length);
    const assignments = activeClients.map((client, index) => ({
      client,
      members: membersArray.slice(index * chunkSize, (index + 1) * chunkSize)
    }));

    const distribution = assignments
      .filter(({ members: assignedMembers }) => assignedMembers.length)
      .map(({ client, members: assignedMembers }) => ({
        bot: client.user?.tag || 'unknown-bot',
        assigned: assignedMembers.length
      }));

    return {
      total: targets.size,
      assignments,
      distribution,
      meta: { unavailableClients }
    };
  }

  async executeBroadcast({ assignments, content, speed = 'medium', onProgress, retries = 2, total = 0 }) {
    const delay = SPEED_MS[speed] ?? SPEED_MS.medium;
    const stats = { sent: 0, failed: 0, total, failureReasons: {} };
    const clients = assignments.map((item) => item.client);

    const notifyProgress = async () => {
      if (typeof onProgress === 'function') {
        await onProgress({ ...stats });
      }
    };

    await Promise.all(
      assignments.map(async ({ client, members }) => {
        for (const member of members) {
          let delivered = false;
          let lastErrorKey = 'unknown_error';
          const fallbackOrder = [client, ...clients.filter((entry) => entry !== client)];

          for (let attempt = 0; attempt <= retries && !delivered; attempt += 1) {
            const sender = fallbackOrder[attempt % fallbackOrder.length];
            if (!sender) continue;

            try {
              const targetUser = await sender.users.fetch(member.id);
              await targetUser.send(`${content}\n<@${member.id}>`);
              stats.sent += 1;
              delivered = true;
            } catch (error) {
              delivered = false;
              lastErrorKey = error?.code ? String(error.code) : (error?.message || 'unknown_error');
            }
          }

          if (!delivered) {
            stats.failed += 1;
            stats.failureReasons[lastErrorKey] = (stats.failureReasons[lastErrorKey] || 0) + 1;
          }

          await notifyProgress();
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      })
    );

    return stats;
  }

  async sendBroadcast({ guild, content, onlineOnly = false, speed = 'medium', onProgress }) {
    const plan = await this.buildBroadcastPlan({ guild, onlineOnly });
    if (plan.assignments.length === 0) {
      return {
        sent: 0,
        failed: 0,
        total: plan.total,
        distribution: plan.distribution,
        failureReasons: {},
        meta: plan.meta
      };
    }

    const stats = await this.executeBroadcast({
      assignments: plan.assignments,
      content,
      speed,
      onProgress,
      total: plan.total
    });

    return { ...stats, distribution: plan.distribution, meta: plan.meta };
  }

  getInviteLinks() {
    return [...this.clients.values()]
      .filter((client) => client.user?.id)
      .map((client) => ({
        bot: client.user.tag,
        url: `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`
      }));
  }

  async renameBots(name) {
    const report = [];
    for (const client of this.clients.values()) {
      try {
        await client.user.setUsername(name);
        report.push(`✅ ${client.user.tag}`);
      } catch (error) {
        report.push(`❌ ${client.user.tag}: ${error.message}`);
      }
    }
    return report;
  }

  async setDescriptions(description) {
    const report = [];
    for (const client of this.clients.values()) {
      try {
        const app = await client.fetchApplication();
        await app.edit({ description });
        report.push(`✅ ${client.user.tag}`);
      } catch (error) {
        report.push(`❌ ${client.user?.tag || 'unknown-bot'}: ${error.message}`);
      }
    }
    return report;
  }

  async setAvatars(url) {
    const report = [];
    for (const client of this.clients.values()) {
      try {
        await client.user.setAvatar(url);
        report.push(`✅ ${client.user.tag}`);
      } catch (error) {
        report.push(`❌ ${client.user.tag}: ${error.message}`);
      }
    }
    return report;
  }

  mixOrder() {
    const entries = [...this.clients.entries()];
    for (let i = entries.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    this.clients = new Map(entries);
  }

  getCount() {
    return { total: this.clients.size, banned: this.badTokens.size };
  }

  getBannedTokens() {
    return [...this.badTokens];
  }

  async kickTokens() {
    const tokens = [...this.clients.keys()];
    for (const token of tokens) {
      await this.detachToken(token);
    }
  }
}

module.exports = { BotManager, SPEED_MS };
