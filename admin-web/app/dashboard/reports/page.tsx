'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

interface Report {
  id: string;
  reported_type: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { id: string; full_name: string };
  item: { id: string; title: string } | null;
  user: { id: string; full_name: string } | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [action, setAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
  }, [filter, page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const url = filter === 'open' 
        ? `/admin/reports?status=open&page=${page}&page_size=20`
        : `/admin/reports?page=${page}&page_size=20`;
      const resp = await apiCall('GET', url);
      setReports(resp.reports || []);
      setHasMore(resp.has_more);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    try {
      setSubmitting(true);
      await apiCall('PATCH', `/admin/reports/${selectedReport.id}`, {
        status: action ? 'resolved' : 'dismissed',
        action_taken: action || undefined,
      });
      setSelectedReport(null);
      setAction('');
      loadReports();
    } catch (err) {
      alert('Failed to resolve report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && reports.length === 0) {
    return <div className={styles.loading}>Loading reports...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>User Reports</h1>
        <p>Review and resolve user-submitted reports</p>
      </div>

      <div className={styles.filterBar}>
        <button
          className={`${styles.filterBtn} ${filter === 'open' ? styles.active : ''}`}
          onClick={() => {
            setFilter('open');
            setPage(1);
          }}
        >
          Open ({reports.filter(r => r.status === 'open').length})
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => {
            setFilter('all');
            setPage(1);
          }}
        >
          All
        </button>
      </div>

      {reports.length === 0 ? (
        <div className={styles.empty}>
          <p>✓ No reports - community is thriving!</p>
        </div>
      ) : (
        <>
          <div className={styles.reportsList}>
            {reports.map((report) => (
              <div key={report.id} className={styles.reportCard}>
                <div className={styles.reportHeader}>
                  <span className={`${styles.type} ${report.reported_type}`}>
                    {report.reported_type === 'item' ? '📦 ITEM' : '👤 USER'}
                  </span>
                  <span className={`${styles.status} ${report.status}`}>
                    {report.status.toUpperCase()}
                  </span>
                </div>
                <p className={styles.reason}>
                  <strong>Reason:</strong> {report.reason}
                </p>
                <p className={styles.target}>
                  <strong>Target:</strong> {report.reported_type === 'item' 
                    ? report.item?.title 
                    : `@${report.user?.full_name}`}
                </p>
                <div className={styles.reportMeta}>
                  <span>By {report.reporter.full_name}</span>
                  <span>{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
                {report.status === 'open' && (
                  <button
                    className={styles.resolveBtn}
                    onClick={() => setSelectedReport(report)}
                  >
                    Review
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.pagination}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              ← Previous
            </button>
            <span>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}>
              Next →
            </button>
          </div>
        </>
      )}

      {selectedReport && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Resolve Report</h2>
            <div className={styles.reportDetails}>
              <p><strong>Type:</strong> {selectedReport.reported_type}</p>
              <p><strong>Reason:</strong> {selectedReport.reason}</p>
              <p><strong>Reporter:</strong> {selectedReport.reporter.full_name}</p>
              {selectedReport.reported_type === 'item' && (
                <p><strong>Item:</strong> {selectedReport.item?.title}</p>
              )}
              {selectedReport.reported_type === 'user' && (
                <p><strong>User:</strong> {selectedReport.user?.full_name}</p>
              )}
            </div>
            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Action taken (optional)"
              className={styles.actionInput}
            />
            <div className={styles.modalButtons}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setSelectedReport(null);
                  setAction('');
                }}
              >
                Cancel
              </button>
              <button
                className={styles.resolveConfirmBtn}
                onClick={handleResolve}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
