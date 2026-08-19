const express = require('express');
const { Telegraf, session, Markup } = require('telegraf');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// ---------- CONFIG ----------
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const DATA_FILE = path.join(__dirname, 'data.json');

// ---------- DATA PERSISTENCE ----------
let data = {};

const loadData = async () => {
  try {
    if (await fs.pathExists(DATA_FILE)) {
      data = await fs.readJson(DATA_FILE);
      console.log('✅ Data loaded from file');
    } else {
      // ⭐ DEFAULT CHANNELS - YAHAN SE LE RAHA HAI
      data = {
        users: {},
        customCommands: {},
        tools: {},
        botSettings: {
          verificationMessage: `╔══════════════════════════╗\n║   VERIFICATION REQUIRED  ║\n╚══════════════════════════╝\n\nHello {name},\n\n⚠️ Please join BOTH WhatsApp channels:\n\n▶ {channel1}\n▶ {channel2}\n\n📸 After joining, send a SCREENSHOT of both channels.\n✅ Then click "I Have Joined Both" to verify.`,
          verifiedMessage: `╔══════════════════════════╗\n║  VERIFICATION SUCCESSFUL ║\n╚══════════════════════════╝\n\n✅ All commands are now unlocked!\n\nUse /help to see available commands.`,
          welcomeBackMessage: `╔══════════════════════════╗\n║   WELCOME BACK   ║\n╚══════════════════════════╝\n\n✓ You are already verified.\nUse /help for commands.`,
          screenshotReceived: `╔══════════════════════════╗\n║   SCREENSHOT RECEIVED   ║\n╚══════════════════════════╝\n\n✅ Screenshot received successfully!\n\n🔄 Now click "I Have Joined Both" to complete verification.`,
          screenshotRequired: `╔══════════════════════════╗\n║   SCREENSHOT REQUIRED   ║\n╚══════════════════════════╝\n\n❌ You haven't sent a screenshot yet!\n\n📸 Please:\n1. Join both WhatsApp channels\n2. Take a screenshot\n3. Send it here\n4. Then click "I Have Joined Both" again`
        },
        // ⭐ YAHAN CHANNELS DEFINED HAIN
        whatsappChannels: [
          {
            id: 'channel1',
            name: 'HJH Tools Official',
            link: 'https://whatsapp.com/channel/0029VaXXXXXXXXX1'
          },
          {
            id: 'channel2',
            name: 'SBL Official',
            link: 'https://whatsapp.com/channel/0029VaXXXXXXXXX2'
          }
        ]
      };
      await saveData();
      console.log('✅ Default data created with channels');
    }
  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
};

const saveData = async () => {
  try {
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    console.log('✅ Data saved to file');
  } catch (error) {
    console.error('❌ Error saving data:', error);
  }
};

// ---------- BOT INIT ----------
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ---------- HELPER FUNCTIONS ----------
const getUserSessions = () => data.users || {};
const setUserSessions = (users) => { data.users = users; saveData(); };
const getCustomCommands = () => data.customCommands || {};
const setCustomCommands = (cmds) => { data.customCommands = cmds; saveData(); };
const getTools = () => data.tools || {};
const setTools = (tools) => { data.tools = tools; saveData(); };
const getBotSettings = () => data.botSettings || {};
const setBotSettings = (settings) => { data.botSettings = settings; saveData(); };
const getWhatsAppChannels = () => {
  // ⭐ FORCE RETURN CHANNELS - AGAR KHALI HAIN TOH DEFAULT DAAL DO
  if (!data.whatsappChannels || data.whatsappChannels.length === 0) {
    data.whatsappChannels = [
      {
        id: 'channel1',
        name: 'HJH Tools Official',
        link: 'https://whatsapp.com/channel/0029VaXXXXXXXXX1'
      },
      {
        id: 'channel2',
        name: 'SBL Official',
        link: 'https://whatsapp.com/channel/0029VaXXXXXXXXX2'
      }
    ];
    saveData();
  }
  return data.whatsappChannels;
};
const setWhatsAppChannels = (channels) => { data.whatsappChannels = channels; saveData(); };

// ---------- BOT COMMANDS ----------

// START COMMAND
bot.command('start', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  console.log('📢 /start command received from:', userId);
  
  // If already verified
  if (users[userId]?.verified) {
    return ctx.reply(getBotSettings().welcomeBackMessage);
  }
  
  // ⭐ GET CHANNELS
  const channels = getWhatsAppChannels();
  console.log('📢 Channels from data:', JSON.stringify(channels, null, 2));
  
  // ⭐ FORCE CREATE BUTTONS - CHANNEL LINKS
  const buttons = [];
  
  // Channel 1 button
  if (channels[0]) {
    buttons.push([
      Markup.button.url(
        `📱 ${channels[0].name || 'Channel 1'}`,
        channels[0].link || '#'
      )
    ]);
  } else {
    buttons.push([
      Markup.button.url('📱 Channel 1', '#')
    ]);
  }
  
  // Channel 2 button
  if (channels[1]) {
    buttons.push([
      Markup.button.url(
        `📱 ${channels[1].name || 'Channel 2'}`,
        channels[1].link || '#'
      )
    ]);
  } else {
    buttons.push([
      Markup.button.url('📱 Channel 2', '#')
    ]);
  }
  
  // ✅ ADD VERIFY BUTTON
  buttons.push([
    Markup.button.callback('✅ I Have Joined Both', 'check_verify')
  ]);
  
  console.log('📢 Buttons created:', buttons.length);
  
  // Store user session
  users[userId] = {
    step: 'waiting_for_join',
    started: Date.now(),
    verified: false,
    screenshotSent: false,
    readyToVerify: false
  };
  setUserSessions(users);
  
  // Build message with channel names
  let msg = getBotSettings().verificationMessage
    .replace(/{name}/g, ctx.from.first_name)
    .replace(/{channel1}/g, channels[0]?.name || 'Channel 1')
    .replace(/{channel2}/g, channels[1]?.name || 'Channel 2');
  
  // ⭐ SEND WITH BUTTONS
  await ctx.reply(msg, {
    ...Markup.inlineKeyboard(buttons)
  });
  
  console.log('✅ Reply sent with', buttons.length, 'buttons');
});

// VERIFY BUTTON
bot.action('check_verify', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]) {
    return ctx.reply(`✗ Please use /start first.`);
  }
  
  if (users[userId].verified) return ctx.reply(`✓ You are already verified!`);
  
  if (!users[userId].screenshotSent) {
    return ctx.reply(getBotSettings().screenshotRequired);
  }
  
  users[userId] = {
    verified: true,
    verifiedAt: new Date().toISOString(),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    step: 'verified',
    screenshotSent: true
  };
  setUserSessions(users);
  
  await ctx.reply(getBotSettings().verifiedMessage);
  
  // Send command list
  let commandsList = `╔══════════════════════════╗\n║    COMMANDS   ║\n╚══════════════════════════╝\n\n`;
  commandsList += `▶ /start - Start the bot\n`;
  commandsList += `▶ /help - Show this menu\n`;
  commandsList += `▶ /premium - Premium features\n`;
  commandsList += `▶ /tools - Available tools\n`;
  commandsList += `▶ /about - About this bot\n`;
  
  const cmds = getCustomCommands();
  for (const [cmd, response] of Object.entries(cmds)) {
    commandsList += `▶ /${cmd} - ${response.split('\n')[0]}\n`;
  }
  
  commandsList += `\n◆ All commands are unlocked.`;
  await ctx.reply(commandsList);
});

// ---------- SCREENSHOT HANDLER ----------
bot.on('photo', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]) {
    return ctx.reply(`✗ Please use /start first.`);
  }
  
  if (users[userId].verified) return ctx.reply(`✓ You are already verified!`);
  
  users[userId].screenshotSent = true;
  users[userId].step = 'screenshot_received';
  setUserSessions(users);
  
  await ctx.reply(getBotSettings().screenshotReceived);
  
  if (ADMIN_ID) {
    try {
      await ctx.forwardMessage(ADMIN_ID);
      await ctx.telegram.sendMessage(
        ADMIN_ID,
        `📸 New screenshot from: ${ctx.from.first_name} (@${ctx.from.username || 'No username'})\nUser ID: ${userId}`
      );
    } catch (error) {}
  }
});

// ---------- DOCUMENT HANDLER ----------
bot.on('document', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]) {
    return ctx.reply(`✗ Please use /start first.`);
  }
  
  if (users[userId].verified) return ctx.reply(`✓ You are already verified!`);
  
  const mimeType = ctx.message.document.mime_type;
  if (mimeType && mimeType.startsWith('image/')) {
    users[userId].screenshotSent = true;
    users[userId].step = 'screenshot_received';
    setUserSessions(users);
    
    await ctx.reply(getBotSettings().screenshotReceived);
    
    if (ADMIN_ID) {
      try {
        await ctx.forwardMessage(ADMIN_ID);
      } catch (error) {}
    }
  } else {
    await ctx.reply(`✗ Please send a screenshot (image file).`);
  }
});

// ---------- HELP COMMAND ----------
bot.command('help', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]?.verified) {
    return ctx.reply(`✗ Please use /start and verify first.`);
  }
  
  let helpText = `╔══════════════════════════╗\n║    COMMANDS   ║\n╚══════════════════════════╝\n\n`;
  helpText += `▶ /start - Start the bot\n`;
  helpText += `▶ /help - Show this menu\n`;
  helpText += `▶ /premium - Premium features\n`;
  helpText += `▶ /tools - Available tools\n`;
  helpText += `▶ /about - About this bot\n`;
  helpText += `▶ /admin - Admin panel (admin only)\n`;
  
  const cmds = getCustomCommands();
  for (const [cmd, response] of Object.entries(cmds)) {
    helpText += `▶ /${cmd} - ${response.split('\n')[0]}\n`;
  }
  
  helpText += `\n◆ All commands are unlocked.`;
  await ctx.reply(helpText);
});

// ---------- PREMIUM COMMAND ----------
bot.command('premium', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]?.verified) {
    return ctx.reply(`✗ Please verify first.`);
  }
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   PREMIUM FEATURES   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `● Exclusive Content\n` +
    `● Priority Support\n` +
    `● Early Access\n` +
    `● Special Offers\n\n` +
    `Contact admin for more information.`
  );
});

// ---------- TOOLS COMMAND ----------
bot.command('tools', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]?.verified) {
    return ctx.reply(`✗ Please verify first.`);
  }
  
  const tools = getTools();
  let toolsText = `╔══════════════════════════╗\n║    TOOLS   ║\n╚══════════════════════════╝\n\n`;
  
  if (Object.keys(tools).length === 0) {
    toolsText += `No tools available. Contact admin to add tools.`;
  } else {
    for (const [id, tool] of Object.entries(tools)) {
      toolsText += `◆ ${tool.name}\n`;
      toolsText += `   ${tool.description}\n`;
      if (tool.link) toolsText += `   🔗 ${tool.link}\n`;
      toolsText += `\n`;
    }
  }
  
  await ctx.reply(toolsText);
});

// ---------- ABOUT COMMAND ----------
bot.command('about', async (ctx) => {
  const userId = String(ctx.from.id);
  const users = getUserSessions();
  
  if (!users[userId]?.verified) {
    return ctx.reply(`✗ Please verify first.`);
  }
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   HJH PREMIUM BOT   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Version: 2.0\n` +
    `Developer: HJH\n\n` +
    `Features:\n` +
    `● WhatsApp Force Join\n` +
    `● Screenshot Verification\n` +
    `● Premium Content\n` +
    `● Tools Management\n` +
    `● Custom Commands\n\n` +
    `Made with Love`
  );
});

// ---------- CUSTOM COMMANDS HANDLER ----------
bot.use(async (ctx, next) => {
  if (!ctx.message || !ctx.message.text) return next();
  
  const text = ctx.message.text;
  if (!text.startsWith('/')) return next();
  
  const command = text.slice(1).split(' ')[0].toLowerCase();
  const cmds = getCustomCommands();
  
  if (cmds[command]) {
    const userId = String(ctx.from.id);
    const users = getUserSessions();
    
    if (!users[userId]?.verified) {
      return ctx.reply(`✗ Please use /start and verify first.`);
    }
    
    return ctx.reply(cmds[command]);
  }
  
  return next();
});

// ---------- ADMIN COMMAND ----------
bot.command('admin', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (userId !== ADMIN_ID) {
    return ctx.reply(`✗ Unknown command.`);
  }
  
  const users = getUserSessions();
  const totalUsers = Object.keys(users).length;
  const verifiedCount = Object.values(users).filter(u => u.verified).length;
  const screenshotCount = Object.values(users).filter(u => u.screenshotSent).length;
  const cmds = getCustomCommands();
  const tools = getTools();
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   ADMIN PANEL   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `📊 Stats:\n` +
    `Total Users: ${totalUsers}\n` +
    `Verified: ${verifiedCount}\n` +
    `Screenshots: ${screenshotCount}\n` +
    `Custom Commands: ${Object.keys(cmds).length}\n` +
    `Tools: ${Object.keys(tools).length}\n\n` +
    `🌐 Admin Panel: https://hjh-premium-telegram-bot.vercel.app/hjh-admin\n` +
    `🔑 Use your Telegram ID to login.`
  );
});

// ---------- EXPRESS APP ----------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- ADMIN PANEL API ----------
const authAdmin = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId !== ADMIN_ID) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/api/admin/stats', authAdmin, (req, res) => {
  const users = getUserSessions();
  const cmds = getCustomCommands();
  const tools = getTools();
  
  res.json({
    totalUsers: Object.keys(users).length,
    verifiedCount: Object.values(users).filter(u => u.verified).length,
    screenshotCount: Object.values(users).filter(u => u.screenshotSent).length,
    customCommands: Object.keys(cmds).length,
    tools: Object.keys(tools).length,
    whatsappChannels: getWhatsAppChannels()
  });
});

app.get('/api/admin/users', authAdmin, (req, res) => {
  const users = getUserSessions();
  const userList = Object.entries(users).map(([id, data]) => ({
    userId: id,
    ...data
  }));
  res.json(userList);
});

app.get('/api/admin/commands', authAdmin, (req, res) => {
  const cmds = getCustomCommands();
  const commands = Object.entries(cmds).map(([cmd, response]) => ({
    command: cmd,
    response
  }));
  res.json(commands);
});

app.post('/api/admin/commands', authAdmin, (req, res) => {
  const { command, response } = req.body;
  
  if (!command || !response) {
    return res.status(400).json({ error: 'Command and response required' });
  }
  
  const cmds = getCustomCommands();
  if (cmds[command]) {
    return res.status(400).json({ error: 'Command already exists' });
  }
  
  cmds[command] = response;
  setCustomCommands(cmds);
  res.json({ success: true, command, response });
});

app.put('/api/admin/commands/:command', authAdmin, (req, res) => {
  const { command } = req.params;
  const { response } = req.body;
  
  if (!response) {
    return res.status(400).json({ error: 'Response required' });
  }
  
  const cmds = getCustomCommands();
  if (!cmds[command]) {
    return res.status(404).json({ error: 'Command not found' });
  }
  
  cmds[command] = response;
  setCustomCommands(cmds);
  res.json({ success: true, command, response });
});

app.delete('/api/admin/commands/:command', authAdmin, (req, res) => {
  const { command } = req.params;
  const cmds = getCustomCommands();
  
  if (!cmds[command]) {
    return res.status(404).json({ error: 'Command not found' });
  }
  
  delete cmds[command];
  setCustomCommands(cmds);
  res.json({ success: true });
});

app.get('/api/admin/tools', authAdmin, (req, res) => {
  const tools = getTools();
  const toolList = Object.entries(tools).map(([id, tool]) => ({
    id,
    ...tool
  }));
  res.json(toolList);
});

app.post('/api/admin/tools', authAdmin, (req, res) => {
  const { name, description, link } = req.body;
  
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description required' });
  }
  
  const tools = getTools();
  const id = Date.now().toString();
  tools[id] = { name, description, link: link || '' };
  setTools(tools);
  res.json({ success: true, id, name, description, link });
});

app.put('/api/admin/tools/:id', authAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, link } = req.body;
  
  const tools = getTools();
  if (!tools[id]) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  
  tools[id] = { name, description, link: link || '' };
  setTools(tools);
  res.json({ success: true });
});

app.delete('/api/admin/tools/:id', authAdmin, (req, res) => {
  const { id } = req.params;
  const tools = getTools();
  
  if (!tools[id]) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  
  delete tools[id];
  setTools(tools);
  res.json({ success: true });
});

app.post('/api/admin/broadcast', authAdmin, async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  
  const users = getUserSessions();
  const userIds = Object.keys(users);
  let sent = 0;
  let failed = 0;
  
  for (const userId of userIds) {
    try {
      await bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
      sent++;
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      failed++;
    }
  }
  
  res.json({ success: true, sent, failed, total: userIds.length });
});

app.get('/api/admin/settings', authAdmin, (req, res) => {
  res.json({
    settings: getBotSettings(),
    channels: getWhatsAppChannels()
  });
});

app.put('/api/admin/settings', authAdmin, (req, res) => {
  const { settings, channels } = req.body;
  
  if (settings) {
    const currentSettings = getBotSettings();
    Object.assign(currentSettings, settings);
    setBotSettings(currentSettings);
  }
  
  if (channels && Array.isArray(channels)) {
    const currentChannels = getWhatsAppChannels();
    channels.forEach((ch, i) => {
      if (currentChannels[i]) {
        if (ch.name) currentChannels[i].name = ch.name;
        if (ch.link) currentChannels[i].link = ch.link;
      }
    });
    setWhatsAppChannels(currentChannels);
  }
  
  res.json({ success: true });
});

app.post('/api/admin/users/:userId/verify', authAdmin, (req, res) => {
  const { userId } = req.params;
  const { verified } = req.body;
  
  const users = getUserSessions();
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users[userId].verified = verified;
  setUserSessions(users);
  res.json({ success: true });
});

// ---------- SERVE ADMIN PANEL HTML ----------
app.get('/hjh-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------- BOT WEBHOOK ----------
app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// ---------- HEALTH CHECK ----------
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    version: '2.0',
    adminPanel: '/hjh-admin',
    webhook: '/webhook',
    health: '/health'
  });
});

app.get('/health', (req, res) => {
  const users = getUserSessions();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    users: Object.keys(users).length,
    verified: Object.values(users).filter(u => u.verified).length
  });
});

// ---------- WEBHOOK SET ----------
const setWebhook = async () => {
  try {
    const url = 'https://hjh-premium-telegram-bot.vercel.app/webhook';
    await bot.telegram.setWebhook(url);
    console.log('✅ Webhook set to:', url);
  } catch (error) {
    console.error('❌ Webhook set failed:', error.message);
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
