const { Markup } = require('telegraf');
const { User } = require('../database');
const config = require('../config');
const { getStartMessage, getVerificationSuccess, getWelcomeBack } = require('../utils/messages');

// Get or create user
const getOrCreateUser = async (userId, userData) => {
  if (!config.mongodbUri) return null;
  
  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({
      userId,
      username: userData.username,
      firstName: userData.first_name,
      lastName: userData.last_name,
      joinedAt: new Date()
    });
    await user.save();
  }
  return user;
};

// Check if user is verified
const isUserVerified = async (userId) => {
  if (!config.mongodbUri) return false;
  
  const user = await User.findOne({ userId });
  return user?.whatsappVerified || false;
};

// Mark user as verified
const markUserVerified = async (userId) => {
  if (!config.mongodbUri) return;
  
  await User.findOneAndUpdate(
    { userId },
    { 
      whatsappVerified: true,
      verifiedAt: new Date()
    },
    { upsert: true }
  );
};

// Start command handler
const startHandler = async (ctx) => {
  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || 'User';
  
  // Get or create user
  await getOrCreateUser(userId, {
    username: ctx.from.username,
    first_name: ctx.from.first_name,
    last_name: ctx.from.last_name
  });
  
  // Check if already verified
  const verified = await isUserVerified(userId);
  
  if (verified) {
    const message = getWelcomeBack();
    return ctx.reply(message.text, { parse_mode: message.parse_mode });
  }
  
  // Create WhatsApp channel buttons
  const channelButtons = config.whatsappChannels.map(channel => {
    return [Markup.button.url(
      `WhatsApp: ${channel.name}`,
      channel.link
    )];
  });
  
  // Add verify button
  channelButtons.push([
    Markup.button.callback('Verify Both Channels', 'verify_whatsapp')
  ]);
  
  // Send message
  const message = getStartMessage(userName);
  await ctx.reply(message.text, {
    parse_mode: message.parse_mode,
    ...Markup.inlineKeyboard(channelButtons)
  });
};

// Verify callback handler
const verifyHandler = async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id.toString();
  
  // Check if already verified
  const verified = await isUserVerified(userId);
  
  if (verified) {
    const message = getVerificationSuccess();
    return ctx.reply(message.text, { parse_mode: message.parse_mode });
  }
  
  // Mark as verified
  await markUserVerified(userId);
  
  // Send success message
  const message = getVerificationSuccess();
  await ctx.reply(message.text, { parse_mode: message.parse_mode });
};

module.exports = {
  getOrCreateUser,
  isUserVerified,
  markUserVerified,
  startHandler,
  verifyHandler
};
