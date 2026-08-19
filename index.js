const express = require('express');
const { Telegraf, session, Markup } = require('telegraf');
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

// Store verified users (in-memory)
const verifiedUsers = new Map();

// ---------- CHECK WHATSAPP JOIN (SIMULATED) ----------
// Note: WhatsApp API doesn't provide direct channel join check
// This is a manual verification system
const checkWhatsAppJoin = (userId) => {
  // In production, you'd check via WhatsApp Business API
  // For now, we use session-based verification
  return false; // Always false until user manually confirms
};

// ---------- COMMANDS ----------

// START COMMAND
bot.command('start', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  // If already verified
  if (userData?.verified) {
    return ctx.reply(
      `╔══════════════════════════╗\n` +
      `║   WELCOME BACK   ║\n` +
      `╚══════════════════════════╝\n\n` +
      `✓ You are already verified.\n` +
      `Use /help for commands.`,
      { parse_mode: 'Markdown' }
    );
  }
  
  // Create channel buttons
  const buttons = WHATSAPP_CHANNELS.map(channel => {
    return [Markup.button.url(
      `▶ ${channel.name}`,
      channel.link
    )];
  });
  
  // Add verify button
  buttons.push([
    Markup.button.callback('✓ I Have Joined Both', 'verify')
  ]);
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   ACCESS DENIED   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Hello ${ctx.from.first_name},\n\n` +
    `Please join BOTH WhatsApp channels:\n\n` +
    `▶ Join both channels\n` +
    `▶ Then click "I Have Joined Both"`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
});

// VERIFY CALLBACK
bot.action('verify', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id.toString();
  
  // Mark as verified
  verifiedUsers.set(userId, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    username: ctx.from.username,
    firstName: ctx.from.first_name
  });
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║  VERIFICATION SUCCESSFUL ║\n` +
    `╚══════════════════════════╝\n\n` +
    `✓ All commands are now unlocked!\n\n` +
    `Use /help to see available commands.`,
    { parse_mode: 'Markdown' }
  );
});

// HELP COMMAND
bot.command('help', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
    return ctx.reply(
      `✗ Access Denied\n\nPlease use /start and verify first.`,
      { parse_mode: 'Markdown' }
    );
  }
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║    COMMANDS   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `▶ /start - Start the bot\n` +
    `▶ /help - Show this menu\n` +
    `▶ /premium - Premium features\n` +
    `▶ /tools - Available tools\n` +
    `▶ /about - About this bot\n` +
    `▶ /admin - Admin panel (admin only)\n\n` +
    `◆ All commands are unlocked.`,
    { parse_mode: 'Markdown' }
  );
});

// PREMIUM COMMAND
bot.command('premium', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
    return ctx.reply(`✗ Please verify first.`, { parse_mode: 'Markdown' });
  }
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   PREMIUM FEATURES   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `● Exclusive Content\n` +
    `● Priority Support\n` +
    `● Early Access\n` +
    `● Special Offers\n\n` +
    `Contact admin for more information.`,
    { parse_mode: 'Markdown' }
  );
});

// TOOLS COMMAND
bot.command('tools', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
    return ctx.reply(`✗ Please verify first.`, { parse_mode: 'Markdown' });
  }
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║    TOOLS   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `◆ Tool 1 - Description\n` +
    `◆ Tool 2 - Description\n` +
    `◆ Tool 3 - Description\n\n` +
    `More tools coming soon.`,
    { parse_mode: 'Markdown' }
  );
});

// ABOUT COMMAND
bot.command('about', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
    return ctx.reply(`✗ Please verify first.`, { parse_mode: 'Markdown' });
  }
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   HJH PREMIUM BOT   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Version: 2.0\n` +
    `Developer: HJH\n\n` +
    `Features:\n` +
    `● WhatsApp Force Join\n` +
    `● Premium Content\n` +
    `● Tools Management\n\n` +
    `Made with Love`,
    { parse_mode: 'Markdown' }
  );
});

// ADMIN COMMAND (Hidden)
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== ADMIN_ID) {
    return ctx.reply(`✗ Unknown command.`, { parse_mode: 'Markdown' });
  }
  
  const totalUsers = verifiedUsers.size;
  const verifiedCount = Array.from(verifiedUsers.values()).filter(u => u.verified).length;
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   ADMIN PANEL   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Total Users: ${totalUsers}\n` +
    `Verified: ${verifiedCount}\n\n` +
    `◆ Admin commands coming soon.`,
    { parse_mode: 'Markdown' }
  );
});

// CATCH ALL
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
    return ctx.reply(`✗ Please use /start and verify first.`, { parse_mode: 'Markdown' });
  }
  
  await ctx.reply(
    `I received: ${ctx.message.text}\n\nUse /help for commands.`,
    { parse_mode: 'Markdown' }
  );
});

// ERROR HANDLER
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  if (ctx) ctx.reply('⚠️ Error occurred. Please try again.');
});

// ---------- EXPRESS APP ----------
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'running', version: '2.0', webhook: '/webhook', health: '/health' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), users: verifiedUsers.size });
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

const setWebhook = async () => {
  try {
    const url = 'https://hjh-premium-telegram-bot.vercel.app/webhook';
    await bot.telegram.setWebhook(url);
    console.log('✅ Webhook set to:', url);
  } catch (error) {
    console.error('❌ Webhook set failed:', error.message);
  }
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await setWebhook();
});

module.exports = app;
