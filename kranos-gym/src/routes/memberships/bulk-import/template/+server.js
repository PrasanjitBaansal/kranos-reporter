// CSV template headers
const CSV_HEADERS = 'name,phone,email,plan_name,duration_days,start_date,amount_paid,purchase_date';

export async function GET() {
    try {
        // Create CSV template content with sample data (DD-MM-YYYY format)
        const sampleRow = 'John Doe,9876543210,john.doe@email.com,Monthly Membership,30,15-01-2024,2500,15-01-2024';
        const csvContent = CSV_HEADERS + '\n' + sampleRow + '\n';
        
        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="membership-import-template.csv"'
            }
        });
    } catch (error) {
        console.error('Template download error:', error);
        return new Response('Failed to generate template', { status: 500 });
    }
}