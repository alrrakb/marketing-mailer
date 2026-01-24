"use client";

import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export function Header({ title }: { title?: string }) {
    const { user } = useAuth();
    const { language, toggleLanguage, dict } = useLanguage();

    const formatName = (email: string | undefined) => {
        if (!email) return 'User';
        const namePart = email.split('@')[0];
        // Capitalize first letter
        return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    };

    return (
        <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-[#39285e] dark:text-white tracking-tight">{title || dict.sidebar.dashboard}</h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Language Toggle */}
                <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">{language}</span>
                </button>

                {/* Profile Section */}
                <Link href="/profile" className="flex items-center gap-3 pl-2 group cursor-pointer">
                    <div className="flex flex-col items-end hidden md:flex transition-all">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-[#39285e] dark:group-hover:text-[#79bbe0] transition-colors">
                            {formatName(user?.email)}
                        </span>
                        <span className="text-[10px] font-medium tracking-wider text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-md border border-gray-100 dark:border-gray-700 group-hover:border-[#79bbe0]/30 transition-colors">
                            {user?.email === 'admin@rrakb.com' ? dict.common.admin : dict.common.team_member}
                        </span>
                    </div>

                    <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#39285e] to-[#4f3882] dark:from-[#79bbe0] dark:to-[#4e9bc7] flex items-center justify-center text-white dark:text-[#39285e] font-bold shadow-lg shadow-[#39285e]/20 ring-2 ring-white dark:ring-gray-900 group-hover:scale-105 transition-transform duration-200">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                    </div>
                </Link>
            </div>
        </header>
    );
}
