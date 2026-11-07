import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Users,
  UserPlus,
  Kanban,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { createServerClient, getCrmDashboardMetrics, getLeads } from '@estatepilot/database';
import { ACTIVE_ORG_COOKIE } from '@estatepilot/auth';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';

export const dynamic = 'force-dynamic';

export default async function CrmDashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('sb-access-token')?.value || '';
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value || 'org_apex_01';

  const client = createServerClient(token);

  // Fetch real CRM dashboard metrics
  const metricsResult = await getCrmDashboardMetrics(client, activeOrgId);
  const stats = metricsResult.ok
    ? metricsResult.value
    : {
        totalLeads: 0,
        newLeads: 0,
        qualifiedLeads: 0,
        activeDeals: 0,
        followUpsDue: 0,
        pipelineOverview: [],
        sourceBreakdown: [],
        recentActivities: [],
      };

  // Fetch top recent leads for action table
  const recentLeadsResult = await getLeads(client, activeOrgId, { limit: 5, sortBy: 'created_at', sortOrder: 'desc' });
  const recentLeads = recentLeadsResult.ok ? recentLeadsResult.value.data : [];

  const stageBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
    new: 'info',
    contacted: 'default',
    qualified: 'purple',
    proposal: 'warning',
    negotiation: 'warning',
    closed_won: 'success',
    closed_lost: 'danger',
    unqualified: 'default',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              CRM & Pipeline Intelligence
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              Live Workspace
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time lead conversion velocity, pipeline health, and team follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/leads">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>All Leads</span>
            </Button>
          </Link>
          <Link href="/dashboard/leads?new=true">
            <Button size="sm" variant="primary" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Lead</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          icon={<Users className="w-4 h-4 text-brand-600" />}
          subtitle="Active directory"
        />
        <StatCard
          title="New Inquiries"
          value={stats.newLeads}
          icon={<UserPlus className="w-4 h-4 text-blue-600" />}
          subtitle="Awaiting first touch"
        />
        <StatCard
          title="Qualified Leads"
          value={stats.qualifiedLeads}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          subtitle="Score > 70"
        />
        <StatCard
          title="Active Deals"
          value={stats.activeDeals}
          icon={<Kanban className="w-4 h-4 text-amber-600" />}
          subtitle="Proposal & negotiation"
        />
        <StatCard
          title="Follow-ups Due"
          value={stats.followUpsDue}
          icon={<Clock className="w-4 h-4 text-rose-600" />}
          subtitle="Pending tasks"
        />
      </div>

      {/* Middle Row: Pipeline Funnel Overview & Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Stage Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Lead Pipeline Distribution</CardTitle>
              <CardDescription>Live distribution across full deal lifecycle stages</CardDescription>
            </div>
            <Link
              href="/dashboard/leads"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Manage Pipeline</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.totalLeads === 0 ? (
              <EmptyState
                icon={<Kanban className="w-5 h-5 text-slate-400" />}
                title="No active pipeline data"
                description="Ingest or create your first lead to visualize stage progression."
              />
            ) : (
              <div className="space-y-3.5">
                {stats.pipelineOverview.map((item) => (
                  <div key={item.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{item.label}</span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({item.count})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.totalValue > 0 && (
                          <span className="text-slate-500 font-medium">
                            ${item.totalValue.toLocaleString()}
                          </span>
                        )}
                        <span className="font-semibold text-slate-700 w-9 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(item.count > 0 ? 3 : 0, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Inquiry Channels</CardTitle>
            <CardDescription>Attribution sources of prospective buyers</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.sourceBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No channel data recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.sourceBreakdown.map((src) => (
                  <div
                    key={src.source}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{src.label}</p>
                      <p className="text-[11px] text-slate-400">{src.percentage}% of total leads</p>
                    </div>
                    <span className="text-xs font-bold text-slate-900 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      {src.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Priority Leads & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Recent Leads & Inquiries</CardTitle>
              <CardDescription>Latest prospect inquiries captured into workspace</CardDescription>
            </div>
            <Link
              href="/dashboard/leads"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentLeads.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Users className="w-5 h-5 text-slate-400" />}
                  title="No leads registered"
                  description="Start by adding new prospective buyers or sellers to your workspace."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Contact</th>
                      <th className="py-2.5 px-3">Stage</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Budget</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {lead.firstName} {lead.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {lead.email && <span className="truncate">{lead.email}</span>}
                            {lead.phone && <span>{lead.phone}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={stageBadgeVariant[lead.status] || 'default'} size="sm">
                            {lead.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold text-xs ${
                              lead.qualificationScore >= 80
                                ? 'text-emerald-600'
                                : lead.qualificationScore >= 50
                                ? 'text-brand-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {lead.qualificationScore}/100
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {lead.estimatedBudgetMax
                            ? `$${lead.estimatedBudgetMax.toLocaleString()}`
                            : 'Unspecified'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            <span>Details</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Activity Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>Live timeline of interactions & notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent activity logged.
              </div>
            ) : (
              <div className="space-y-3.5 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
                {stats.recentActivities.map((act) => (
                  <div key={act.id} className="relative flex items-start gap-3 pl-1">
                    <div className="w-5 h-5 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0 z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">
                        {act.title}
                      </p>
                      {act.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {act.description}
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(act.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
