"use client";

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Mail, Plus, Trash2, CheckCircle, RefreshCw, X, Eye, Inbox as InboxIcon, Globe, Loader2, ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DesktopMessageRow, MobileMessageCard, type InboxMessage } from '@/components/inbox/InboxRows';

export default function InboxPage() {
    const { dict, dir } = useLanguage();
    const router = useRouter();
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Translation State
    const [isTranslated, setIsTranslated] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedContent, setTranslatedContent] = useState<string>("");

    // Reset translation when message changes
    useEffect(() => {
        setIsTranslated(false);
        setIsTranslating(false);
        setTranslatedContent("");
    }, [selectedMessage]);

    // Toast state (reuse logic if extracted, or local for now)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchMessages();
        // Setup polling for real-time updates (every 10 seconds)
        const interval = setInterval(() => {
            fetchMessages(true, true);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const fetchMessages = async (sync: boolean = false, isBackground: boolean = false) => {
        if (!isBackground) setIsLoading(true);
        try {
            if (sync) {
                const syncRes = await fetch('/api/inbox?action=sync', { method: 'POST' });
                if (!syncRes.ok) {
                    // Check for 401 Unauthorized specifically to avoid console spam
                    if (syncRes.status === 401) {
                        // Session expired - silently fail background sync
                        return;
                    }

                    const errData = await syncRes.json().catch(() => ({ error: syncRes.statusText }));
                    // Only show toast on error if manual sync, or maybe just log it on background
                    if (!isBackground) {
                        throw new Error(errData.error || 'Sync failed');
                    } else {
                        console.error('Background sync failed:', errData.error);
                    }
                }
            }
            const res = await fetch('/api/inbox');
            const data = await res.json();
            if (Array.isArray(data)) {
                setMessages(data);
            }
        } catch (error: any) {
            console.error('Failed to fetch inbox', error);
            if (!isBackground) showToast('error', error.message || 'Failed to update');
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    const handleSimulate = async () => {
        setIsSimulating(true);
        try {
            const fakeEmail = {
                sender: `Client ${Math.floor(Math.random() * 1000)} <client${Math.floor(Math.random() * 100)}@example.com>`,
                subject: `Inquiry about services #${Math.floor(Math.random() * 1000)}`,
                content: `<p>Hello,</p><p>I would like to know more about your marketing packages.</p><p>Best regards,<br>Client</p>`,
                tags: ['Inquiry']
            };

            const res = await fetch('/api/inbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fakeEmail)
            });

            if (!res.ok) throw new Error('Failed to simulate');

            showToast('success', dict.inbox.simulated_success);
            fetchMessages();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSimulating(false);
        }
    };

    const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
        if (currentStatus) return; // Already read
        try {
            await fetch('/api/inbox', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_read: true })
            });
            // Optimistic update
            setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        } catch (error) {
            console.error(error);
        }
    };

    const handleTranslate = () => {
        if (!selectedMessage) return;

        if (isTranslated) {
            setIsTranslated(false);
            return;
        }

        const content = selectedMessage.content;
        const isArabic = /[\u0600-\u06FF]/.test(content);

        let translated = "";

        // Simulation Logic:
        // In a real app, we would call an API like Google Cloud Translation here.
        // For simulation, we'll wrap text or show a placeholder.
        if (isArabic) {
            translated = `<div style="padding: 10px; border-left: 3px solid #39285e; background: #f8f9fa;">
                <strong>[Simulated Translation to English]</strong><br/><br/>
                This is a simulated English translation of the Arabic content.<br/>
                (Real-time translation requires a paid API integration).<br/><br/>
                Original length: ${content.length} chars.
            </div>`;
        } else {
            translated = `<div style="padding: 10px; border-right: 3px solid #39285e; background: #f8f9fa; direction: rtl; text-align: right;">
                <strong>[محاكاة الترجمة للعربية]</strong><br/><br/>
                هذه ترجمة محاكاة للمحتوى الإنجليزي.<br/>
                (الترجمة الفورية تتطلب ربط مع خدمة مدفوعة).<br/><br/>
                النص الأصلي: ${content}
            </div>`;
        }

        setTranslatedContent(translated);
        setIsTranslated(true);
    };

    const handleDelete = useCallback((id: string) => {
        setDeleteConfirmation(id);
    }, []);

    const cancelDelete = () => {
        setDeleteConfirmation(null);
    };

    const openMessage = useCallback((msg: InboxMessage) => {
        setSelectedMessage(msg);
        // Note: handleMarkAsRead is not memoized but it's okay, we can call it here.
        // To be perfectly strict we should verify handleMarkAsRead is stable or pull logic here.
        // For simplicity, we just call it.
        if (!msg.is_read) {
            // Inline the simple optimistic logic or move handleMarkAsRead to useCallback if needed
            // but 'openMessage' changing only when 'msg' changes is handled by the caller not passing a new closure?
            // Actually, openMessage IS passed to memoized row. It needs to be stable.
            // So handleMarkAsRead needs to be outside or we just do the fetch here.
            fetch('/api/inbox', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: msg.id, is_read: true })
            }).catch(console.error);
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
        }
    }, []);

    const getStyledContent = (content: string) => {
        // We force a white background for the email content to ensure templates execute as designed.
        // Most HTML emails are designed for white backgrounds.
        const styles = `
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                /* Ensure links are blue */
                a { color: #2563eb !important; text-decoration: underline; }
                
                /* Scrollbar styling for the iframe content */
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            </style>
        `;

        if (content.includes('<!DOCTYPE html') || content.includes('<html')) {
            return content.replace('</head>', `${styles}</head>`);
        } else {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    ${styles}
                </head>
                <body>
                    ${content}
                </body>
                </html>
            `;
        }
    };

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Toggle Selection Mode
    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            // Turning off: Clear selection
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        } else {
            // Turning on
            setIsSelectionMode(true);
        }
    };

    // Reset selection when messages change/refresh
    // Sync selection with messages: Remove IDs that no longer exist, but preserve valid selections.
    useEffect(() => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            let changed = false;
            // If message list is empty, clear selection
            if (messages.length === 0 && next.size > 0) return new Set();

            // If we have messages, ensure all selected IDs still valid
            // Optimization: Create a Set of message IDs for O(1) lookups if messages array is large
            const msgIds = new Set(messages.map(m => m.id));

            for (const id of Array.from(next)) {
                if (!msgIds.has(id)) {
                    next.delete(id);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [messages]);

    const toggleSelectAll = () => {
        if (selectedIds.size === messages.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(messages.map(m => m.id)));
        }
    };

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const handleBulkDelete = () => {
        setDeleteConfirmation('BULK');
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;
        setIsDeleting(true);

        if (deleteConfirmation === 'BULK') {
            try {
                // Use Body payload to avoid URL length limits
                const res = await fetch('/api/inbox', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedIds) })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to delete selected');
                }

                setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
                setSelectedIds(new Set());
                showToast('success', dict.inbox.delete_success);
            } catch (error: any) {
                console.error(error);
                showToast('error', error.message || 'Failed to delete selected messages');
            } finally {
                setIsDeleting(false);
                setDeleteConfirmation(null);
            }
        } else {
            // Single delete
            const id = deleteConfirmation;
            try {
                const res = await fetch(`/api/inbox?id=${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed');

                setMessages(prev => prev.filter(m => m.id !== id));
                showToast('success', dict.inbox.delete_success);

                if (selectedMessage?.id === id) setSelectedMessage(null);
            } catch (error) {
                console.error(error);
            } finally {
                setIsDeleting(false);
                setDeleteConfirmation(null);
            }
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">{dict.inbox.loading}</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 relative h-full flex flex-col">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-top fade-in duration-300 ${toast.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#39285e] dark:text-white flex items-center gap-3">
                    <div className="bg-[#39285e]/10 p-2 rounded-lg text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]">
                        <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    {dict.inbox.title}
                </h1>

                <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto overflow-x-auto max-w-full pb-1 sm:pb-0">
                    {process.env.NODE_ENV === 'development' && (
                        <button
                            onClick={handleSimulate}
                            disabled={isSimulating}
                            className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Simulate
                        </button>
                    )}
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-colors flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap text-sm sm:text-base"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">{dict.inbox.delete_selected}</span>
                            <span className="sm:hidden">Delete</span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs ml-1">{selectedIds.size}</span>
                        </button>
                    )}
                    <button
                        onClick={toggleSelectionMode}
                        className={`p-2 transition-colors rounded-lg flex items-center justify-center ${isSelectionMode
                            ? 'bg-[#39285e] text-white dark:bg-[#79bbe0] dark:text-gray-900 shadow-md'
                            : 'text-gray-500 hover:text-[#39285e] hover:bg-gray-100 dark:text-gray-400 dark:hover:text-[#79bbe0] dark:hover:bg-gray-800'}`}
                        title={isSelectionMode ? "Cancel Selection Mode" : dict.inbox.select_all || "Select Messages"}
                    >
                        <ListChecks className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => fetchMessages(true, false)}
                        className="p-2 text-gray-500 hover:text-[#39285e] dark:text-gray-400 dark:hover:text-[#79bbe0] transition-colors"
                        title={dict.inbox.refresh}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                        <InboxIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p>{dict.inbox.no_messages}</p>
                    </div>
                ) : (
                    <div className="overflow-auto flex-1">
                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                            <table className="w-full text-start border-separate border-spacing-0">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-medium sticky top-0 z-10 backdrop-blur-sm">
                                    <tr>
                                        {isSelectionMode && (
                                            <th className="px-6 py-4 text-start w-[50px] animate-in fade-in duration-200">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-[#39285e] focus:ring-[#39285e]"
                                                    checked={messages.length > 0 && selectedIds.size === messages.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                        )}
                                        <th className="px-6 py-4 text-start w-1/4">{dict.inbox.sender}</th>
                                        <th className="px-6 py-4 text-start w-1/3">{dict.inbox.subject}</th>
                                        <th className="px-6 py-4 text-start">{dict.inbox.date}</th>
                                        <th className="px-6 py-4 text-start">{dict.inbox.actions}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {messages.map(msg => (
                                        <DesktopMessageRow
                                            key={msg.id}
                                            message={msg}
                                            isSelected={selectedIds.has(msg.id)}
                                            isSelectionMode={isSelectionMode}
                                            onToggleSelect={toggleSelect}
                                            onOpen={openMessage}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                            {messages.map(msg => (
                                <MobileMessageCard
                                    key={msg.id}
                                    message={msg}
                                    isSelected={selectedIds.has(msg.id)}
                                    isSelectionMode={isSelectionMode}
                                    onToggleSelect={toggleSelect}
                                    onOpen={openMessage}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Message Detail Modal */}
            {
                selectedMessage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedMessage(null)}>
                        <div className="bg-white dark:bg-gray-900 w-full max-w-3xl h-[85vh] sm:max-h-[85vh] md:max-h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedMessage.subject}</h2>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{dict.inbox.sender}:</span>
                                        <span>{selectedMessage.sender}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span className="font-medium bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{dict.inbox.date}:</span>
                                        <span>{new Date(selectedMessage.received_at).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Action Buttons: Translate & Close */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleTranslate}
                                        className={`p-2 rounded-full transition-all flex items-center justify-center ${isTranslated
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'bg-white hover:bg-gray-100 text-gray-500 hover:text-[#39285e] border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'
                                            }`}
                                        title={isTranslated ? dict.inbox.show_original : dict.inbox.translate_btn}
                                    >
                                        <Globe className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 hover:text-red-500">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto bg-white dark:bg-gray-950 p-6 relative">
                                {/* Translation Banner */}
                                {isTranslated && (
                                    <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 mb-4 text-sm font-medium rounded-lg flex items-center gap-2 border border-blue-100 dark:border-blue-900/50">
                                        <Globe className="w-4 h-4" />
                                        {dict.inbox.translated_label}
                                    </div>
                                )}

                                {/* Safe HTML render or IFrame */}
                                <div className="prose dark:prose-invert max-w-none w-full h-full">
                                    <iframe
                                        srcDoc={getStyledContent(isTranslated ? translatedContent : selectedMessage.content)}
                                        className="w-full min-h-[500px] border-0"
                                        sandbox="allow-same-origin"
                                        title="Email Content"
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
                                <button
                                    onClick={() => handleDelete(selectedMessage.id)}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {dict.common.delete}
                                </button>
                                <button
                                    onClick={() => setSelectedMessage(null)}
                                    className="px-6 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                                >
                                    {dict.inbox.close}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Custom Delete Confirmation Modal */}
            {
                deleteConfirmation && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in" onClick={cancelDelete}>
                        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 mx-4 sm:mx-0" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {deleteConfirmation === 'BULK' ? dict.inbox.delete_modal.title + ` (${selectedIds.size})` : dict.inbox.delete_modal.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {deleteConfirmation === 'BULK' ? dict.inbox.delete_modal.desc : dict.inbox.delete_modal.desc}
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={cancelDelete}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                                >
                                    {dict.inbox.delete_modal.cancel}
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {dict.inbox.delete_modal.confirm}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
