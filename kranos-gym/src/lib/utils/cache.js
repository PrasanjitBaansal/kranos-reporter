/**
 * Simple in-memory cache utility for server-side caching
 * Provides TTL-based caching with automatic cleanup
 */

class SimpleCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 300000; // 5 minutes default
        
        // Cleanup expired entries every 10 minutes
        setInterval(() => this.cleanup(), 600000);
    }
    
    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null if not found/expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return null;
        }
        
        entry.lastAccessed = Date.now();
        return entry.data;
    }
    
    /**
     * Set cached data
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            expires: Date.now() + ttl,
            created: Date.now(),
            lastAccessed: Date.now()
        });
    }
    
    /**
     * Delete cached entry
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
    }
    
    /**
     * Clear all cached entries
     */
    clear() {
        this.cache.clear();
    }
    
    /**
     * Get cache statistics
     * @returns {object} Cache statistics
     */
    getStats() {
        const now = Date.now();
        let totalSize = 0;
        let expiredCount = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            totalSize += JSON.stringify(entry.data).length;
            if (now > entry.expires) {
                expiredCount++;
            }
        }
        
        return {
            entries: this.cache.size,
            expired: expiredCount,
            sizeBytes: totalSize,
            sizeKB: Math.round(totalSize / 1024 * 100) / 100
        };
    }
    
    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expires) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`Cache cleanup: removed ${cleanedCount} expired entries`);
        }
    }
    
    /**
     * Generate cache key from parameters
     * @param {...any} parts - Parts to create cache key from
     * @returns {string} Cache key
     */
    key(...parts) {
        return parts.map(part => 
            typeof part === 'object' ? JSON.stringify(part) : String(part)
        ).join(':');
    }
}

// Global cache instance
const cache = new SimpleCache();

/**
 * Cache wrapper for async functions
 * @param {string} key - Cache key
 * @param {Function} fn - Async function to cache result of
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any>} Cached or fresh data
 */
export async function cached(key, fn, ttl = 300000) {
    const cachedData = cache.get(key);
    if (cachedData !== null) {
        return cachedData;
    }
    
    const data = await fn();
    cache.set(key, data, ttl);
    return data;
}

/**
 * Performance monitoring wrapper
 * @param {string} operation - Operation name
 * @param {Function} fn - Function to monitor
 * @returns {Promise<any>} Function result with performance logging
 */
export async function withPerformanceLogging(operation, fn) {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;
        
        if (duration > 1000) {
            console.warn(`⚠️  Slow operation: ${operation} took ${duration}ms`);
        } else if (duration > 100) {
            console.log(`🐌 ${operation} took ${duration}ms`);
        } else {
            console.log(`⚡ ${operation} took ${duration}ms`);
        }
        
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        console.error(`❌ ${operation} failed after ${duration}ms:`, error.message);
        throw error;
    }
}

/**
 * Database query caching helper
 * @param {Database} db - Database instance
 * @param {string} queryName - Query identifier
 * @param {Function} queryFn - Database query function
 * @param {number} ttl - Cache TTL in milliseconds
 * @returns {Promise<any>} Query result
 */
export async function cachedQuery(db, queryName, queryFn, ttl = 300000) {
    const cacheKey = `query:${queryName}`;
    
    return await withPerformanceLogging(
        `Query: ${queryName}`,
        () => cached(cacheKey, queryFn, ttl)
    );
}

export default cache;