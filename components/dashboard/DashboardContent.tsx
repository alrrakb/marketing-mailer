"use client";

import { useLanguage } from '@/components/providers/LanguageProvider';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

export default function DashboardContent({ sentCount, failedCount, recentLogs }: any) {
    const { dict } = useLanguage();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#39285e] dark:text-white">{dict.dashboard.title}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{dict.dashboard.welcome}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-[#39285e]/10 text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0] rounded-xl">
                        <Mail className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{dict.dashboard.total_sent}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{sentCount || 0}</h3>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-xl">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{dict.dashboard.successful}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{sentCount || 0}</h3>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl">
                        <XCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{dict.dashboard.failed}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{failedCount || 0}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{dict.dashboard.recent_activity}</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#39285e]/10 text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]">
                        {dict.dashboard.live_updates}
                    </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentLogs && recentLogs.length > 0 ? (
                        recentLogs.map((log: any) => (
                            <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full shadow-sm ring-4 ring-white dark:ring-gray-800 ${log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{log.subject}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{log.recipient}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 font-mono">
                                    {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                                <Mail className="w-6 h-6 text-gray-400" />
                            </div>
                            <p>{dict.dashboard.no_activity}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
