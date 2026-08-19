const { Command, Tool } = require('../database');
const { isUserVerified } = require('./startHandler');
const {
  getHelpMessage,
  getPremiumMessage,
  getToolsMessage,
  getAboutMessage
} = require('../utils/messages');
const config = require('../config');

// Help command
const helpHandler = async (ctx) => {
  const userId = ctx.from.id.toString();
  const verified = await isUserVerified(userId);
  
  if (!verified) {
    return ctx.reply('Access Denied. Please use /start and verify first.');
  }
  
  let customCommands = [];
  if (config.mongodbUri) {
    customCommands = await Command.find({ isActive: true });
  }
  
  const message = getHelpMessage(customCommands);
  await ctx.reply(message.text, { parse_mode: message.parse_mode });
};

// Premium command
const premiumHandler = async (ctx) => {
  const userId = ctx.from.id.toString();
  const verified = await isUserVerified(userId);
  
  if (!verified) {
    return ctx.reply('Access Denied. Please use /start and verify first.');
  }
  
  const message = getPremiumMessage();
  await ctx.reply(message.text, { parse_mode: message.parse_mode });
};

// Tools command
const toolsHandler = async (ctx) => {
  const userId = ctx.from.id.toString();
  const verified = await isUserVerified(userId);
  
  if (!verified) {
    return ctx.reply('Access Denied. Please use /start and verify first.');
  }
  
  let tools = [];
  if (config.mongodbUri) {
    tools = await Tool.find({ isActive: true });
  }
  
  const message = getToolsMessage(tools);
  await ctx.reply(message.text, {
    parse_mode: message.parse_mode,
    disable_web_page_preview: message.disable_web_page_preview
  });
};

// About command
const aboutHandler = async (ctx) => {
  const userId = ctx.from.id.toString();
  const verified = await isUserVerified(userId);
  
  if (!verified) {
    return ctx.reply('Access Denied. Please use /start and verify first.');
  }
  
  const message = getAboutMessage();
  await ctx.reply(message.text, { parse_mode: message.parse_mode });
};

module.exports = {
  helpHandler,
  premiumHandler,
  toolsHandler,
  aboutHandler
};
