'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Compass,
  Kanban,
  MessageSquare,
  Bot,
  Calendar,
  Sparkles,
  GitBranch,
  BarChart3,
  CreditCard,
  Settings,
  ShieldAlert,
  Building,
} from 'lucide-react';
import { OrgSwitcher } from './org-switcher';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();

  const navigation: NavItem[] = [
    { name: 'Agent Dashboard', href: '/dashboard', icon: Home },
    { name: 'Agency Overview', href: '/agency', icon: Building },
    { name: 'CRM & Leads', href: '/dashboard/leads', icon: Users, badge: '12 New' },
    { name: 'Properties', href: '/dashboard/properties', icon: Compass },
    { name: 'Deal Pipeline', href: '/dashboard/deals', icon: Kanban },
    { name: 'Unified Inbox', href: '/dashboard/inbox', icon: MessageSquare, badge: '3' },
    { name: 'Calendar & Visits', href: '/dashboard/calendar', icon: Calendar },
    { name: 'AI Agent Center', href: '/dashboard/ai-agents', icon: Bot, badge: 'Active' },
    { name: 'Workflows', href: '/dashboard/workflows', icon: GitBranch },
    { name: 'Analytics & BI', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Billing & AI Credits', href: '/settings/billing', icon: CreditCard },
    { name: 'Organization Settings', href: '/settings/organization', icon: Settings },
  ];

  const adminNav: NavItem = {
    name: 'Super Admin Portal',
    href: '/admin',
    icon: ShieldAlert,
    badge: 'Platform',
  };

  return (
    <aside className="w-64 bg-navy-950 border-r border-slate-800 flex flex-col h-screen fixed inset-y-0 left-0 z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white">
              EstatePilot <span className="text-brand-400">AI</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
              Real Estate OS
            </p>
          </div>
        </Link>

        {/* Tenant Workspace Selector */}
        <div className="mt-4">
          <OrgSwitcher />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Core Workspace
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Super Administration
        </div>
        <Link
          href={adminNav.href}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            pathname === adminNav.href
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <adminNav.icon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{adminNav.name}</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
            {adminNav.badge}
          </span>
        </Link>
      </nav>

      {/* Footer Profile */}
      <div className="p-3 border-t border-slate-800 bg-navy-950/80">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-navy-900/60 border border-slate-800">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white">
            AM
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              Alex Morgan
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              alex@apexrealty.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
