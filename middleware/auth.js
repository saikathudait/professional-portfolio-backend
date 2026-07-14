import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const getTokenFromRequest = (req) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  return token;
};

const attachUserFromToken = async (req, token) => {
  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');
  if (user) {
    req.user = user;
  }
  return user;
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    await attachUserFromToken(req, token);
  } catch (error) {
    req.user = null;
  }
  next();
};

export const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    const user = await attachUserFromToken(req, token);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Admin check middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as admin',
    });
  }
};
