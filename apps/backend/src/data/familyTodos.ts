import type { FamilyTodo } from "../types";

const familyTodos = new Map<string, FamilyTodo[]>();

export const listFamilyTodos = (familyId: string): FamilyTodo[] =>
  familyTodos.get(familyId)?.map((todo) => ({ ...todo })) ?? [];

export const saveFamilyTodo = (familyId: string, todo: FamilyTodo): void => {
  const existing = familyTodos.get(familyId) ?? [];
  familyTodos.set(familyId, [...existing, { ...todo }]);
};

export const getFamilyTodo = (
  familyId: string,
  todoId: string
): FamilyTodo | null => {
  const todos = familyTodos.get(familyId) ?? [];
  return todos.find((todo) => todo.id === todoId) ?? null;
};

export const updateFamilyTodo = (
  familyId: string,
  todoId: string,
  update: (todo: FamilyTodo) => FamilyTodo
): FamilyTodo | null => {
  const todos = familyTodos.get(familyId) ?? [];
  const index = todos.findIndex((todo) => todo.id === todoId);
  if (index === -1) {
    return null;
  }

  const updated = update(todos[index]);
  const next = [...todos];
  next[index] = { ...updated };
  familyTodos.set(familyId, next);
  return updated;
};

export const removeFamilyTodo = (
  familyId: string,
  todoId: string
): FamilyTodo | null => {
  const todos = familyTodos.get(familyId) ?? [];
  const match = todos.find((todo) => todo.id === todoId) ?? null;
  if (!match) {
    return null;
  }
  familyTodos.set(
    familyId,
    todos.filter((todo) => todo.id !== todoId)
  );
  return match;
};
