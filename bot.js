const { Telegraf, session } = require('telegraf');
const config = require('./config');
const {
  startHandler,
  verifyHandler
} = require('./handlers/startHandler');
const {
  helpHandler,
  premiumHandler,
  toolsHandler,
  aboutHandler
} = require('./handlers/commandHandler');
const {
  adminHandler,
  adminPanelHandler
} = require('./handlers/adminHandler');

// Initialize bot
const bot = new Telegraf(config.botToken);

// Session middleware
bot.use(session());

// Command handlers
bot.command('start', startHandler);
bot.command('help', helpHandler);
bot.command('premium', premiumHandler);
bot.command('tools', toolsHandler);
bot.command('about', aboutHandler);

// Hidden admin command (only for admin)
bot.command('admin', adminHandler);

// Callback handlers
bot.action('verify_whatsapp', verifyHandler);

// Error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('An error occurred. Please try again later.');
});

module.exports = bot;
