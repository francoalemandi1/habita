/**
 * §9 only defines named tokens; these are one-off hex values the handoff
 * gives explicitly for a single component state with no matching token.
 */
export const RAW_COLORS = {
  /** Checkbox `pending` border + 3rd-seniority avatar fill (§6.2, §6.10). */
  fadedBorder: "#B9B3A6",
  /** Toggle `off` track (§6.4). */
  toggleOffTrack: "#D6CFC1",
  /** Snackbar navigation action "Ver" (§6.13). */
  snackbarNavText: "#C9D8CC",
  /** Snackbar error action "Reintentar" (§6.13). */
  snackbarErrorText: "#F2A893",
  /** SegmentedControl active-option shadow (§6.7). */
  segmentedShadow: "0 1px 2px rgba(29,38,32,.08)",
} as const;
