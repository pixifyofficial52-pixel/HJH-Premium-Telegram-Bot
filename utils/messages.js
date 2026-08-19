const config = require('../config');

// Get WhatsApp channel buttons
const getChannelButtons = () => {
  const buttons = [];
  
  config.whatsappChannels.forEach(channel => {
    buttons.push({
      text: `WhatsApp: ${channel.name}`,
      url: channel.link
    });
  });
  
  return buttons;
};

// Main start message
const getStartMessage = (userName) => {
  return {
    text: `Access Denied\n\nHello ${userName},\n\nYou must join both WhatsApp channels to access this bot.\n\nPlease join the channels below and then click the verify button.`,
    parse_mode: 'Markdown'
  };
};

// Verification success message
const getVerificationSuccess = () => {
  return {
    text: `Verification Successful\n\nCongratulations! You are now verified.\n\nAll commands are now unlocked.\n\nUse /help to see available commands.`,
    parse_mode: 'Markdown'
  };
};

// Welcome back message
const getWelcomeBack = () => {
  return {
    text: `Welcome Back\n\nYou are already verified.\n\nUse /help to see all commands.`,
    parse_mode: 'Markdown'
  };
};

// Help message
const getHelpMessage = (commands) => {
  let helpText = `Available Commands\n\n`;
  
  if (commands && commands.length > 0) {
    commands.forEach(cmd => {
      helpText += `/${cmd.command} - ${cmd.description || cmd.response.substring(0, 30)}\n`;
    });
  } else {
    helpText += `/start - Start the bot\n`;
    helpText += `/help - Show this help menu\n`;
    helpText += `/premium - Premium features\n`;
    helpText += `/tools - Available tools\n`;
    helpText += `/about - About this bot\n`;
  }
  
  helpText += `\nAll commands are unlocked for verified users.`;
  
  return {
    text: helpText,
    parse_mode: 'Markdown'
  };
};

// Premium message
const getPremiumMessage = () => {
  return {
    text: `Premium Features\n\n1. Exclusive Content\n2. Priority Support\n3. Early Access\n4. Special Offers\n\nContact admin for more information.`,
    parse_mode: 'Markdown'
  };
};

// Tools message
const getToolsMessage = (tools) => {
  let toolsText = `Available Tools\n\n`;
  
  if (tools && tools.length > 0) {
    tools.forEach(tool => {
      toolsText += `${tool.name}\n`;
      toolsText += `  ${tool.description}\n`;
      if (tool.link) toolsText += `  Link: ${tool.link}\n`;
      toolsText += `\n`;
    });
  } else {
    toolsText += `No tools available. Contact admin to add tools.`;
  }
  
  return {
    text: toolsText,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  };
};

// About message
const getAboutMessage = () => {
  return {
    text: `About HJH Premium Bot\n\nVersion: 2.0\nDeveloper: HJH\n\nFeatures:\n- WhatsApp Force Join System\n- Premium Content\n- Custom Commands\n- Tools Management\n\nMade with Love`,
    parse_mode: 'Markdown'
  };
};

// Admin panel message
const getAdminMessage = (panelUrl) => {
  return {
    text: `Secret Admin Panel\n\nURL: ${panelUrl || '/admin-panel'}\nUsername: admin\nPassword: admin123\n\nKeep this information secret.`,
    parse_mode: 'Markdown'
  };
};

module.exports = {
  getChannelButtons,
  getStartMessage,
  getVerificationSuccess,
  getWelcomeBack,
  getHelpMessage,
  getPremiumMessage,
  getToolsMessage,
  getAboutMessage,
  getAdminMessage
};
