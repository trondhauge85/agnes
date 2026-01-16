import type { ContextRetriever, ContextSearchResult, ContextStore } from "../types";

const estimateTokens = (value: string): number =>
  value.split(/\s+/).filter(Boolean).length;

export class ContextStoreRetriever implements ContextRetriever {
  constructor(private readonly store: ContextStore) {}

  retrieve(options: {
    scope: string;
    query: string;
    maxTokens: number;
    maxResults: number;
  }): ContextSearchResult[] {
    const results = this.store.search(options.scope, options.query);
    const selected: ContextSearchResult[] = [];
    let usedTokens = 0;

    for (const result of results.slice(0, options.maxResults)) {
      const tokenEstimate = estimateTokens(result.excerpt);
      if (usedTokens + tokenEstimate > options.maxTokens) {
        break;
      }
      selected.push(result);
      usedTokens += tokenEstimate;
    }

    return selected;
  }
}
