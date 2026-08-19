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

// ---------- START COMMAND ----------
bot.command('start', async (ctx) => {
  const userId = String(ctx.from.id);
  
  // Check if already verified
  if (userSessions.has(userId) && userSessions.get(userId)?.verified) {
    return ctx.reply(
      `╔══════════════════════════╗\n` +
      `║   WELCOME BACK   ║\n` +
      `╚══════════════════════════╝\n\n` +
      `✓ You are already verified.\n` +
      `Use /help for commands.`
    );
  }
  
  // ONLY 2 CHANNEL BUTTONS
  const buttons = WHATSAPP_CHANNELS.map(channel => {
    return [Markup.button.url(`▶ ${channel.name}`, channel.link)];
  });
  
  // Add "I Have Joined Both" button
  buttons.push([
    Markup.button.callback('✓ I Have Joined Both', 'check_verify')
  ]);
  
  // Store user session
  userSessions.set(userId, {
    step: 'waiting_for_join',
    started: Date.now(),
    verified: false,
    screenshotSent: false,
    readyToVerify: false
  });
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   VERIFICATION REQUIRED  ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Hello ${ctx.from.first_name},\n\n` +
    `⚠️ Please join BOTH WhatsApp channels:\n\n` +
    `▶ ${WHATSAPP_CHANNELS[0].name}\n` +
    `▶ ${WHATSAPP_CHANNELS[1].name}\n\n` +
    `📸 After joining, send a SCREENSHOT of both channels.\n` +
    `✅ Then click "I Have Joined Both" to verify.`,
    {
      ...Markup.inlineKeyboard(buttons)
    }
  );
});

// ---------- HANDLE SCREENSHOTS (PHOTOS) ----------
bot.on('photo', async (ctx) => {
  const userId = String(ctx.from.id);
  
  // Check if user exists
  if (!userSessions.has(userId)) {
    return ctx.reply(
      `✗ Please use /start first.`
    );
  }
  
  const session = userSessions.get(userId);
  
  // If already verified
  if (session.verified) {
    return ctx.reply(`✓ You are already verified!`);
  }
  
  // Mark screenshot as received
  userSessions.set(userId, {
    ...session,
    screenshotSent: true,
    step: 'screenshot_received'
  });
  
  // Get photo file info
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   SCREENSHOT RECEIVED   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `✅ Screenshot received successfully!\n\n` +
    `📸 File ID: ${fileId}\n\n` +
    `🔄 Now click "I Have Joined Both" to complete verification.`
  );
  
  // For admin: forward screenshot to admin
  if (ADMIN_ID) {
    try {
      await ctx.forwardMessage(ADMIN_ID);
      await ctx.telegram.sendMessage(
        ADMIN_ID,
        `📸 New screenshot from user: ${ctx.from.first_name} (@${ctx.from.username || 'No username'})\nUser ID: ${userId}`
      );
    } catch (error) {
      console.log('Admin forward failed:', error.message);
    }
  }
});

// ---------- HANDLE DOCUMENTS (IF USER SENDS AS FILE) ----------
bot.on('document', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId)) {
    return ctx.reply(`✗ Please use /start first.`);
  }
  
  const session = userSessions.get(userId);
  
  if (session.verified) {
    return ctx.reply(`✓ You are already verified!`);
  }
  
  // Check if it's an image
  const mimeType = ctx.message.document.mime_type;
  if (mimeType && mimeType.startsWith('image/')) {
    // Mark screenshot as received
    userSessions.set(userId, {
      ...session,
      screenshotSent: true,
      step: 'screenshot_received'
    });
    
    await ctx.reply(
      `╔══════════════════════════╗\n` +
      `║   SCREENSHOT RECEIVED   ║\n` +
      `╚══════════════════════════╝\n\n` +
      `✅ Screenshot received successfully!\n\n` +
      `🔄 Now click "I Have Joined Both" to complete verification.`
    );
    
    // Forward to admin
    if (ADMIN_ID) {
      try {
        await ctx.forwardMessage(ADMIN_ID);
      } catch (error) {
        console.log('Admin forward failed:', error.message);
      }
    }
  } else {
    await ctx.reply(
      `✗ Please send a screenshot (image file).\n\n` +
      `📸 After joining both channels, send a screenshot.`
    );
  }
});

// ---------- CHECK VERIFY BUTTON ----------
bot.action('check_verify', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId)) {
    return ctx.reply(`✗ Please use /start first.`);
  }
  
  const session = userSessions.get(userId);
  
  // Check if already verified
  if (session.verified) {
    return ctx.reply(`✓ You are already verified!`);
  }
  
  // CHECK IF SCREENSHOT WAS SENT
  if (!session.screenshotSent) {
    return ctx.reply(
      `╔══════════════════════════╗\n` +
      `║   SCREENSHOT REQUIRED   ║\n` +
      `╚══════════════════════════╝\n\n` +
      `❌ You haven't sent a screenshot yet!\n\n` +
      `📸 Please:\n` +
      `1. Join both WhatsApp channels\n` +
      `2. Take a screenshot\n` +
      `3. Send it here\n` +
      `4. Then click "I Have Joined Both" again`
    );
  }
  
  // ✅ All checks passed - VERIFY USER
  userSessions.set(userId, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    step: 'verified',
    screenshotSent: true
  });
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║  VERIFICATION SUCCESSFUL ║\n` +
    `╚══════════════════════════╝\n\n` +
    `✅ All commands are now unlocked!\n\n` +
    `Use /help to see available commands.`
  );
  
  // Send command list
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║    COMMANDS   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `▶ /start - Start the bot\n` +
    `▶ /help - Show this menu\n` +
    `▶ /premium - Premium features\n` +
    `▶ /tools - Available tools\n` +
    `▶ /about - About this bot\n\n` +
    `◆ All commands are unlocked.`
  );
});

// ---------- HELP COMMAND ----------
bot.command('help', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
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

// ---------- PREMIUM COMMAND ----------
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

// ---------- TOOLS COMMAND ----------
bot.command('tools', async (ctx) => {
  const userId = String(ctx.from.id);
  
  if (!userSessions.has(userId) || !userSessions.get(userId)?.verified) {
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

// ---------- ABOUT COMMAND ----------
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
    `● Premium Content\n` +
    `● Tools Management\n\n` +
    `Made with Love`
  );
});

// ---------- ADMIN COMMAND ----------
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
    `Total Users: ${totalUsers}\n` +
    `Verified: ${verifiedCount}\n` +
    `Screenshots Received: ${screenshotCount}\n\n` +
    `◆ Admin commands coming soon.`
  );
});

// ---------- CATCH ALL TEXT ----------
bot.on('text', async (ctx) => {
  const userId = String(ctx.from.id);
  const session = userSessions.get(userId);
  
  if (!session?.verified) {
    return ctx.reply(
      `✗ Please use /start and verify first.\n\n` +
      `📸 Remember: You need to send a screenshot to verify.`
    );
  }
  
  await ctx.reply(
    `I received: ${ctx.message.text}\n\nUse /help for commands.`
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
