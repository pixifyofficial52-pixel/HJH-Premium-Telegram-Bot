const express = require('express');
const { Telegraf, session, Markup } = require('telegraf');
const path = require('path');
require('dotenv').config();

// ---------- CONFIG ----------
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// WhatsApp Channels from .env
const WHATSAPP_CHANNELS = [
  {
    id: 'channel1',
    name: process.env.WHATSAPP_CHANNEL_1_NAME || 'Channel 1',
    link: process.env.WHATSAPP_CHANNEL_1_LINK || '#'
  },
  {
    id: 'channel2',
    name: process.env.WHATSAPP_CHANNEL_2_NAME || 'Channel 2',
    link: process.env.WHATSAPP_CHANNEL_2_LINK || '#'
  }
];

// ---------- BOT INIT ----------
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ---------- DATABASE (In-Memory) ----------
const userSessions = new Map();
const customCommands = new Map();
const tools = new Map();
const botSettings = {
  verificationMessage: `╔══════════════════════════╗\n║   VERIFICATION REQUIRED  ║\n╚══════════════════════════╝\n\nHello {name},\n\n⚠️ Please join BOTH WhatsApp channels:\n\n▶ {channel1}\n▶ {channel2}\n\n📸 After joining, send a SCREENSHOT of both channels.\n✅ Then click "I Have Joined Both" to verify.`,
  verifiedMessage: `╔══════════════════════════╗\n║  VERIFICATION SUCCESSFUL ║\n╚══════════════════════════╝\n\n✅ All commands are now unlocked!\n\nUse /help to see available commands.`,
  welcomeBackMessage: `╔══════════════════════════╗\n║   WELCOME BACK   ║\n╚══════════════════════════╝\n\n✓ You are already verified.\nUse /help for commands.`,
  screenshotReceived: `╔══════════════════════════╗\n║   SCREENSHOT RECEIVED   ║\n╚══════════════════════════╝\n\n✅ Screenshot received successfully!\n\n🔄 Now click "I Have Joined Both" to complete verification.`,
  screenshotRequired: `╔══════════════════════════╗\n║   SCREENSHOT REQUIRED   ║\n╚══════════════════════════╝\n\n❌ You haven't sent a screenshot yet!\n\n📸 Please:\n1. Join both WhatsApp channels\n2. Take a screenshot\n3. Send it here\n4. Then click "I Have Joined Both" again`,
  timerSeconds: 30
};

// ---------- BOT COMMANDS ----------

// START COMMAND
bot.command('start', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (userSessions.has(userId) && userSessions.get(userId)?.verified) {
    return ctx.reply(botSettings.welcomeBackMessage);
  }
  
  const buttons = WHATSAPP_CHANNELS.map(channel => {
    return [Markup.button.url(`▶ ${channel.name}`, channel.link)];
  });
  
  buttons.push([
    Markup.button.callback('✓ I Have Joined Both', 'check_verify')
  ]);
  
  userSessions.set(userId, {
    step: 'waiting_for_join',
    started: Date.now(),
    verified: false,
    screenshotSent: false,
    readyToVerify: false
  });
  
  let msg = botSettings.verificationMessage
    .replace(/{name}/g, ctx.from.first_name)
    .replace(/{channel1}/g, WHATSAPP_CHANNELS[0].name)
    .replace(/{channel2}/g, WHATSAPP_CHANNELS[1].name);
  
  await ctx.reply(msg, {
    ...Markup.inlineKeyboard(buttons)
  });
});

// SCREENSHOT HANDLER
bot.on('photo', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId)) {
    return ctx.reply(`✗ Please use /start first.`);
  }
  
  const session = userSessions.get(userId);
  if (session.verified) return ctx.reply(`✓ You are already verified!`);
  
  userSessions.set(userId, {
    ...session,
    screenshotSent: true,
    step: 'screenshot_received'
  });
  
  await ctx.reply(botSettings.screenshotReceived);
  
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

// VERIFY BUTTON
bot.action('check_verify', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId)) {
    return ctx.reply(`✗ Please use /start first.`);
  }
  
  const session = userSessions.get(userId);
  if (session.verified) return ctx.reply(`✓ You are already verified!`);
  
  if (!session.screenshotSent) {
    return ctx.reply(botSettings.screenshotRequired);
  }
  
  userSessions.set(userId, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    step: 'verified',
    screenshotSent: true
  });
  
  await ctx.reply(botSettings.verifiedMessage);
  
  // Send command list
  let commandsList = `╔══════════════════════════╗\n║    COMMANDS   ║\n╚══════════════════════════╝\n\n`;
  commandsList += `▶ /start - Start the bot\n`;
  commandsList += `▶ /help - Show this menu\n`;
  commandsList += `▶ /premium - Premium features\n`;
  commandsList += `▶ /tools - Available tools\n`;
  commandsList += `▶ /about - About this bot\n`;
  
  // Add custom commands
  for (const [cmd, response] of customCommands) {
    commandsList += `▶ /${cmd} - ${response.split('\n')[0]}\n`;
  }
  
  commandsList += `\n◆ All commands are unlocked.`;
  await ctx.reply(commandsList);
});

// HELP COMMAND
bot.command('help', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
    return ctx.reply(`✗ Please use /start and verify first.`);
  }
  
  let helpText = `╔══════════════════════════╗\n║    COMMANDS   ║\n╚══════════════════════════╝\n\n`;
  helpText += `▶ /start - Start the bot\n`;
  helpText += `▶ /help - Show this menu\n`;
  helpText += `▶ /premium - Premium features\n`;
  helpText += `▶ /tools - Available tools\n`;
  helpText += `▶ /about - About this bot\n`;
  helpText += `▶ /admin - Admin panel (admin only)\n`;
  
  for (const [cmd, response] of customCommands) {
    helpText += `▶ /${cmd} - ${response.split('\n')[0]}\n`;
  }
  
  helpText += `\n◆ All commands are unlocked.`;
  await ctx.reply(helpText);
});

// PREMIUM COMMAND
bot.command('premium', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
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

// TOOLS COMMAND
bot.command('tools', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
    return ctx.reply(`✗ Please verify first.`);
  }
  
  let toolsText = `╔══════════════════════════╗\n║    TOOLS   ║\n╚══════════════════════════╝\n\n`;
  
  if (tools.size === 0) {
    toolsText += `No tools available. Contact admin to add tools.`;
  } else {
    for (const [name, tool] of tools) {
      toolsText += `◆ ${tool.name}\n`;
      toolsText += `   ${tool.description}\n`;
      if (tool.link) toolsText += `   🔗 ${tool.link}\n`;
      toolsText += `\n`;
    }
  }
  
  await ctx.reply(toolsText);
});

// ABOUT COMMAND
bot.command('about', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
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

// ---------- ADMIN PANEL COMMANDS ----------
bot.command('admin', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (userId !== ADMIN_ID) {
    return ctx.reply(`✗ Unknown command.`);
  }
  
  const totalUsers = userSessions.size;
  const verifiedCount = Array.from(userSessions.values()).filter(u => u.verified).length;
  const screenshotCount = Array.from(userSessions.values()).filter(u => u.screenshotSent).length;
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   ADMIN PANEL   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `📊 Stats:\n` +
    `Total Users: ${totalUsers}\n` +
    `Verified: ${verifiedCount}\n` +
    `Screenshots: ${screenshotCount}\n` +
    `Custom Commands: ${customCommands.size}\n` +
    `Tools: ${tools.size}\n\n` +
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

// Auth Middleware
const authAdmin = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId !== ADMIN_ID) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Get Stats
app.get('/api/admin/stats', authAdmin, (req, res) => {
  const totalUsers = userSessions.size;
  const verifiedCount = Array.from(userSessions.values()).filter(u => u.verified).length;
  const screenshotCount = Array.from(userSessions.values()).filter(u => u.screenshotSent).length;
  
  res.json({
    totalUsers,
    verifiedCount,
    screenshotCount,
    customCommands: customCommands.size,
    tools: tools.size,
    whatsappChannels: WHATSAPP_CHANNELS
  });
});

// Get Users
app.get('/api/admin/users', authAdmin, (req, res) => {
  const users = [];
  for (const [id, data] of userSessions) {
    users.push({
      userId: id,
      ...data
    });
  }
  res.json(users);
});

// Get Commands
app.get('/api/admin/commands', authAdmin, (req, res) => {
  const commands = [];
  for (const [cmd, response] of customCommands) {
    commands.push({ command: cmd, response });
  }
  res.json(commands);
});

// Add Command
app.post('/api/admin/commands', authAdmin, (req, res) => {
  const { command, response } = req.body;
  
  if (!command || !response) {
    return res.status(400).json({ error: 'Command and response required' });
  }
  
  if (customCommands.has(command)) {
    return res.status(400).json({ error: 'Command already exists' });
  }
  
  customCommands.set(command, response);
  res.json({ success: true, command, response });
});

// Update Command
app.put('/api/admin/commands/:command', authAdmin, (req, res) => {
  const { command } = req.params;
  const { response } = req.body;
  
  if (!customCommands.has(command)) {
    return res.status(404).json({ error: 'Command not found' });
  }
  
  customCommands.set(command, response);
  res.json({ success: true, command, response });
});

// Delete Command
app.delete('/api/admin/commands/:command', authAdmin, (req, res) => {
  const { command } = req.params;
  
  if (!customCommands.has(command)) {
    return res.status(404).json({ error: 'Command not found' });
  }
  
  customCommands.delete(command);
  res.json({ success: true });
});

// Get Tools
app.get('/api/admin/tools', authAdmin, (req, res) => {
  const toolsList = [];
  for (const [id, tool] of tools) {
    toolsList.push({ id, ...tool });
  }
  res.json(toolsList);
});

// Add Tool
app.post('/api/admin/tools', authAdmin, (req, res) => {
  const { name, description, link } = req.body;
  
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description required' });
  }
  
  const id = Date.now().toString();
  tools.set(id, { name, description, link: link || '' });
  res.json({ success: true, id, name, description, link });
});

// Update Tool
app.put('/api/admin/tools/:id', authAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, link } = req.body;
  
  if (!tools.has(id)) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  
  tools.set(id, { name, description, link: link || '' });
  res.json({ success: true });
});

// Delete Tool
app.delete('/api/admin/tools/:id', authAdmin, (req, res) => {
  const { id } = req.params;
  
  if (!tools.has(id)) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  
  tools.delete(id);
  res.json({ success: true });
});

// Broadcast
app.post('/api/admin/broadcast', authAdmin, async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  
  const users = Array.from(userSessions.keys());
  let sent = 0;
  
  for (const userId of users) {
    try {
      await bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
      sent++;
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {}
  }
  
  res.json({ success: true, sent, total: users.length });
});

// Get Settings
app.get('/api/admin/settings', authAdmin, (req, res) => {
  res.json({
    settings: botSettings,
    channels: WHATSAPP_CHANNELS
  });
});

// Update Settings
app.put('/api/admin/settings', authAdmin, (req, res) => {
  const { settings, channels } = req.body;
  
  if (settings) {
    Object.assign(botSettings, settings);
  }
  
  if (channels) {
    // Update channels (in production, update .env)
    channels.forEach((ch, i) => {
      if (WHATSAPP_CHANNELS[i]) {
        WHATSAPP_CHANNELS[i].name = ch.name || WHATSAPP_CHANNELS[i].name;
        WHATSAPP_CHANNELS[i].link = ch.link || WHATSAPP_CHANNELS[i].link;
      }
    });
  }
  
  res.json({ success: true });
});

// Verify/Unverify User
app.post('/api/admin/users/:userId/verify', authAdmin, (req, res) => {
  const { userId } = req.params;
  const { verified } = req.body;
  
  if (!userSessions.has(userId)) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const session = userSessions.get(userId);
  session.verified = verified;
  userSessions.set(userId, session);
  
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
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    users: userSessions.size,
    verified: Array.from(userSessions.values()).filter(u => u.verified).length
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
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Admin Panel: https://hjh-premium-telegram-bot.vercel.app/hjh-admin`);
  await setWebhook();
});

module.exports = app;
