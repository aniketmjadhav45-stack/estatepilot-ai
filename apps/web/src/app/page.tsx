import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Bot,
  Compass,
  Users,
  ShieldCheck,
  Building2,
  Calendar,
  MessageSquare,
  PhoneCall,
  Check,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export default function MarketingHomePage() {
  const capabilities = [
    {
      title: 'Autonomous AI Agent Center',
      desc: '11 specialist AI agents handle inbound lead qualification, property matching summaries, follow-up cadences, and viewing booking.',
      icon: <Bot className="w-6 h-6 text-brand-400" />,
    },
    {
      title: 'Unified Communication Inbox',
      desc: 'Centralize WhatsApp Cloud API, Gmail, SMS, and website chat streams into a single multi-agent collaborative inbox.',
      icon: <MessageSquare className="w-6 h-6 text-emerald-400" />,
    },
    {
      title: 'Deterministic Matching Engine',
      desc: 'Zero-hallucination property matching pairing buyer requirements against verified inventory with strict mathematical weights.',
      icon: <Compass className="w-6 h-6 text-purple-400" />,
    },
    {
      title: 'AI Voice Receptionist',
      desc: 'Sub-second streaming voice agents that answer inbound property inquiries, screen buyers, and book site visits 24/7.',
      icon: <PhoneCall className="w-6 h-6 text-amber-400" />,
    },
    {
      title: 'Multi-Branch & Team Hierarchy',
      desc: 'Scales from solo agents up to national multi-branch brokerages with granular RBAC, team leads, and commission splits.',
      icon: <Building2 className="w-6 h-6 text-blue-400" />,
    },
    {
      title: 'PostgreSQL Row-Level Security',
      desc: 'Guaranteed tenant isolation. Every database table is locked with PostgreSQL RLS to prevent cross-organization leakage.',
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
    },
  ];

  const pricingTiers = [
    {
      name: 'Solo Starter',
      price: '$49',
      period: '/month',
      desc: 'Ideal for independent top-producing real estate agents.',
      seats: '1 Seat included',
      features: [
        'Complete CRM & Lead Lifecycle',
        'Up to 25 Active Listings',
        'AI Lead Qualification & Scoring',
        'Unified WhatsApp & Email Inbox',
        'Google / Outlook Calendar Sync',
        '500 Monthly AI Credits',
      ],
      highlight: false,
    },
    {
      name: 'Professional Agent',
      price: '$99',
      period: '/month',
      desc: 'For growing agents and partnerships requiring AI voice reception.',
      seats: 'Up to 3 Seats included',
      features: [
        'Everything in Starter',
        '100 Active Listings',
        'AI Voice Agent (Inbound & Outbound)',
        'Deterministic Property Matching',
        'Automated Re-engagement Cadences',
        '2,000 Monthly AI Credits',
      ],
      highlight: true,
    },
    {
      name: 'Boutique Agency',
      price: '$249',
      period: '/month',
      desc: 'Built for agencies and brokerages managing multiple agents & branches.',
      seats: 'Up to 15 Agent Seats included',
      features: [
        'Everything in Professional',
        '500 Active Listings',
        'Multi-Branch & Team Hierarchy',
        'Commission Tracking & Deal Splits',
        'Visual Workflow Automation Studio',
        '8,000 Monthly AI Credits',
      ],
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-navy-950 text-white selection:bg-brand-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-navy-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              EstatePilot <span className="text-brand-400">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#specialists" className="hover:text-white transition-colors">
              11 Specialist Agents
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing Plans
            </a>
            <Link href="/agency" className="hover:text-white transition-colors">
              Agency Hub
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Super Admin
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link href="/auth/register">
              <Button size="sm" variant="primary" className="bg-brand-600 hover:bg-brand-500 text-xs">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-6 max-w-6xl mx-auto text-center">
        <Badge variant="purple" size="md" className="mb-4 bg-brand-900/50 text-brand-300 border-brand-700/60">
          Next-Generation Real Estate Operating System
        </Badge>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Scale your real estate business with <br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Autonomous AI Agents.
          </span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          EstatePilot AI powers top-performing solo agents, boutique agencies, and multi-branch brokerages with 11 domain-specific AI agents, a deterministic matching engine, and unified multi-channel communication.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg" className="bg-brand-600 hover:bg-brand-500 text-sm font-semibold px-6 gap-2">
              <span>Launch Live Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-900 text-sm font-semibold px-6">
              Create Free Account
            </Button>
          </Link>
        </div>

        {/* Live Metrics Proof */}
        <div className="mt-14 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-white">$450M+</p>
            <p className="text-xs text-slate-400 mt-0.5">Pipeline Managed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">92%</p>
            <p className="text-xs text-slate-400 mt-0.5">Faster Lead Response</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-400">11 Agents</p>
            <p className="text-xs text-slate-400 mt-0.5">Specialist Registry</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">100%</p>
            <p className="text-xs text-slate-400 mt-0.5">PostgreSQL RLS Isolated</p>
          </div>
        </div>
      </section>

      {/* Product Capabilities */}
      <section id="features" className="py-20 bg-navy-900/60 border-y border-slate-800/80 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enterprise Architecture. Precision Real Estate AI.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Every tool and agent is engineered to eliminate busywork while maintaining human control through our approval center.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-navy-950/70 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                  {cap.icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {cap.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Matrix */}
      <section id="pricing" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Transparent Pricing for Growing Brokerages
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Start with our 14-day free trial. Upgrade or cancel anytime. Verified Stripe & Razorpay billing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-8 border flex flex-col justify-between ${
                tier.highlight
                  ? 'bg-navy-900 border-brand-500 shadow-elevated relative'
                  : 'bg-navy-950/60 border-slate-800'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{tier.desc}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {tier.price}
                  </span>
                  <span className="text-xs text-slate-400">{tier.period}</span>
                </div>
                <p className="text-xs font-medium text-brand-400 mt-1">
                  {tier.seats}
                </p>

                <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <Link href="/auth/register">
                  <Button
                    size="md"
                    className={`w-full text-xs font-semibold py-2.5 ${
                      tier.highlight
                        ? 'bg-brand-600 hover:bg-brand-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    Start 14-Day Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-10 px-6 bg-navy-950 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-slate-300">EstatePilot AI</span>
            <span>— Your AI-Powered Real Estate Business Operating System</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-slate-300">Agent App</Link>
            <Link href="/agency" className="hover:text-slate-300">Agency Hub</Link>
            <Link href="/admin" className="hover:text-slate-300">Super Admin</Link>
            <a href="#privacy" className="hover:text-slate-300">Privacy & RLS Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
