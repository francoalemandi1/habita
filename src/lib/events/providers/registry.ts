/**
 * Registry of all available event providers.
 * Uses lazy imports to avoid loading all provider code in every invocation.
 * New providers are added by importing and registering them here.
 */

import type { EventProvider } from "./base-provider";

/** Factory functions — dynamic imports keep cold starts fast. */
const PROVIDER_FACTORIES: Record<string, () => Promise<EventProvider>> = {
  "exa-web": async () => {
    const { ExaProvider } = await import("./exa-provider");
    return new ExaProvider();
  },
  eventbrite: async () => {
    const { EventbriteProvider } = await import("./eventbrite-provider");
    return new EventbriteProvider();
  },
  "ba-agenda": async () => {
    const { BuenosAiresAgendaProvider } = await import("./ba-agenda-provider");
    return new BuenosAiresAgendaProvider();
  },
};

/** Get a provider instance by source name. Returns null if not registered. */
export async function getProvider(sourceName: string): Promise<EventProvider | null> {
  const factory = PROVIDER_FACTORIES[sourceName];
  if (!factory) return null;
  return factory();
}

/** List all registered provider names. */
export function getRegisteredProviderNames(): string[] {
  return Object.keys(PROVIDER_FACTORIES);
}
