import React from 'react';
import {
  Users,
  Compass,
  Kanban,
  Bot,
  ArrowUpRight,
  Clock,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function AgentDashboardPage() {
  const stats = [
    {
      title: 'Active Deal Pipeline',
      value: '$4,850,000',
      change: '14.2% vs last month',
      isPositive: true,
      icon: <Kanban className="w-5 h-5 text-brand-600" />,
      subtitle: '8 deals in active negotiation',
    },
    {
      title: 'High-Intent Leads',
      value: '24',
      change: '8 this week',
      isPositive: true,
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      subtitle: 'Qualified with >75 lead score',
    },
    {
      title: 'Listed Properties',
      value: '18',
      change: '3 new listings',
      isPositive: true,
      icon: <Compass className="w-5 h-5 text-emerald-600" />,
      subtitle: '12 active, 6 pending escrow',
    },
    {
      title: 'AI Agent Automations',
      value: '142',
      change: '99.4% accuracy',
      isPositive: true,
      icon: <Bot className="w-5 h-5 text-purple-600" />,
      subtitle: 'Lead scoring, voice & follow-ups',
    },
  ];

  const priorityLeads = [
    {
      id: '1',
      name: 'Sophia Montgomery',
      email: 'sophia.m@example.com',
      phone: '+1 (555) 234-8901',
      score: 92,
      budget: '$1,200,000 - $1,500,000',
      preference: '3-Bed Penthouse in Downtown',
      stage: 'Negotiation',
      lastTouch: '15 mins ago by Voice Agent',
    },
    {
      id: '2',
      name: 'David & Claire Vance',
      email: 'claire.vance@example.com',
      phone: '+1 (555) 456-7890',
      score: 86,
      budget: '$850,000 - $950,000',
      preference: 'Single Family Home with Garden',
      stage: 'Qualified',
      lastTouch: '2 hours ago via WhatsApp',
    },
    {
      id: '3',
      name: 'Marcus Sterling',
      email: 'marcus@sterlinginvest.com',
      phone: '+1 (555) 890-1234',
      score: 79,
      budget: '$2,500,000+',
      preference: 'Commercial Multi-Unit Portfolio',
      stage: 'Proposal Sent',
      lastTouch: 'Yesterday via Email',
    },
  ];

  const upcomingViewings = [
    {
      id: 'v1',
      property: 'The Grandview Residence, Penthouse B',
      client: 'Sophia Montgomery',
      time: 'Today, 3:30 PM (45m)',
      status: 'Confirmed by Calendar',
    },
    {
      id: 'v2',
      property: 'Oakridge Manor, 742 Willow Lane',
      client: 'David & Claire Vance',
      time: 'Tomorrow, 11:00 AM (1h)',
      status: 'Awaiting Client Confirm',
    },
  ];

  const liveAiFeed = [
    {
      agent: 'Lead Intelligence Agent',
      action: 'Qualified inbound lead from Zillow with score 86',
      lead: 'David & Claire Vance',
      time: '2m ago',
    },
    {
      agent: 'Customer Conversation Agent',
      action: 'Shared verified brochure & floorplan via WhatsApp',
      lead: 'Sophia Montgomery',
      time: '18m ago',
    },
    {
      agent: 'Property Matching Engine',
      action: 'Matched 3 candidate villas with 94% compatibility',
      lead: 'Marcus Sterling',
      time: '1h ago',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Agent Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pipeline performance, AI automated lead routing, and scheduled viewings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Viewing</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run AI Lead Match</span>
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Grid: Priority Leads & AI Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Lead Queue */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between py-4">
              <div>
                <CardTitle>High-Priority Lead Queue</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI scored leads requiring immediate agent attention
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-brand-600">
                View All CRM Leads
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {priorityLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {lead.name}
                      </span>
                      <Badge
                        variant={lead.score >= 90 ? 'success' : 'purple'}
                        size="sm"
                      >
                        Score {lead.score}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {lead.stage}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-slate-700">
                      {lead.preference} ·{' '}
                      <span className="text-slate-500">{lead.budget}</span>
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="secondary" size="sm">
                      Follow Up
                    </Button>
                    <Button variant="primary" size="sm">
                      View Dossier
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Viewing Visits */}
          <Card>
            <CardHeader className="flex items-center justify-between py-4">
              <CardTitle>Upcoming Site Visits & Appointments</CardTitle>
              <Badge variant="info" size="sm">
                2 Scheduled
              </Badge>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {upcomingViewings.map((v) => (
                <div
                  key={v.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-600 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {v.property}
                      </p>
                      <p className="text-xs text-slate-500">
                        Client: {v.client} · {v.time}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">
                    {v.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Live AI Orchestrator Stream & Approvals */}
        <div className="space-y-6">
          {/* AI Activity Ticker */}
          <Card>
            <CardHeader className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <CardTitle>Live AI Event Stream</CardTitle>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {liveAiFeed.map((item, idx) => (
                <div key={idx} className="flex gap-2.5 items-start text-xs">
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800">{item.agent}</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {item.action} for{' '}
                      <span className="font-medium text-slate-900">{item.lead}</span>
                    </p>
                    <span className="text-[10px] text-slate-400">{item.time}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pending Human-in-the-Loop Approval Card */}
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader className="py-3 px-4 bg-amber-50/60 border-b border-amber-200/60">
              <div className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>Action Approval Required</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              <p className="text-xs text-slate-700">
                <strong>Property Intelligence Agent</strong> requested to update asking price for{' '}
                <span className="font-semibold">Villa Serena (Unit 4B)</span> from $1,250,000 to $1,195,000.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="primary" className="text-xs py-1 px-3">
                  Approve Price Change
                </Button>
                <Button size="sm" variant="outline" className="text-xs py-1 px-3">
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
