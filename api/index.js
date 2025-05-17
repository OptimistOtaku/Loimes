const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const JWT_SECRET = process.env.JWT_SECRET || 'HvbDVufXpUIr9/zES1p+dt7xrlsyVliIhFB4B1FDwcM=';
const ALLOWED_USERS = ['adi padi', 'rui pui'];

// SQLite database setup
async function getDB() {
  return await open({
    filename: '/tmp/envelopes.db',
    driver: sqlite3.Database
  }).then(async (db) => {
    await db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`);
    await db.run(`CREATE TABLE IF NOT EXISTS envelopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`);
    return db;
  });
}

const handler = async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Detailed request logging
    console.log('Request details:', {
      method: req.method,
      url: req.url,
      path: req.url.replace(/^\/api\//, ''),
      headers: req.headers,
      query: req.query,
      timestamp: new Date().toISOString()
    });

    // Handle OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Parse the path - remove /api/ prefix if present
    const path = req.url.replace(/^\/api\//, '');
    
    // Get database connection
    const db = await getDB();
    
    // Handle login and register routes
    if (path === 'login' || path === 'register') {
      try {
        // Parse request body
        const body = await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', chunk => { 
            data += chunk;
            console.log('Received chunk:', chunk.length, 'bytes');
          });
          req.on('end', () => {
            console.log('Raw request body:', data);
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

        const { username, password } = body;

        if (!username || !password) {
          res.status(400).json({ error: 'Username and password required' });
          return;
        }

        if (path === 'register') {
          if (!ALLOWED_USERS.includes(username)) {
            res.status(403).json({ error: 'Registration not allowed for this username' });
            return;
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hashedPassword);
          res.status(201).json({ message: 'User registered successfully' });
          return;
        }

        if (path === 'login') {
          const user = await db.get('SELECT * FROM users WHERE username = ?', username);
          if (!user) {
            res.status(400).json({ error: 'Invalid credentials' });
            return;
          }

          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
            res.status(400).json({ error: 'Invalid credentials' });
            return;
          }

          const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '1d' });
          res.status(200).json({ token });
          return;
        }
      } catch (e) {
        console.error('Auth error:', e);
        res.status(500).json({ error: 'Server error', details: e.message });
        return;
      }
    }

    // Handle protected routes
    if (path === 'envelopes') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      try {
        const user = jwt.verify(token, JWT_SECRET);
        
        if (req.method === 'GET') {
          const envelopes = await db.all('SELECT * FROM envelopes ORDER BY id DESC');
          res.status(200).json(envelopes);
          return;
        }

        if (req.method === 'POST') {
          const body = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error('Invalid JSON'));
              }
            });
          });

          const { sender, content } = body;
          if (!sender || !content) {
            res.status(400).json({ error: 'Sender and content required' });
            return;
          }

          const createdAt = new Date().toISOString();
          const result = await db.run(
            'INSERT INTO envelopes (sender, content, createdAt) VALUES (?, ?, ?)',
            sender,
            content,
            createdAt
          );

          res.status(201).json({
            id: result.lastID,
            sender,
            content,
            createdAt
          });
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
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = handler;
