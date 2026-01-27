"use client";

import { useEffect, useState } from 'react';
import { accountManager, StoredAccount } from '@/lib/account-manager';
import { supabase } from '@/lib/supabase';
import { X, User } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function QuickLoginList() {
    const [savedAccounts, setSavedAccounts] = useState<StoredAccount[]>([]);
    const { dict } = useLanguage();

    useEffect(() => {
        setSavedAccounts(accountManager.getSavedAccounts());
    }, []);

    const handleQuickLogin = async (account: StoredAccount) => {
        const { error } = await supabase.auth.setSession({
            access_token: account.session.access_token,
            refresh_token: account.session.refresh_token
        });

        if (error) {
            alert(dict.login?.session_expired || "Session expired. Please sign in again.");
            // If expired, maybe remove from quick login?
            // accountManager.removeAccount(account.email); // or unmark?
            // setSavedAccounts(accountManager.getSavedAccounts());
            return;
        }

        // Reload to apply session
        window.location.reload();
    };

    const handleRemove = (e: React.MouseEvent, email: string) => {
        e.stopPropagation();
        // Here we just "unmark" as saved, or remove completely? 
        // User said "if no then it is not saved". 
        // Usually clicking X on a quick login list means "Forget this account".
        // So we should remove it or unmark it. Let's unmark it so it drops from the list.
        // Actually accountManager.removeAccount removes it from storage entirely. 
        // That seems appropriate for "Forget".
        accountManager.removeAccount(email);
        setSavedAccounts(accountManager.getSavedAccounts());
    };

    if (savedAccounts.length === 0) return null;

    return (
        <div className="w-full mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
                {dict.login?.quick_login_title || "Quick Login"}
            </h3>

            <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {savedAccounts.map((account) => (
                    <div
                        key={account.email}
                        onClick={() => handleQuickLogin(account)}
                        className="group relative flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-blue-900/10"
                    >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                            {account.email.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {account.full_name || account.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{account.email}</p>
                        </div>

                        <button
                            onClick={(e) => handleRemove(e, account.email)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title={dict.login?.remove_account || "Remove account"}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
