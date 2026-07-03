import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.label}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Overall Progress</span>
        </div>
        <div className={styles.stats}>
          <span className={styles.fraction}>
            <strong>{completed}</strong> / {total} topics mastered
          </span>
          <span className={styles.pct}>{pct}%</span>
        </div>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%` }}
        />
        {pct > 0 && pct < 100 && (
          <div className={styles.glowDot} style={{ left: `${pct}%` }} />
        )}
      </div>
      {pct === 100 && (
        <div className={styles.complete}>
          🎉 Congratulations! You've mastered all topics!
        </div>
      )}
    </div>
  );
}
