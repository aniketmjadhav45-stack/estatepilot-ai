export interface SpecialistAgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  defaultModel: string;
  allowedTools: string[];
  requiresConsentCheck: boolean;
}

export const SPECIALIST_AGENTS: Record<string, SpecialistAgentConfig> = {
  LEAD_INTELLIGENCE: {
    id: 'lead-intelligence-agent',
    name: 'Lead Intelligence Agent',
    description: 'Analyzes inbound leads, scores intent, and recommends pipeline staging',
    defaultModel: 'gpt-4o-mini',
    allowedTools: [
      'get_lead_details',
      'update_lead',
      'calculate_lead_score',
      'create_followup_task',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Lead Intelligence Agent. Evaluate leads objectively based on timeline, verified budget, and responsiveness. Never fabricate scores.`,
  },
  CUSTOMER_CONVERSATION: {
    id: 'customer-conversation-agent',
    name: 'Customer Conversation Agent',
    description: 'Real-time assistant for website chat and messaging grounded in verified listings',
    defaultModel: 'gpt-4o',
    allowedTools: [
      'search_properties',
      'get_property_details',
      'get_calendar_availability',
      'book_property_visit',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Customer Conversation Agent. Answer inquiries accurately using verified property data. Never fabricate availability or amenities.`,
  },
  PROPERTY_INTELLIGENCE: {
    id: 'property-intelligence-agent',
    name: 'Property Intelligence Agent',
    description: 'Assists with listing descriptions, architectural analysis, and feature extraction',
    defaultModel: 'gpt-4o',
    allowedTools: [
      'get_property_details',
      'generate_listing_description',
      'update_property_price',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Property Intelligence Agent. Generate compelling, legally compliant property descriptions.`,
  },
  PROPERTY_MATCHING: {
    id: 'property-matching-agent',
    name: 'Property Matching Agent',
    description: 'Summarizes deterministic property matches for buyer requirement profiles',
    defaultModel: 'gpt-4o-mini',
    allowedTools: [
      'search_properties',
      'get_property_details',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Property Matching Agent. Present verified match results clearly with transparent rationale.`,
  },
  VOICE: {
    id: 'voice-agent',
    name: 'Voice Agent',
    description: 'Handles telephony inbound receptionist calls and outbound qualification',
    defaultModel: 'gpt-4o-mini-realtime',
    allowedTools: [
      'get_lead_details',
      'update_lead',
      'get_calendar_availability',
      'book_property_visit',
    ],
    requiresConsentCheck: true,
    systemPrompt: `You are the EstatePilot Voice Agent. Speak professionally, concisely, and warmly. Verify dates and requirements carefully.`,
  },
  FOLLOW_UP: {
    id: 'followup-agent',
    name: 'Follow-up Agent',
    description: 'Monitors stagnant opportunities and crafts personalized re-engagement messages',
    defaultModel: 'gpt-4o-mini',
    allowedTools: [
      'search_leads',
      'create_followup_task',
      'send_message',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Follow-up Agent. Provide timely, high-value touches without being spammy.`,
  },
  APPOINTMENT: {
    id: 'appointment-agent',
    name: 'Appointment Agent',
    description: 'Coordinates viewing schedules and verifies calendar conflicts',
    defaultModel: 'gpt-4o-mini',
    allowedTools: [
      'get_calendar_availability',
      'book_property_visit',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Appointment Agent. Never confirm a slot until verified against the calendar provider.`,
  },
  SALES: {
    id: 'sales-agent',
    name: 'Sales Agent',
    description: 'Monitors deal pipeline velocity, offer drafting, and commission splits',
    defaultModel: 'gpt-4o',
    allowedTools: [
      'create_deal',
      'update_deal_stage',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Sales Agent. Track deal milestones with financial precision.`,
  },
  MARKETING: {
    id: 'marketing-agent',
    name: 'Marketing Agent',
    description: 'Creates multi-channel marketing campaigns, social posts, and property flyers',
    defaultModel: 'gpt-4o',
    allowedTools: [
      'get_property_details',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Marketing Agent. Produce high-converting, polished marketing assets.`,
  },
  ANALYTICS: {
    id: 'analytics-agent',
    name: 'Analytics Agent',
    description: 'Translates natural language questions into aggregated performance metrics',
    defaultModel: 'gpt-4o',
    allowedTools: [
      'get_sales_analytics',
    ],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Analytics Agent. Answer business queries using pre-calculated tenant KPIs.`,
  },
  WORKFLOW: {
    id: 'workflow-agent',
    name: 'Workflow Agent',
    description: 'Executes automated pipeline triggers and multi-step business logic',
    defaultModel: 'gpt-4o-mini',
    allowedTools: [],
    requiresConsentCheck: false,
    systemPrompt: `You are the EstatePilot Workflow Agent. Evaluate conditions strictly and execute deterministic steps.`,
  },
};
