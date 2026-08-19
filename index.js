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

// ---------- COMMANDS ----------

// START COMMAND
bot.command('start', async (ctx) => {
  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);
  
  // If already verified
  if (session?.verified) {
    return ctx.reply(
      `╔══════════════════════════╗\n` +
      `║   WELCOME BACK   ║\n` +
      `╚══════════════════════════╝\n\n` +
      `✓ You are already verified.\n` +
      `Use /help for commands.`
    );
  }
  
  // Create channel buttons
  const buttons = WHATSAPP_CHANNELS.map(channel => {
    return [Markup.button.url(`▶ ${channel.name}`, channel.link)];
  });
  
  // Add "I Have Joined Both" button (will be auto-enabled after 30 sec)
  buttons.push([
    Markup.button.callback('⏳ Please join both channels', 'auto_verify')
  ]);
  
  // Store that user is in verification process
  userSessions.set(userId, {
    step: 'waiting_for_join',
    started: Date.now(),
    verified: false
  });
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   VERIFICATION REQUIRED  ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Hello ${ctx.from.first_name},\n\n` +
    `⚠️ Please join BOTH WhatsApp channels:\n\n` +
    `▶ ${WHATSAPP_CHANNELS[0].name}\n` +
    `▶ ${WHATSAPP_CHANNELS[1].name}\n\n` +
    `📌 After joining both channels, timer will start automatically.\n` +
    `⏳ 30 seconds countdown will begin...`,
    {
      ...Markup.inlineKeyboard(buttons)
    }
  );
});

// AUTO VERIFY - User ne dono channels join kar liye
bot.action('auto_verify', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);
  
  // Check if already verified
  if (session?.verified) {
    return ctx.reply(`✓ You are already verified!`);
  }
  
  // Check if timer already running
  if (activeTimers.has(userId)) {
    return ctx.reply(
      `⏳ Timer is already running.\n` +
      `Please wait ${activeTimers.get(userId)} seconds...`
    );
  }
  
  // Check if user already verified
  if (session?.readyToVerify) {
    return ctx.reply(
      `✓ You are ready to verify!\n` +
      `Click "I Have Joined Both" button.`
    );
  }
  
  // START AUTO TIMER - 30 seconds
  let countdown = 30;
  activeTimers.set(userId, countdown);
  
  // Update session
  userSessions.set(userId, {
    ...session,
    step: 'timer_running',
    timerStarted: Date.now()
  });
  
  // Send initial timer message
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   VERIFICATION STARTED   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `✓ Both channels joined! ✅\n\n` +
    `⏳ Timer started: 30 seconds\n` +
    `🔄 Please wait while we verify...\n\n` +
    `⏱️ ${countdown} seconds remaining...`
  );
  
  // Create interval for live countdown
  const interval = setInterval(async () => {
    countdown -= 1;
    activeTimers.set(userId, countdown);
    
    if (countdown > 0) {
      // Update countdown every 5 seconds
      if (countdown % 5 === 0 || countdown <= 3) {
        await ctx.reply(
          `⏱️ ${countdown} seconds remaining...\n` +
          `Please stay on this chat.`
        );
      }
    } else {
      // Timer complete - 30 seconds done
      clearInterval(interval);
      activeTimers.delete(userId);
      
      // Enable verify button
      const verifyButton = [
        [Markup.button.callback('✓ I Have Joined Both', 'verify_now')]
      ];
      
      // Update session
      userSessions.set(userId, {
        ...session,
        step: 'ready_to_verify',
        readyToVerify: true,
        verified: false
      });
      
      await ctx.reply(
        `╔══════════════════════════╗\n` +
        `║  VERIFICATION READY   ║\n` +
        `╚══════════════════════════╝\n\n` +
        `✅ Timer complete!\n\n` +
        `✓ You have successfully waited 30 seconds.\n` +
        `✓ Click the button below to complete verification.`,
        {
          ...Markup.inlineKeyboard(verifyButton)
        }
      );
    }
  }, 1000); // Update every 1 second
});

// VERIFY NOW - Final verification
bot.action('verify_now', async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);
  
  if (session?.verified) {
    return ctx.reply(`✓ You are already verified!`);
  }
  
  if (!session?.readyToVerify) {
    return ctx.reply(
      `✗ Please wait 30 seconds after joining channels.\n` +
      `Use /start to try again.`
    );
  }
  
  // Mark as verified
  userSessions.set(userId, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    step: 'verified'
  });
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║  VERIFICATION SUCCESSFUL ║\n` +
    `╚══════════════════════════╝\n\n` +
    `✓ All commands are now unlocked!\n\n` +
    `Use /help to see available commands.`
  );
  
  // Send command list immediately
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

// HELP COMMAND
bot.command('help', async (ctx) => {
  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);
  
  if (!session?.verified) {
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
  const session = userSessions.get(userId);
  
  if (!session?.verified) {
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
  const session = userSessions.get(userId);
  
  if (!session?.verified) {
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
  const session = userSessions.get(userId);
  
  if (!session?.verified) {
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
  
  const totalUsers = userSessions.size;
  const verifiedCount = Array.from(userSessions.values()).filter(u => u.verified).length;
  
  await ctx.reply(
    `╔══════════════════════════╗\n` +
    `║   ADMIN PANEL   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Total Users: ${totalUsers}\n` +
    `Verified: ${verifiedCount}\n\n` +
    `◆ Admin commands coming soon.`
  );
});

// CATCH ALL
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);
  
  if (!session?.verified) {
    return ctx.reply(`✗ Please use /start and verify first.`);
  }
  
  await ctx.reply(
    `I received: ${ctx.message.text}\n\nUse /help for commands.`
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
