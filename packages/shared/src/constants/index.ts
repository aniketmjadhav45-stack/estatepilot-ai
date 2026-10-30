export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

export const SUPPORTED_AREA_UNITS = [
  { code: 'sqft', name: 'Square Feet', factorToSqMeters: 0.092903 },
  { code: 'sqm', name: 'Square Meters', factorToSqMeters: 1.0 },
  { code: 'sqyd', name: 'Square Yards', factorToSqMeters: 0.836127 },
  { code: 'acre', name: 'Acres', factorToSqMeters: 4046.86 },
] as const;

export type AreaUnitCode = typeof SUPPORTED_AREA_UNITS[number]['code'];

export const PROPERTY_TYPES = [
  'apartment',
  'condo',
  'single_family',
  'villa',
  'townhouse',
  'commercial',
  'land',
  'industrial',
  'penthouse',
  'duplex'
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number];

export const LISTING_TYPES = ['sale', 'rent', 'lease'] as const;
export type ListingType = typeof LISTING_TYPES[number];

export const PROPERTY_STATUSES = [
  'draft',
  'active',
  'pending',
  'under_contract',
  'sold',
  'leased',
  'withdrawn'
] as const;
export type PropertyStatus = typeof PROPERTY_STATUSES[number];

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
  'unqualified'
] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type LeadPriority = typeof LEAD_PRIORITIES[number];

export const DEAL_STATUSES = ['open', 'won', 'lost', 'abandoned'] as const;
export type DealStatus = typeof DEAL_STATUSES[number];

export const ORG_TYPES = ['individual', 'agency', 'enterprise'] as const;
export type OrgType = typeof ORG_TYPES[number];

export const MEMBERSHIP_STATUSES = ['active', 'invited', 'suspended'] as const;
export type MembershipStatus = typeof MEMBERSHIP_STATUSES[number];
