
"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PenSquare, FileText, History, Settings, Mail, ChevronLeft, ChevronRight, LogOut, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';

type NavItem = {
  key: string;
  href: string;
  icon: any;
}

const navigation: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'inbox', href: '/inbox', icon: Mail },
  { key: 'compose', href: '/compose', icon: PenSquare },
  // { key: 'templates', href: '/templates', icon: FileText },
  { key: 'history', href: '/history', icon: History },
  // { key: 'contacts', href: '/contacts', icon: Mail },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { dict, dir } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={clsx(
        "flex h-full flex-col bg-[#39285e] text-white transition-all duration-300 relative z-20",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={clsx(
          "absolute top-8 bg-[#79bbe0] text-[#39285e] p-1 rounded-full shadow-md hover:bg-white transition-colors border-2 border-[#39285e] z-30",
          dir === 'rtl' ? "-left-3" : "-right-3"
        )}
      >
        {/* Logic simplifiction: Just swap icon based on state/dir combo or stick to one logic if button rotates? Let's just use icons that make sense. 
           If LTR: < points left (collapse). > points right (expand)
           If RTL: > points right (collapse into right). < points left (expand)
        */}
        {dir === 'ltr'
          ? (isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)
          : (isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
        }
      </button>

      <div className={clsx("flex h-16 items-center px-6 font-bold text-xl tracking-wider border-b border-[#79bbe0]/20 overflow-hidden", isCollapsed && "px-4")}>
        <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain mx-1" unoptimized />
        <span className={clsx("transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>{dict.sidebar.brand_suffix}</span>
      </div>

      <div className="flex-1 flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          // @ts-ignore
          const label = dict.sidebar[item.key] || item.key;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-[#79bbe0] text-[#39285e] shadow-md shadow-[#79bbe0]/10 font-bold'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? label : undefined}
            >
              <item.icon className={clsx("h-5 w-5 min-w-[20px]", isActive ? "text-[#39285e]" : "text-gray-400 group-hover:text-white")} />
              <span className={clsx("transition-all duration-300 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                {label}
              </span>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className={clsx(
                  "absolute top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50",
                  dir === 'rtl' ? "right-full mr-2" : "left-full ml-2"
                )}>
                  {label}
                </div>
              )}
            </Link>
          );
        })}

        {/* Admin Link - Only visible to Admin */}
        {user?.email === 'admin@rrakb.com' && (
          <Link
            href="/admin/users"
            className={clsx(
              'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors mt-4 border border-red-500/30 group relative',
              pathname.startsWith('/admin')
                ? 'bg-red-500/10 text-red-300'
                : 'text-red-300 hover:bg-red-500/10',
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? dict.sidebar.admin_users : undefined}
          >
            <ShieldAlert className="h-5 w-5 min-w-[20px]" />
            <span className={clsx("transition-all duration-300 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
              {dict.sidebar.admin_users}
            </span>
            {isCollapsed && (
              <div className={clsx(
                "absolute top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50",
                dir === 'rtl' ? "right-full mr-2" : "left-full ml-2"
              )}>
                {dict.sidebar.admin_users}
              </div>
            )}
          </Link>
        )}

      </div>
      <div className="p-4 border-t border-[#79bbe0]/20 flex flex-col gap-2">
        {user?.email === 'admin@rrakb.com' && (
          <Link
            href="/admin/settings"
            className={clsx(
              "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors group relative",
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? dict.sidebar.platform_settings : undefined}
          >
            <Settings className="h-5 w-5 min-w-[20px]" />
            <span className={clsx("transition-all duration-300 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
              {dict.sidebar.platform_settings}
            </span>
            {isCollapsed && (
              <div className={clsx(
                "absolute top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50",
                dir === 'rtl' ? "right-full mr-2" : "left-full ml-2"
              )}>
                {dict.sidebar.platform_settings}
              </div>
            )}
          </Link>
        )}
        <button
          onClick={signOut}
          className={clsx(
            "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors group relative",
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? dict.common.logout : undefined}
        >
          <LogOut className="h-5 w-5 min-w-[20px]" />
          <span className={clsx("transition-all duration-300 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
            {dict.common.logout}
          </span>
          {isCollapsed && (
            <div className={clsx(
              "absolute top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50",
              dir === 'rtl' ? "right-full mr-2" : "left-full ml-2"
            )}>
              {dict.common.logout}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
