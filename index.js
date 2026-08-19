const express = require('express');
const { Telegraf, session, Markup } = require('telegraf');
require('dotenv').config();

// ---------- CONFIG ----------
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

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

// Store user sessions
const userSessions = new Map();
const activeTimers = new Map();

// ---------- START COMMAND ----------
bot.command('start', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (userSessions.has(userId) && userSessions.get(userId)?.verified) {
    return ctx.reply(
      `✅ You are already verified.\nUse /help for commands.`
    );
  }
  
  const buttons = WHATSAPP_CHANNELS.map(channel => {
    return [Markup.button.url(`▶ ${channel.name}`, channel.link)];
  });
  
  userSessions.set(userId, {
    step: 'waiting_for_join',
    started: Date.now(),
    verified: false,
    timerStarted: false,
    readyToVerify: false
  });
  
  console.log(`✅ User session created for: ${userId}`);
  
  await ctx.reply(
    `🔐 *VERIFICATION REQUIRED*\n\n` +
    `Hello ${ctx.from.first_name},\n\n` +
    `⚠️ Please join BOTH WhatsApp channels:\n` +
    `▶ ${WHATSAPP_CHANNELS[0].name}\n` +
    `▶ ${WHATSAPP_CHANNELS[1].name}\n\n` +
    `⏳ Send any message after joining to start 30s timer.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
});

// ---------- HANDLE ALL MESSAGES - AUTO TIMER START ----------
bot.on('message', async (ctx) => {
  const userId = String(ctx.from.id);
  
  console.log(`📨 Message from: ${userId}`);
  
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      step: 'waiting_for_join',
      started: Date.now(),
      verified: false,
      timerStarted: false,
      readyToVerify: false
    });
    return ctx.reply(`✅ Session created!\nUse /start to see channels.`);
  }
  
  const session = userSessions.get(userId);
  
  if (session.verified) return;
  if (session.readyToVerify) {
    return ctx.reply(`✅ You are ready!\nClick "I Have Joined Both" button.`);
  }
  
  if (activeTimers.has(userId)) {
    const remaining = activeTimers.get(userId);
    return ctx.reply(`⏳ Timer running: ${remaining}s remaining...`);
  }
  
  // ⭐ START LIVE COUNTDOWN
  console.log(`⏳ Starting timer for: ${userId}`);
  
  let countdown = 30;
  activeTimers.set(userId, countdown);
  
  userSessions.set(userId, {
    ...session,
    step: 'timer_running',
    timerStarted: Date.now()
  });
  
  // Send first countdown message
  await ctx.reply(
    `⏳ *Timer Started!*\n\n` +
    `⏱️ ${countdown} seconds remaining...\n` +
    `🔴 Please wait...`,
    { parse_mode: 'Markdown' }
  );
  
  // ⭐ LIVE COUNTDOWN INTERVAL - Har second naya message
  const interval = setInterval(async () => {
    countdown -= 1;
    activeTimers.set(userId, countdown);
    
    if (countdown > 0) {
      // Har second naya message with current count
      await ctx.reply(`⏱️ *${countdown}* seconds remaining...`, { 
        parse_mode: 'Markdown' 
      });
      
    } else {
      // Timer complete
      clearInterval(interval);
      activeTimers.delete(userId);
      
      const verifyButton = [
        [Markup.button.callback('✅ I Have Joined Both', 'verify_now')]
      ];
      
      userSessions.set(userId, {
        ...session,
        step: 'ready_to_verify',
        readyToVerify: true,
        verified: false
      });
      
      await ctx.reply(
        `✅ *Timer Complete!*\n\n` +
        `✅ You have waited 30 seconds.\n` +
        `✅ Click button below to verify.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(verifyButton)
        }
      );
    }
  }, 1000);
});

// ---------- VERIFY NOW ----------
bot.action('verify_now', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId)) {
    return ctx.reply(`❌ Please use /start first.`);
  }
  
  const session = userSessions.get(userId);
  
  if (session.verified) {
    return ctx.reply(`✅ Already verified!`);
  }
  
  if (!session.readyToVerify) {
    return ctx.reply(`❌ Please wait 30 seconds first.`);
  }
  
  userSessions.set(userId, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    step: 'verified',
    readyToVerify: false
  });
  
  await ctx.reply(
    `✅ *VERIFICATION SUCCESSFUL!*\n\n` +
    `✅ All commands are now unlocked!\n\n` +
    `Use /help to see available commands.`,
    { parse_mode: 'Markdown' }
  );
  
  await ctx.reply(
    `📋 *COMMANDS*\n\n` +
    `▶ /start - Start the bot\n` +
    `▶ /help - Show this menu\n` +
    `▶ /premium - Premium features\n` +
    `▶ /tools - Available tools\n` +
    `▶ /about - About this bot`,
    { parse_mode: 'Markdown' }
  );
});

// ---------- HELP COMMAND ----------
bot.command('help', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
    return ctx.reply(`❌ Please verify first using /start.`);
  }
  
  await ctx.reply(
    `📋 *COMMANDS*\n\n` +
    `▶ /start - Start the bot\n` +
    `▶ /help - Show this menu\n` +
    `▶ /premium - Premium features\n` +
    `▶ /tools - Available tools\n` +
    `▶ /about - About this bot\n` +
    `▶ /admin - Admin panel (admin only)`,
    { parse_mode: 'Markdown' }
  );
});

// ---------- PREMIUM COMMAND ----------
bot.command('premium', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
    return ctx.reply(`❌ Please verify first.`);
  }
  
  await ctx.reply(
    `⭐ *PREMIUM FEATURES*\n\n` +
    `○ Exclusive Content\n` +
    `○ Priority Support\n` +
    `○ Early Access\n` +
    `○ Special Offers\n\n` +
    `Contact admin for more information.`,
    { parse_mode: 'Markdown' }
  );
});

// ---------- TOOLS COMMAND ----------
bot.command('tools', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
    return ctx.reply(`❌ Please verify first.`);
  }
  
  await ctx.reply(
    `🔧 *TOOLS*\n\n` +
    `† Tool 1 - Description\n` +
    `† Tool 2 - Description\n` +
    `† Tool 3 - Description\n\n` +
    `More tools coming soon.`,
    { parse_mode: 'Markdown' }
  );
});

// ---------- ABOUT COMMAND ----------
bot.command('about', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
    return ctx.reply(`❌ Please verify first.`);
  }
  
  await ctx.reply(
    `🤖 *HJH PREMIUM BOT*\n\n` +
    `Version: 2.0\n` +
    `Developer: HJH\n\n` +
    `Features:\n` +
    `○ WhatsApp Force Join\n` +
    `○ Premium Content\n` +
    `○ Tools Management\n\n` +
    `Made with ❤️`,
    { parse_mode: 'Markdown' }
  );
});

// ---------- ADMIN COMMAND ----------
bot.command('admin', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (userId !== ADMIN_ID) {
    return ctx.reply(`❌ Unknown command.`);
  }
  
  const totalUsers = userSessions.size;
  const verifiedCount = Array.from(userSessions.values()).filter(u => u.verified).length;
  
  await ctx.reply(
    `👑 *ADMIN PANEL*\n\n` +
    `Total Users: ${totalUsers}\n` +
    `Verified: ${verifiedCount}\n\n` +
    `† Admin commands coming soon.`,
    { parse_mode: 'Markdown' }
  );
});

// ---------- ERROR HANDLER ----------
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  if (ctx) ctx.reply('⚠️ Error occurred. Please try again.');
});

// ---------- EXPRESS APP ----------
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'running', version: '2.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
