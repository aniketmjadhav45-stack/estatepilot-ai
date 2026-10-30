'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Sparkles, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { createOrganizationAction } from '../actions/auth';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [orgType, setOrgType] = useState<'individual' | 'agency' | 'enterprise'>('individual');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('America/New_York');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('slug', slug);
    formData.append('orgType', orgType);
    formData.append('defaultCurrency', currency);
    formData.append('defaultTimezone', timezone);

    try {
      const res = await createOrganizationAction(formData);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create workspace.');
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during onboarding.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            EstatePilot <span className="text-brand-400">AI</span>
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Initialize your Real Estate Workspace
        </h1>
        <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
          Configure your dedicated multi-tenant workspace with cryptographic isolation and Row-Level Security.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-navy-900 py-8 px-6 shadow-elevated rounded-2xl border border-slate-800 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Workspace Tier Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                Select Workspace Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    type: 'individual',
                    title: 'Solo Agent',
                    desc: 'Single-seat autonomous CRM',
                  },
                  {
                    type: 'agency',
                    title: 'Agency',
                    desc: 'Multi-agent team & deals',
                  },
                  {
                    type: 'enterprise',
                    title: 'Enterprise',
                    desc: 'Multi-branch & regional',
                  },
                ].map((tier) => (
                  <button
                    key={tier.type}
                    type="button"
                    onClick={() => setOrgType(tier.type as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      orgType === tier.type
                        ? 'border-brand-500 bg-brand-600/15 ring-1 ring-brand-500'
                        : 'border-slate-800 bg-navy-950/60 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{tier.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      {tier.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Organization Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Organization / Agency Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Apex Premier Realty"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-700 bg-navy-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tenant Workspace Slug
                </label>
                <div className="flex items-center">
                  <span className="text-[11px] text-slate-500 bg-navy-950 border border-r-0 border-slate-700 px-2.5 py-2.5 rounded-l-lg font-mono">
                    app/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="apex-premier"
                    className="w-full text-xs px-3 py-2.5 rounded-r-lg border border-slate-700 bg-navy-950 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Currency & Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-700 bg-navy-950 text-white focus:outline-none"
                >
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                  <option value="AED">AED — UAE Dirham (AED)</option>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="CAD">CAD — Canadian Dollar (CA$)</option>
                  <option value="AUD">AUD — Australian Dollar (A$)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Time Zone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-700 bg-navy-950 text-white focus:outline-none"
                >
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Central Europe (CET)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full text-xs py-3 mt-4 bg-brand-600 hover:bg-brand-500 gap-2 font-semibold"
              isLoading={isLoading}
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
