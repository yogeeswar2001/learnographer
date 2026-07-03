import { useState, useCallback, useMemo } from 'react';
import type { LearningTree, SourceEntry, AnalyzeResult } from './types';
import { generateTree, analyzeUrl } from './api';
import LandingScreen from './components/LandingScreen';
import TreeView from './components/TreeView';
import ProgressBar from './components/ProgressBar';
import UrlInput from './components/UrlInput';
import SuggestionCard from './components/SuggestionCard';
import SourcesList from './components/SourcesList';
import styles from './App.module.css';

export default function App() {
  // Core state
  const [tree, setTree] = useState<LearningTree | null>(null);
  const [sources, setSources] = useState<SourceEntry[]>([]);

  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Error state
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Suggestion state
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    result: AnalyzeResult;
    url: string;
    matchedLabels: string[];
  } | null>(null);

  // ── Computed values ──────────────────────────────────────────
  const leafStats = useMemo(() => {
    if (!tree) return { total: 0, completed: 0 };
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

  const suggestedNodeIds = useMemo(() => {
    if (!pendingSuggestion) return new Set<string>();
    return new Set(pendingSuggestion.result.matchedNodeIds);
  }, [pendingSuggestion]);

  // ── Generate tree ────────────────────────────────────────────
  const handleGenerateTopic = useCallback(async (topic: string) => {
    setIsGenerating(true);
    try {
      const result = await generateTree(topic);
      setTree(result);
      setSources([]);
      setPendingSuggestion(null);
      setAnalyzeError(null);
    } catch (err) {
      console.error('Failed to generate tree:', err);
      alert(`Failed to generate roadmap: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // ── Analyze URL ──────────────────────────────────────────────
  const handleAnalyzeUrl = useCallback(async (url: string) => {
    if (!tree) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setPendingSuggestion(null);

    try {
      const result = await analyzeUrl(url, tree);

      if (result.matchedNodeIds.length === 0) {
        setAnalyzeError('This article doesn\'t seem to cover any topics in your roadmap.');
        return;
      }

      // Build labels for matched nodes
      const labelMap = new Map<string, string>();
      for (const branch of tree.nodes) {
        for (const leaf of branch.children) {
          labelMap.set(leaf.id, leaf.label);
        }
      }

      // Filter out already-completed nodes
      const newMatchIds = result.matchedNodeIds.filter(id => {
        for (const branch of tree.nodes) {
          for (const leaf of branch.children) {
            if (leaf.id === id && leaf.status !== 'completed') return true;
          }
        }
        return false;
      });

      if (newMatchIds.length === 0) {
        setAnalyzeError('This article covers topics you\'ve already completed!');
        return;
      }

      const matchedLabels = newMatchIds
        .map(id => labelMap.get(id) || id)
        .filter(Boolean);

      setPendingSuggestion({
        result: { ...result, matchedNodeIds: newMatchIds },
        url,
        matchedLabels,
      });

      // Mark nodes as suggested in tree
      setTree(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map(branch => ({
            ...branch,
            children: branch.children.map(leaf =>
              newMatchIds.includes(leaf.id)
                ? { ...leaf, status: 'suggested' as const, justification: result.justification }
                : leaf
            ),
          })),
        };
      });
    } catch (err) {
      console.error('Failed to analyze URL:', err);
      setAnalyzeError(err instanceof Error ? err.message : 'Failed to analyze URL');
    } finally {
      setIsAnalyzing(false);
    }
  }, [tree]);

  // ── Confirm suggestion ───────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!pendingSuggestion || !tree) return;

    const { result, url, matchedLabels } = pendingSuggestion;

    // Mark nodes as completed
    setTree(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(branch => ({
          ...branch,
          children: branch.children.map(leaf =>
            result.matchedNodeIds.includes(leaf.id)
              ? { ...leaf, status: 'completed' as const }
              : leaf
          ),
        })),
      };
    });

    // Add to sources
    setSources(prev => [
      {
        url,
        matchedNodeIds: result.matchedNodeIds,
        matchedLabels,
        justification: result.justification,
        timestamp: Date.now(),
      },
      ...prev,
    ]);

    setPendingSuggestion(null);
  }, [pendingSuggestion, tree]);

  // ── Dismiss suggestion ───────────────────────────────────────
  const handleDismiss = useCallback(() => {
    if (!pendingSuggestion) return;

    // Revert suggested nodes back to not_started
    setTree(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(branch => ({
          ...branch,
          children: branch.children.map(leaf =>
            pendingSuggestion.result.matchedNodeIds.includes(leaf.id) && leaf.status === 'suggested'
              ? { ...leaf, status: 'not_started' as const, justification: undefined }
              : leaf
          ),
        })),
      };
    });

    setPendingSuggestion(null);
  }, [pendingSuggestion]);

  // ── Start over ───────────────────────────────────────────────
  const handleStartOver = useCallback(() => {
    setTree(null);
    setSources([]);
    setPendingSuggestion(null);
    setAnalyzeError(null);
  }, []);

  // ── Render ───────────────────────────────────────────────────
  if (!tree) {
    return <LandingScreen onSubmit={handleGenerateTopic} loading={isGenerating} />;
  }

  return (
    <div className={styles.shell}>
      {/* Background effects */}
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleStartOver}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
          </button>
          <div className={styles.headerTitle}>
            <span className={styles.headerIcon}>🧠</span>
            <span className={styles.headerLabel}>Learnograph</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.topicPill}>{tree.topic}</span>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.contentArea}>
          {/* Progress bar */}
          <ProgressBar completed={leafStats.completed} total={leafStats.total} />

          {/* URL input */}
          <div className={styles.urlInputArea}>
            <UrlInput
              onSubmit={handleAnalyzeUrl}
              loading={isAnalyzing}
              error={analyzeError}
            />
          </div>

          {/* Tree visualization */}
          <div className={styles.treeArea}>
            <TreeView tree={tree} suggestedNodeIds={suggestedNodeIds} />
          </div>

          {/* Sources list */}
          <SourcesList sources={sources} />
        </div>
      </main>

      {/* Suggestion overlay */}
      {pendingSuggestion && (
        <SuggestionCard
          matchedLabels={pendingSuggestion.matchedLabels}
          justification={pendingSuggestion.result.justification}
          onConfirm={handleConfirm}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
