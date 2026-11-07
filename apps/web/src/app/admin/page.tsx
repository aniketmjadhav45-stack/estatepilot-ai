'use client';

import React from 'react';
import {
  ShieldAlert,
  Server,
  Activity,
  Building,
  Users,
  DollarSign,
  Cpu,
  Lock,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/sidebar';
import { Topbar } from '../../components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { StatCard } from '../../components/ui/stat-card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function SuperAdminPage() {
  const platformStats = [
    {
      title: 'Active SaaS Tenants',
      value: '428',
      change: '34 this month',
      isPositive: true,
      icon: <Building className="w-5 h-5 text-brand-600" />,
      subtitle: '84 Enterprise, 212 Agency, 132 Solo',
    },
    {
      title: 'Platform MRR',
      value: '$94,250',
      change: '18.6% MoM',
      isPositive: true,
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      subtitle: 'Stripe & Razorpay verified billing',
    },
    {
      title: 'AI Tokens Processed (24h)',
      value: '14.8M',
      change: '99.98% uptime',
      isPositive: true,
      icon: <Cpu className="w-5 h-5 text-purple-600" />,
      subtitle: 'OpenAI (62%), Gemini (28%), Claude (10%)',
    },
    {
      title: 'Security & RLS Violations',
      value: '0',
      change: '100% isolated',
      isPositive: true,
      icon: <Lock className="w-5 h-5 text-rose-600" />,
      subtitle: 'Continuous tenant boundary auditing',
    },
  ];

  const tenants = [
    {
      id: 'org_1',
      name: 'Apex Premier Realty',
      slug: 'apex-premier',
      type: 'Agency',
      plan: 'Agency ($249/mo)',
      members: 18,
      status: 'Active',
      mrr: '$249',
      createdAt: '2026-08-14',
    },
    {
      id: 'org_2',
      name: 'Metropolitan Properties Group',
      slug: 'metropolitan-grp',
      type: 'Enterprise',
      plan: 'Enterprise ($599/mo)',
      members: 64,
      status: 'Active',
      mrr: '$599',
      createdAt: '2026-07-02',
    },
    {
      id: 'org_3',
      name: 'Alex Morgan Solo Agent',
      slug: 'alex-morgan-re',
      type: 'Individual',
      plan: 'Starter ($49/mo)',
      members: 1,
      status: 'Active',
      mrr: '$49',
      createdAt: '2026-09-21',
    },
    {
      id: 'org_4',
      name: 'Pacific Crest Real Estate',
      slug: 'pacific-crest',
      type: 'Agency',
      plan: 'Agency ($249/mo)',
      members: 12,
      status: 'Past Due',
      mrr: '$249',
      createdAt: '2026-05-19',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 pl-64 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Global Super Admin Portal
                </h1>
                <Badge variant="danger" size="sm">
                  Restricted Privileges
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Platform-wide multi-tenant observability, subscription health, and security ledger.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                System Health Check
              </Button>
              <Button variant="danger" size="sm">
                View Global Audit Ledger
              </Button>
            </div>
          </div>

          {/* Platform KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformStats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </div>

          {/* Tenant Directory */}
          <Card>
            <CardHeader className="py-4 flex items-center justify-between">
              <div>
                <CardTitle>Global Tenant Directory</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isolated multi-tenant organizations across all tiers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tenant name or slug..."
                    className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">Organization</th>
                    <th className="py-2.5 px-4 font-semibold">Tenant Slug</th>
                    <th className="py-2.5 px-4 font-semibold">Tier</th>
                    <th className="py-2.5 px-4 font-semibold">Plan</th>
                    <th className="py-2.5 px-4 font-semibold">Active Seats</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {t.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {t.slug}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{t.type}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{t.plan}</td>
                      <td className="py-3 px-4 text-slate-700">{t.members} seats</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={t.status === 'Active' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-brand-600 gap-1"
                          onClick={() => alert(`Audited Impersonation initiated for ${t.name}.`)}
                        >
                          <span>Impersonate</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
