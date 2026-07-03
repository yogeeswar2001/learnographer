import { useState, useMemo } from 'react';
import type { LearningTree, BranchNode, LeafNode, NodeStatus } from '../types';
import styles from './TreeView.module.css';

interface TreeViewProps {
  tree: LearningTree;
  suggestedNodeIds: Set<string>;
}

function getBranchStatus(branch: BranchNode): 'completed' | 'in_progress' | 'not_started' {
  const completed = branch.children.filter(c => c.status === 'completed').length;
  if (completed === branch.children.length) return 'completed';
  if (completed > 0 || branch.children.some(c => c.status === 'suggested')) return 'in_progress';
  return 'not_started';
}

function getStatusClass(status: NodeStatus | string, isSuggested: boolean): string {
  if (isSuggested) return styles.suggested;
  if (status === 'completed') return styles.completed;
  if (status === 'in_progress') return styles.inProgress;
  return styles.notStarted;
}

function StatusIcon({ status, isSuggested }: { status: string; isSuggested: boolean }) {
  if (isSuggested || status === 'suggested') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4"/>
        <path d="M12 16h.01"/>
      </svg>
    );
  }
  if (status === 'completed') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  );
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg className={styles.progressRing} width="30" height="30" viewBox="0 0 30 30">
      <circle
        cx="15" cy="15" r={radius}
        fill="none"
        stroke="var(--bg-border)"
        strokeWidth="3"
      />
      <circle
        cx="15" cy="15" r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 15 15)"
        style={{ transition: 'stroke-dashoffset 600ms var(--ease-out)' }}
      />
      <text
        x="15" y="15"
        textAnchor="middle"
        dominantBaseline="central"
        className={styles.ringText}
      >
        {completed}/{total}
      </text>
    </svg>
  );
}

export default function TreeView({ tree, suggestedNodeIds }: TreeViewProps) {
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(() => {
    return new Set(tree.nodes.map(n => n.id));
  });

  const toggleBranch = (id: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const leafCount = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const branch of tree.nodes) {
      for (const leaf of branch.children) {
        total++;
        if (leaf.status === 'completed') completed++;
      }
    }
    return { total, completed };
  }, [tree]);

  // Avoid unused variable warning
  void leafCount;

  return (
    <div className={styles.container}>
      {/* Root node */}
      <div className={styles.rootNode}>
        <span className={styles.rootIcon}>🧠</span>
        <span className={styles.rootLabel}>{tree.topic}</span>
      </div>

      <div className={styles.rootConnector} />

      {/* Branch nodes */}
      <div className={styles.branches}>
        {tree.nodes.map((branch, branchIdx) => {
          const isExpanded = expandedBranches.has(branch.id);
          const branchStatus = getBranchStatus(branch);
          const completedChildren = branch.children.filter(c => c.status === 'completed').length;
          const hasSuggested = branch.children.some(c => suggestedNodeIds.has(c.id));

          return (
            <div
              key={branch.id}
              className={styles.branchGroup}
              style={{ animationDelay: `${branchIdx * 80}ms` }}
            >
              <button
                className={`${styles.branchNode} ${getStatusClass(branchStatus, hasSuggested)}`}
                onClick={() => toggleBranch(branch.id)}
                aria-expanded={isExpanded}
              >
                <div className={styles.branchLeft}>
                  <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>
                  <span className={styles.branchLabel}>{branch.label}</span>
                </div>
                <ProgressRing completed={completedChildren} total={branch.children.length} />
              </button>

              {/* Leaf nodes */}
              <div className={`${styles.leaves} ${isExpanded ? styles.leavesOpen : ''}`}>
                {branch.children.map((leaf: LeafNode, leafIdx: number) => {
                  const isSuggested = suggestedNodeIds.has(leaf.id);
                  const effectiveStatus = isSuggested ? 'suggested' : leaf.status;

                  return (
                    <div
                      key={leaf.id}
                      className={`${styles.leafNode} ${getStatusClass(effectiveStatus, isSuggested)}`}
                      style={{ animationDelay: `${leafIdx * 40}ms` }}
                    >
                      <span className={styles.leafConnector} />
                      <StatusIcon status={effectiveStatus} isSuggested={isSuggested} />
                      <span className={styles.leafLabel}>{leaf.label}</span>
                      {leaf.status === 'completed' && (
                        <span className={styles.doneTag}>Done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
