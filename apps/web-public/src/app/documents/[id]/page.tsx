import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface DocumentMetadata {
  document_id: string;
  source_id: string;
  source_url: string;
  fetch_timestamp: string;
  sha256_hash: string;
  document_type?: string;
  language?: string;
  file_size_bytes?: number;
}

async function getDocumentMetadata(id: string): Promise<DocumentMetadata | null> {
  try {
    const res = await fetch(`${API_URL}/documents/${id}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getDocumentContent(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/documents/${id}/download`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

function formatDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatBytes(bytes?: number) {
  if (bytes == null) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DocumentViewerPage({ params }: PageProps) {
  const { id } = await params;
  const [meta, content] = await Promise.all([
    getDocumentMetadata(id),
    getDocumentContent(id),
  ]);

  if (!meta) {
    notFound();
  }

  const docTitle = meta.document_type
    ? meta.document_type.replace(/_/g, ' ').toUpperCase()
    : 'PROCUREMENT DOCUMENT';

  return (
    <div>
      <main className={styles.pageContent}>
        {/* Back navigation */}
        <Link href="/cases" className={`${styles.backLink} font-ui`}>
          &larr; Back to Cases
        </Link>

        {/* Page Head */}
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Document Viewer</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Veritas Cryptographic & Text Provenance Records
          </p>
        </div>

        {/* Metadata Grid */}
        <div className={styles.metaGrid}>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>Document Type</div>
            <div className={`${styles.metaValue} font-body`}>{docTitle}</div>
          </div>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>Date Fetched</div>
            <div className={`${styles.metaValue} font-mono`}>
              {formatDate(meta.fetch_timestamp)}
            </div>
          </div>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>SHA-256 Checksum</div>
            <div className={`${styles.metaValue} font-mono`} title={meta.sha256_hash}>
              {meta.sha256_hash}
            </div>
          </div>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>Original Source URL</div>
            <div className={`${styles.metaValue} font-mono`}>
              <a
                href={meta.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.metaValueLink}
              >
                Open External Portal &nearr;
              </a>
            </div>
          </div>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>File Size</div>
            <div className={`${styles.metaValue} font-mono`}>
              {formatBytes(meta.file_size_bytes)}
            </div>
          </div>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>Language</div>
            <div className={`${styles.metaValue} font-body`} style={{ textTransform: 'uppercase' }}>
              {meta.language ?? 'en'}
            </div>
          </div>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>Factual Proof (Verified Version)</div>
            <div className={`${styles.metaValue} font-mono`}>
              <a
                href={`/api/documents/${id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.metaValueLink}
                style={{ color: 'var(--color-confirm)', fontWeight: 600 }}
              >
                View Original Ingested Page (PDF/HTML) &nearr;
              </a>
            </div>
          </div>
        </div>

        {/* Text Reader */}
        <div className={styles.viewerContainer}>
          <div className={styles.viewerHeader}>
            <span className={`${styles.viewerTitle} font-ui`}>Document Content Plaintext</span>
          </div>
          {content ? (
            <pre className={`${styles.viewerBody} font-mono`}>{content}</pre>
          ) : (
            <div className={`${styles.emptyState} font-body`}>
              No textual content extracted yet for this notice. Text content is gathered once the detail downloader cycle runs.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
