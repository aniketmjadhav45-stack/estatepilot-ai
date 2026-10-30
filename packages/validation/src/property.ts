import { z } from 'zod';
import { PROPERTY_TYPES, LISTING_TYPES, PROPERTY_STATUSES } from '@estatepilot/shared';

export const PropertyFilterSchema = z.object({
  query: z.string().optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  listingType: z.enum(LISTING_TYPES).optional(),
  status: z.enum(PROPERTY_STATUSES).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minBedrooms: z.number().int().min(0).optional(),
  minBathrooms: z.number().min(0).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PropertyFilterInput = z.infer<typeof PropertyFilterSchema>;

export const CreatePropertySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  propertyType: z.enum(PROPERTY_TYPES),
  listingType: z.enum(LISTING_TYPES),
  status: z.enum(PROPERTY_STATUSES).default('draft'),
  headline: z.string().max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than zero'),
  currency: z.string().length(3).default('USD'),
  bedrooms: z.number().int().min(0).default(0),
  bathrooms: z.number().min(0).default(0),
  squareFeet: z.number().positive().optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    unit: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State / Province is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(2, 'Country code is required'),
  }),
});

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
