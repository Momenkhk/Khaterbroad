const { Client, GatewayIntentBits, Events, ActivityType } = require('discord.js');

const SPEED_MS = {
  slow: 700,
  medium: 220,
  fast: 80
};

class BotManager {
  constructor({ onTokenBanned }) {
    this.clients = new Map();
    this.badTokens = new Set();
    this.onTokenBanned = onTokenBanned;
  }

  async attachTokens(tokens) {
    const uniqueTokens = [...new Set(tokens)];
    const tasks = uniqueTokens.map((token) => this.attachToken(token));
    await Promise.allSettled(tasks);

    for (const token of this.clients.keys()) {
      if (!uniqueTokens.includes(token)) {
        await this.detachToken(token);
      }
    }
  }

  async attachToken(token) {
    if (this.clients.has(token) || this.badTokens.has(token)) {
      return;
    }

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
    if (!client) {
      return;
    }

    try {
      await client.destroy();
    } finally {
      this.clients.delete(token);
    }
  }

  async sendBroadcast({ guild, content, onlineOnly = false, speed = 'medium' }) {
    const delay = SPEED_MS[speed] ?? SPEED_MS.medium;
    const members = await guild.members.fetch();
    const targets = members.filter((member) => {
      if (member.user.bot) return false;
      if (!onlineOnly) return true;

      // بعض الأعضاء Presence بتاعتهم بتكون unavailable؛ نعتبرهم قابلين للاستهداف
      // عشان أمر obc/ob ما يجيبش نسبة قليلة جدًا.
      if (!member.presence) return true;

      return ['online', 'idle', 'dnd'].includes(member.presence.status);
    });

    const activeClients = [...this.clients.values()];
    if (activeClients.length === 0) {
      return { sent: 0, failed: 0, total: targets.size, distribution: [] };
    }

    const membersArray = [...targets.values()];
    const chunkSize = Math.ceil(membersArray.length / activeClients.length);
    const assignments = activeClients.map((client, index) => ({
      client,
      members: membersArray.slice(index * chunkSize, (index + 1) * chunkSize)
    }));

    const workerResults = await Promise.all(
      assignments.map(async ({ client, members }) => {
        let workerSent = 0;
        let workerFailed = 0;

        for (const member of members) {
          try {
            const targetUser = await client.users.fetch(member.id);
            await targetUser.send(content);
            workerSent += 1;
          } catch {
            // Retry once عبر توكن آخر لرفع نسبة الوصول
            const fallbackClient = activeClients.find((item) => item !== client);
            if (fallbackClient) {
              try {
                const fallbackUser = await fallbackClient.users.fetch(member.id);
                await fallbackUser.send(content);
                workerSent += 1;
              } catch {
                workerFailed += 1;
              }
            } else {
              workerFailed += 1;
            }
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        return { workerSent, workerFailed };
      })
    );

    const sent = workerResults.reduce((total, item) => total + item.workerSent, 0);
    const failed = workerResults.reduce((total, item) => total + item.workerFailed, 0);

    return {
      sent,
      failed,
      total: targets.size,
      distribution: assignments
        .filter(({ members }) => members.length)
        .map(({ client, members }) => ({
          bot: client.user?.tag || 'unknown-bot',
          assigned: members.length
        }))
    };
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
        if (!client.application) {
          await client.application?.fetch();
        }

        if (!client.application) {
          report.push(`❌ ${client.user?.tag || 'unknown-bot'}: application unavailable`);
          continue;
        }

        await client.application.edit({ description });
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
    return {
      total: this.clients.size,
      banned: this.badTokens.size
    };
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
