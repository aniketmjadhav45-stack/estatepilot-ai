export interface PlanTier {
  id: string;
  name: string;
  priceMonthlyUSD: number;
  priceAnnualUSD: number;
  maxSeats: number;
  maxActiveProperties: number;
  aiCreditsMonthly: number;
  features: string[];
}

export const BILLING_PLANS: Record<string, PlanTier> = {
  FREE_TRIAL: {
    id: 'plan_free_trial',
    name: '14-Day Free Trial',
    priceMonthlyUSD: 0,
    priceAnnualUSD: 0,
    maxSeats: 1,
    maxActiveProperties: 5,
    aiCreditsMonthly: 50,
    features: [
      'Basic CRM & Contact Management',
      'Up to 5 Active Listings',
      '50 AI Assistant Credits',
      'Single User Workspace',
    ],
  },
  STARTER: {
    id: 'plan_starter',
    name: 'Solo Agent Starter',
    priceMonthlyUSD: 49,
    priceAnnualUSD: 470,
    maxSeats: 1,
    maxActiveProperties: 25,
    aiCreditsMonthly: 500,
    features: [
      'Full CRM & Contact Management',
      '25 Active Property Listings',
      'AI Lead Qualification & Scoring',
      'Unified Inbox (Email & WhatsApp)',
      'Calendar Viewing Scheduling',
      '500 Monthly AI Credits',
    ],
  },
  PROFESSIONAL: {
    id: 'plan_professional',
    name: 'Professional Agent',
    priceMonthlyUSD: 99,
    priceAnnualUSD: 950,
    maxSeats: 3,
    maxActiveProperties: 100,
    aiCreditsMonthly: 2000,
    features: [
      'Everything in Starter',
      'Up to 3 Team Seats',
      '100 Active Listings',
      'Deterministic Property Matching',
      'AI Voice Receptionist (Vapi)',
      '2,000 Monthly AI Credits',
      'Automated Follow-up Cadences',
    ],
  },
  AGENCY: {
    id: 'plan_agency',
    name: 'Boutique Agency',
    priceMonthlyUSD: 249,
    priceAnnualUSD: 2390,
    maxSeats: 15,
    maxActiveProperties: 500,
    aiCreditsMonthly: 8000,
    features: [
      'Everything in Professional',
      'Up to 15 Agent Seats',
      'Multi-branch Management',
      'Commission Tracking & Splits',
      'Visual Workflow Automation',
      'Custom Marketing Campaign Generator',
      '8,000 Monthly AI Credits',
    ],
  },
  ENTERPRISE: {
    id: 'plan_enterprise',
    name: 'Enterprise Brokerage',
    priceMonthlyUSD: 599,
    priceAnnualUSD: 5750,
    maxSeats: 999,
    maxActiveProperties: 10000,
    aiCreditsMonthly: 30000,
    features: [
      'Everything in Agency',
      'Unlimited Agent Seats',
      'Hierarchical Regional Management',
      'Dedicated LLM Fine-tuning & Knowledge Vault',
      'Custom Domain & White-labeling',
      'SLA & 24/7 Dedicated Support',
      'Custom Data Connectors & MLS Ingestion',
    ],
  },
};
