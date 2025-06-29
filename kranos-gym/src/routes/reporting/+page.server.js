import Database from '../../lib/db/database.js';

// OPTIMIZATION: Simple in-memory cache for report data (1 hour TTL)
const reportCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

function getCacheKey(type, startDate, endDate, days = null) {
    return `${type}-${startDate}-${endDate}${days ? `-${days}` : ''}`;
}

function getCachedData(cacheKey) {
    const cached = reportCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    if (cached) {
        reportCache.delete(cacheKey); // Remove expired cache
    }
    return null;
}

function setCachedData(cacheKey, data) {
    reportCache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
}

export const load = async ({ url }) => {
    const db = new Database();
    try {
        await db.connect();
        
        // Get query parameters for date range
        const startDate = url.searchParams.get('start_date') || 
            new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const endDate = url.searchParams.get('end_date') || 
            new Date().toISOString().split('T')[0];
        
        // OPTIMIZATION: Check cache before running expensive queries
        const financialCacheKey = getCacheKey('financial', startDate, endDate);
        const renewalsCacheKey = getCacheKey('renewals', startDate, endDate, 30);
        
        let financialReport = getCachedData(financialCacheKey);
        let upcomingRenewals = getCachedData(renewalsCacheKey);
        
        // OPTIMIZATION: Only query what's not cached (synchronous calls)
        if (!financialReport) {
            financialReport = db.getFinancialReport(startDate, endDate);
            setCachedData(financialCacheKey, financialReport);
        }
        
        if (!upcomingRenewals) {
            upcomingRenewals = db.getUpcomingRenewals(30);
            setCachedData(renewalsCacheKey, upcomingRenewals);
        }
        
        console.log(`Reporting load: Financial ${financialReport ? 'cached' : 'fresh'}, Renewals ${upcomingRenewals ? 'cached' : 'fresh'}`);

        return {
            financialReport,
            upcomingRenewals,
            dateRange: { startDate, endDate },
            // OPTIMIZATION: Add cache metadata
            cached: {
                financial: !!getCachedData(financialCacheKey),
                renewals: !!getCachedData(renewalsCacheKey)
            }
        };
    } catch (error) {
        console.error('Reporting load error:', error);
        return {
            financialReport: [],
            upcomingRenewals: [],
            dateRange: { 
                startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
            }
        };
    } finally {
        await db.close();
    }
};

export const actions = {
    generateReport: async ({ request }) => {
        const data = await request.formData();
        const startDate = data.get('start_date');
        const endDate = data.get('end_date');
        const db = new Database();

        try {
            await db.connect();
            const financialReport = db.getFinancialReport(startDate, endDate);
            return { 
                success: true, 
                report: financialReport,
                dateRange: { startDate, endDate }
            };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    }
};