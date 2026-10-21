/** zod schemas: every request body is validated here before it touches the database. */
import { z } from 'zod';
import { isValidDate } from './availability';

const dateStr = z.string().refine(isValidDate, 'Use a valid date (yyyy-mm-dd)');

/** Photos are either our own uploads or an https URL (Supabase Storage). */
const photoUrl = z
  .string()
  .max(500)
  .refine((u) => /^\/api\/uploads\/[\w-]+\.(jpg|png|webp)$/.test(u) || /^https:\/\//.test(u), 'Invalid photo URL');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(72),
  role: z.enum(['host', 'guest']),
});

export const roleSchema = z.object({ role: z.enum(['host', 'guest']) });

export const listingInputSchema = z.object({
  title: z.string().trim().min(5, 'Title is too short').max(100),
  description: z.string().trim().min(20, 'Describe the place in at least 20 characters').max(4000),
  pricePerNight: z.coerce.number().min(1, 'Set a price').max(100_000),
  currency: z.string().trim().toUpperCase().length(3).default('USD'),
  unitCount: z.coerce.number().int().min(1, 'At least 1 unit').max(50),
  propertyType: z.enum(['entire_place', 'private_room']),
  bedrooms: z.coerce.number().int().min(0).max(20),
  beds: z.coerce.number().int().min(1).max(50),
  bathrooms: z.coerce.number().min(0.5).max(20),
  maxGuests: z.coerce.number().int().min(1).max(50),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  houseRules: z.string().trim().max(2000).default(''),
  photos: z.array(photoUrl).min(1, 'Add at least one photo').max(12),
  address: z.string().trim().min(3, 'Enter the address').max(200),
  neighborhood: z.string().trim().max(80).default(''),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  instantBook: z.boolean().default(false),
  blockedDates: z.array(dateStr).max(1000).default([]),
});
export type ListingInput = z.infer<typeof listingInputSchema>;

export const bookingRequestSchema = z.object({
  listingId: z.string().min(1).max(80),
  checkIn: dateStr,
  checkOut: dateStr,
  guests: z.coerce.number().int().min(1).max(50),
  note: z.string().trim().max(1000).default(''),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const bookingDecisionSchema = z.object({ action: z.enum(['accept', 'reject']) });

/** First human-readable problem in a zod error. */
export const firstIssue = (err: z.ZodError) => err.issues[0]?.message ?? 'Invalid request';
