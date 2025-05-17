import mongoose from 'mongoose';

// Define schemas
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

const envelopeSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Initialize models
const models = {
  User: mongoose.models.User || mongoose.model('User', userSchema),
  Envelope: mongoose.models.Envelope || mongoose.model('Envelope', envelopeSchema)
};

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    console.log('=> Using existing database connection');
    return mongoose;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('=> Created new database connection');
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export { connectToDatabase, models };
