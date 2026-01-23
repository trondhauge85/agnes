import type { DatabaseAdapter } from "../db/adapter";
import { getDatabaseAdapter } from "../db/client";
import type { Family, FamilyMember, FamilyRole } from "../types";

type FamilyRow = {
  id: string;
  name: string;
  picture_url: string;
  created_at: string;
  metadata_interests: string;
  metadata_goals: string;
};

type FamilyMemberRow = {
  family_id: string;
  user_id: string;
  display_name: string;
  role: FamilyRole;
  joined_at: string;
  email: string | null;
  phone_number: string | null;
  age: number | null;
};

const escapeLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const toSqlValue = (value: string | null | undefined): string =>
  value ? escapeLiteral(value) : "NULL";

const toSqlNumber = (value: number | null | undefined): string =>
  Number.isFinite(value) ? String(value) : "NULL";

const parseJsonArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    return [];
  } catch {
    return [];
  }
};

const serializeFamilyRow = (
  row: FamilyRow,
  members: FamilyMember[]
): Family => ({
  id: row.id,
  name: row.name,
  pictureUrl: row.picture_url,
  createdAt: row.created_at,
  metadata: {
    interests: parseJsonArray(row.metadata_interests),
    goals: parseJsonArray(row.metadata_goals)
  },
  members
});

const getAdapter = async (
  adapter?: DatabaseAdapter
): Promise<DatabaseAdapter> => adapter ?? getDatabaseAdapter();

export const familyRoles: FamilyRole[] = ["owner", "admin", "member"];

export const findFamily = async (
  familyId: string,
  adapter?: DatabaseAdapter
): Promise<Family | null> => {
  const db = await getAdapter(adapter);
  const rows = await db.query<FamilyRow>(
    `SELECT id, name, picture_url, created_at, metadata_interests, metadata_goals
     FROM families
     WHERE id = ${escapeLiteral(familyId)}
     LIMIT 1`
  );
  const familyRow = rows[0];
  if (!familyRow) {
    return null;
  }

  const memberRows = await db.query<FamilyMemberRow>(
    `SELECT family_id, user_id, display_name, role, joined_at, email, phone_number, age
     FROM family_members
     WHERE family_id = ${escapeLiteral(familyId)}
     ORDER BY joined_at ASC`
  );
  const members = memberRows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role,
    joinedAt: row.joined_at,
    email: row.email ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    age: row.age ?? undefined
  }));

  return serializeFamilyRow(familyRow, members);
};

export const saveFamily = async (
  family: Family,
  adapter?: DatabaseAdapter
): Promise<void> => {
  const db = await getAdapter(adapter);
  const metadataInterests = JSON.stringify(family.metadata.interests ?? []);
  const metadataGoals = JSON.stringify(family.metadata.goals ?? []);

  await db.execute(
    `INSERT INTO families (
      id,
      name,
      picture_url,
      created_at,
      metadata_interests,
      metadata_goals
    ) VALUES (
      ${escapeLiteral(family.id)},
      ${escapeLiteral(family.name)},
      ${escapeLiteral(family.pictureUrl)},
      ${escapeLiteral(family.createdAt)},
      ${escapeLiteral(metadataInterests)},
      ${escapeLiteral(metadataGoals)}
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      picture_url = excluded.picture_url,
      metadata_interests = excluded.metadata_interests,
      metadata_goals = excluded.metadata_goals`
  );

  if (family.members.length === 0) {
    return;
  }

  const values = family.members
    .map(
      (member) =>
        `(
          ${escapeLiteral(family.id)},
          ${escapeLiteral(member.userId)},
          ${escapeLiteral(member.displayName)},
          ${escapeLiteral(member.role)},
          ${escapeLiteral(member.joinedAt)},
          ${toSqlValue(member.email)},
          ${toSqlValue(member.phoneNumber)},
          ${toSqlNumber(member.age)}
        )`
    )
    .join(", ");

  await db.execute(
    `INSERT INTO family_members (
      family_id,
      user_id,
      display_name,
      role,
      joined_at,
      email,
      phone_number,
      age
    ) VALUES ${values}
    ON CONFLICT(family_id, user_id) DO UPDATE SET
      display_name = excluded.display_name,
      role = excluded.role,
      email = excluded.email,
      phone_number = excluded.phone_number,
      age = excluded.age,
      joined_at = excluded.joined_at`
  );
};

export const addFamilyMember = async (
  familyId: string,
  member: FamilyMember,
  adapter?: DatabaseAdapter
): Promise<void> => {
  const db = await getAdapter(adapter);
  await db.execute(
    `INSERT INTO family_members (
      family_id,
      user_id,
      display_name,
      role,
      joined_at,
      email,
      phone_number,
      age
    ) VALUES (
      ${escapeLiteral(familyId)},
      ${escapeLiteral(member.userId)},
      ${escapeLiteral(member.displayName)},
      ${escapeLiteral(member.role)},
      ${escapeLiteral(member.joinedAt)},
      ${toSqlValue(member.email)},
      ${toSqlValue(member.phoneNumber)},
      ${toSqlNumber(member.age)}
    )
    ON CONFLICT(family_id, user_id) DO UPDATE SET
      display_name = excluded.display_name,
      role = excluded.role,
      email = excluded.email,
      phone_number = excluded.phone_number,
      age = excluded.age,
      joined_at = excluded.joined_at`
  );
};

export const removeFamilyMember = async (
  familyId: string,
  userId: string,
  adapter?: DatabaseAdapter
): Promise<void> => {
  const db = await getAdapter(adapter);
  await db.execute(
    `DELETE FROM family_members
     WHERE family_id = ${escapeLiteral(familyId)}
       AND user_id = ${escapeLiteral(userId)}`
  );
};

export const listFamilies = async (
  adapter?: DatabaseAdapter
): Promise<Family[]> => {
  const db = await getAdapter(adapter);
  const familyRows = await db.query<FamilyRow>(
    "SELECT id, name, picture_url, created_at, metadata_interests, metadata_goals FROM families"
  );
  if (familyRows.length === 0) {
    return [];
  }

  const memberRows = await db.query<FamilyMemberRow>(
    "SELECT family_id, user_id, display_name, role, joined_at, email, phone_number, age FROM family_members"
  );
  const membersByFamily = new Map<string, FamilyMember[]>();
  for (const row of memberRows) {
    const existing = membersByFamily.get(row.family_id) ?? [];
    existing.push({
      userId: row.user_id,
      displayName: row.display_name,
      role: row.role,
      joinedAt: row.joined_at,
      email: row.email ?? undefined,
      phoneNumber: row.phone_number ?? undefined,
      age: row.age ?? undefined
    });
    membersByFamily.set(row.family_id, existing);
  }

  return familyRows.map((row) =>
    serializeFamilyRow(row, membersByFamily.get(row.id) ?? [])
  );
};

export const getMemberById = (
  family: Family,
  userId: string
): FamilyMember | undefined => family.members.find((member) => member.userId === userId);

export const canAddMembers = (role: FamilyRole): boolean =>
  role === "owner" || role === "admin";

export const serializeFamily = (family: Family): Family => ({
  ...family,
  members: [...family.members]
});
