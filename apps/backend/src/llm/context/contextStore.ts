import type {
  ContextDocument,
  ContextSearchResult,
  ContextStore
} from "../types";

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean);

const buildExcerpt = (text: string, terms: string[]): string => {
  const lower = text.toLowerCase();
  const match = terms.find((term) => lower.includes(term));
  if (!match) {
    return text.slice(0, 160);
  }
  const start = Math.max(lower.indexOf(match) - 40, 0);
  return text.slice(start, start + 160);
};

export class InMemoryContextStore implements ContextStore {
  private readonly documentsByScope = new Map<string, ContextDocument[]>();

  addDocuments(docs: ContextDocument[]): void {
    docs.forEach((doc) => {
      const existing = this.documentsByScope.get(doc.scope) ?? [];
      this.documentsByScope.set(doc.scope, [...existing, { ...doc }]);
    });
  }

  listDocuments(scope: string): ContextDocument[] {
    return this.documentsByScope.get(scope)?.map((doc) => ({ ...doc })) ?? [];
  }

  search(scope: string, query: string): ContextSearchResult[] {
    const terms = tokenize(query);
    if (terms.length === 0) {
      return [];
    }
    const docs = this.documentsByScope.get(scope) ?? [];
    return docs
      .map((doc) => {
        const tokens = tokenize(doc.text);
        const overlap = terms.filter((term) => tokens.includes(term)).length;
        return {
          document: { ...doc },
          score: overlap / Math.max(tokens.length, 1),
          excerpt: buildExcerpt(doc.text, terms)
        };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}
