const express = require('express');
const { Telegraf, session, Markup } = require('telegraf');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
require('dotenv').config();

// ---------- CONFIG ----------
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const DATA_FILE = path.join(__dirname, 'data.json');

// API URLs
const SIM_API_URL = 'https://hjh-pro-simdatabase-api.vercel.app/api/sim';
const TIKTOK_API_URL = 'https://hjh-tiktok-bulk-api.vercel.app/api/tiktok-bulk';
const DOWNLOADER_API_URL = 'https://hjh-social-media-downloader-api.vercel.app/api/download';

// ---------- WHATSAPP CHANNEL LINKS ----------
const CHANNEL_1_NAME = 'HJH TOOLS Official';
const CHANNEL_1_LINK = 'https://whatsapp.com/channel/0029VbAaNJ6C1FuB0mIAx93M';
const CHANNEL_2_NAME = 'SBL OFFICIAL';
const CHANNEL_2_LINK = 'https://whatsapp.com/channel/0029VbBVDAc1noz5dhxnYO3r';

// ---------- DATA PERSISTENCE ----------
let data = {};

const loadData = async () => {
  try {
    if (await fs.pathExists(DATA_FILE)) {
      data = await fs.readJson(DATA_FILE);
      console.log('✓ Data loaded from file');
    } else {
      data = {
        users: {},
        botSettings: {
          verificationMessage: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃   VERIFICATION REQUIRED   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\nHello {name},\n\n⚠ Please join BOTH WhatsApp channels:\n\n▶ {channel1}\n▶ {channel2}\n\n📸 After joining, send a SCREENSHOT of both channels.\n✓ Then click "I Have Joined Both" to verify.`,
          verifiedMessage: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃   VERIFICATION SUCCESSFUL   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n✓ All tools are now unlocked!\n\nUse the buttons below to access tools:`,
          welcomeBackMessage: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃     WELCOME BACK     ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n✓ You are already verified.\nUse the buttons below to access tools.`,
          screenshotReceived: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃   SCREENSHOT RECEIVED   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n✓ Screenshot received successfully!\n\n🔄 Now click "I Have Joined Both" to complete verification.`,
          screenshotRequired: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃   SCREENSHOT REQUIRED   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n✗ You haven't sent a screenshot yet!\n\n📸 Please:\n1. Join both WhatsApp channels\n2. Take a screenshot\n3. Send it here\n4. Then click "I Have Joined Both" again`
        },
        whatsappChannels: [
          { id: 'channel1', name: CHANNEL_1_NAME, link: CHANNEL_1_LINK },
          { id: 'channel2', name: CHANNEL_2_NAME, link: CHANNEL_2_LINK }
        ]
      };
      await saveData();
      console.log('✓ Default data created');
    }
  } catch (error) {
    console.error('✗ Error loading data:', error);
  }
};

const saveData = async () => {
  try {
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    console.log('✓ Data saved to file');
  } catch (error) {
    console.error('✗ Error saving data:', error);
  }
};

// ---------- BOT INIT ----------
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ---------- HELPER FUNCTIONS ----------
const getUserSessions = () => data.users || {};
const setUserSessions = (users) => { data.users = users; saveData(); };
const getBotSettings = () => data.botSettings || {};
const getWhatsAppChannels = () => {
  return [
    { id: 'channel1', name: CHANNEL_1_NAME, link: CHANNEL_1_LINK },
    { id: 'channel2', name: CHANNEL_2_NAME, link: CHANNEL_2_LINK }
  ];
};

// ---------- API FUNCTIONS ----------
const getSimData = async (number) => {
  try {
    const cleanNumber = number.replace(/[\s\-\(\)]/g, '');
    if (!cleanNumber.match(/^03\d{9}$/)) {
      return { success: false, error: 'Invalid Pakistani number. Use: 03XXXXXXXXX' };
    }
    const url = `${SIM_API_URL}?q=${cleanNumber}`;
    const response = await axios.get(url, { timeout: 15000 });
    if (response.data && response.data.success !== false) {
      return { success: true, data: response.data, number: cleanNumber };
    }
    return { success: false, error: response.data?.message || 'No data found' };
  } catch (error) {
    return { success: false, error: 'API Error: ' + (error.response?.data?.message || error.message) };
  }
};

const getTikTokData = async (username) => {
  try {
    const cleanUsername = username.replace('@', '').trim();
    const url = `${TIKTOK_API_URL}?target=${cleanUsername}`;
    const response = await axios.get(url, { timeout: 20000 });
    if (response.data && response.data.success !== false) {
      return { success: true, data: response.data, username: cleanUsername };
    }
    return { success: false, error: response.data?.message || 'No data found' };
  } catch (error) {
    return { success: false, error: 'API Error: ' + (error.response?.data?.message || error.message) };
  }
};

const getDownloadData = async (url) => {
  try {
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `${DOWNLOADER_API_URL}?url=${encodedUrl}`;
    const response = await axios.get(apiUrl, { timeout: 30000 });
    if (response.data && response.data.success !== false) {
      return { success: true, data: response.data, url: url };
    }
    return { success: false, error: response.data?.message || 'Download failed' };
  } catch (error) {
    return { success: false, error: 'API Error: ' + (error.response?.data?.message || error.message) };
  }
};

// ---------- FORMAT FUNCTIONS ----------
const formatSimData = (result) => {
  if (!result.success) {
    return `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   ERROR   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n✗ ${result.error}`;
  }
  const data = result.data.data || result.data;
  let response = `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   SIM DATABASE   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n📱 Number: ${result.number}\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  response += `▶ Provider: ${data.provider || data.operator || data.network || 'Unknown'}\n`;
  response += `▶ CNIC: ${data.cnic || data.cnicNumber || 'Not available'}\n`;
  response += `▶ Name: ${data.name || data.ownerName || 'Not available'}\n`;
  response += `▶ Status: ${data.status || data.activeStatus || 'Active'}\n`;
  response += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (data.location) response += `📍 Location: ${data.location}\n`;
  if (data.city) response += `📍 City: ${data.city}\n`;
  if (data.state) response += `📍 State: ${data.state}\n`;
  response += `\n⚡ Powered by HJH SIM Database`;
  return response;
};

const formatTikTokData = (result) => {
  if (!result.success) {
    return `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   ERROR   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n✗ ${result.error}`;
  }
  const data = result.data.data || result.data;
  let response = `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   TIKTOK BULK   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n👤 Username: @${result.username}\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (data.stats) {
    response += `▶ Followers: ${data.stats.followerCount || data.followers || 'N/A'}\n`;
    response += `▶ Following: ${data.stats.followingCount || data.following || 'N/A'}\n`;
    response += `▶ Likes: ${data.stats.heartCount || data.likes || 'N/A'}\n`;
    response += `▶ Videos: ${data.stats.videoCount || data.videos || 'N/A'}\n`;
  }
  if (data.bio) response += `📝 Bio: ${data.bio}\n`;
  if (data.avatar) response += `🖼 Avatar: ${data.avatar}\n`;
  response += `━━━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by HJH TikTok API`;
  return response;
};

const formatDownloadData = (result) => {
  if (!result.success) {
    return `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   ERROR   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n✗ ${result.error}`;
  }
  const data = result.data.data || result.data;
  let response = `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   DOWNLOADER   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n✓ Download ready!\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (data.title) response += `📌 Title: ${data.title}\n`;
  if (data.thumbnail) response += `🖼 Thumbnail: ${data.thumbnail}\n`;
  if (data.duration) response += `⏱ Duration: ${data.duration}\n`;
  if (data.quality) response += `▶ Quality: ${data.quality}\n`;
  if (data.downloadUrl || data.url) {
    response += `━━━━━━━━━━━━━━━━━━━━━━\n🔗 Download: ${data.downloadUrl || data.url}\n`;
  }
  response += `━━━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by HJH Downloader API`;
  return response;
};

// ---------- BOT COMMANDS ----------

// START COMMAND
bot.command('start', async (ctx) => {
  console.log('📨 /start received from:', ctx.from.id);
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (users[userId]?.verified) {
    return showToolsMenu(ctx);
  }
  
  const channels = getWhatsAppChannels();
  const buttons = [];
  
  channels.forEach(channel => {
    if (channel.link && channel.link !== '#' && channel.link.startsWith('http')) {
      buttons.push([Markup.button.url(`▶ ${channel.name}`, channel.link)]);
    }
  });
  
  buttons.push([
    Markup.button.callback('✓ I Have Joined Both', 'check_verify')
  ]);
  
  users[userId] = {
    step: 'waiting_for_join',
    started: Date.now(),
    verified: false,
    screenshotSent: false
  };
  setUserSessions(users);
  
  let msg = getBotSettings().verificationMessage
    .replace(/{name}/g, ctx.from.first_name)
    .replace(/{channel1}/g, channels[0]?.name || 'Channel 1')
    .replace(/{channel2}/g, channels[1]?.name || 'Channel 2');
  
  await ctx.reply(msg, { ...Markup.inlineKeyboard(buttons) });
});

// SHOW TOOLS MENU
const showToolsMenu = async (ctx) => {
  const buttons = [
    [Markup.button.callback('▶ SIM Database', 'tool_sim')],
    [Markup.button.callback('▶ TikTok Bulk', 'tool_tiktok')],
    [Markup.button.callback('▶ Social Downloader', 'tool_downloader')]
  ];
  
  await ctx.reply(
    `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   TOOLS MENU   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\nSelect a tool below:`,
    { ...Markup.inlineKeyboard(buttons) }
  );
};

// ---------- ⭐ TOOL HANDLERS ----------
bot.action('tool_sim', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    ctx.session.tool = 'sim';
    await ctx.reply(
      `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   SIM DATABASE   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n🔍 Please send the Pakistani mobile number.\n\n📱 Format: 03217558607\n\nType /cancel to cancel.`
    );
  } catch (error) {
    console.error('SIM tool error:', error);
    await ctx.reply('⚠️ Error loading SIM tool. Please try again.');
  }
});

bot.action('tool_tiktok', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    ctx.session.tool = 'tiktok';
    await ctx.reply(
      `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   TIKTOK BULK   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n🔍 Please send the TikTok username.\n\n👤 Format: @username\n\nType /cancel to cancel.`
    );
  } catch (error) {
    console.error('TikTok tool error:', error);
    await ctx.reply('⚠️ Error loading TikTok tool. Please try again.');
  }
});

bot.action('tool_downloader', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    ctx.session.tool = 'downloader';
    await ctx.reply(
      `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   DOWNLOADER   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n🔍 Please send the video URL.\n\n📌 Supported: Facebook, Instagram, YouTube, TikTok\n\nType /cancel to cancel.`
    );
  } catch (error) {
    console.error('Downloader tool error:', error);
    await ctx.reply('⚠️ Error loading Downloader tool. Please try again.');
  }
});

// Cancel command
bot.command('cancel', async (ctx) => {
  if (ctx.session?.tool) {
    ctx.session.tool = null;
    await ctx.reply(`✗ Operation cancelled.`);
    await showToolsMenu(ctx);
  }
});

// ---------- HANDLE USER INPUT ----------
bot.on('text', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  const text = ctx.message.text.trim();
  
  if (!users[userId]?.verified) {
    return ctx.reply(`✗ Please use /start and verify first.`);
  }
  
  const tool = ctx.session?.tool;
  
  if (tool === 'sim') {
    ctx.session.tool = null;
    await ctx.reply(`⏳ Checking number: ${text}...`);
    const result = await getSimData(text);
    await ctx.reply(formatSimData(result));
    await showToolsMenu(ctx);
    return;
  }
  
  if (tool === 'tiktok') {
    ctx.session.tool = null;
    await ctx.reply(`⏳ Fetching TikTok data: ${text}...`);
    const result = await getTikTokData(text);
    await ctx.reply(formatTikTokData(result));
    await showToolsMenu(ctx);
    return;
  }
  
  if (tool === 'downloader') {
    ctx.session.tool = null;
    await ctx.reply(`⏳ Processing URL: ${text}...`);
    const result = await getDownloadData(text);
    await ctx.reply(formatDownloadData(result));
    await showToolsMenu(ctx);
    return;
  }
  
  await showToolsMenu(ctx);
});

// ---------- SCREENSHOT HANDLER ----------
bot.on('photo', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]) return ctx.reply(`✗ Please use /start first.`);
  if (users[userId].verified) return showToolsMenu(ctx);
  
  users[userId].screenshotSent = true;
  setUserSessions(users);
  
  await ctx.reply(getBotSettings().screenshotReceived);
  
  if (ADMIN_ID) {
    try {
      await ctx.forwardMessage(ADMIN_ID);
    } catch (error) {}
  }
});

// ---------- VERIFY BUTTON ----------
bot.action('check_verify', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]) return ctx.reply(`✗ Please use /start first.`);
  if (users[userId].verified) return showToolsMenu(ctx);
  if (!users[userId].screenshotSent) {
    return ctx.reply(getBotSettings().screenshotRequired);
  }
  
  users[userId] = {
    verified: true,
    verifiedAt: new Date().toISOString(),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    screenshotSent: true
  };
  setUserSessions(users);
  
  await ctx.reply(getBotSettings().verifiedMessage);
  await showToolsMenu(ctx);
});

// ---------- ADMIN COMMAND ----------
bot.command('admin', async (ctx) => {
  const userId = String(ctx.from.id);
  if (userId !== ADMIN_ID) return ctx.reply(`✗ Unknown command.`);
  
  const users = getUserSessions();
  await ctx.reply(
    `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃   ADMIN PANEL   ┃\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
    `▶ Total Users: ${Object.keys(users).length}\n` +
    `▶ Verified: ${Object.values(users).filter(u => u.verified).length}\n\n` +
    `🌐 Admin Panel: https://hjh-premium-telegram-bot.vercel.app/hjh-admin`
  );
});

// ---------- EXPRESS APP ----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin API
app.get('/api/admin/stats', (req, res) => {
  const users = getUserSessions();
  res.json({
    totalUsers: Object.keys(users).length,
    verifiedCount: Object.values(users).filter(u => u.verified).length
  });
});

app.get('/hjh-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'running', version: '3.0', adminPanel: '/hjh-admin' });
});

app.get('/health', (req, res) => {
  const users = getUserSessions();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    users: Object.keys(users).length
  });
});

// ---------- WEBHOOK SET ----------
const setWebhook = async () => {
  try {
    const url = 'https://hjh-premium-telegram-bot.vercel.app/webhook';
    await bot.telegram.setWebhook(url);
    console.log('✓ Webhook set to:', url);
  } catch (error) {
    console.error('✗ Webhook set failed:', error.message);
  }
};

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;

loadData().then(() => {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Admin Panel: https://hjh-premium-telegram-bot.vercel.app/hjh-admin`);
    await setWebhook();
  });
});

module.exports = app;
