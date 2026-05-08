
import { Resend } from 'resend';

// Singleton Resend instance — import this wherever emails need to be sent.
export const resend = new Resend(process.env.RESEND_API_KEY);

export const DEFAULT_FROM = `"${process.env.RESEND_FROM_NAME || 'TALAE ALRRAKB'}" <${process.env.RESEND_FROM_EMAIL || 'admin@rrakb.com'}>`;
