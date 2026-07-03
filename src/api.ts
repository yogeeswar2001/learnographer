/**
 * Learnograph API client.
 *
 * Two endpoints:
 *   POST /generate-tree  — LLM generates a learning curriculum tree
 *   POST /analyze-url    — Fetch + analyze a URL against the tree
 */

import type { LearningTree, AnalyzeResult } from './types';

const API = {
  generateTree: '/generate-tree',
  analyzeUrl: '/analyze-url',
} as const;

/**
 * Generate a learning tree for a given topic.
 * Calls the backend which uses the AI Gateway to produce structured JSON.
 */
export async function generateTree(topic: string): Promise<LearningTree> {
  const res = await fetch(API.generateTree, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to generate tree: HTTP ${res.status} ${text}`);
  }

  const data = await res.json();
  if (!data || !data.topic || !Array.isArray(data.nodes)) {
    throw new Error('Invalid tree response from server');
  }

  return data as LearningTree;
}

/**
 * Analyze a URL's content against the current learning tree.
 * Returns matched node IDs and a justification.
 */
export async function analyzeUrl(
  url: string,
  tree: LearningTree,
): Promise<AnalyzeResult> {
  const res = await fetch(API.analyzeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, tree }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to analyze URL: HTTP ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    matchedNodeIds: Array.isArray(data.matchedNodeIds) ? data.matchedNodeIds : [],
    justification: data.justification || 'No justification provided.',
  };
}
