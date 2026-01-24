"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Editor from '@/components/email/Editor';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Send, Loader2, Eye, FileText, Sparkles, Mail, AlertTriangle, X } from 'lucide-react';
import EmailPreview from '@/components/email/EmailPreview';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { toast } from 'sonner';

type FormData = {
    recipients: string;
    subject: string;
};

export default function ComposePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { dict, dir } = useLanguage();
    const [content, setContent] = useState('');
    const [editorKey, setEditorKey] = useState(0); // Force editor remount
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isDraftsOpen, setIsDraftsOpen] = useState(false);
    const [drafts, setDrafts] = useState<any[]>([]);
    const [draftToLoad, setDraftToLoad] = useState<any | null>(null);
    const [attachments, setAttachments] = useState<{ filename: string, content: string, encoding: 'base64' }[]>([]);

    // AI State
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiMode, setAiMode] = useState<'generate' | 'refine'>('generate');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);

    const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<FormData>();

    const openAIModal = (mode: 'generate' | 'refine') => {
        setAiMode(mode);
        setAiPrompt('');
        setIsAIModalOpen(true);
    };

    const handleAIRequest = async () => {
        if (!aiPrompt.trim()) return;
        setIsAILoading(true);
        try {
            if (aiMode === 'generate') {
                const res = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: aiPrompt, senderName: user?.user_metadata?.full_name || 'Al-Rrakb Team' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setValue('subject', data.subject);
                setContent(data.content);
                setEditorKey(k => k + 1);
                if (data.recipients && Array.isArray(data.recipients) && data.recipients.length > 0) {
                    setValue('recipients', data.recipients.join(', '));
                }
                if (data.recipients && Array.isArray(data.recipients) && data.recipients.length > 0) {
                    setValue('recipients', data.recipients.join(', '));
                }
                toast.success(dict.ai.success_generated);
                // setMessage({ type: 'success', text: 'Draft generated successfully!' });
            } else {
                // Refine
                // Strip HTML tags to check real content length
                const strippedContent = content.replace(/<[^>]*>/g, '').trim();

                if (!strippedContent && content.length < 50) {
                    // Only error if truly empty AND html is short (avoids blocking complex empty structures)
                    toast.error(dict.ai.error_no_content);
                    return;
                }

                const res = await fetch('/api/ai/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, instruction: aiPrompt })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setContent(data.content);
                setEditorKey(k => k + 1);
                toast.success(dict.ai.success_refined);
                // setMessage({ type: 'success', text: 'Content polished successfully!' });
            }
            setIsAIModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || dict.ai.error_generic);
        } finally {
            setIsAILoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const newAttachments: any[] = [];

            for (const file of files) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                await new Promise<void>((resolve) => {
                    reader.onload = () => {
                        const base64Content = (reader.result as string).split(',')[1];
                        newAttachments.push({
                            filename: file.name,
                            content: base64Content,
                            encoding: 'base64'
                        });
                        resolve();
                    };
                });
            }
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        setMessage(null);

        // Calculate payload size estimation
        const recipientList = data.recipients.split(',').map(email => email.trim()).filter(email => email);
        const attachmentsSize = attachments.reduce((acc, curr) => acc + (curr.content.length * 0.75), 0); // Base64 overhead approx
        const contentSize = new Blob([content]).size;
        const totalSize = attachmentsSize + contentSize;

        // Vercel Serverless Function Limit is ~4.5MB. We set safety margin at 3.5MB.
        if (totalSize > 3.5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Total message size exceeds 3.5MB limit. Please reduce attachments.' });
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipients: recipientList,
                    subject: data.subject,
                    content: content,
                    senderEmail: user?.email,
                    attachments: attachments // Send attachments
                }),
            });

            if (!res.ok) {
                // Handle HTML error responses (like 413)
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const result = await res.json();
                    throw new Error(result.error || 'Failed to send email');
                } else {
                    const text = await res.text();
                    if (res.status === 413) {
                        throw new Error('File too large (413). Please reduce attachment size.');
                    }
                    throw new Error(`Server Error (${res.status}): ${text.substring(0, 50)}...`);
                }
            }

            const result = await res.json();
            setMessage({ type: 'success', text: dict.compose.email_sent });
            setAttachments([]); // Clear attachments on success
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const saveDraft = async () => {
        const currentSubject = getValues('subject');

        if (!currentSubject && !content) {
            setMessage({ type: 'error', text: 'Subject or content required to save draft' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const recipientsStr = getValues('recipients') || '';
            const recipientList = recipientsStr.split(',').map(email => email.trim()).filter(email => email);

            const { error } = await supabase.from('drafts').insert({
                subject: currentSubject,
                content_html: content,
                recipients_json: recipientList,
                user_email: user?.email // Save owner
            });

            if (error) throw error;

            setMessage({ type: 'success', text: dict.compose.draft_saved });
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Failed to save draft: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const loadDrafts = async () => {
        setIsDraftsOpen(true);
        try {
            const { data, error } = await supabase
                .from('drafts')
                .select('*')
                .eq('user_email', user?.email) // Filter by owner
                .order('updated_at', { ascending: false });
            if (error) throw error;
            setDrafts(data || []);
        } catch (error: any) {
            alert('Failed to load drafts: ' + error.message);
        }
    };

    const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this draft?')) return;

        try {
            const res = await fetch(`/api/drafts?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');

            // Remove from local state
            setDrafts(prev => prev.filter(d => d.id !== id));
            // showToast('success', 'Draft deleted');
        } catch (error) {
            // showToast('error', 'Failed to delete draft');
        }
    };

    const confirmLoadDraft = (draft: any) => {
        setValue('subject', draft.subject || '');
        const recipients = Array.isArray(draft.recipients_json)
            ? draft.recipients_json.join(', ')
            : '';

        setValue('recipients', recipients);
        setContent(draft.content_html || '');
        setIsDraftsOpen(false);
        setDraftToLoad(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Action Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-[#39285e] dark:text-white flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-[#79bbe0]" />
                            {dict.compose.title}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">{dict.compose.desc}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => openAIModal('generate')}
                            className="flex-1 md:flex-none justify-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 rounded-lg font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg text-sm"
                        >
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                            <span className="hidden sm:inline">{dict.ai.btn_generate}</span>
                        </button>
                        <button
                            type="button"
                            onClick={loadDrafts}
                            className="flex-1 md:flex-none justify-center px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center gap-2 shadow-sm text-sm"
                        >
                            <FileText className="w-4 h-4 text-[#79bbe0]" />
                            <span className="hidden sm:inline">{dict.compose.load_draft}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            className="flex-1 md:flex-none justify-center px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center gap-2 shadow-sm text-sm"
                        >
                            <Eye className="w-4 h-4 text-[#79bbe0]" />
                            <span className="hidden sm:inline">{dict.compose.preview}</span>
                        </button>
                        <button
                            type="button"
                            onClick={saveDraft}
                            className="flex-1 md:flex-none justify-center px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center gap-2 shadow-sm text-sm"
                        >
                            <Save className="w-4 h-4 text-[#79bbe0]" />
                            <span className="hidden sm:inline">{dict.common.save}</span>
                        </button>
                        <button
                            form="compose-form"
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 md:flex-none justify-center px-6 py-2 bg-[#39285e] text-white rounded-lg font-bold hover:bg-[#2d1f4b] shadow-lg shadow-[#39285e]/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm whitespace-nowrap transform hover:scale-105 active:scale-95"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {dict.compose.send_email}
                        </button>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 mb-8 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {message.text}
                    </div>
                )}

                <form id="compose-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Metadata Card */}
                    <div className="grid gap-6 bg-white dark:bg-gray-900/50 p-6 md:p-8 rounded-2xl shadow-md border-t-4 border-[#39285e] dark:border-[#79bbe0]">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">{dict.compose.recipients}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        {...register('recipients', { required: 'Recipients are required' })}
                                        type="text"
                                        placeholder={dict.compose.recipients_placeholder}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] focus:border-transparent dark:text-white outline-none transition-all placeholder:text-gray-400"
                                    />
                                </div>
                                {errors.recipients && <p className="text-red-500 text-sm">{errors.recipients.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">{dict.compose.subject}</label>
                                <input
                                    {...register('subject', { required: 'Subject is required' })}
                                    type="text"
                                    placeholder={dict.compose.subject_placeholder}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] focus:border-transparent dark:text-white outline-none transition-all placeholder:text-gray-400"
                                />
                                {errors.subject && <p className="text-red-500 text-sm">{errors.subject.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Content Editor Card */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#39285e]/10 dark:bg-[#79bbe0]/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-[#39285e] dark:text-[#79bbe0]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{dict.compose.content_title}</h3>
                                    <p className="text-xs text-gray-500">{dict.compose.content_desc}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    id="file-upload"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:text-[#79bbe0] hover:border-[#79bbe0] transition-colors flex items-center gap-2 text-sm font-medium shadow-sm group"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#79bbe0] transition-colors"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                    {dict.compose.attach_file}
                                </label>
                            </div>
                        </div>

                        {/* Attachments List */}
                        {attachments.length > 0 && (
                            <div className="px-4 pt-4 flex flex-wrap gap-2">
                                {attachments.map((file, index) => (
                                    <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-[#79bbe0]/10 border border-[#79bbe0]/20 rounded-lg text-sm text-[#39285e] dark:text-[#79bbe0] shadow-sm animate-in fade-in zoom-in-95">
                                        <span className="truncate max-w-[200px] font-medium">{file.filename}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(index)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="p-4">
                            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                <Editor key={editorKey} value={content} onChange={setContent} onRefine={() => openAIModal('refine')} />
                            </div>
                        </div>
                    </div>
                </form>

                <EmailPreview
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    content={content}
                    subject={getValues('subject') || "Email Preview"}
                />

                {/* Drafts Modal */}
                {isDraftsOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-[#39285e] text-white">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-[#79bbe0]" />
                                    {dict.compose.saved_drafts}
                                </h3>
                                <button onClick={() => setIsDraftsOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-950">
                                {drafts.length === 0 ? (
                                    <div className="text-center py-12 px-4">
                                        <div className="bg-white dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
                                            <FileText className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400">{dict.compose.no_drafts}</p>
                                    </div>
                                ) : (
                                    drafts.map(draft => (
                                        <button
                                            key={draft.id}
                                            onClick={() => setDraftToLoad(draft)}
                                            className="w-full text-start p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#79bbe0] dark:hover:border-[#79bbe0] transition-all group shadow-sm hover:shadow-md"
                                        >
                                            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-[#39285e] dark:group-hover:text-[#79bbe0] transition-colors">
                                                {draft.subject || '(No Subject)'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">
                                                    {new Date(draft.updated_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(draft.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Draft Load Modal */}
                {draftToLoad && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3 text-[#39285e] dark:text-[#79bbe0] mb-4">
                                <AlertTriangle className="w-6 h-6" />
                                <h3 className="text-lg font-bold">{dict.compose.overwrite_warn_title}</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {dict.compose.overwrite_warn_desc}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDraftToLoad(null)}
                                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                                >
                                    {dict.common.cancel}
                                </button>
                                <button
                                    onClick={() => confirmLoadDraft(draftToLoad)}
                                    className="px-4 py-2 rounded-lg bg-[#39285e] text-white hover:bg-[#2d1f4b] transition-colors font-medium shadow-lg shadow-[#39285e]/20"
                                >
                                    {dict.compose.limit_load}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Modal */}
                {isAIModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                                        {aiMode === 'generate' ? dict.ai.modal_generate_title : dict.ai.modal_refine_title}
                                    </h3>
                                    <button onClick={() => setIsAIModalOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-white/80 text-sm mt-2">
                                    {aiMode === 'generate'
                                        ? dict.ai.hint_generate
                                        : dict.ai.hint_refine}
                                </p>
                            </div>

                            <div className="p-6">
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder={aiMode === 'generate' ? dict.ai.placeholder_generate : dict.ai.placeholder_refine}
                                    className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-6 dark:text-white"
                                    autoFocus
                                />

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setIsAIModalOpen(false)}
                                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        {dict.ai.cancel}
                                    </button>
                                    <button
                                        onClick={handleAIRequest}
                                        disabled={isAILoading || !aiPrompt.trim()}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {aiMode === 'generate'
                                            ? (isAILoading ? dict.ai.generating : dict.ai.generate)
                                            : (isAILoading ? dict.ai.refining : dict.ai.refine)
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
