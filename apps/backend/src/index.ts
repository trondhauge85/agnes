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

type FamilyRole = "owner" | "admin" | "member";

type FamilyMember = {
  userId: string;
  displayName: string;
  role: FamilyRole;
  joinedAt: string;
};

type FamilyMetadata = {
  interests: string[];
  goals: string[];
};

type Family = {
  id: string;
  name: string;
  pictureUrl: string;
  createdAt: string;
  metadata: FamilyMetadata;
  members: FamilyMember[];
};

type FamilyCreatePayload = {
  name: string;
  pictureUrl: string;
  creator: {
    userId: string;
    displayName: string;
  };
  metadata?: {
    interests?: string[];
    goals?: string[];
  };
};

type FamilyJoinPayload = {
  userId: string;
  displayName: string;
  addedByUserId: string;
};

type FamilyLeavePayload = {
  userId: string;
};

const oauthProviders: OAuthProvider[] = ["apple", "google", "facebook"];
const emailActions: EmailAction[] = ["login", "signup"];
const familyRoles: FamilyRole[] = ["owner", "admin", "member"];

const jsonHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json"
};

const families = new Map<string, Family>();

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

const normalizeString = (value: string): string => value.trim();

const normalizeStringArray = (values: string[] | undefined): string[] =>
  (values ?? []).map((value) => normalizeString(value)).filter(Boolean);

const findFamily = (familyId: string): Family | null =>
  families.get(familyId) ?? null;

const getMemberById = (
  family: Family,
  userId: string
): FamilyMember | undefined => family.members.find((member) => member.userId === userId);

const canAddMembers = (role: FamilyRole): boolean =>
  role === "owner" || role === "admin";

const serializeFamily = (family: Family): Family => ({
  ...family,
  members: [...family.members]
});

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

const handleFamilyCreate = async (request: Request): Promise<Response> => {
  const body = await parseJsonBody<FamilyCreatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const name = normalizeString(body.name ?? "");
  const pictureUrl = normalizeString(body.pictureUrl ?? "");
  const creatorId = normalizeString(body.creator?.userId ?? "");
  const creatorName = normalizeString(body.creator?.displayName ?? "");
  const metadata: FamilyMetadata = {
    interests: normalizeStringArray(body.metadata?.interests),
    goals: normalizeStringArray(body.metadata?.goals)
  };

  if (!name) {
    return createJsonResponse({ error: "Family name is required." }, 400);
  }

  if (!pictureUrl) {
    return createJsonResponse({ error: "Family pictureUrl is required." }, 400);
  }

  if (!creatorId || !creatorName) {
    return createJsonResponse(
      { error: "creator.userId and creator.displayName are required." },
      400
    );
  }

  const now = new Date().toISOString();
  const family: Family = {
    id: crypto.randomUUID(),
    name,
    pictureUrl,
    createdAt: now,
    metadata,
    members: [
      {
        userId: creatorId,
        displayName: creatorName,
        role: "owner",
        joinedAt: now
      }
    ]
  };

  families.set(family.id, family);

  return createJsonResponse({
    status: "created",
    family: serializeFamily(family),
    roles: familyRoles,
    message:
      "Family created. Use the join endpoint with an admin/owner to add more members."
  });
};

const handleFamilyJoin = async (
  request: Request,
  familyId: string
): Promise<Response> => {
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const body = await parseJsonBody<FamilyJoinPayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const userId = normalizeString(body.userId ?? "");
  const displayName = normalizeString(body.displayName ?? "");
  const addedByUserId = normalizeString(body.addedByUserId ?? "");

  if (!userId || !displayName || !addedByUserId) {
    return createJsonResponse(
      {
        error:
          "userId, displayName, and addedByUserId are required to join a family."
      },
      400
    );
  }

  const addedByMember = getMemberById(family, addedByUserId);
  if (!addedByMember || !canAddMembers(addedByMember.role)) {
    return createJsonResponse(
      { error: "Only owners or admins can add family members." },
      403
    );
  }

  const existingMember = getMemberById(family, userId);
  if (existingMember) {
    return createJsonResponse({
      status: "already_member",
      family: serializeFamily(family),
      member: existingMember
    });
  }

  const now = new Date().toISOString();
  const newMember: FamilyMember = {
    userId,
    displayName,
    role: "member",
    joinedAt: now
  };
  family.members.push(newMember);

  return createJsonResponse({
    status: "joined",
    family: serializeFamily(family),
    member: newMember,
    addedBy: {
      userId: addedByMember.userId,
      role: addedByMember.role
    }
  });
};

const handleFamilyLeave = async (
  request: Request,
  familyId: string
): Promise<Response> => {
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const body = await parseJsonBody<FamilyLeavePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const userId = normalizeString(body.userId ?? "");
  if (!userId) {
    return createJsonResponse({ error: "userId is required to leave." }, 400);
  }

  const member = getMemberById(family, userId);
  if (!member) {
    return createJsonResponse(
      { error: "Member not found in family." },
      404
    );
  }

  if (member.role === "owner") {
    const ownerCount = family.members.filter((item) => item.role === "owner")
      .length;
    if (ownerCount <= 1) {
      return createJsonResponse(
        { error: "Families must have at least one owner." },
        400
      );
    }
  }

  family.members = family.members.filter((item) => item.userId !== userId);

  return createJsonResponse({
    status: "left",
    family: serializeFamily(family),
    removedMember: member
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

  if (request.method === "POST" && pathname === "/families") {
    return handleFamilyCreate(request);
  }

  const familyJoinMatch = pathname.match(/^\/families\/([^/]+)\/join$/);
  if (request.method === "POST" && familyJoinMatch) {
    return handleFamilyJoin(request, familyJoinMatch[1]);
  }

  const familyLeaveMatch = pathname.match(/^\/families\/([^/]+)\/leave$/);
  if (request.method === "POST" && familyLeaveMatch) {
    return handleFamilyLeave(request, familyLeaveMatch[1]);
  }

  return notFound(pathname);
};
