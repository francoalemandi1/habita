import { z } from "zod";

export const householdSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const memberSummarySchema = z.object({
  id: z.string(),
  householdId: z.string(),
  name: z.string(),
});

export const authMeResponseSchema = z.object({
  userId: z.string().nullable().optional(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  hasMembership: z.boolean(),
  activeHouseholdId: z.string().nullable().optional(),
  households: z.array(householdSummarySchema).default([]),
  members: z.array(memberSummarySchema).default([]),
});

export const mobileExchangeInputSchema = z.object({
  // idToken: from native iOS client (real device, implicit flow)
  // authCode + codeVerifier: from Web client (simulator/Android, PKCE flow)
  idToken: z.string().min(1).optional(),
  authCode: z.string().min(1).optional(),
  codeVerifier: z.string().min(1).optional(),
  deviceId: z.string().min(1).max(200).optional(),
  householdId: z.string().min(1).optional(),
}).refine((data) => data.idToken ?? data.authCode, {
  message: "Either idToken or authCode is required",
});

export const mobileRefreshInputSchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().min(1).max(200).optional(),
});

export const mobileTokenExchangeResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresInSeconds: z.number().int().positive(),
});

export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
export type MobileExchangeInput = z.infer<typeof mobileExchangeInputSchema>;
export type MobileRefreshInput = z.infer<typeof mobileRefreshInputSchema>;
export type MobileTokenExchangeResponse = z.infer<typeof mobileTokenExchangeResponseSchema>;
