const mongoose = require('mongoose');
const config = require('./config');

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  whatsappVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  joinedAt: { type: Date, default: Date.now },
  lastActive: Date
});

// Command Schema for custom commands
const commandSchema = new mongoose.Schema({
  command: { type: String, required: true, unique: true },
  response: { type: String, required: true },
  description: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Tool Schema
const toolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  link: String,
  icon: String,
  category: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Command = mongoose.model('Command', commandSchema);
const Tool = mongoose.model('Tool', toolSchema);

// Connect to MongoDB
const connectDB = async () => {
  if (!config.mongodbUri) {
    console.log('Warning: No MongoDB URI provided. Running without database.');
    return;
  }
  
  try {
    await mongoose.connect(config.mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

module.exports = {
  User,
  Command,
  Tool,
  connectDB
};
