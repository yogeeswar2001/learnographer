// ── Learnograph Types ──────────────────────────────────────────

export type NodeStatus = 'not_started' | 'suggested' | 'completed';

export interface LeafNode {
  id: string;
  label: string;
  status: NodeStatus;
  justification?: string;
}

export interface BranchNode {
  id: string;
  label: string;
  children: LeafNode[];
}

export interface LearningTree {
  topic: string;
  nodes: BranchNode[];
}

export interface AnalyzeResult {
  matchedNodeIds: string[];
  justification: string;
}

export interface SourceEntry {
  url: string;
  matchedNodeIds: string[];
  matchedLabels: string[];
  justification: string;
  timestamp: number;
}
