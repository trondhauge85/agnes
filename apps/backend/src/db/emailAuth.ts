import type { EmailAction } from "../types";
import type { DatabaseAdapter } from "./adapter";

const escapeLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const createVerificationCode = (): string => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const value = buffer[0] % 1000000;
  return value.toString().padStart(6, "0");
};

export type EmailAuthRequestRecord = {
  id: string;
  email: string;
  action: EmailAction;
  code: string;
  createdAt: string;
  expiresAt: string;
};

export type EmailAuthVerification = {
  id: string;
  email: string;
  action: EmailAction;
  expiresAt: string;
};

const EMAIL_AUTH_TTL_MS = 15 * 60 * 1000;

export const createEmailAuthRequest = async (
  adapter: DatabaseAdapter,
  email: string,
  action: EmailAction
): Promise<EmailAuthRequestRecord> => {
  const id = crypto.randomUUID();
  const code = createVerificationCode();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + EMAIL_AUTH_TTL_MS);

  await adapter.execute(
    `INSERT INTO email_auth_requests (
      id,
      email,
      action,
      code,
      created_at,
      expires_at
    ) VALUES (
      ${escapeLiteral(id)},
      ${escapeLiteral(email)},
      ${escapeLiteral(action)},
      ${escapeLiteral(code)},
      ${escapeLiteral(createdAt.toISOString())},
      ${escapeLiteral(expiresAt.toISOString())}
    )`
  );

  return {
    id,
    email,
    action,
    code,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
};

export const verifyEmailAuthRequest = async (
  adapter: DatabaseAdapter,
  email: string,
  code: string
): Promise<EmailAuthVerification | null> => {
  const now = new Date().toISOString();
  const rows = await adapter.query<{
    id: string;
    email: string;
    action: EmailAction;
    expires_at: string;
  }>(
    `SELECT id, email, action, expires_at
     FROM email_auth_requests
     WHERE email = ${escapeLiteral(email)}
       AND code = ${escapeLiteral(code)}
       AND verified_at IS NULL
       AND expires_at >= ${escapeLiteral(now)}
     ORDER BY created_at DESC
     LIMIT 1`
  );

  const match = rows[0];
  if (!match) {
    return null;
  }

  await adapter.execute(
    `UPDATE email_auth_requests
     SET verified_at = ${escapeLiteral(now)}
     WHERE id = ${escapeLiteral(match.id)}`
  );

  return {
    id: match.id,
    email: match.email,
    action: match.action,
    expiresAt: match.expires_at
  };
};
