"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Mail, CheckCircle, XCircle, Clock, Calendar, Search, ArrowLeft,
    RotateCw, Send, Eye, MousePointerClick, AlertTriangle, Timer, Ban, Wifi
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';

type ResendStatus = 'sent' | 'delivered' | 'delayed' | 'bounced' | 'complained' | 'opened' | 'clicked' | 'failed';

type SentLog = {
    id: string;
    sent_at: string;
    updated_at?: string;
    recipient: string;
    subject: string;
    status: ResendStatus;
    error_message?: string;
    content?: string;
    sender_email?: string;
    resend_email_id?: string;
};

type StatusFilter = 'all' | 'delivered' | 'failed';

function StatusBadge({ status, dict }: { status: ResendStatus; dict: any }) {
    const cfg: Record<ResendStatus, { label: string; icon: React.ReactNode; cls: string }> = {
        delivered: {
            label: dict.history.delivered,
            icon: <CheckCircle className="w-3.5 h-3.5" />,
            cls: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        },
        sent: {
            label: dict.history.sent,
            icon: <Send className="w-3.5 h-3.5" />,
            cls: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        },
        opened: {
            label: dict.history.opened,
            icon: <Eye className="w-3.5 h-3.5" />,
            cls: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
        },
        clicked: {
            label: dict.history.clicked,
            icon: <MousePointerClick className="w-3.5 h-3.5" />,
            cls: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
        },
        delayed: {
            label: dict.history.delayed,
            icon: <Timer className="w-3.5 h-3.5" />,
            cls: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        },
        bounced: {
            label: dict.history.bounced,
            icon: <Ban className="w-3.5 h-3.5" />,
            cls: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        },
        complained: {
            label: dict.history.complained,
            icon: <AlertTriangle className="w-3.5 h-3.5" />,
            cls: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
        },
        failed: {
            label: dict.history.failed,
            icon: <XCircle className="w-3.5 h-3.5" />,
            cls: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        },
    };

    const c = cfg[status] ?? cfg.failed;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.cls}`}>
            {c.icon}
            {c.label}
        </span>
    );
}

export default function HistoryPage() {
    const { dict, dir } = useLanguage();
    const [logs, setLogs] = useState<SentLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedLog, setSelectedLog] = useState<SentLog | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const PER_PAGE = 20;

    const fetchLogs = useCallback(async (reset = false, overrideSearch?: string, overrideFilter?: StatusFilter) => {
        try {
            setIsLoading(true);
            const currentPage = reset ? 0 : page;
            const search = overrideSearch !== undefined ? overrideSearch : searchQuery;
            const filter = overrideFilter !== undefined ? overrideFilter : statusFilter;

            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email;
            const isAdmin = userEmail === 'admin@rrakb.com';

            let query = supabase
                .from('sent_logs')
                .select('id, sent_at, updated_at, recipient, subject, status, error_message, sender_email, resend_email_id, content')
                .order('sent_at', { ascending: false })
                .range(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE - 1);

            if (!isAdmin && userEmail) {
                query = query.eq('sender_email', userEmail);
            }

            if (search) {
                query = query.or(`subject.ilike.%${search}%,recipient.ilike.%${search}%`);
            }

            if (filter === 'delivered') {
                query = query.in('status', ['sent', 'delivered', 'opened', 'clicked']);
            } else if (filter === 'failed') {
                query = query.in('status', ['failed', 'bounced', 'complained']);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching logs:', error.message, error.code, error.details);
                return;
            }

            if (reset) {
                setLogs(data || []);
                setPage(1);
            } else {
                setLogs(prev => [...prev, ...(data || [])]);
                setPage(prev => prev + 1);
            }
            setHasMore((data?.length ?? 0) >= PER_PAGE);
        } catch (error: any) {
            console.error('Error fetching logs:', error?.message ?? error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [page, searchQuery, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // Initial load + search/filter debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs(true, searchQuery, statusFilter);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // Realtime: update status of individual rows when Resend webhooks fire
    useEffect(() => {
        const channel = supabase
            .channel('sent_logs_realtime')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sent_logs' },
                (payload) => {
                    setLogs(prev =>
                        prev.map(log =>
                            log.id === (payload.new as SentLog).id
                                ? { ...log, ...(payload.new as SentLog) }
                                : log
                        )
                    );
                    // Also update selected modal if open
                    setSelectedLog(prev =>
                        prev && prev.id === (payload.new as SentLog).id
                            ? { ...prev, ...(payload.new as SentLog) }
                            : prev
                    );
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchLogs(true);
    };

    const filterTabs: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: dict.history.filter_all },
        { key: 'delivered', label: dict.history.filter_delivered },
        { key: 'failed', label: dict.history.filter_failed },
    ];

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="md:flex items-start justify-between mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors md:hidden">
                            <ArrowLeft className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                        </Link>
                        <h1 className="text-3xl font-bold text-[#39285e] dark:text-white flex items-center gap-3">
                            <div className="bg-[#39285e]/10 p-2 rounded-lg text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]">
                                <HistoryIcon className="w-6 h-6" />
                            </div>
                            {dict.history.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{dict.history.subtitle}</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                            <Wifi className="w-3 h-3" />
                            {dict.history.live_badge}
                        </span>
                    </div>
                </div>

                <div className="mt-4 md:mt-0 flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        title={dict.history.refresh}
                    >
                        <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="relative">
                        <Search className={`w-5 h-5 absolute top-1/2 -translate-y-1/2 text-gray-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                        <input
                            type="text"
                            placeholder={dict.history.search_placeholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`py-2 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#39285e]/30 outline-none transition-all dark:text-white text-sm ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                {filterTabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${statusFilter === tab.key
                            ? 'bg-[#39285e] text-white border-[#39285e] dark:bg-[#79bbe0] dark:text-gray-900 dark:border-[#79bbe0]'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="px-5 py-4 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide text-start">{dict.history.status}</th>
                                <th className="px-5 py-4 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide text-start">{dict.history.recipient}</th>
                                <th className="px-5 py-4 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide text-start">{dict.history.subject}</th>
                                <th className="px-5 py-4 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide text-start">{dict.history.sender_col}</th>
                                <th className="px-5 py-4 font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide text-end">{dict.history.time}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {logs.map((log) => (
                                <tr
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-5 py-4">
                                        <StatusBadge status={log.status} dict={dict} />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm">
                                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold uppercase shrink-0 transition-transform group-hover:scale-110">
                                                {log.recipient.charAt(0)}
                                            </div>
                                            <span className="truncate max-w-[180px]">{log.recipient}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm truncate max-w-[200px]">
                                        {log.subject}
                                    </td>
                                    <td className="px-5 py-4 text-gray-500 dark:text-gray-500 text-xs font-mono truncate max-w-[160px]">
                                        {log.sender_email || '—'}
                                    </td>
                                    <td className="px-5 py-4 text-end whitespace-nowrap">
                                        <div className="flex flex-col items-end gap-0.5 text-gray-500 dark:text-gray-500 text-xs">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(log.sent_at).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-14 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <Mail className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p>{dict.history.no_history}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            className="p-4 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 me-3">
                                    <h3 className="font-bold text-[#39285e] dark:text-[#79bbe0] text-sm line-clamp-1">{log.subject || '(No Subject)'}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{log.recipient}</p>
                                </div>
                                <StatusBadge status={log.status} dict={dict} />
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                                <span className="font-mono truncate max-w-[140px]">{log.sender_email || '—'}</span>
                                <span className="flex items-center gap-1 shrink-0">
                                    <Clock className="w-3 h-3" />
                                    {new Date(log.sent_at).toLocaleDateString()} {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && !isLoading && (
                        <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                                <Mail className="w-6 h-6 text-gray-400" />
                            </div>
                            <p>{dict.history.no_history}</p>
                        </div>
                    )}
                </div>

                {/* Loading skeleton rows */}
                {isLoading && logs.length === 0 && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                                <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                <div className="h-6 w-40 bg-gray-100 dark:bg-gray-800 rounded" />
                                <div className="h-6 w-32 bg-gray-100 dark:bg-gray-800 rounded flex-1" />
                            </div>
                        ))}
                    </div>
                )}

                {hasMore && !isLoading && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
                        <button
                            onClick={() => fetchLogs()}
                            className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm flex items-center gap-2 mx-auto text-sm"
                        >
                            {dict.history.load_more}
                        </button>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0">
                                    <StatusBadge status={selectedLog.status} dict={dict} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">
                                        {selectedLog.subject}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {dict.history.sent_to} <span className="font-medium text-gray-700 dark:text-gray-300">{selectedLog.recipient}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="shrink-0 ms-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Metadata strip */}
                        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            {selectedLog.sender_email && (
                                <>
                                    <span className="text-gray-400">{dict.inbox.sender}</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300 truncate">{selectedLog.sender_email}</span>
                                </>
                            )}
                            {selectedLog.resend_email_id && (
                                <>
                                    <span className="text-gray-400">{dict.history.resend_id}</span>
                                    <span className="font-mono text-gray-500 dark:text-gray-400 truncate">{selectedLog.resend_email_id}</span>
                                </>
                            )}
                            {selectedLog.updated_at && selectedLog.updated_at !== selectedLog.sent_at && (
                                <>
                                    <span className="text-gray-400">{dict.history.status} ↻</span>
                                    <span className="text-gray-500 dark:text-gray-400">{new Date(selectedLog.updated_at).toLocaleString()}</span>
                                </>
                            )}
                        </div>

                        {/* Error block */}
                        {(selectedLog.status === 'failed' || selectedLog.status === 'bounced' || selectedLog.status === 'complained') && selectedLog.error_message && (
                            <div className="mx-5 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl shrink-0">
                                <h4 className="text-sm font-bold text-red-800 dark:text-red-300 mb-1 flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
                                    {dict.history.delivery_failed}
                                </h4>
                                <p className="text-sm text-red-600 dark:text-red-400 font-mono bg-white/50 dark:bg-black/20 p-2 rounded mt-2 break-all">
                                    {selectedLog.error_message || dict.history.unknown_error}
                                </p>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{dict.history.content_preview}</h4>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white">
                                {selectedLog.content ? (
                                    <iframe
                                        srcDoc={selectedLog.content}
                                        className="w-full h-[380px]"
                                        title="Email Content"
                                        sandbox="allow-same-origin"
                                    />
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                                        <Mail className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-sm">{dict.history.content_unavailable}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-between items-center text-xs text-gray-400">
                            <span>ID: {selectedLog.id}</span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(selectedLog.sent_at).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
            <path d="M3 3v9h9" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}
