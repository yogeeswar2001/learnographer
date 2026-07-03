import type { SourceEntry } from '../types';
import styles from './SourcesList.module.css';

interface SourcesListProps {
  sources: SourceEntry[];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        Sources Read ({sources.length})
      </h3>

      <div className={styles.list}>
        {sources.map((source, i) => (
          <div key={i} className={styles.item} style={{ animationDelay: `${i * 60}ms` }}>
            <img
              className={styles.favicon}
              src={`https://www.google.com/s2/favicons?domain=${getDomain(source.url)}&sz=32`}
              alt=""
              width={16}
              height={16}
            />
            <div className={styles.info}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.url}
              >
                {getDomain(source.url)}
              </a>
              <div className={styles.chips}>
                {source.matchedLabels.map((label, j) => (
                  <span key={j} className={styles.chip}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
