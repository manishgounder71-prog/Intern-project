import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../../database/models/User.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'studygen-secret-super-key-2026';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required. Access denied.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user exists in database (handles database resets/clears gracefully)
    const userExists = await User.exists({ _id: decoded.id });
    if (!userExists) {
      return res.status(401).json({ error: 'User session has expired or no longer exists. Please sign in again.' });
    }
    
    // Add user info to request
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token. Authentication failed.' });
  }
};
