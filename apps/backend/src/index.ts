export type Runtime = "worker" | "node" | "edge";

type OAuthProvider = "apple" | "google" | "facebook";
type EmailAction = "login" | "signup";

type OAuthStartPayload = {
  provider: OAuthProvider;
  redirectUri: string;
  state?: string;
};

type EmailStartPayload = {
  email: string;
  action: EmailAction;
};

type EmailVerifyPayload = {
  email: string;
  code: string;
};

const oauthProviders: OAuthProvider[] = ["apple", "google", "facebook"];
const emailActions: EmailAction[] = ["login", "signup"];

const jsonHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json"
};

const createJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: jsonHeaders
  });

const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parseJsonBody = async <T>(request: Request): Promise<T | null> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await request.json()) as T;
};

const handleRoot = (pathname: string): Response =>
  createJsonResponse({
    name: "agnes-backend",
    runtime: "edge" satisfies Runtime,
    path: pathname,
    message: "Authentication routes are available."
  });

const handleProviders = (): Response =>
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

const handleOAuthStart = async (request: Request): Promise<Response> => {
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

const handleEmailStart = async (request: Request): Promise<Response> => {
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

const handleEmailVerify = async (request: Request): Promise<Response> => {
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

const notFound = (pathname: string): Response =>
  createJsonResponse(
    {
      error: "Route not found.",
      path: pathname
    },
    404
  );

export const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/") {
    return handleRoot(pathname);
  }

  if (request.method === "GET" && pathname === "/auth/providers") {
    return handleProviders();
  }

  if (request.method === "POST" && pathname === "/auth/oauth/start") {
    return handleOAuthStart(request);
  }

  if (request.method === "POST" && pathname === "/auth/email/start") {
    return handleEmailStart(request);
  }

  if (request.method === "POST" && pathname === "/auth/email/verify") {
    return handleEmailVerify(request);
  }

  return notFound(pathname);
};
