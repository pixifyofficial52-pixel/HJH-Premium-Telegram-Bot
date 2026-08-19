# HJH Premium Bot

WhatsApp Force Join Bot with Premium Features

## Features

- Two WhatsApp Channels Force Join
- Automatic Verification System
- Premium Content Access
- Custom Commands Support
- Tools Management
- User Management
- Secure and Fast

## Installation

1. Clone repository
2. Install dependencies: `npm install`
3. Configure .env file
4. Run: `npm start`

## Environment Variables

- BOT_TOKEN: Your Telegram Bot Token
- ADMIN_ID: Your Telegram User ID
- WHATSAPP_CHANNEL_1_NAME: First Channel Name
- WHATSAPP_CHANNEL_1_LINK: First Channel Link
- WHATSAPP_CHANNEL_2_NAME: Second Channel Name
- WHATSAPP_CHANNEL_2_LINK: Second Channel Link
- MONGODB_URI: MongoDB Connection String (Optional)

## Commands

- /start - Verify WhatsApp channels
- /help - Show all commands
- /premium - Premium features
- /tools - Available tools
- /about - About bot

## Deployment

### Vercel
```bash
vercel deploy
