import { connectToDatabase, models } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'HvbDVufXpUIr9/zES1p+dt7xrlsyVliIhFB4B1FDwcM=';
const ALLOWED_USERS = ['adi padi', 'rui pui'];

const handler = async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Handle OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Connect to database
    await connectToDatabase();
    const { User, Envelope } = models;
    
    // Parse the path - remove /api/ prefix if present
    const path = req.url.replace(/^\/api\//, '');

    // Parse request body for POST requests
    let body = null;
    if (req.method === 'POST') {
      body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
          data += chunk;
          console.log('Received chunk:', chunk.length, 'bytes');
        });
        req.on('end', () => {
          console.log('Raw request body:', data);
          if (!data) {
            reject(new Error('Empty request body'));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            console.log('Parsed body:', parsed);
            resolve(parsed);
          } catch (e) {
            console.error('JSON parse error:', e);
            reject(new Error('Invalid JSON'));
          }
        });
        req.on('error', (e) => {
          console.error('Request error:', e);
          reject(e);
        });
      });
    }

    // Handle routes
    if (path === 'register' && req.method === 'POST') {
      const { username, password } = body;
      
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password required' });
        return;
      }

      if (!ALLOWED_USERS.includes(username)) {
        res.status(403).json({ error: 'Registration not allowed for this username' });
        return;
      }

      const existingUser = await User.findOne({ username });
      if (existingUser) {
        res.status(400).json({ error: 'Username already exists' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({ username, password: hashedPassword });
      
      res.status(201).json({ message: 'User registered successfully' });
      return;
    }

    if (path === 'login' && req.method === 'POST') {
      const { username, password } = body;
      
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password required' });
        return;
      }

      const user = await User.findOne({ username });
      if (!user) {
        res.status(400).json({ error: 'Invalid credentials' });
        return;
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        res.status(400).json({ error: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign(
        { username: user.username, id: user._id.toString() },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      res.status(200).json({ token });
      return;
    }

    if (path === 'envelopes') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (req.method === 'GET') {
          const messages = await Envelope.find()
            .sort({ createdAt: -1 })
            .lean()
            .exec();
          
          res.status(200).json(messages);
          return;
        }

        if (req.method === 'POST') {
          const { sender, content } = body;
          if (!sender || !content) {
            res.status(400).json({ error: 'Sender and content required' });
            return;
          }

          const envelope = await Envelope.create({
            sender,
            content,
            createdAt: new Date()
          });

          res.status(201).json(envelope.toObject());
          return;
        }
      } catch (e) {
        console.error('Protected route error:', e);
        res.status(403).json({ error: 'Invalid token' });
        return;
      }
    }

    // If no route matches
    res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

export default handler;
