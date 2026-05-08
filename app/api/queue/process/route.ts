
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function GET(req: Request) {
    const PROCESS_LIMIT = 1;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 200 });
    }

    const resend = new Resend(resendApiKey);

    const DEFAULT_SENDER_NAME = process.env.RESEND_FROM_NAME || 'TALAE ALRRAKB';

    try {
        // 1. Get Active Campaign IDs
        const { data: activeCampaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('status', 'active');

        const activeIds = activeCampaigns?.map(c => c.id) || [];
        if (activeIds.length === 0) {
            return NextResponse.json({ message: 'No active campaigns' });
        }

        // 2. Atomic Fetch & Lock
        const { data: emails, error: fetchError } = await supabase
            .rpc('fetch_next_queue_batch', {
                p_limit: PROCESS_LIMIT,
                p_active_campaign_ids: activeIds,
            });

        if (fetchError) throw fetchError;
        if (!emails || emails.length === 0) {
            return NextResponse.json({ message: 'No pending emails' });
        }

        const results = [];

        for (const email of emails) {
            let senderEmail = process.env.RESEND_FROM_EMAIL || 'admin@rrakb.com';
            let campaignUserId: string | null = null;

            try {
                let { subject, body_html, attachments, campaign_id } = email;

                const { data: campaign } = await supabase
                    .from('campaigns')
                    .select('subject, body_html, attachments, user_email, user_id')
                    .eq('id', campaign_id)
                    .single();

                if (campaign) {
                    subject = subject || campaign.subject;
                    body_html = body_html || campaign.body_html;
                    attachments = attachments || campaign.attachments;
                    senderEmail = campaign.user_email || senderEmail;
                    campaignUserId = campaign.user_id ?? null;
                }

                if (!senderEmail) throw new Error('No sender email determined');

                // Resolve display name from profile
                let senderName = DEFAULT_SENDER_NAME;
                if (campaignUserId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', campaignUserId)
                        .single();
                    if (profile?.full_name) senderName = profile.full_name;
                }

                console.log(`[QUEUE] Sending from: "${senderName}" <${senderEmail}> → ${email.recipient_email}`);

                const { data: sendData, error: sendError } = await resend.emails.send({
                    from: `"${senderName}" <${senderEmail}>`,
                    reply_to: senderEmail,
                    to: email.recipient_email,
                    subject,
                    html: body_html,
                    ...(attachments?.length ? { attachments } : {}),
                });

                if (sendError) throw new Error(sendError.message);

                await supabase.from('email_queue')
                    .update({ status: 'completed', updated_at: new Date() })
                    .eq('id', email.id);

                await supabase.from('sent_logs').insert({
                    recipient: email.recipient_email,
                    subject,
                    content: body_html,
                    status: 'sent',
                    sender_email: senderEmail,
                    resend_email_id: sendData?.id ?? null,
                    sent_at: new Date().toISOString(),
                    user_id: campaignUserId,
                });

                results.push({ id: email.id, status: 'success', resend_id: sendData?.id });

            } catch (err: any) {
                const msg = err.message || '';
                const isRateLimit = msg.includes('rate') || msg.includes('429');

                if (isRateLimit) {
                    const backoffTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                    await supabase.from('email_queue').update({
                        status: 'pending',
                        scheduled_at: backoffTime,
                        last_error: `Rate limit. Retry after ${backoffTime}. ${msg}`,
                        updated_at: new Date(),
                    }).eq('id', email.id);

                    results.push({ id: email.id, status: 'rate_limited', backoff: '30m' });
                } else {
                    await supabase.from('email_queue').update({
                        status: 'failed',
                        last_error: msg,
                        attempts: (email.attempts || 0) + 1,
                        updated_at: new Date(),
                    }).eq('id', email.id);

                    await supabase.from('sent_logs').insert({
                        recipient: email.recipient_email,
                        subject: email.subject || 'Unknown',
                        content: email.body_html || '',
                        status: 'failed',
                        error_message: msg,
                        sender_email: senderEmail,
                        sent_at: new Date().toISOString(),
                        user_id: campaignUserId,
                    });

                    results.push({ id: email.id, status: 'failed', error: msg });
                }
            }
        }

        // 3. Campaign Completion Check
        const touchedCampaignIds = [...new Set(emails.map((e: any) => e.campaign_id))];
        for (const cId of touchedCampaignIds) {
            const { count, error } = await supabase
                .from('email_queue')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', cId)
                .in('status', ['pending', 'queued']);

            if (!error && count === 0) {
                await supabase.from('campaigns').update({ status: 'completed' }).eq('id', cId);
                console.log(`[QUEUE] Campaign ${cId} completed.`);
            }
        }

        return NextResponse.json({ processed: results.length, details: results });

    } catch (err: any) {
        console.error('[QUEUE] Error:', err);
        return NextResponse.json({ error: err.message, stack: err.stack }, { status: 200 });
    }
}
