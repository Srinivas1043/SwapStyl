'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

interface Report {
  id: string;
  reported_type: 'item' | 'user';
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter: { id: string; full_name: string };
  item: { id: string; title: string; images: string[] } | null;
  user: { id: string; full_name: string; avatar_url: string } | null;
}

type StatusFilter = 'open' | 'all';
type TypeFilter = 'all' | 'item' | 'user';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolveAction, setResolveAction] = useState<'resolved' | 'dismissed'>('resolved');
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadReports(); }, [statusFilter, page]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'open'
        ? `/admin/reports?status=open&page=${page}&page_size=20`
        : `/admin/reports?page=${page}&page_size=20`;
      const resp = await apiCall('GET', url);
      setReports(resp.reports || []);
      setHasMore(resp.has_more);
      setTotal(resp.total || 0);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    setSubmitting(true);
    try {
      await apiCall('PATCH', `/admin/reports/${selectedReport.id}`, {
        status: resolveAction,
        action_taken: actionNote || undefined,
      });
      setSelectedReport(null); setActionNote('');
      loadReports();
    } catch { setError('Failed to update report'); }
    finally { setSubmitting(false); }
  };

  const displayed = typeFilter === 'all' ? reports : reports.filter(r => r.reported_type === typeFilter);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>User Reports</h1>
          <p>Review and resolve user-submitted reports</p>
        </div>
        <span className={styles.totalBadge}>{total} reports</span>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.filterRow}>
        <div className={styles.filterBar}>
          <button className={`${styles.filterBtn} ${statusFilter === 'open' ? styles.active : ''}`} onClick={() => { setStatusFilter('open'); setPage(1); }}>
            🔴 Open
          </button>
          <button className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.active : ''}`} onClick={() => { setStatusFilter('all'); setPage(1); }}>
            All Reports
          </button>
        </div>
        <div className={styles.filterBar}>
          {(['all', 'item', 'user'] as TypeFilter[]).map(t => (
            <button key={t} className={`${styles.filterBtn} ${typeFilter === t ? styles.active : ''}`} onClick={() => setTypeFilter(t)}>
              {t === 'all' ? 'All Types' : t === 'item' ? '📦 Items' : '👤 Users'}
            </button>
          ))}
        </div>
      </div>

      {loading && displayed.length === 0 ? (
        <div className={styles.loading}>Loading reports...</div>
      ) : displayed.length === 0 ? (
        <div className={styles.empty}><p>✓ No reports in this view</p></div>
      ) : (
        <>
          <div className={styles.reportsList}>
            {displayed.map(report => (
              <div key={report.id} className={styles.reportCard}>
                <div className={styles.reportHeader}>
                  <div className={styles.reportMeta}>
                    <span className={`${styles.typeBadge} ${report.reported_type === 'item' ? styles.itemType : styles.userType}`}>
                      {report.reported_type === 'item' ? '📦 ITEM' : '👤 USER'}
                    </span>
                    <span className={`${styles.statusBadge} ${styles[report.status]}`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                  <span className={styles.reportDate}>{new Date(report.created_at).toLocaleDateString()}</span>
                </div>

                <div className={styles.reportBody}>
                  {/* Thumbnail for item reports */}
                  {report.reported_type === 'item' && report.item?.images?.[0] && (
                    <img src={report.item.images[0]} alt={report.item.title} className={styles.reportThumb} />
                  )}
                  {report.reported_type === 'user' && report.user?.avatar_url && (
                    <img src={report.user.avatar_url} alt={report.user.full_name} className={styles.reportThumb} />
                  )}
                  <div className={styles.reportDetails}>
                    <p><strong>Target:</strong> {report.reported_type === 'item' ? report.item?.title : report.user?.full_name}</p>
                    <p><strong>Reason:</strong> {report.reason}</p>
                    {report.description && <p className={styles.description}>{report.description}</p>}
                    <p className={styles.reporter}>Reported by {report.reporter?.full_name}</p>
                  </div>
                </div>

                {report.status === 'open' && (
                  <div className={styles.reportActions}>
                    <button className={styles.resolveBtn} onClick={() => { setSelectedReport(report); setResolveAction('resolved'); }}>
                      ✓ Resolve
                    </button>
                    <button className={styles.dismissBtn} onClick={() => { setSelectedReport(report); setResolveAction('dismissed'); }}>
                      ✕ Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.pagination}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}>Next →</button>
          </div>
        </>
      )}

      {selectedReport && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{resolveAction === 'resolved' ? '✓ Resolve Report' : '✕ Dismiss Report'}</h2>
            <div className={styles.reportDetails}>
              <p><strong>Type:</strong> {selectedReport.reported_type}</p>
              <p><strong>Reason:</strong> {selectedReport.reason}</p>
              {selectedReport.description && <p>{selectedReport.description}</p>}
              <p><strong>Reporter:</strong> {selectedReport.reporter?.full_name}</p>
            </div>
            <textarea
              value={actionNote}
              onChange={e => setActionNote(e.target.value)}
              placeholder="Action note (optional)"
              className={styles.actionInput}
            />
            <div className={styles.modalButtons}>
              <button className={styles.cancelBtn} onClick={() => { setSelectedReport(null); setActionNote(''); }}>Cancel</button>
              <button className={resolveAction === 'resolved' ? styles.resolveConfirmBtn : styles.dismissConfirmBtn} onClick={handleResolve} disabled={submitting}>
                {submitting ? 'Processing...' : resolveAction === 'resolved' ? 'Resolve' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
