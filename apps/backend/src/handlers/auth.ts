import type {
  EmailAction,
  EmailStartPayload,
  EmailVerifyPayload,
  OidcCallbackPayload,
  OidcProfile,
  OAuthProvider,
  OAuthStartPayload
} from "../types";
import { createEmailAuthRequest, verifyEmailAuthRequest } from "../db/emailAuth";
import { getDatabaseAdapter } from "../db/client";
import { getOidcProfile, saveOidcProfile } from "../data/oidcProfiles";
import { createDefaultMessageService } from "../communications";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { isEmail } from "../utils/strings";

const oauthProviders: OAuthProvider[] = ["apple", "google", "facebook"];
const oauthProviderLabels: Record<OAuthProvider, string> = {
  apple: "Apple",
  google: "Google",
  facebook: "Facebook"
};
const emailActions: EmailAction[] = ["login", "signup"];
const oidcCookieKey = "agnes_session";
const defaultOidcProfiles: Record<OAuthProvider, OidcProfile> = {
  apple: {
    displayName: "Jordan Appleseed",
    givenName: "Jordan",
    familyName: "Appleseed",
    email: "jordan@icloud.com"
  },
  google: {
    displayName: "Avery Chen",
    givenName: "Avery",
    familyName: "Chen",
    email: "avery.chen@gmail.com",
    pictureUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=256&h=256"
  },
  facebook: {
    displayName: "Riley Harper",
    givenName: "Riley",
    familyName: "Harper",
    email: "riley.harper@example.com"
  }
};

const buildDisplayName = (profile: OidcProfile): string | undefined => {
  if (profile.displayName) {
    return profile.displayName;
  }

  const pieces = [profile.givenName, profile.familyName].filter(Boolean);
  if (pieces.length > 0) {
    return pieces.join(" ");
  }

  return undefined;
};

const getSessionToken = (request: Request): string | null => {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token || null;
  }

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${oidcCookieKey}=`));
  if (match) {
    return match.split("=")[1] ?? null;
  }

  return null;
};

export const handleProviders = (): Response =>
  createJsonResponse({
    providers: [
      ...oauthProviders.map((provider) => ({
        id: provider,
        type: "oauth",
        displayName: oauthProviderLabels[provider]
      })),
      {
        id: "email",
        type: "passwordless",
        displayName: "Email"
      }
    ]
  });

export const handleOAuthStart = async (request: Request): Promise<Response> => {
  const body = await parseJsonBody<OAuthStartPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  if (!oauthProviders.includes(body.provider)) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported OAuth provider.",
      messageKey: "errors.auth.oauth_provider_unsupported",
      status: 400,
      details: { provider: body.provider }
    });
  }

  if (!body.redirectUri) {
    return createErrorResponse({
      code: "bad_request",
      message: "redirectUri is required for OAuth starts.",
      messageKey: "errors.auth.redirect_uri_required",
      status: 400,
      details: { field: "redirectUri", reason: "required" }
    });
  }

  const encodedState = body.state ?? crypto.randomUUID();
  const authUrl = `https://auth.example.com/${body.provider}?redirect_uri=${encodeURIComponent(
    body.redirectUri
  )}&state=${encodeURIComponent(encodedState)}`;

  return createJsonResponse({
    status: "pending",
    provider: body.provider,
    redirectUri: body.redirectUri,
    state: encodedState,
    authUrl,
    message:
      "OAuth initialization is scaffolded. Swap authUrl generation with your OAuth client."
  });
};

export const handleEmailStart = async (request: Request): Promise<Response> => {
  const body = await parseJsonBody<EmailStartPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  if (!isEmail(body.email)) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Invalid email address.",
      messageKey: "errors.auth.invalid_email",
      status: 422,
      details: { field: "email", reason: "format" }
    });
  }

  if (!emailActions.includes(body.action)) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported email action.",
      messageKey: "errors.auth.email_action_unsupported",
      status: 400,
      details: { action: body.action }
    });
  }

  const email = body.email.toLowerCase();
  const adapter = await getDatabaseAdapter();
  const record = await createEmailAuthRequest(adapter, email, body.action);
  const messageService = createDefaultMessageService();
  if (messageService) {
    await messageService.sendCommunication({
      channel: "email",
      idempotencyKey: `email-auth-${record.id}`,
      message: `Your Agnes ${body.action} code is ${record.code}.`,
      recipients: [{ address: email }]
    });
  }

  return createJsonResponse({
    status: "pending",
    provider: "email",
    action: body.action,
    email,
    requestId: record.id,
    expiresAt: record.expiresAt,
    verificationCode: record.code,
    message:
      "Email authentication started. Wire this to your email service to send a code or magic link."
  });
};

export const handleEmailVerify = async (request: Request): Promise<Response> => {
  const body = await parseJsonBody<EmailVerifyPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  if (!isEmail(body.email)) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Invalid email address.",
      messageKey: "errors.auth.invalid_email",
      status: 422,
      details: { field: "email", reason: "format" }
    });
  }

  if (!body.code) {
    return createErrorResponse({
      code: "bad_request",
      message: "Verification code is required.",
      messageKey: "errors.auth.verification_code_required",
      status: 400,
      details: { field: "code", reason: "required" }
    });
  }

  const email = body.email.toLowerCase();
  const adapter = await getDatabaseAdapter();
  const match = await verifyEmailAuthRequest(adapter, email, body.code);

  if (!match) {
    return createErrorResponse({
      code: "unauthorized",
      message: "Invalid or expired verification code.",
      messageKey: "errors.auth.invalid_verification_code",
      status: 401,
      details: { email }
    });
  }

  return createJsonResponse({
    status: "verified",
    provider: "email",
    email: match.email,
    action: match.action,
    sessionToken: crypto.randomUUID(),
    message:
      "Email verification is scaffolded. Replace sessionToken with a real session."
  });
};

export const handleOidcCallback = async (request: Request): Promise<Response> => {
  const body = await parseJsonBody<OidcCallbackPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  if (!oauthProviders.includes(body.provider)) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported OAuth provider.",
      messageKey: "errors.auth.oauth_provider_unsupported",
      status: 400,
      details: { provider: body.provider }
    });
  }

  const baseProfile = defaultOidcProfiles[body.provider];
  const mergedProfile: OidcProfile = {
    ...baseProfile,
    ...(body.profile ?? {})
  };
  const displayName = buildDisplayName(mergedProfile);
  if (displayName) {
    mergedProfile.displayName = displayName;
  }

  const sessionToken = crypto.randomUUID();
  saveOidcProfile(sessionToken, mergedProfile);

  return createJsonResponse({
    status: "authenticated",
    provider: body.provider,
    sessionToken,
    profile: mergedProfile
  });
};

export const handleOidcProfile = (request: Request): Response => {
  const sessionToken = getSessionToken(request);
  if (!sessionToken) {
    return createErrorResponse({
      code: "unauthorized",
      message: "Session token is required to fetch OIDC profile data.",
      messageKey: "errors.auth.oidc_session_required",
      status: 401
    });
  }

  const profile = getOidcProfile(sessionToken);
  if (!profile) {
    return createErrorResponse({
      code: "not_found",
      message: "OIDC profile not found for current session.",
      messageKey: "errors.auth.oidc_profile_not_found",
      status: 404
    });
  }

  return createJsonResponse({
    profile
  });
};
