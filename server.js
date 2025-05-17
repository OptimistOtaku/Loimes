require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiHandler = require('./api/index.js');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Handle API routes
app.all('/api/*', (req, res) => {
  return apiHandler(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});