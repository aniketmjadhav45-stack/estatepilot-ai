import { RegisteredToolDefinition } from '@estatepilot/ai-runtime';
import { PERMISSIONS } from '@estatepilot/permissions';

export const INITIAL_REGISTERED_TOOLS: RegisteredToolDefinition[] = [
  {
    name: 'search_properties',
    description: 'Search properties within the organization using price, rooms, and location.',
    requiredPermission: PERMISSIONS.PROPERTIES_READ,
    requiresApproval: false,
    schema: {},
    execute: async (args, context) => {
      return {
        organizationId: context.organizationId,
        query: args.query,
        count: 0,
        results: [],
      };
    },
  },
  {
    name: 'get_property_details',
    description: 'Retrieve full specifications and amenities for a specific property.',
    requiredPermission: PERMISSIONS.PROPERTIES_READ,
    requiresApproval: false,
    schema: {},
    execute: async (args, context) => {
      return {
        propertyId: args.propertyId,
        organizationId: context.organizationId,
      };
    },
  },
  {
    name: 'search_leads',
    description: 'Search active leads in the CRM by status, score, or keyword.',
    requiredPermission: PERMISSIONS.LEADS_READ,
    requiresApproval: false,
    schema: {},
    execute: async (args, context) => {
      return {
        organizationId: context.organizationId,
        results: [],
      };
    },
  },
  {
    name: 'calculate_lead_score',
    description: 'Run lead scoring algorithm based on activity frequency and budget.',
    requiredPermission: PERMISSIONS.LEADS_WRITE,
    requiresApproval: false,
    schema: {},
    execute: async (args, context) => {
      return {
        leadId: args.leadId,
        score: 75,
        rating: 'warm',
      };
    },
  },
  {
    name: 'update_property_price',
    description: 'Modify listing price. Sensitive action that requires human sign-off.',
    requiredPermission: PERMISSIONS.PROPERTIES_WRITE,
    requiresApproval: true,
    schema: {},
    execute: async (args, context) => {
      return {
        propertyId: args.propertyId,
        newPrice: args.newPrice,
        status: 'approved_and_applied',
      };
    },
  },
];
