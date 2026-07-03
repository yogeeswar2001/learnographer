import { useState } from 'react';
import styles from './UrlInput.module.css';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
  error?: string | null;
}

export default function UrlInput({ onSubmit, loading, error }: UrlInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed && !loading) {
      onSubmit(trimmed);
      setUrl('');
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrapper}>
          <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <input
            id="url-input"
            type="url"
            className={styles.input}
            placeholder="Paste a link you just read…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            autoComplete="off"
          />
          <button
            id="analyze-btn"
            type="submit"
            className={styles.submitBtn}
            disabled={!url.trim() || loading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            )}
          </button>
        </div>
      </form>
      {loading && (
        <div className={styles.loadingMsg}>
          <span className={styles.loadingDot} />
          Fetching and analyzing article…
        </div>
      )}
      {error && (
        <div className={styles.error}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m15 9-6 6"/>
            <path d="m9 9 6 6"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
