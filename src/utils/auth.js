import { getUserInfo } from "../middleware/auth.js";

export const userHasRole = (req, role) => {
  const userInfo = getUserInfo(req);
  return userInfo?.roles?.includes(role) || false;
};

export const userHasRealmRole = (req, role) => {
  const userInfo = getUserInfo(req);
  return userInfo?.roles?.includes(role) || false;
};

export const isAdmin = (req) => {
  const userInfo = getUserInfo(req);
  return userInfo?.roles?.includes('admin') || 
         userInfo?.roles?.includes('realm-admin') || 
         false;
};

export const isOwner = (req, resourceUserId) => {
  const userInfo = getUserInfo(req);
  return userInfo?.id === resourceUserId;
};

export const canAccessResource = (req, resourceUserId) => {
  return isOwner(req, resourceUserId) || isAdmin(req);
};

export const getUserId = (req) => {
  const userInfo = getUserInfo(req);
  return userInfo?.id || null;
};

export const getUsername = (req) => {
  const userInfo = getUserInfo(req);
  return userInfo?.username || userInfo?.email || 'anonymous';
};
