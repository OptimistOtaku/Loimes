import jwt from 'jsonwebtoken';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// SQLite database setup
async function getDB() {
  return await open({
    filename: '/tmp/envelopes.db',
    driver: sqlite3.Database
  });
}

// Verify JWT token
async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) reject(err);
      resolve(user);
    });
  });
}

// Serverless function handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication for protected routes
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      await verifyToken(token);
    } catch (e) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const db = await getDB();

    // Get all envelopes
    if (req.method === 'GET') {
      const envelopes = await db.all('SELECT * FROM envelopes ORDER BY id DESC');
      return res.status(200).json(envelopes);
    }

    // Create new envelope
    if (req.method === 'POST') {
      const { sender, content } = req.body;
      
      if (!sender || !content) {
        return res.status(400).json({ error: 'Sender and content required' });
      }

      const createdAt = new Date().toISOString();
      const result = await db.run(
        'INSERT INTO envelopes (sender, content, createdAt) VALUES (?, ?, ?)',
        sender,
        content,
        createdAt
      );

      const envelope = {
        id: result.lastID,
        sender,
        content,
        createdAt,
      };
      
      return res.status(201).json(envelope);
    }

    // If no route matches
    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
