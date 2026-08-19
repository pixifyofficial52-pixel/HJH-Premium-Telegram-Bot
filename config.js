require('dotenv').config();

module.exports = {
  botToken: process.env.BOT_TOKEN,
  adminId: process.env.ADMIN_ID,
  
  whatsappChannels: [
    {
      id: 'channel1',
      name: process.env.WHATSAPP_CHANNEL_1_NAME || 'Channel 1',
      link: process.env.WHATSAPP_CHANNEL_1_LINK
    },
    {
      id: 'channel2',
      name: process.env.WHATSAPP_CHANNEL_2_NAME || 'Channel 2',
      link: process.env.WHATSAPP_CHANNEL_2_LINK
    }
  ],
  
  mongodbUri: process.env.MONGODB_URI,
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development'
};
