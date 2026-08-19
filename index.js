const express = require('express');
const { Telegraf } = require('telegraf');
require('dotenv').config();

// ---------- BOT INIT ----------
const bot = new Telegraf(process.env.BOT_TOKEN);

// ---------- COMMANDS ----------
bot.command('start', async (ctx) => {
  await ctx.reply('🤖 Bot is working! Use /help');
});

bot.command('help', async (ctx) => {
  await ctx.reply('📖 Commands coming soon.');
});

bot.on('text', async (ctx) => {
  await ctx.reply('I received: ' + ctx.message.text);
});

// ---------- EXPRESS APP ----------
const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'running', webhook: '/webhook' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', time: new Date().toISOString() });
});

// ⭐ MAIN WEBHOOK - YEH IMPORTANT HAI
app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// ---------- WEBHOOK SET ----------
const setWebhook = async () => {
  try {
    const url = 'https://hjh-premium-telegram-bot.vercel.app/webhook';
    await bot.telegram.setWebhook(url);
    console.log('✅ Webhook set to:', url);
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
  }
};

// ---------- START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await setWebhook();
});

// ⭐ YEH EXPORT VERCEL KE LIYE ZAROORI HAI
module.exports = app;
