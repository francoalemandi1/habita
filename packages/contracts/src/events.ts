import { z } from "zod";

export const eventCategorySchema = z.enum([
  "CINE",
  "TEATRO",
  "MUSICA",
  "EXPOSICIONES",
  "FESTIVALES",
  "MERCADOS",
  "PASEOS",
  "EXCURSIONES",
  "TALLERES",
  "DANZA",
  "LITERATURA",
  "GASTRONOMIA",
  "DEPORTES",
  "INFANTIL",
  "OTRO",
]);

export const eventItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  venueName: z.string().nullable(),
  address: z.string().nullable(),
  cityId: z.string().nullable(),
  province: z.string().nullable(),
  category: eventCategorySchema,
  tags: z.array(z.string()),
  artists: z.array(z.string()),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  currency: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  // Web-only fields (optional so mobile can omit)
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  status: z.string().optional(),
  cityProvince: z.string().nullable().optional(),
  // Mobile-only fields
  editorialHighlight: z.string().nullable().optional(),
  culturalCategory: z.string().nullable().optional(),
  ticketUrl: z.string().nullable().optional(),
  mapsUrl: z.string().nullable().optional(),
  // Joined field
  cityName: z.string().nullable().optional(),
});

export const eventsResponseSchema = z.object({
  events: z.array(eventItemSchema),
  total: z.number(),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export const weekendEventsResponseSchema = z.object({
  events: z.array(eventItemSchema),
  cityId: z.string().nullable(),
});

export type EventCategory = z.infer<typeof eventCategorySchema>;
export type EventItem = z.infer<typeof eventItemSchema>;
export type EventsResponse = z.infer<typeof eventsResponseSchema>;
export type WeekendEventsResponse = z.infer<typeof weekendEventsResponseSchema>;
