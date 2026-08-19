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

// Store verification codes (in-memory)
const verificationCodes = new Map();
const verifiedUsers = new Map();

// ---------- GENERATE RANDOM CODE ----------
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ---------- COMMANDS ----------

// START COMMAND
bot.command('start', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (userData?.verified) {
    return ctx.reply(
      `╔══════════════════════════╗\n` +
      `║   WELCOME BACK   ║\n` +
      `╚══════════════════════════╝\n\n` +
      `✓ You are already verified.\n` +
      `Use /help for commands.`
    );
  }
  
  // Check if verification in progress
  if (verificationCodes.has(userId)) {
    return ctx.reply(
      `╔══════════════════════════╗\n` +
      `║  VERIFICATION IN PROGRESS ║\n` +
      `╚══════════════════════════╝\n\n` +
      `Please check your WhatsApp for the verification code.\n` +
      `Send the 6-digit code here to complete verification.`
    );
  }
  
  // Channel buttons
  const buttons = WHATSAPP_CHANNELS.map(channel => {
    return [Markup.button.url(`▶ ${channel.name}`, channel.link)];
  });
  
  buttons.push([
    Markup.button.callback('✓ I Have Joined Both', 'request_code')
  ]);
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   VERIFICATION REQUIRED  ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Hello ${ctx.from.first_name},\n\n` +
    `Please join BOTH WhatsApp channels:\n\n` +
    `▶ Join both channels\n` +
    `▶ Click "I Have Joined Both"\n` +
    `▶ Enter the verification code sent to your WhatsApp`,
    {
      ...Markup.inlineKeyboard(buttons)
    }
  );
});

// REQUEST CODE - User ne join kar liya
bot.action('request_code', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id.toString();
  const code = generateCode();
  
  // Store code with expiry (5 minutes)
  verificationCodes.set(userId, {
    code: code,
    expires: Date.now() + 300000, // 5 minutes
    attempts: 0
  });
  
  // In production, send actual WhatsApp message via API
  // For now, show code in chat (demo)
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║  VERIFICATION CODE SENT  ║\n` +
    `╚══════════════════════════╝\n\n` +
    `✓ A 6-digit code has been sent to your WhatsApp.\n\n` +
    `📱 Code: ${code}\n\n` +
    `⚠️ This code expires in 5 minutes.\n` +
    `Send this code here to complete verification.`
  );
  
  // In production, send via WhatsApp API:
  // await sendWhatsAppMessage(userPhone, `Your verification code: ${code}`);
});

// HANDLE CODE INPUT
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text.trim();
  
  // Check if this is a verification code (6 digits)
  if (/^\d{6}$/.test(text)) {
    const pending = verificationCodes.get(userId);
    
    if (!pending) {
      return ctx.reply(
        `✗ No verification in progress.\n\nUse /start to begin.`
      );
    }
    
    // Check expiry
    if (Date.now() > pending.expires) {
      verificationCodes.delete(userId);
      return ctx.reply(
        `✗ Code expired.\n\nUse /start to try again.`
      );
    }
    
    // Check attempts
    if (pending.attempts >= 3) {
      verificationCodes.delete(userId);
      return ctx.reply(
        `✗ Too many failed attempts.\n\nUse /start to try again.`
      );
    }
    
    // Verify code
    if (text === pending.code) {
      // Success!
      verifiedUsers.set(userId, {
        verified: true,
        verifiedAt: new Date().toISOString(),
        username: ctx.from.username,
        firstName: ctx.from.first_name
      });
      
      verificationCodes.delete(userId);
      
      return ctx.reply(
        `╔══════════════════════════╗\n` +
        `║  VERIFICATION SUCCESSFUL ║\n` +
        `╚══════════════════════════╝\n\n` +
        `✓ All commands are now unlocked!\n\n` +
        `Use /help to see available commands.`
      );
    } else {
      // Wrong code
      pending.attempts += 1;
      const remaining = 3 - pending.attempts;
      
      return ctx.reply(
        `✗ Invalid code.\n\n` +
        `Attempts remaining: ${remaining}\n\n` +
        `Please try again.`
      );
    }
  }
  
  // Regular message handling
  const userData = verifiedUsers.get(userId);
  if (!userData?.verified) {
    return ctx.reply(
      `✗ Please use /start and verify first.`
    );
  }
  
  await ctx.reply(
    `I received: ${text}\n\nUse /help for commands.`
  );
});

// HELP COMMAND
bot.command('help', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
    return ctx.reply(`✗ Please use /start and verify first.`);
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
    `◆ All commands are unlocked.`
  );
});

// PREMIUM COMMAND
bot.command('premium', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
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
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
    return ctx.reply(`✗ Please verify first.`);
  }
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║    TOOLS   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `◆ Tool 1 - Description\n` +
    `◆ Tool 2 - Description\n` +
    `◆ Tool 3 - Description\n\n` +
    `More tools coming soon.`
  );
});

// ABOUT COMMAND
bot.command('about', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userData = verifiedUsers.get(userId);
  
  if (!userData?.verified) {
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
    `● Premium Content\n` +
    `● Tools Management\n\n` +
    `Made with Love`
  );
});

// ADMIN COMMAND
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== ADMIN_ID) {
    return ctx.reply(`✗ Unknown command.`);
  }
  
  const totalUsers = verifiedUsers.size;
  const verifiedCount = Array.from(verifiedUsers.values()).filter(u => u.verified).length;
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   ADMIN PANEL   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Total Users: ${totalUsers}\n` +
    `Verified: ${verifiedCount}\n\n` +
    `◆ Admin commands coming soon.`
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
