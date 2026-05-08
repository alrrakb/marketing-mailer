import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (id) {
            const { data, error } = await supabase
                .from('inbox')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id) // Enforce ownership
                .single();
            if (error) throw error;
            return NextResponse.json(data);
        }

        const { data, error } = await supabase
            .from('inbox')
            .select('*')
            .eq('user_id', user.id) // Filter by user
            .order('received_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { ImapHelper } from '@/lib/imap-helper';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    const supabase = await createClient(); // Current user context
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        if (action === 'sync') {
            // 1. Get current authenticated user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user || !user.email) {
                return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
            }

            console.log(`[INBOX] Sync triggered by: ${user.email}`);

            const supabaseAdmin = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // IMAP always authenticates with the Primary Account.
            // Aliases cannot log in to IMAP independently.
            const imapAuthUser = process.env.IMAP_AUTH_USER || process.env.SMTP_AUTH_USER;
            const imapAuthPass = process.env.IMAP_AUTH_PASS || process.env.SMTP_AUTH_PASS;

            if (!imapAuthUser || !imapAuthPass) {
                console.error('[INBOX] IMAP credentials not configured. Set IMAP_AUTH_USER and IMAP_AUTH_PASS in .env.local');
                return NextResponse.json({ error: 'IMAP not configured' }, { status: 500 });
            }

            console.log(`[IMAP] user="${imapAuthUser}" pass_length=${imapAuthPass.length} pass_last_char="${imapAuthPass[imapAuthPass.length - 1]}"`);

            // Filter to only messages addressed to the currently logged-in user's alias.
            // This way each user sees only their own mail, even though we read from a shared inbox.
            const imapHelper = new ImapHelper();
            const emails = await imapHelper.fetchNewEmails(imapAuthUser, imapAuthPass, user.email);
            let newCount = 0;

            for (const email of emails) {
                // Check if exists
                const { data: existing } = await supabaseAdmin
                    .from('inbox')
                    .select('id')
                    .eq('message_id', email.message_id)
                    .single();

                if (!existing) {
                    await supabaseAdmin.from('inbox').insert({
                        sender: email.sender,
                        subject: email.subject,
                        content: email.content,
                        received_at: email.date.toISOString(),
                        is_read: false,
                        tags: ['IMAP'],
                        message_id: email.message_id,
                        user_id: user.id // Associate with current user
                    });
                    newCount++;
                }
            }

            return NextResponse.json({ success: true, count: newCount });
        }

        const body = await request.json();

        // Basic validation
        if (!body.sender || !body.subject) {
            return NextResponse.json({ error: 'Sender and Subject are required' }, { status: 400 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('inbox')
            .insert({
                sender: body.sender,
                subject: body.subject,
                content: body.content || '',
                tags: body.tags || [],
                is_read: false,
                message_id: `sim-${Date.now()}`, // Add simulated ID
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Inbox Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const supabase = await createClient();
    try {
        const body = await request.json();
        const { id, is_read } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const { error } = await supabase
            .from('inbox')
            .update({ is_read })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const idParam = searchParams.get('id'); // Explicitly get 'id' if needed

    let idsToDelete: string[] = [];

    // Prioritize Body for Bulk Deletes
    try {
        // Clone request to avoid body already used error if we fall back? 
        // Actually, just try parse first.
        const text = await request.text();
        if (text) {
            const body = JSON.parse(text);
            if (body.ids && Array.isArray(body.ids)) {
                idsToDelete = body.ids;
            }
        }
    } catch (e) {
        console.log('Error parsing DELETE body:', e);
    }

    // Fallback to Query Params
    if (idsToDelete.length === 0) {
        if (idsParam) {
            idsToDelete = idsParam.split(',');
        } else if (idParam) {
            idsToDelete = [idParam];
        }
    }

    console.log('IDs to delete:', idsToDelete.length);

    if (idsToDelete.length === 0) {
        return NextResponse.json({ error: 'ID or IDs required' }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from('inbox')
            .delete()
            .in('id', idsToDelete);

        if (error) throw error;

        return NextResponse.json({ success: true, count: idsToDelete.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
