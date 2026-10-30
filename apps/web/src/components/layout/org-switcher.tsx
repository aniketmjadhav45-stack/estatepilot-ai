'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Check, Plus, AlertCircle } from 'lucide-react';
import { switchOrganizationAction } from '../../app/actions/auth';

export interface WorkspaceOrg {
  id: string;
  name: string;
  type: 'individual' | 'agency' | 'enterprise';
  role: string;
}

export function OrgSwitcher() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Active user accessible organizations
  const [organizations] = useState<WorkspaceOrg[]>([
    { id: 'org_apex_01', name: 'Apex Premier Realty', type: 'agency', role: 'Owner' },
    { id: 'org_morgan_02', name: 'Alex Morgan Solo Agent', type: 'individual', role: 'Owner' },
    { id: 'org_metro_03', name: 'Metropolitan Properties LLC', type: 'enterprise', role: 'Branch Manager' },
  ]);

  const [activeOrg, setActiveOrg] = useState<WorkspaceOrg>(organizations[0]);

  const handleSelect = async (org: WorkspaceOrg) => {
    if (org.id === activeOrg.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setSwitchError(null);

    try {
      const res = await switchOrganizationAction(org.id);
      if (!res.success) {
        setSwitchError(res.error || 'Failed to switch workspace.');
        setIsSwitching(false);
        return;
      }

      setActiveOrg(org);
      setIsSwitching(false);
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Error switching organization.');
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-700/60 bg-navy-950/60 hover:bg-navy-900 transition-colors text-left disabled:opacity-50"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">
              {activeOrg.name}
            </p>
            <p className="text-[11px] text-slate-400 capitalize">
              {activeOrg.type} · {activeOrg.role}
            </p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-navy-900 border border-slate-700/80 rounded-lg shadow-elevated z-50 py-1.5 divide-y divide-slate-800">
          {switchError && (
            <div className="p-2 mx-2 mb-1 rounded bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{switchError}</span>
            </div>
          )}

          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
            Active Workspaces
          </div>
          <div className="py-1">
            {organizations.map((org) => {
              const isSelected = org.id === activeOrg.id;
              return (
                <button
                  key={org.id}
                  onClick={() => handleSelect(org)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800/80 transition-colors ${
                    isSelected ? 'bg-slate-800/50' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {org.name}
                    </p>
                    <p className="text-[11px] text-slate-400 capitalize">
                      {org.type} ({org.role})
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="p-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/onboarding');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
