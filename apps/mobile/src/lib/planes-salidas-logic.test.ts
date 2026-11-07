import { describe, expect, it } from "vitest";

import {
  formatSalidaMeta,
  isAiDisabledStatus,
  isMissingCityStatus,
  pickSalidaLink,
  resolveSalidaGroupState,
} from "./planes-salidas-logic";

describe("isMissingCityStatus", () => {
  it("is true for 400", () => {
    expect(isMissingCityStatus(400)).toBe(true);
  });

  it("is false for other statuses", () => {
    expect(isMissingCityStatus(503)).toBe(false);
    expect(isMissingCityStatus(undefined)).toBe(false);
  });
});

describe("isAiDisabledStatus", () => {
  it("is true for 503", () => {
    expect(isAiDisabledStatus(503)).toBe(true);
  });

  it("is false for other statuses", () => {
    expect(isAiDisabledStatus(400)).toBe(false);
    expect(isAiDisabledStatus(undefined)).toBe(false);
  });
});

describe("resolveSalidaGroupState", () => {
  it("returns loading while the query is in flight", () => {
    expect(resolveSalidaGroupState({ isLoading: true, isError: false, eventCount: 0 })).toBe("loading");
  });

  it("returns missing-city for a 400", () => {
    expect(resolveSalidaGroupState({ isLoading: false, isError: true, errorStatus: 400, eventCount: 0 })).toBe(
      "missing-city",
    );
  });

  it("returns ai-disabled for a 503", () => {
    expect(resolveSalidaGroupState({ isLoading: false, isError: true, errorStatus: 503, eventCount: 0 })).toBe(
      "ai-disabled",
    );
  });

  it("returns error for any other failure", () => {
    expect(resolveSalidaGroupState({ isLoading: false, isError: true, errorStatus: 500, eventCount: 0 })).toBe(
      "error",
    );
  });

  it("returns empty when there are no events", () => {
    expect(resolveSalidaGroupState({ isLoading: false, isError: false, eventCount: 0 })).toBe("empty");
  });

  it("returns ready when there are events", () => {
    expect(resolveSalidaGroupState({ isLoading: false, isError: false, eventCount: 3 })).toBe("ready");
  });
});

describe("formatSalidaMeta", () => {
  it("joins date and venue", () => {
    expect(formatSalidaMeta({ dateInfo: "Sáb 9 nov", venue: "Teatro Colón" })).toBe("Sáb 9 nov · Teatro Colón");
  });

  it("falls back to only the date when there is no venue", () => {
    expect(formatSalidaMeta({ dateInfo: "Sáb 9 nov", venue: "" })).toBe("Sáb 9 nov");
  });

  it("returns undefined when both parts are empty", () => {
    expect(formatSalidaMeta({ dateInfo: "", venue: "" })).toBeUndefined();
  });
});

describe("pickSalidaLink", () => {
  it("prefers the ticket link", () => {
    expect(pickSalidaLink({ ticketUrl: "a", bookingUrl: "b", sourceUrl: "c", url: "d" })).toBe("a");
  });

  it("falls back to booking, then source, then url", () => {
    expect(pickSalidaLink({ ticketUrl: null, bookingUrl: "b", sourceUrl: "c", url: "d" })).toBe("b");
    expect(pickSalidaLink({ ticketUrl: null, bookingUrl: null, sourceUrl: "c", url: "d" })).toBe("c");
    expect(pickSalidaLink({ ticketUrl: null, bookingUrl: null, sourceUrl: null, url: "d" })).toBe("d");
  });

  it("returns null when there is no link at all", () => {
    expect(pickSalidaLink({ ticketUrl: null, bookingUrl: null, sourceUrl: null, url: null })).toBeNull();
  });
});
