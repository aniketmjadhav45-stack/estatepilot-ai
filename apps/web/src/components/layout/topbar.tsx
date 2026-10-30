'use client';

import React from 'react';
import { Search, Bell, Sparkles, Plus } from 'lucide-react';
import { Button } from '../ui/button';

export function Topbar() {
  return (
    <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads, properties, deals, contacts..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Quick Actions & Status */}
      <div className="flex items-center gap-3">
        {/* AI Assistant Status indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AI Runtime Online</span>
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-brand-600 absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        {/* Quick Create Button */}
        <Button size="sm" variant="primary" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>New Entry</span>
        </Button>
      </div>
    </header>
  );
}
