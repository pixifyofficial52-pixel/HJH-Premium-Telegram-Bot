const express = require('express');
const { Telegraf, session } = require('telegraf');
require('dotenv').config();

// ---------- CONFIG ----------
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// WhatsApp Channels (`.env` se lein)
const WHATSAPP_CHANNELS = [
  {
    name: process.env.WHATSAPP_CHANNEL_1_NAME || 'Channel 1',
    link: process.env.WHATSAPP_CHANNEL_1_LINK || '#'
  },
  {
    name: process.env.WHATSAPP_CHANNEL_2_NAME || 'Channel 2',
    link: process.env.WHATSAPP_CHANNEL_2_LINK || '#'
  }
];

// ---------- BOT INIT ----------
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Store verified users (in memory - database ke liye later)
const verifiedUsers = new Set();

// ---------- COMMANDS ----------

// Start command - WhatsApp force join
bot.command('start', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  // Check if already verified
  if (verifiedUsers.has(userId)) {
    return ctx.reply(
      '✅ *Welcome Back!*\n\nYou are already verified.\nUse /help for commands.',
      { parse_mode: 'Markdown' }
    );
  }
  
  // Create WhatsApp channel buttons
  const buttons = WHATSAPP_CHANNELS.map(channel => {
    return [{ text: `📱 ${channel.name}`, url: channel.link }];
  });
  
  // Add verify button
  buttons.push([{ text: '✅ I Have Joined Both', callback_data: 'verify' }]);
  
  await ctx.reply(
    '🚫 *Access Denied!*\n\n' +
    `Hello ${ctx.from.first_name},\n\n` +
    '⚠️ *Please join BOTH WhatsApp channels to access this bot:*\n\n' +
    '📌 Join both channels then click "I Have Joined Both"',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    }
  );
});

// Verify callback
bot.action('verify', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  
  verifiedUsers.add(userId);
  
  await ctx.reply(
    '✅ *Verification Successful!*\n\n' +
    '🎉 All commands are now unlocked!\n\n' +
    '📌 Use /help to see available commands.',
    { parse_mode: 'Markdown' }
  );
});

// Help command
bot.command('help', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (!verifiedUsers.has(userId)) {
    return ctx.reply('🚫 Please use /start and verify first.');
  }
  
  await ctx.reply(
    '📖 *Available Commands*\n\n' +
    '/start - Start the bot\n' +
    '/help - Show this menu\n' +
    '/premium - Premium features\n' +
    '/tools - Available tools\n' +
    '/about - About this bot\n\n' +
    '💡 All commands are unlocked!',
    { parse_mode: 'Markdown' }
  );
});

// Premium command
bot.command('premium', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (!verifiedUsers.has(userId)) {
    return ctx.reply('🚫 Please verify first.');
  }
  
  await ctx.reply(
    '💎 *Premium Features*\n\n' +
    '1️⃣ Exclusive Content\n' +
    '2️⃣ Priority Support\n' +
    '3️⃣ Early Access\n' +
    '4️⃣ Special Offers\n\n' +
    '✨ Contact admin for more information.',
    { parse_mode: 'Markdown' }
  );
});

// Tools command
bot.command('tools', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (!verifiedUsers.has(userId)) {
    return ctx.reply('🚫 Please verify first.');
  }
  
  await ctx.reply(
    '🛠️ *Available Tools*\n\n' +
    '🔹 Tool 1 - Description\n' +
    '🔹 Tool 2 - Description\n' +
    '🔹 Tool 3 - Description\n\n' +
    '📌 More tools coming soon.',
    { parse_mode: 'Markdown' }
  );
});

// About command
bot.command('about', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (!verifiedUsers.has(userId)) {
    return ctx.reply('🚫 Please verify first.');
  }
  
  await ctx.reply(
    '🤖 *HJH Premium Bot*\n\n' +
    'Version: 2.0\n' +
    'Developer: HJH\n\n' +
    '✨ Features:\n' +
    '• WhatsApp Force Join\n' +
    '• Premium Content\n' +
    '• Tools Management\n\n' +
    'Made with ❤️',
    { parse_mode: 'Markdown' }
  );
});

// Admin command (hidden - only for admin)
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== ADMIN_ID) {
    return ctx.reply('🚫 Unknown command.');
  }
  
  await ctx.reply(
    '🔐 *Admin Panel*\n\n' +
    '📊 Stats:\n' +
    `👥 Total Users: ${verifiedUsers.size}\n\n` +
    '📌 Admin commands coming soon.',
    { parse_mode: 'Markdown' }
  );
});

// Catch all messages
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (!verifiedUsers.has(userId)) {
    return ctx.reply('🚫 Please use /start and verify first.');
  }
  
  await ctx.reply('I received: ' + ctx.message.text + '\n\nUse /help for commands.');
});

// Error handler
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  if (ctx) ctx.reply('⚠️ Error occurred. Please try again.');
});

// ---------- EXPRESS APP ----------
const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    version: '2.0',
    webhook: '/webhook',
    health: '/health'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    users: verifiedUsers.size
  });
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.sendStatus(500);
  }
});

// Webhook set
const setWebhook = async () => {
  try {
    const url = 'https://hjh-premium-telegram-bot.vercel.app/webhook';
    await bot.telegram.setWebhook(url);
    console.log('✅ Webhook set to:', url);
  } catch (error) {
    console.error('❌ Webhook set failed:', error.message);
  }
};

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await setWebhook();
});

module.exports = app;
