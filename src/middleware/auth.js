const jwt = require('jsonwebtoken');
const config = require('../config/config');

const publicKey = config.keycloak.realmPublicKey && config.keycloak.realmPublicKey !== 'put_public_key_here'
  ? `-----BEGIN PUBLIC KEY-----\n${config.keycloak.realmPublicKey}\n-----END PUBLIC KEY-----`
  : null;

const verifyToken = (token) => {
  if (publicKey) {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  }
  return jwt.decode(token);
};

const protect = process.env.PROTECT_ROUTES === 'keycloak' 
  ? (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No valid Bearer token provided' });
      }
      
      const token = authHeader.substring(7);
      try {
        req.user = verifyToken(token);
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
  : (req, res, next) => next();

const optionalAuth = (req, res, next) => {
  if (process.env.PROTECT_ROUTES !== 'keycloak') {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.substring(7);
  try {
    req.user = verifyToken(token);
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
};

const getUserInfo = (req) => {
  if (!req.user) return null;
  
  const userId = req.user.sub || req.user.sid || req.user.preferred_username || req.user.email;
  
  return {
    id: userId,
    username: req.user.preferred_username,
    email: req.user.email,
    roles: req.user.realm_access?.roles || [],
  };
};

const hasRole = (req, role) => {
  const user = getUserInfo(req);
  return user && user.roles.includes(role);
};

const isAdmin = (req) => {
  const user = getUserInfo(req);
  return user && user.roles.includes(config.admin.role);
};

const isTeacher = (req) => {
  const user = getUserInfo(req);
  return user && user.roles.includes(config.teacher.role);
};

const isTeacherOrAdmin = (req) => {
  const user = getUserInfo(req);
  return user && (user.roles.includes(config.teacher.role) || user.roles.includes(config.admin.role));
};

const requireTeacher = (req, res, next) => {
  if (!isTeacher(req)) {
    return res.status(403).json({ error: 'Forbidden: Teacher role required' });
  }
  next();
};

const requireTeacherOrAdmin = (req, res, next) => {
  if (!isTeacherOrAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden: Teacher or Admin role required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden: Admin role required' });
  }
  next();
};

module.exports = { 
  protect,
  optionalAuth,
  getUserInfo, 
  hasRole, 
  isAdmin, 
  isTeacher, 
  isTeacherOrAdmin, 
  requireTeacher,
  requireTeacherOrAdmin,
  requireAdmin
};
