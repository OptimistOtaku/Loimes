import 'dotenv/config';
import { connectToDatabase, models } from '../api/db.js';

async function testConnection() {
  let mongoose;
  try {
    console.log('Testing MongoDB connection and models...');
    
    // Test database connection
    console.log('\n1. Testing connection...');
    mongoose = await connectToDatabase();
    console.log('✓ Connected successfully to MongoDB');
    
    const { User, Envelope } = models;
    
    // Test model creation
    console.log('\n2. Testing models...');
    console.log('Available models:', Object.keys(mongoose.models));
    console.log('✓ Models initialized successfully');
    
    // Test collections
    console.log('\n3. Testing collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    console.log('✓ Collections accessible');

    // Test model operations
    console.log('\n4. Testing model operations...');
    
    // Test User model
    const testUser = {
      username: 'test_user_' + Date.now(),
      password: 'test_password'
    };
    
    const user = await User.create(testUser);
    console.log('✓ User creation successful');
    
    const foundUser = await User.findOne({ username: testUser.username });
    console.log('✓ User query successful');
    
    await User.deleteOne({ _id: user._id });
    console.log('✓ User deletion successful');

    // Test Envelope model
    const testEnvelope = {
      sender: 'test_sender',
      content: 'test_content_' + Date.now()
    };
    
    const envelope = await Envelope.create(testEnvelope);
    console.log('✓ Envelope creation successful');
    
    const foundEnvelope = await Envelope.findOne({ _id: envelope._id });
    console.log('✓ Envelope query successful');
    
    await Envelope.deleteOne({ _id: envelope._id });
    console.log('✓ Envelope deletion successful');

    console.log('\n✨ All tests completed successfully!');
    
  } catch (err) {
    console.error('Error during testing:', err);
    process.exit(1);
  } finally {
    if (mongoose) {
      await mongoose.disconnect();
      console.log('\nDatabase connection closed');
    }
  }
}

testConnection();
