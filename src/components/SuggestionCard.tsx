import styles from './SuggestionCard.module.css';

interface SuggestionCardProps {
  matchedLabels: string[];
  justification: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function SuggestionCard({
  matchedLabels,
  justification,
  onConfirm,
  onDismiss,
}: SuggestionCardProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4"/>
              <path d="m6.34 7.34 2.83 2.83"/>
              <path d="M2 12h4"/>
              <path d="m17.66 7.34-2.83 2.83"/>
              <path d="M22 12h-4"/>
              <circle cx="12" cy="12" r="4"/>
            </svg>
          </div>
          <div>
            <h3 className={styles.title}>AI Suggestion</h3>
            <p className={styles.subtitle}>The article you read covers these topics:</p>
          </div>
        </div>

        <div className={styles.matchedList}>
          {matchedLabels.map((label, i) => (
            <span key={i} className={styles.matchedChip}>
              <span className={styles.chipDot} />
              {label}
            </span>
          ))}
        </div>

        <p className={styles.justification}>
          <em>"{justification}"</em>
        </p>

        <div className={styles.actions}>
          <button
            id="confirm-suggestion-btn"
            className={styles.confirmBtn}
            onClick={onConfirm}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Confirm
          </button>
          <button
            id="dismiss-suggestion-btn"
            className={styles.dismissBtn}
            onClick={onDismiss}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
