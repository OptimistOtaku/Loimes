import app from '../server.js';

// Handle all HTTP methods
export default function handler(req, res) {
  // Forward the request to our Express app
  return app(req, res);
}
