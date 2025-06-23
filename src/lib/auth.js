const bcrypt = require('bcryptjs');

class Auth {
    constructor() {
        this.sessions = new Map();
        this.saltRounds = 10;
        
        // Default admin credentials - should be changed in production
        this.defaultCredentials = {
            username: 'admin',
            // Default password: 'admin123' - hashed
            passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
        };
    }

    // Hash a password
    async hashPassword(password) {
        try {
            const hash = await bcrypt.hash(password, this.saltRounds);
            return hash;
        } catch (error) {
            throw new Error('Error hashing password: ' + error.message);
        }
    }

    // Verify password against hash
    async verifyPassword(password, hash) {
        try {
            const isValid = await bcrypt.compare(password, hash);
            return isValid;
        } catch (error) {
            throw new Error('Error verifying password: ' + error.message);
        }
    }

    // Generate session token
    generateSessionToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Login function
    async login(username, password) {
        try {
            // Simple check against default credentials
            if (username !== this.defaultCredentials.username) {
                return {
                    success: false,
                    message: 'Invalid username or password'
                };
            }

            const isValidPassword = await this.verifyPassword(password, this.defaultCredentials.passwordHash);
            
            if (!isValidPassword) {
                return {
                    success: false,
                    message: 'Invalid username or password'
                };
            }

            // Create session
            const sessionToken = this.generateSessionToken();
            const sessionData = {
                username: username,
                loginTime: new Date(),
                lastActivity: new Date()
            };

            this.sessions.set(sessionToken, sessionData);

            return {
                success: true,
                message: 'Login successful',
                sessionToken: sessionToken,
                user: {
                    username: username
                }
            };

        } catch (error) {
            return {
                success: false,
                message: 'Login error: ' + error.message
            };
        }
    }

    // Logout function
    logout(sessionToken) {
        try {
            if (this.sessions.has(sessionToken)) {
                this.sessions.delete(sessionToken);
                return {
                    success: true,
                    message: 'Logout successful'
                };
            } else {
                return {
                    success: false,
                    message: 'Invalid session token'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: 'Logout error: ' + error.message
            };
        }
    }

    // Validate session
    validateSession(sessionToken) {
        try {
            if (!sessionToken) {
                return {
                    valid: false,
                    message: 'No session token provided'
                };
            }

            const sessionData = this.sessions.get(sessionToken);
            
            if (!sessionData) {
                return {
                    valid: false,
                    message: 'Invalid or expired session'
                };
            }

            // Check if session is expired (24 hours)
            const now = new Date();
            const loginTime = new Date(sessionData.loginTime);
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

            if (hoursSinceLogin > 24) {
                this.sessions.delete(sessionToken);
                return {
                    valid: false,
                    message: 'Session expired'
                };
            }

            // Update last activity
            sessionData.lastActivity = now;
            this.sessions.set(sessionToken, sessionData);

            return {
                valid: true,
                user: {
                    username: sessionData.username
                }
            };

        } catch (error) {
            return {
                valid: false,
                message: 'Session validation error: ' + error.message
            };
        }
    }

    // Get all active sessions (for admin purposes)
    getActiveSessions() {
        const sessions = [];
        for (const [token, data] of this.sessions.entries()) {
            sessions.push({
                token: token.substring(0, 10) + '...', // Partial token for security
                username: data.username,
                loginTime: data.loginTime,
                lastActivity: data.lastActivity
            });
        }
        return sessions;
    }

    // Clear all sessions
    clearAllSessions() {
        this.sessions.clear();
        return {
            success: true,
            message: 'All sessions cleared'
        };
    }

    // Update password (for future use)
    async updatePassword(currentPassword, newPassword) {
        try {
            const isValidCurrentPassword = await this.verifyPassword(
                currentPassword, 
                this.defaultCredentials.passwordHash
            );

            if (!isValidCurrentPassword) {
                return {
                    success: false,
                    message: 'Current password is incorrect'
                };
            }

            const newHash = await this.hashPassword(newPassword);
            this.defaultCredentials.passwordHash = newHash;

            return {
                success: true,
                message: 'Password updated successfully'
            };

        } catch (error) {
            return {
                success: false,
                message: 'Error updating password: ' + error.message
            };
        }
    }

    // Middleware function for Express.js
    requireAuth() {
        return (req, res, next) => {
            const sessionToken = req.headers.authorization || req.cookies?.sessionToken;
            
            const validation = this.validateSession(sessionToken);
            
            if (validation.valid) {
                req.user = validation.user;
                next();
            } else {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: validation.message
                });
            }
        };
    }
}

module.exports = Auth;