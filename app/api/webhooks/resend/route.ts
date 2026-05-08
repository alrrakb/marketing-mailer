
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Map Resend event types to sent_logs status values
const EVENT_STATUS_MAP: Record<string, string> = {
    'email.sent':             'sent',
    'email.delivered':        'delivered',
    'email.delivery_delayed': 'delayed',
    'email.bounced':          'bounced',
    'email.complained':       'complained',
    'email.opened':           'opened',
    'email.clicked':          'clicked',
};

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { type, data } = payload;

        console.log(`[WEBHOOK] Resend event: ${type} | email_id: ${data?.email_id}`);

        const newStatus = EVENT_STATUS_MAP[type];

        // Only process events we care about
        if (!newStatus || !data?.email_id) {
            return NextResponse.json({ received: true, action: 'ignored' });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Update sent_logs row that matches the Resend email ID
        const { error } = await supabaseAdmin
            .from('sent_logs')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('resend_email_id', data.email_id);

        if (error) {
            console.error(`[WEBHOOK] DB update failed for ${data.email_id}:`, error.message);
            // Return 200 anyway so Resend doesn't retry indefinitely
            return NextResponse.json({ received: true, db_error: error.message });
        }

        console.log(`[WEBHOOK] Updated sent_logs → status="${newStatus}" for email_id=${data.email_id}`);
        return NextResponse.json({ received: true, status: newStatus });

    } catch (err: any) {
        console.error('[WEBHOOK] Parse error:', err);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
