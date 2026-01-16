import type { FamilyProject } from "../types";

const familyProjects = new Map<string, FamilyProject[]>();

export const listFamilyProjects = (familyId: string): FamilyProject[] =>
  familyProjects.get(familyId)?.map((project) => ({ ...project })) ?? [];

export const saveFamilyProject = (
  familyId: string,
  project: FamilyProject
): void => {
  const existing = familyProjects.get(familyId) ?? [];
  familyProjects.set(familyId, [...existing, { ...project }]);
};

export const getFamilyProject = (
  familyId: string,
  projectId: string
): FamilyProject | null => {
  const projects = familyProjects.get(familyId) ?? [];
  return projects.find((project) => project.id === projectId) ?? null;
};

export const updateFamilyProject = (
  familyId: string,
  projectId: string,
  update: (project: FamilyProject) => FamilyProject
): FamilyProject | null => {
  const projects = familyProjects.get(familyId) ?? [];
  const index = projects.findIndex((project) => project.id === projectId);
  if (index === -1) {
    return null;
  }

  const updated = update(projects[index]);
  const next = [...projects];
  next[index] = { ...updated };
  familyProjects.set(familyId, next);
  return updated;
};

export const removeFamilyProject = (
  familyId: string,
  projectId: string
): FamilyProject | null => {
  const projects = familyProjects.get(familyId) ?? [];
  const match = projects.find((project) => project.id === projectId) ?? null;
  if (!match) {
    return null;
  }
  familyProjects.set(
    familyId,
    projects.filter((project) => project.id !== projectId)
  );
  return match;
};
