import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/loimes';
const ALLOWED_USERS = ['adi padi', 'rui pui'];

async function testDatabase() {
  let client;
  try {
    console.log('Testing MongoDB connection...');
    client = await MongoClient.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    const db = client.db();
    
    // Test users collection
    const users = db.collection('users');
    
    // Create test users if they don't exist
    for (const username of ALLOWED_USERS) {
      const existingUser = await users.findOne({ username });
      if (!existingUser) {
        console.log(`Creating test user: ${username}`);
        const hashedPassword = await bcrypt.hash('password123', 10);
        await users.insertOne({
          username,
          password: hashedPassword
        });
      }
    }

    // Verify users were created
    const userCount = await users.countDocuments();
    console.log(`Total users in database: ${userCount}`);

    // Test envelopes collection
    const envelopes = db.collection('envelopes');
    await envelopes.createIndex({ createdAt: -1 });
    
    console.log('Database test completed successfully');
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testDatabase();