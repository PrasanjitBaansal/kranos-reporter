import Database from '../../lib/db/database.js';

export const load = async ({ url }) => {
    const db = new Database();
    try {
        await db.connect();
        
        // Get query parameters for date range
        const startDate = url.searchParams.get('start_date') || 
            new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const endDate = url.searchParams.get('end_date') || 
            new Date().toISOString().split('T')[0];
        
        const [financialReport, upcomingRenewals] = await Promise.all([
            db.getFinancialReport(startDate, endDate),
            db.getUpcomingRenewals(30)
        ]);

        return {
            financialReport,
            upcomingRenewals,
            dateRange: { startDate, endDate }
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
            const financialReport = await db.getFinancialReport(startDate, endDate);
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