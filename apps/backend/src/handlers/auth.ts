import type {
  EmailAction,
  EmailStartPayload,
  EmailVerifyPayload,
  OAuthProvider,
  OAuthStartPayload
} from "../types";
import { createJsonResponse, parseJsonBody } from "../utils/http";
import { isEmail } from "../utils/strings";

const oauthProviders: OAuthProvider[] = ["apple", "google", "facebook"];
const emailActions: EmailAction[] = ["login", "signup"];

export const handleProviders = (): Response =>
  createJsonResponse({
    providers: [
      {
        id: "apple",
        type: "oauth",
        displayName: "Apple"
      },
      {
        id: "google",
        type: "oauth",
        displayName: "Google"
      },
      {
        id: "facebook",
        type: "oauth",
        displayName: "Facebook"
      },
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
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  if (!oauthProviders.includes(body.provider)) {
    return createJsonResponse(
      { error: "Unsupported OAuth provider.", provider: body.provider },
      400
    );
  }

  if (!body.redirectUri) {
    return createJsonResponse(
      { error: "redirectUri is required for OAuth starts." },
      400
    );
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
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  if (!isEmail(body.email)) {
    return createJsonResponse({ error: "Invalid email address." }, 400);
  }

  if (!emailActions.includes(body.action)) {
    return createJsonResponse(
      { error: "Unsupported email action.", action: body.action },
      400
    );
  }

  return createJsonResponse({
    status: "pending",
    provider: "email",
    action: body.action,
    email: body.email.toLowerCase(),
    message:
      "Email authentication started. Wire this to your email service to send a code or magic link."
  });
};

export const handleEmailVerify = async (request: Request): Promise<Response> => {
  const body = await parseJsonBody<EmailVerifyPayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  if (!isEmail(body.email)) {
    return createJsonResponse({ error: "Invalid email address." }, 400);
  }

  if (!body.code) {
    return createJsonResponse({ error: "Verification code is required." }, 400);
  }

  return createJsonResponse({
    status: "verified",
    provider: "email",
    email: body.email.toLowerCase(),
    sessionToken: crypto.randomUUID(),
    message:
      "Email verification is scaffolded. Replace sessionToken with a real session."
  });
};
