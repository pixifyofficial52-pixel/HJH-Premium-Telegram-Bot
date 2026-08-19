const { Markup } = require('telegraf');
const config = require('../config');
const { User, Command, Tool } = require('../database');
const { getAdminMessage } = require('../utils/messages');

// Admin command (hidden)
const adminHandler = async (ctx) => {
  const userId = ctx.from.id.toString();
  
  // Check if user is admin
  if (userId !== config.adminId) {
    return ctx.reply('Unknown command.');
  }
  
  const message = getAdminMessage('/admin-panel');
  await ctx.reply(message.text, { parse_mode: message.parse_mode });
};

// Admin panel command (for future use)
const adminPanelHandler = async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== config.adminId) {
    return ctx.reply('Unauthorized access.');
  }
  
  // This will be expanded when we add admin panel
  await ctx.reply('Admin Panel will be available soon.');
};

module.exports = {
  adminHandler,
  adminPanelHandler
};
