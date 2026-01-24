import { createClient } from '@/lib/supabase-server';
import DashboardContent from '@/components/dashboard/DashboardContent';

export const revalidate = 0; // Disable static caching for real-time stats

export default async function DashboardPage() {
    const supabase = await createClient();
    // Fetch stats
    const { count: sentCount } = await supabase
        .from('sent_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent');

    const { count: failedCount } = await supabase
        .from('sent_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

    const { data: recentLogs } = await supabase
        .from('sent_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    return (
        <DashboardContent
            sentCount={sentCount || 0}
            failedCount={failedCount || 0}
            recentLogs={recentLogs || []}
        />
    );
}
