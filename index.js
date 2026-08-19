const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const bot = require('./bot');
const { connectDB } = require('./database');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/', (req, res) => {
  res.json({
    name: 'HJH Premium Bot',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      webhook: '/webhook',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ⭐ MAIN WEBOOK ENDPOINT - Bot updates yahan aayengi
app.post('/webhook', (req, res) => {
  try {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// Connect to database (if MongoDB configured)
connectDB();

// ⭐ SET WEBHOOK - Bot ko batayein ke updates kahan bhejne hain
const setWebhook = async () => {
  try {
    // Vercel ka live URL automatically detect karein
    const webhookUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/webhook`
      : 'https://hjh-premium-telegram-bot.vercel.app/webhook';
    
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`✅ Webhook set successfully to: ${webhookUrl}`);
    
    // Webhook status check
    const webhookInfo = await bot.telegram.getWebhookInfo();
    console.log(`📊 Webhook Info:`, webhookInfo);
    
  } catch (error) {
    console.error('❌ Failed to set webhook:', error.message);
  }
};

// ⭐ SERVER START
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Live URL: https://hjh-premium-telegram-bot.vercel.app`);
  console.log(`📱 Webhook URL: https://hjh-premium-telegram-bot.vercel.app/webhook`);
  
  // Webhook set karein
  await setWebhook();
});

// Export for Vercel
module.exports = app;
