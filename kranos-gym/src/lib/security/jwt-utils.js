/**
 * JWT Utilities for Kranos Gym Authentication System
 * Handles JWT token generation, validation, and management
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Environment variables with fallbacks for development
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-at-least-256-bits-long';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-super-secret-refresh-key-at-least-256-bits-long';
const JWT_ISSUER = process.env.JWT_ISSUER || 'kranos-gym';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'kranos-gym-users';

// Token expiration settings
const ACCESS_TOKEN_EXPIRES_IN = '1h';        // Access tokens: 1 hour
const REFRESH_TOKEN_EXPIRES_IN = '7d';       // Refresh tokens: 7 days

/**
 * Generate a secure random token ID
 */
function generateTokenId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Create JWT access token
 * @param {Object} user - User object with id, username, role, etc.
 * @param {string} sessionId - Session identifier
 * @returns {Object} Token object with token, expiresAt, jti
 */
export function createAccessToken(user, sessionId) {
    const jti = generateTokenId();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((now + 3600) * 1000); // 1 hour from now
    
    const payload = {
        // Standard JWT claims
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        sub: user.id.toString(),
        iat: now,
        exp: now + 3600, // 1 hour
        jti: jti,
        
        // Custom claims
        username: user.username,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
        session_id: sessionId,
        
        // Security metadata
        token_type: 'access'
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
    
    return {
        token,
        expiresAt: expiresAt.toISOString(),
        jti,
        type: 'access'
    };
}

/**
 * Create JWT refresh token
 * @param {Object} user - User object
 * @param {string} sessionId - Session identifier
 * @returns {Object} Refresh token object
 */
export function createRefreshToken(user, sessionId) {
    const jti = generateTokenId();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((now + 7 * 24 * 3600) * 1000); // 7 days from now
    
    const payload = {
        // Standard JWT claims
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        sub: user.id.toString(),
        iat: now,
        exp: now + 7 * 24 * 3600, // 7 days
        jti: jti,
        
        // Custom claims
        username: user.username,
        session_id: sessionId,
        
        // Security metadata
        token_type: 'refresh'
    };
    
    const token = jwt.sign(payload, REFRESH_SECRET, { algorithm: 'HS256' });
    
    return {
        token,
        expiresAt: expiresAt.toISOString(),
        jti,
        type: 'refresh'
    };
}

/**
 * Verify and decode JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            algorithms: ['HS256']
        });
        
        // Verify token type
        if (decoded.token_type !== 'access') {
            throw new Error('Invalid token type');
        }
        
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Access token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid access token');
        } else {
            throw new Error(`Token verification failed: ${error.message}`);
        }
    }
}

/**
 * Verify and decode JWT refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            algorithms: ['HS256']
        });
        
        // Verify token type
        if (decoded.token_type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Refresh token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid refresh token');
        } else {
            throw new Error(`Refresh token verification failed: ${error.message}`);
        }
    }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
export function extractTokenFromHeader(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') {
        return null;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
}

/**
 * Check if token is expired (without verifying signature)
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
export function isTokenExpired(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return true;
        }
        
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp < now;
    } catch (error) {
        return true;
    }
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
export function getTokenExpiration(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return null;
        }
        
        return new Date(decoded.exp * 1000);
    } catch (error) {
        return null;
    }
}

/**
 * Generate secure session ID
 * @returns {string} Secure random session ID
 */
export function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create complete token set (access + refresh)
 * @param {Object} user - User object
 * @param {string} sessionId - Session identifier
 * @returns {Object} Complete token set
 */
export function createTokenSet(user, sessionId) {
    const accessToken = createAccessToken(user, sessionId);
    const refreshToken = createRefreshToken(user, sessionId);
    
    return {
        accessToken: accessToken.token,
        refreshToken: refreshToken.token,
        accessExpiresAt: accessToken.expiresAt,
        refreshExpiresAt: refreshToken.expiresAt,
        accessJti: accessToken.jti,
        refreshJti: refreshToken.jti,
        sessionId
    };
}

/**
 * Validate token payload structure
 * @param {Object} payload - Decoded token payload
 * @returns {boolean} True if valid
 */
export function validateTokenPayload(payload) {
    const requiredFields = ['sub', 'username', 'role', 'session_id', 'token_type'];
    
    for (const field of requiredFields) {
        if (!payload[field]) {
            return false;
        }
    }
    
    // Validate role
    const validRoles = ['admin', 'trainer', 'member'];
    if (!validRoles.includes(payload.role)) {
        return false;
    }
    
    return true;
}

/**
 * Get user info from token payload
 * @param {Object} payload - Decoded token payload
 * @returns {Object} User information
 */
export function getUserFromToken(payload) {
    return {
        id: parseInt(payload.sub),
        username: payload.username,
        role: payload.role,
        email: payload.email,
        full_name: payload.full_name,
        session_id: payload.session_id
    };
}

/**
 * Check if user has required role
 * @param {Object} tokenPayload - Decoded token payload
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean} True if user has required role
 */
export function hasRole(tokenPayload, requiredRoles) {
    if (!tokenPayload || !tokenPayload.role) {
        return false;
    }
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(tokenPayload.role);
}

/**
 * Role hierarchy for authorization
 * Higher number = more privileges
 */
const ROLE_HIERARCHY = {
    member: 1,
    trainer: 2,
    admin: 3
};

/**
 * Check if user role meets minimum requirement
 * @param {Object} tokenPayload - Decoded token payload
 * @param {string} minRole - Minimum required role
 * @returns {boolean} True if user meets requirement
 */
export function hasMinimumRole(tokenPayload, minRole) {
    if (!tokenPayload || !tokenPayload.role) {
        return false;
    }
    
    const userLevel = ROLE_HIERARCHY[tokenPayload.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 999;
    
    return userLevel >= requiredLevel;
}

export default {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    extractTokenFromHeader,
    isTokenExpired,
    getTokenExpiration,
    generateSessionId,
    createTokenSet,
    validateTokenPayload,
    getUserFromToken,
    hasRole,
    hasMinimumRole
};