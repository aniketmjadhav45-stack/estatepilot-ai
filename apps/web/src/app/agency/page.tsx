import React from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Compass,
  MapPin,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/sidebar';
import { Topbar } from '../../components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { StatCard } from '../../components/ui/stat-card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function AgencyDashboardPage() {
  const agencyStats = [
    {
      title: 'Gross Agency Pipeline',
      value: '$28,450,000',
      change: '21.4% MoM',
      isPositive: true,
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      subtitle: 'Across 4 branches and 18 active agents',
    },
    {
      title: 'Total Active Listings',
      value: '142',
      change: '12 new this month',
      isPositive: true,
      icon: <Compass className="w-5 h-5 text-brand-600" />,
      subtitle: 'Average listing velocity: 32 days',
    },
    {
      title: 'Active Deal Volume',
      value: '38',
      change: '6 in closing escrow',
      isPositive: true,
      icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
      subtitle: 'Expected commission: $712,000',
    },
    {
      title: 'Agency AI Utilization',
      value: '1,420 Runs',
      change: '92% time saved',
      isPositive: true,
      icon: <Sparkles className="w-5 h-5 text-indigo-600" />,
      subtitle: 'Lead scoring, voice calls & matching',
    },
  ];

  const branches = [
    {
      id: 'b1',
      name: 'Downtown Manhattan Flagship',
      manager: 'Victoria Sterling',
      activeAgents: 8,
      activeListings: 64,
      pipelineValue: '$16,200,000',
      closingRate: '34%',
    },
    {
      id: 'b2',
      name: 'Brooklyn Heights Branch',
      manager: 'Julian Ross',
      activeAgents: 5,
      activeListings: 48,
      pipelineValue: '$8,450,000',
      closingRate: '29%',
    },
    {
      id: 'b3',
      name: 'Hamptons Coastal Office',
      manager: 'Eleanor Vance',
      activeAgents: 5,
      activeListings: 30,
      pipelineValue: '$3,800,000',
      closingRate: '41%',
    },
  ];

  const topAgents = [
    {
      name: 'Alex Morgan',
      branch: 'Downtown Manhattan',
      dealsClosed: 14,
      volume: '$6,420,000',
      commission: '$160,500',
      aiScore: '98%',
    },
    {
      name: 'Sophia Patel',
      branch: 'Brooklyn Heights',
      dealsClosed: 11,
      volume: '$4,890,000',
      commission: '$122,250',
      aiScore: '94%',
    },
    {
      name: 'Liam Chen',
      branch: 'Downtown Manhattan',
      dealsClosed: 9,
      volume: '$3,950,000',
      commission: '$98,750',
      aiScore: '91%',
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
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Agency Executive Headquarters
                </h1>
                <Badge variant="purple" size="sm">
                  Agency Tier
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated branch analytics, agent productivity leaderboards, and revenue attribution.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Export Executive Report
              </Button>
              <Button variant="primary" size="sm">
                + Add Branch Office
              </Button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agencyStats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </div>

          {/* Branch Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="py-4 flex items-center justify-between">
                  <div>
                    <CardTitle>Branch Office Performance</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Multi-branch inventory and pipeline distribution
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-brand-600">
                    Manage Branches
                  </Button>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100">
                  {branches.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-900">
                            {b.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 pl-6">
                          Manager: {b.manager} · {b.activeAgents} Agents ·{' '}
                          {b.activeListings} Active Listings
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {b.pipelineValue}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-medium">
                          {b.closingRate} Win Rate
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Agent Productivity Leaderboard */}
              <Card>
                <CardHeader className="py-4">
                  <CardTitle>Agent Productivity Leaderboard</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Year-to-date closings, sales volume, and AI adoption
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500">
                        <th className="py-2.5 px-4 font-semibold">Agent</th>
                        <th className="py-2.5 px-4 font-semibold">Branch</th>
                        <th className="py-2.5 px-4 font-semibold">Deals Closed</th>
                        <th className="py-2.5 px-4 font-semibold">Sales Volume</th>
                        <th className="py-2.5 px-4 font-semibold">Commission Split</th>
                        <th className="py-2.5 px-4 font-semibold">AI Adoption</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topAgents.map((agent, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {agent.name}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{agent.branch}</td>
                          <td className="py-3 px-4 text-slate-700">{agent.dealsClosed}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {agent.volume}
                          </td>
                          <td className="py-3 px-4 text-emerald-600 font-medium">
                            {agent.commission}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="success" size="sm">
                              {agent.aiScore}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Agency Quick Health */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle>Commission & Revenue Forecast</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-700 font-medium mb-1">
                      <span>Monthly Commission Target</span>
                      <span>78% ($555,000 / $712,000)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78%' }} />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <p className="text-slate-800 font-semibold">Agency Split Model</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Default 70/30 agent-to-broker split applied across active residential deals.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
