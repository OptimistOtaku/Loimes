import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'HvbDVufXpUIr9/zES1p+dt7xrlsyVliIhFB4B1FDwcM=';
const ALLOWED_USERS = ['adi padi', 'rui pui'];

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  cachedDb = db;
  return db;
}

// Auth middleware
async function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const user = await new Promise((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
    return user;
  } catch (err) {
    throw new Error('Invalid token');
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const db = await connectToDatabase();
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    // Auth routes
    if (pathname === '/api/login') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { username, password } = req.body;
      
      if (!ALLOWED_USERS.includes(username)) {
        return res.status(401).json({ error: 'Invalid username' });
      }

      const users = db.collection('users');
      const user = await users.findOne({ username });

      if (!user) {
        // Create new user if doesn't exist
        const hashedPassword = await bcrypt.hash(password, 10);
        await users.insertOne({ username, password: hashedPassword });
        const token = jwt.sign({ username }, JWT_SECRET);
        return res.json({ token });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      const token = jwt.sign({ username }, JWT_SECRET);
      return res.json({ token });
    }

    if (pathname === '/api/register') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { username, password } = req.body;
      
      if (!ALLOWED_USERS.includes(username)) {
        return res.status(401).json({ error: 'Invalid username' });
      }

      const users = db.collection('users');
      const existingUser = await users.findOne({ username });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await users.insertOne({ username, password: hashedPassword });
      return res.status(201).json({ message: 'Registration successful' });
    }

    // Protected routes
    if (pathname === '/api/envelopes') {
      try {
        await authenticateToken(req);
      } catch (error) {
        return res.status(401).json({ error: error.message });
      }

      if (req.method === 'GET') {
        const envelopes = db.collection('envelopes');
        const messages = await envelopes.find().sort({ createdAt: -1 }).toArray();
        return res.json(messages);
      }

      if (req.method === 'POST') {
        const { sender, content } = req.body;
        if (!sender || !content) {
          return res.status(400).json({ error: 'Sender and content required' });
        }

        const envelopes = db.collection('envelopes');
        const newEnvelope = {
          sender,
          content,
          createdAt: new Date().toISOString()
        };

        const result = await envelopes.insertOne(newEnvelope);
        return res.status(201).json({
          id: result.insertedId.toString(),
          ...newEnvelope
        });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // If no route matches
    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}
