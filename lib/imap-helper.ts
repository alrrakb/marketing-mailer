import imap from 'imap-simple';
import { simpleParser } from 'mailparser';

export class ImapHelper {
    constructor() { }

    // authUser and authPass are always the Primary Account credentials.
    // Aliases cannot authenticate to IMAP — only the primary mailbox can.
    // aliasFilter optionally filters messages by their To/Delivered-To header.
    async fetchNewEmails(authUser: string, authPass: string, aliasFilter?: string) {
        console.log(`[IMAP] Connecting as Primary Account: <${authUser}>${aliasFilter ? ` (filtering for alias: <${aliasFilter}>)` : ''}`);

        const config = {
            imap: {
                user: authUser,
                password: authPass,
                host: process.env.IMAP_HOST || 'imap.hostinger.com',
                port: Number(process.env.IMAP_PORT) || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 30000,
            }
        };

        try {
            const connection = await imap.connect(config);
            console.log('IMAP Connected. Opening INBOX...');

            await connection.openBox('INBOX');
            console.log('INBOX Opened. Searching...');

            // When using aliases, all mail lands in the primary inbox.
            // We filter by the To header so each user only sees their own alias messages.
            const searchCriteria: any[] = aliasFilter
                ? ['UNSEEN', ['TO', aliasFilter]]
                : ['UNSEEN'];

            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: true
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            console.log(`[IMAP] Found ${messages.length} unseen message(s)${aliasFilter ? ` for <${aliasFilter}>` : ''}.`);

            const parsedMessages = await Promise.all(messages.map(async (msg: any) => {
                const all = msg.parts.find((part: any) => part.which === '');
                const id = msg.attributes.uid;
                const body = all ? all.body : '';

                const parsed = await simpleParser(body);

                return {
                    message_id: parsed.messageId || `uid-${id}`,
                    sender: parsed.from?.text || 'Unknown',
                    subject: parsed.subject || 'No Subject',
                    content: parsed.html || parsed.textAsHtml || parsed.text || '',
                    date: parsed.date || new Date(),
                    original_msg: msg
                };
            }));

            connection.end();
            return parsedMessages;
        } catch (error) {
            console.error('IMAP Fetch Error:', error);
            throw error;
        }
    }
}
