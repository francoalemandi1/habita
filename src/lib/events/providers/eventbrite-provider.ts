/**
 * Eventbrite API provider — fetches events from Eventbrite in Argentina.
 *
 * Uses the Eventbrite v3 API to search for events by location.
 * Cycles through major Argentine cities across runs.
 */

import { EVENTBRITE_CATEGORY_MAP } from "../constants";

import type { EventProvider, FetchOptions } from "./base-provider";
import type { ProviderFetchResult, RawEventData } from "../types";
import type { EventCategory } from "@prisma/client";

// ============================================
// Eventbrite API types
// ============================================

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text: string } | null;
  start: { utc: string; local: string };
  end: { utc: string; local: string } | null;
  venue_id: string | null;
  category_id: string | null;
  logo: { url: string } | null;
  url: string;
  is_free: boolean;
}

interface EventbriteVenue {
  id: string;
  name: string;
  address: {
    localized_address_display: string;
    city: string;
    region: string;
    latitude: string;
    longitude: string;
  };
}

interface EventbriteSearchResponse {
  events: EventbriteEvent[];
  pagination: {
    page_number: number;
    page_count: number;
    page_size: number;
    has_more_items: boolean;
  };
}

// ============================================
// Constants
// ============================================

const EVENTBRITE_API_URL = "https://www.eventbriteapi.com/v3";
const EVENTS_PER_PAGE = 50;

/** Major Argentine cities to cycle through. */
const SEARCH_LOCATIONS = [
  { lat: -34.6037, lng: -58.3816, city: "Buenos Aires" },
  { lat: -31.4201, lng: -64.1888, city: "Córdoba" },
  { lat: -32.9468, lng: -60.6393, city: "Rosario" },
  { lat: -32.8895, lng: -68.8458, city: "Mendoza" },
  { lat: -26.8083, lng: -65.2176, city: "Tucumán" },
  { lat: -24.7859, lng: -65.4117, city: "Salta" },
] as const;

// ============================================
// Provider implementation
// ============================================

export class EventbriteProvider implements EventProvider {
  readonly sourceName = "eventbrite";

  async fetchEvents(options: FetchOptions): Promise<ProviderFetchResult> {
    const apiToken = process.env.EVENTBRITE_API_TOKEN;
    if (!apiToken) {
      return { events: [], hasMore: false, errors: ["EVENTBRITE_API_TOKEN not configured"] };
    }

    const errors: string[] = [];
    const allEvents: RawEventData[] = [];

    // Rotate cities: use cursor as index
    const cityIndex = options.cursor ? parseInt(options.cursor, 10) : 0;
    const location = SEARCH_LOCATIONS[cityIndex % SEARCH_LOCATIONS.length]!;

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
      const searchUrl = new URL(`${EVENTBRITE_API_URL}/events/search/`);
      searchUrl.searchParams.set("location.latitude", String(location.lat));
      searchUrl.searchParams.set("location.longitude", String(location.lng));
      searchUrl.searchParams.set("location.within", "50km");
      searchUrl.searchParams.set("start_date.range_start", now.toISOString().replace(/\.\d+Z$/, "Z"));
      searchUrl.searchParams.set("start_date.range_end", thirtyDaysLater.toISOString().replace(/\.\d+Z$/, "Z"));
      searchUrl.searchParams.set("expand", "venue");
      searchUrl.searchParams.set("page_size", String(EVENTS_PER_PAGE));

      const response = await fetch(searchUrl.toString(), {
        headers: { Authorization: `Bearer ${apiToken}` },
        signal: options.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Eventbrite API error: ${response.status} ${errorText.slice(0, 200)}`);
      }

      const data = (await response.json()) as EventbriteSearchResponse;

      for (const event of data.events) {
        const mapped = mapEventbriteEvent(event, location.city);
        if (mapped) allEvents.push(mapped);
        if (allEvents.length >= options.maxEvents) break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`City "${location.city}": ${message}`);
    }

    const nextCityIndex = (cityIndex + 1) % SEARCH_LOCATIONS.length;

    return {
      events: allEvents.slice(0, options.maxEvents),
      hasMore: allEvents.length >= options.maxEvents,
      cursor: String(nextCityIndex),
      errors,
    };
  }
}

// ============================================
// Event mapping
// ============================================

function mapEventbriteEvent(event: EventbriteEvent, fallbackCity: string): RawEventData | null {
  const title = event.name?.text;
  if (!title) return null;

  const venue = (event as unknown as { venue?: EventbriteVenue }).venue;
  const category = mapCategory(event.category_id);

  return {
    title,
    description: event.description?.text ?? undefined,
    startDate: event.start.utc,
    endDate: event.end?.utc ?? undefined,
    venueName: venue?.name ?? undefined,
    address: venue?.address?.localized_address_display ?? undefined,
    latitude: venue?.address?.latitude ? parseFloat(venue.address.latitude) : undefined,
    longitude: venue?.address?.longitude ? parseFloat(venue.address.longitude) : undefined,
    cityName: venue?.address?.city ?? fallbackCity,
    province: venue?.address?.region ?? undefined,
    category,
    sourceUrl: event.url,
    sourceEventId: event.id,
    imageUrl: event.logo?.url ?? undefined,
    priceMin: event.is_free ? 0 : undefined,
  };
}

function mapCategory(categoryId: string | null): EventCategory | undefined {
  if (!categoryId) return undefined;
  return EVENTBRITE_CATEGORY_MAP[categoryId];
}
