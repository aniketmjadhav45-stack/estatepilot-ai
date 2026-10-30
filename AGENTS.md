# EstatePilot AI — Specialist Agent Registry (AGENTS.md)

EstatePilot AI utilizes a specialized, multi-agent AI framework coordinated by a central AI Orchestrator. Rather than relying on a generic monolithic prompt, tasks are routed to domain-specific specialist agents with strictly scoped system prompts, deterministic tool registries, and mandatory human-in-the-loop approval gates.

---

## Central AI Orchestrator Principles

1. **Intent Resolution**: Analyzes incoming messages, triggers, or system events to classify task domain and urgency.
2. **Specialist Selection**: Dispatches the task to the exact specialist agent registered for the task.
3. **Context Grounding**: Retrieves verified tenant-scoped database records (properties, leads, deals) with organization boundary enforcement.
4. **Tool Permission Check**: Validates that the active tenant and executing user have RBAC permissions to invoke requested tools.
5. **Tool Execution**: Executes tools strictly through parameterized server-side services (no arbitrary SQL generation).
6. **Human-in-the-Loop (HITL) Gate**: Blocks destructive or sensitive operations (e.g. price change, listing publish, contract signing) until verified by an authorized human.
7. **Audit & Usage Metering**: Records tokens consumed, model latencies, execution steps, and costs in `ai_usage_records`.

---

## The 11 Specialist Agents

### 1. Lead Intelligence Agent (`lead-intelligence-agent`)
- **Primary Function**: Ingests incoming leads from web forms, property portals, WhatsApp, and email. Analyzes sentiment, urgency, budget match, and readiness.
- **Model Configuration**: Default: `gpt-4o-mini` / `gemini-1.5-flash` for high throughput, low latency.
- **Allowed Tools**:
  - `get_lead_details`
  - `update_lead`
  - `calculate_lead_score`
  - `create_followup_task`
- **Output Schema**:
  ```json
  {
    "lead_id": "uuid",
    "qualification_score": 85,
    "intent_summary": "High-intent buyer seeking 3BHK in downtown within $1.2M",
    "suggested_pipeline_stage": "qualified",
    "recommended_agent_assignment": "uuid"
  }
  ```
- **HITL Requirements**: Automated qualification is non-destructive. Lead status promotions beyond "Qualified" require agent review.

---

### 2. Customer Conversation Agent (`customer-conversation-agent`)
- **Primary Function**: Powers the real-time website chat widget, portal messaging, and WhatsApp customer communications. Answers customer questions grounded solely in verified listing data.
- **Model Configuration**: Default: `gpt-4o` / `claude-3-5-sonnet` for nuanced, empathetic, and accurate conversation.
- **Allowed Tools**:
  - `search_properties`
  - `get_property_details`
  - `get_calendar_availability`
  - `book_property_visit`
- **Strict Guardrails**: Never invents property amenities, prices, or availability. If a property is unverified or unavailable, explicitly clarifies this to the customer.
- **HITL Requirements**: None for standard informational queries. Booking visits requires customer contact verification.

---

### 3. Property Intelligence Agent (`property-intelligence-agent`)
- **Primary Function**: Assists agents in parsing raw property brochures, extracting architectural details, generating compliant SEO descriptions, and standardizing feature sets.
- **Model Configuration**: Default: `gpt-4o` / `gemini-1.5-pro` (multimodal vision support for floor plans & photographs).
- **Allowed Tools**:
  - `get_property_details`
  - `generate_listing_description`
  - `extract_property_features`
- **HITL Requirements**: **MANDATORY APPROVAL** before saving generated listing descriptions to published status.

---

### 4. Property Matching Agent (`property-matching-agent`)
- **Primary Function**: Explains and summarizes deterministic match results between buyer requirement profiles and active property listings.
- **Model Configuration**: Default: `gpt-4o-mini` / `claude-3-5-haiku`.
- **Allowed Tools**:
  - `search_properties`
  - `get_property_details`
  - `get_buyer_requirements`
- **Strict Guardrails**: Relies on the deterministic property matching engine for scored candidates. Agent only formats compelling, structured comparison summaries.
- **HITL Requirements**: Automated delivery of matching decks requires agent sign-off.

---

### 5. Voice Agent (`voice-agent`)
- **Primary Function**: Connects with telephony providers (Vapi, ElevenLabs, Twilio) for inbound receptionist handling and outbound qualification calls.
- **Model Configuration**: Ultra-low latency streaming model (`gpt-4o-mini-realtime` / ElevenLabs Conversational AI).
- **Allowed Tools**:
  - `get_lead_details`
  - `update_lead`
  - `get_calendar_availability`
  - `book_property_visit`
- **Call Script Modes**:
  - Inbound Receptionist (inquiry capture, routing)
  - Post-Viewing Follow-up (feedback collection)
  - New Portal Inquiry Qualification (budget, timeline verification)
- **HITL Requirements**: Outbound calling requires validated contact consent records (`consent_records`).

---

### 6. Follow-up Agent (`followup-agent`)
- **Primary Function**: Monitors stagnant leads, unconfirmed viewing requests, and expired offers. Formulates intelligent, multi-channel re-engagement cadences.
- **Model Configuration**: Default: `gpt-4o-mini` / `gemini-1.5-flash`.
- **Allowed Tools**:
  - `search_leads`
  - `create_followup_task`
  - `send_message`
- **HITL Requirements**: Automated messages require pre-approved templates or explicit agent staging in draft status.

---

### 7. Appointment Agent (`appointment-agent`)
- **Primary Function**: Manages the calendar coordination for site viewings, open houses, and client consultations.
- **Model Configuration**: Default: `gpt-4o-mini`.
- **Allowed Tools**:
  - `get_calendar_availability`
  - `book_property_visit`
  - `reschedule_appointment`
  - `cancel_appointment`
- **Strict Guardrails**: Never confirms an appointment without successful two-way calendar sync via Google Calendar or Outlook API.
- **HITL Requirements**: Double-booking prevention with instant conflict notification.

---

### 8. Sales Agent (`sales-agent`)
- **Primary Function**: Evaluates deal velocity, flags stalled pipeline opportunities, calculates commission splits, and assists in offer drafting.
- **Model Configuration**: Default: `gpt-4o` / `claude-3-5-sonnet`.
- **Allowed Tools**:
  - `create_deal`
  - `update_deal_stage`
  - `get_deal_details`
  - `calculate_commission`
- **HITL Requirements**: **MANDATORY APPROVAL** for contract modifications, deal stage regressions, or closing status transitions.

---

### 9. Marketing Agent (`marketing-agent`)
- **Primary Function**: Generates multi-channel marketing campaigns: email newsletters, social media teasers (LinkedIn, Instagram, Facebook), WhatsApp broadcast drafts, and print flyers.
- **Model Configuration**: Default: `gpt-4o` / `gemini-1.5-pro`.
- **Allowed Tools**:
  - `get_property_details`
  - `generate_social_posts`
  - `create_campaign_draft`
- **HITL Requirements**: All external broadcasts require manual agent review and compliance approval.

---

### 10. Analytics Agent (`analytics-agent`)
- **Primary Function**: Provides natural language querying over business data ("What was our top-performing branch in Q3?", "Show lead conversion rate by source").
- **Model Configuration**: Default: `gpt-4o` / `gemini-1.5-pro`.
- **Allowed Tools**:
  - `get_sales_analytics`
  - `get_lead_source_metrics`
  - `get_agent_performance_kpis`
- **Strict Guardrails**: Disallows arbitrary query execution. Maps natural language questions to pre-defined, indexed, aggregated analytical functions.
- **HITL Requirements**: Read-only operations.

---

### 11. Workflow Agent (`workflow-agent`)
- **Primary Function**: Evaluates visual workflow trigger events, assesses conditions, and triggers automated pipeline progressions.
- **Model Configuration**: Deterministic rule evaluation with LLM fallback for unstructured data parsing.
- **Allowed Tools**:
  - `trigger_workflow_step`
  - `log_workflow_audit`
- **HITL Requirements**: Workflows involving financial transactions or contract generation pause at approval checkpoints.

---

## Tool Registry & Action Approval Matrix

| Tool Name | Specialist Agent(s) | Read/Write | Requires HITL Approval? |
|:---|:---|:---|:---|
| `search_properties` | Conversation, Matching, Marketing | Read | No |
| `get_property_details` | Conversation, Intelligence, Matching | Read | No |
| `generate_listing_description` | Property Intelligence, Marketing | Read | Yes (to publish) |
| `update_property_price` | Property Intelligence | Write | **Yes (Mandatory)** |
| `search_leads` | Lead, Follow-up, Analytics | Read | No |
| `get_lead_details` | Lead, Follow-up, Voice | Read | No |
| `create_lead` | Conversation, Voice, Lead | Write | No |
| `update_lead` | Lead, Voice, Follow-up | Write | No |
| `calculate_lead_score` | Lead Intelligence | Read/Write | No |
| `create_followup_task` | Follow-up, Lead | Write | No |
| `send_message` | Follow-up, Conversation | Write | Conditional (Templates: No, Custom: Yes) |
| `get_calendar_availability` | Appointment, Conversation, Voice | Read | No |
| `book_property_visit` | Appointment, Conversation, Voice | Write | No (Requires verified calendar) |
| `create_deal` | Sales | Write | No |
| `update_deal_stage` | Sales | Write | Yes (for Closing/Lost) |
| `get_sales_analytics` | Analytics | Read | No |

---

## Safety, Privacy & Multi-Tenancy Invariant

Every tool call executed by any AI agent must inject the validated `organization_id` derived from the active session. Under no circumstances may an agent query across organization boundaries. Violations trigger immediate execution termination and security alerting.
