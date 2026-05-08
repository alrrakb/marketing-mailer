
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { getBaseEmailHtml } from '@/lib/email-templates';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { recipients, subject, content, attachments, senderEmail, showDate } = body;

        if (!subject || !content) {
            return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            console.error('[RESEND] FATAL: RESEND_API_KEY is not set');
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
        }

        const resend = new Resend(resendApiKey);

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Resolve the calling user's UUID from their JWT so we can store it in sent_logs
        let userId: string | null = null;
        const authHeader = req.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
            userId = user?.id ?? null;
        }

        // Determine sender alias — falls back to env default
        const actualSenderEmail = senderEmail || process.env.RESEND_FROM_EMAIL || 'admin@rrakb.com';

        // Resolve display name from user profile
        let senderName = process.env.RESEND_FROM_NAME || 'TALAE ALRRAKB';

        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.find(u => u.email?.toLowerCase() === actualSenderEmail.toLowerCase());
        if (user) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();
            if (profile?.full_name) senderName = profile.full_name;
        }

        console.log(`[RESEND] Sending from: "${senderName}" <${actualSenderEmail}>`);

        const results = [];

        for (const recipient of recipients) {
            try {
                const htmlContent = getBaseEmailHtml(content, subject, showDate);

                const { data, error } = await resend.emails.send({
                    from: `"${senderName}" <${actualSenderEmail}>`,
                    reply_to: actualSenderEmail,
                    to: recipient,
                    bcc: 'archive@rrakb.com',
                    subject,
                    html: htmlContent,
                    ...(attachments?.length ? { attachments } : {}),
                });

                if (error) throw new Error(error.message);

                console.log(`[RESEND] Sent to ${recipient} | ID: ${data?.id}`);

                await supabaseAdmin.from('sent_logs').insert({
                    recipient,
                    subject,
                    content: htmlContent,
                    status: 'sent',
                    sender_email: actualSenderEmail,
                    resend_email_id: data?.id ?? null,
                    sent_at: new Date().toISOString(),
                    user_id: userId,
                });

                results.push({ recipient, status: 'sent', id: data?.id });

            } catch (err: any) {
                console.error(`[RESEND] Failed to send to ${recipient}:`, err.message);

                await supabaseAdmin.from('sent_logs').insert({
                    recipient,
                    subject,
                    content: getBaseEmailHtml(content, subject),
                    status: 'failed',
                    error_message: err.message,
                    sender_email: actualSenderEmail,
                    sent_at: new Date().toISOString(),
                    user_id: userId,
                });

                results.push({ recipient, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (err: any) {
        console.error('[RESEND] Internal error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
