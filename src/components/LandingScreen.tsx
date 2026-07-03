import { useState } from 'react';
import styles from './LandingScreen.module.css';

interface LandingScreenProps {
  onSubmit: (topic: string) => void;
  loading: boolean;
}

export default function LandingScreen({ onSubmit, loading }: LandingScreenProps) {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (trimmed && !loading) {
      onSubmit(trimmed);
    }
  };

  return (
    <div className={styles.container}>
      {/* Ambient background effects */}
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />
      <div className={styles.bgOrb3} />
      <div className={styles.gridOverlay} />

      <div className={styles.content}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          AI-Powered Learning
        </div>

        <h1 className={styles.title}>
          <span className={styles.titleIcon}>🧠</span>
          Learnograph
        </h1>

        <p className={styles.subtitle}>
          Type any topic. Get a personalized learning roadmap.
          <br />
          Track your progress as you read and learn.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="topic-input"
              type="text"
              className={styles.input}
              placeholder="What do you want to learn? (e.g., Kubernetes, Machine Learning)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              autoFocus
              autoComplete="off"
            />
          </div>

          <button
            id="generate-btn"
            type="submit"
            className={styles.submitBtn}
            disabled={!topic.trim() || loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Generating Roadmap…
              </>
            ) : (
              <>
                Generate Roadmap
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <div className={styles.examples}>
          <span className={styles.examplesLabel}>Try:</span>
          {['React Hooks', 'Machine Learning', 'Public Speaking', 'Kubernetes'].map((ex) => (
            <button
              key={ex}
              className={styles.exampleChip}
              onClick={() => { setTopic(ex); }}
              disabled={loading}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <footer className={styles.footer}>
        <span>Built for EdgeOne Makers Hackathon</span>
        <span className={styles.footerDot}>·</span>
        <span>Powered by AI</span>
      </footer>
    </div>
  );
}
