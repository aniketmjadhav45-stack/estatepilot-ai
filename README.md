# EstatePilot AI

> **Your AI-Powered Real Estate Business Operating System**

EstatePilot AI is a commercial, multi-tenant, enterprise-grade Real Estate CRM and AI Agent Automation platform. Engineered as a modular monolith, EstatePilot AI powers individual real estate agents, boutique brokerages, multi-branch agencies, and large property enterprises worldwide.

---

## Architecture Overview

EstatePilot AI is structured as a TypeScript monorepo with domain isolation, strict Row-Level Security (RLS), and a centralized AI Orchestration runtime.

```
estatepilot-ai/
├── apps/
│   └── web/                   # Next.js App Router (UI, Server Actions, API routes)
├── packages/
│   ├── database/              # Supabase PostgreSQL client, types & query builders
│   ├── auth/                  # Multi-tenant auth validation & session handling
│   ├── permissions/           # RBAC matrix, permission checking & policies
│   ├── ai-runtime/            # Central AI Orchestrator & LLM multi-provider engine
│   ├── agent-registry/        # 11 Specialist AI Agents & tool registration
│   ├── integrations/          # External provider adapters (WhatsApp, Gmail, Stripe, etc.)
│   ├── workflow-engine/       # Visual workflow automation runner & step execution
│   ├── billing/               # Subscriptions, usage credits & multi-gateway billing
│   ├── notifications/         # Multi-channel notification dispatchers
│   ├── validation/            # Zod schemas for domain models and API payloads
│   └── shared/                # Core domain types, utilities, and constants
├── supabase/
│   ├── migrations/            # Version-controlled idempotent SQL migrations
│   ├── functions/             # Edge functions for webhooks & background triggers
│   └── tests/                 # Database RLS and schema test suites
├── docs/                      # Architectural and technical documentation
└── tests/                     # Integration and end-to-end test suites
```

---

## Core Product Capabilities (28 Modules)

1. **Organization & Workspace Management**: Single-user agents to multi-branch enterprises with branch/team hierarchies.
2. **Authentication & Authorization**: Supabase Auth integration, session validation, active tenant switching, and granular RBAC.
3. **Individual Agent Dashboard**: Focused workspace for solo operators with active deals, AI suggestions, and quick actions.
4. **Agency Dashboard**: Multi-agent team metrics, branch performance, and aggregated pipeline visibility.
5. **Global Super Admin Dashboard**: Platform-level tenant management, system telemetry, and audited impersonation.
6. **CRM & Contact Management**: Unified profiles for buyers, sellers, brokers, and partners with rich activity logs.
7. **Lead Management & Scoring**: Algorithmic and AI-driven lead qualification with SLA tracking.
8. **Property Listing Management**: Rich residential/commercial listing inventory with multi-unit, media, and document vaults.
9. **Buyer & Seller Management**: Requirement tracking, preferences, and portfolio monitoring.
10. **Property Matching Engine**: Hard-filter criteria paired with weighted scoring algorithms.
11. **Deal & Sales Pipeline**: Multi-stage visual Kanban boards with commission calculations and closing milestones.
12. **Unified Communication Inbox**: Integrated WhatsApp Cloud, Gmail/Email, SMS, and website chat streams.
13. **AI Agent Center**: Central management for 11 specialized real estate AI agents.
14. **AI Customer Chat**: Real-time website chat widget with automated qualification.
15. **AI Voice Agent Infrastructure**: Inbound and outbound voice agent orchestration (Vapi/ElevenLabs).
16. **AI Lead Qualification**: Dynamic qualification frameworks (BANT, MEDDIC, custom real estate parameters).
17. **AI Follow-up Automation**: Smart re-engagement cadences adapting to customer responses.
18. **AI Property Recommendations**: Personalized property decks based on verified inventory.
19. **Appointment & Site Visit Scheduling**: Viewing coordinator with automated slots and reminders.
20. **Calendar Integration**: Google Calendar / Outlook bi-directional synchronization.
21. **Marketing Automation**: Property listing copy generation, campaign flyers, and newsletter broadcasts.
22. **Workflow Automation Studio**: Node-based triggers, conditions, and actions for end-to-end business automation.
23. **Analytics & Business Intelligence**: Agent conversion rates, average closing times, and revenue forecasts.
24. **Subscription & Billing**: Tiered plans (Starter, Pro, Agency, Enterprise) powered by Stripe & Razorpay.
25. **AI Usage & Credit Management**: Token metering, voice minute tracking, and organization quotas.
26. **Integration Marketplace**: One-click connectors for n8n, MLS/Portals, Google Workspace, and webhooks.
27. **Notification Center**: In-app toast, email, push, and SMS notifications with user preferences.
28. **Audit & Security Center**: Comprehensive audit trails, IP logging, and tenant isolation monitors.

---

## Technology Stack

- **Frontend**: Next.js 14+ (App Router), React 18/19, TypeScript, Tailwind CSS, Lucide Icons.
- **UI System**: Professional Enterprise Dark Navy & Slate/White design system.
- **Backend**: Next.js Server Actions & Route Handlers, modular service layer.
- **Database**: Supabase PostgreSQL with `pgvector`, Row-Level Security (RLS), and database triggers.
- **AI Core**: Multi-model orchestration supporting OpenAI (GPT-4o), Google Gemini, and Anthropic Claude.
- **Validation**: Zod runtime schema validation across API boundaries.
- **Testing**: Automated unit, integration, and tenant isolation testing.

---

## Getting Started

### Prerequisites
- Node.js 20+ or 22+
- npm 10+
- Supabase CLI or hosted Supabase Project

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/organization/estatepilot-ai.git
cd estatepilot-ai

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local

# 4. Run database migrations
npm run db:migrate

# 5. Start the development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## Documentation Links

- [System Architecture](file:///docs/architecture.md)
- [Database Schema & ERD](file:///docs/database-schema.md)
- [AI Agents & Orchestrator](file:///docs/ai-agents.md)
- [Security & RLS Model](file:///docs/security.md)
- [Implementation Roadmap](file:///docs/implementation-roadmap.md)
- [Specialist Agent Registry](file:///AGENTS.md)
