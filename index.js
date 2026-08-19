const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Telegraf, session } = require('telegraf');
require('dotenv').config();

// ---------- CONFIG ----------
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// ---------- BOT INIT ----------
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ---------- DEBUG MIDDLEWARE ----------
bot.use(async (ctx, next) => {
  console.log('📨 Update:', ctx.updateType);
  console.log('👤 From:', ctx.from?.id);
  console.log('📝 Text:', ctx.message?.text);
  await next();
});

// ---------- COMMANDS ----------
bot.command('start', async (ctx) => {
  console.log('✅ Start command received');
  await ctx.reply('🤖 Bot is working! Use /help for commands.');
});

bot.command('help', async (ctx) => {
  await ctx.reply('📖 Help menu - commands coming soon.');
});

bot.on('text', async (ctx) => {
  await ctx.reply('I received: ' + ctx.message.text);
});

bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  if (ctx) ctx.reply('⚠️ Error occurred.');
});

// ---------- EXPRESS APP ----------
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'HJH Premium Bot',
    status: 'running',
    webhook: '/webhook',
    health: '/health'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ⭐ MAIN WEBHOOK ENDPOINT - YEH IMPORTANT HAI
app.post('/webhook', async (req, res) => {
  console.log('📨 Webhook POST received');
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.sendStatus(500);
  }
});

// ---------- WEBHOOK SET ----------
const setWebhook = async () => {
  try {
    const url = 'https://hjh-premium-telegram-bot.vercel.app/webhook';
    await bot.telegram.setWebhook(url);
    console.log('✅ Webhook set to:', url);
    
    const info = await bot.telegram.getWebhookInfo();
    console.log('📊 Webhook info:', JSON.stringify(info, null, 2));
  } catch (error) {
    console.error('❌ Webhook set failed:', error.message);
  }
};

// ---------- START ----------
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 URL: https://hjh-premium-telegram-bot.vercel.app`);
  
  // Webhook set
  await setWebhook();
});

// Export for Vercel
module.exports = app;
