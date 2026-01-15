export type Runtime = "worker" | "node" | "edge";

export type OAuthProvider = "apple" | "google" | "facebook";
export type EmailAction = "login" | "signup";

export type OAuthStartPayload = {
  provider: OAuthProvider;
  redirectUri: string;
  state?: string;
};

export type EmailStartPayload = {
  email: string;
  action: EmailAction;
};

export type EmailVerifyPayload = {
  email: string;
  code: string;
};

export type FamilyRole = "owner" | "admin" | "member";

export type FamilyMember = {
  userId: string;
  displayName: string;
  role: FamilyRole;
  joinedAt: string;
};

export type FamilyMetadata = {
  interests: string[];
  goals: string[];
};

export type Family = {
  id: string;
  name: string;
  pictureUrl: string;
  createdAt: string;
  metadata: FamilyMetadata;
  members: FamilyMember[];
};

export type FamilyCreatePayload = {
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

export type FamilyJoinPayload = {
  userId: string;
  displayName: string;
  addedByUserId: string;
};

export type FamilyLeavePayload = {
  userId: string;
};
