'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

type Tab = 'pending' | 'all';
type StatusFilter = 'all' | 'approved' | 'rejected';

interface Item {
  id: string;
  title: string;
  images: string[];
  brand: string;
  size: string;
  moderation_status: string;
  owner: { id: string; full_name: string; username: string };
  created_at: string;
}

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [modalItem, setModalItem] = useState<Item | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadItems(); }, [tab, statusFilter, page]);

  const loadItems = async () => {
    setLoading(true); setError('');
    try {
      let resp;
      if (tab === 'pending') {
        resp = await apiCall('GET', `/admin/items/pending?page=${page}&page_size=20`);
      } else {
        const sf = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        resp = await apiCall('GET', `/admin/items?page=${page}&page_size=20${sf}`);
      }
      setItems(resp.items || []);
      setTotal(resp.total || 0);
      setHasMore(resp.has_more);
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!modalItem || !modalAction) return;
    setSubmitting(true);
    try {
      if (modalAction === 'delete') {
        await apiCall('DELETE', `/admin/items/${modalItem.id}?reason=${encodeURIComponent(reason || 'Admin deletion')}`);
      } else {
        await apiCall('POST', `/admin/items/${modalItem.id}/moderate`, { action: modalAction, reason: reason || undefined });
      }
      setModalItem(null); setModalAction(null); setReason('');
      loadItems();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const statusColor: Record<string, string> = {
    approved: '#27ae60', rejected: '#e74c3c', pending_review: '#f39c12',
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Product Moderation</h1>
          <p>Review, approve, reject, or delete listed items</p>
        </div>
        <span className={styles.totalBadge}>{total.toLocaleString()} items</span>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Tabs */}
      <div className={styles.filterBar}>
        <button className={`${styles.filterBtn} ${tab === 'pending' ? styles.active : ''}`} onClick={() => { setTab('pending'); setPage(1); }}>
          📋 Pending Review
        </button>
        <button className={`${styles.filterBtn} ${tab === 'all' ? styles.active : ''}`} onClick={() => { setTab('all'); setPage(1); }}>
          📦 All Items
        </button>
      </div>

      {tab === 'all' && (
        <div className={styles.subFilter}>
          {(['all', 'approved', 'rejected'] as StatusFilter[]).map(s => (
            <button key={s} className={`${styles.subBtn} ${statusFilter === s ? styles.subActive : ''}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className={styles.loading}>Loading items...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}><p>✓ No items in this view</p></div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Brand / Size</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      {item.images?.[0]
                        ? <img src={item.images[0]} alt={item.title} className={styles.itemThumb} />
                        : <div className={styles.noImage}>📷</div>
                      }
                    </td>
                    <td><strong>{item.title}</strong></td>
                    <td><span className={styles.meta}>{item.brand} · {item.size}</span></td>
                    <td>{item.owner?.full_name || '—'}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ color: statusColor[item.moderation_status] || '#888' }}>
                        ● {item.moderation_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actions}>
                        {item.moderation_status === 'pending_review' && (
                          <>
                            <button className={styles.approveBtn} onClick={() => { setModalItem(item); setModalAction('approve'); }}>✓ Approve</button>
                            <button className={styles.rejectBtn} onClick={() => { setModalItem(item); setModalAction('reject'); }}>✕ Reject</button>
                          </>
                        )}
                        <button className={styles.deleteBtn} onClick={() => { setModalItem(item); setModalAction('delete'); }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}>Next →</button>
          </div>
        </>
      )}

      {modalItem && modalAction && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>
              {modalAction === 'approve' ? '✓ Approve Item' : modalAction === 'reject' ? '✕ Reject Item' : '🗑 Delete Item'}
            </h2>
            <div className={styles.itemPreview}>
              {modalItem.images?.[0] && <img src={modalItem.images[0]} alt={modalItem.title} className={styles.previewImg} />}
              <div>
                <p><strong>{modalItem.title}</strong></p>
                <p className={styles.meta}>{modalItem.brand} · {modalItem.size}</p>
                <p>By {modalItem.owner?.full_name}</p>
              </div>
            </div>
            {(modalAction === 'reject' || modalAction === 'delete') && (
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={modalAction === 'reject' ? 'Rejection reason (required)' : 'Deletion reason (optional)'}
                className={styles.reasonInput}
                required={modalAction === 'reject'}
              />
            )}
            <div className={styles.modalButtons}>
              <button className={styles.cancelBtn} onClick={() => { setModalItem(null); setModalAction(null); setReason(''); }}>Cancel</button>
              <button
                className={modalAction === 'approve' ? styles.approveConfirmBtn : modalAction === 'reject' ? styles.rejectConfirmBtn : styles.deleteConfirmBtn}
                onClick={handleAction}
                disabled={submitting || (modalAction === 'reject' && !reason.trim())}
              >
                {submitting ? 'Processing...' : modalAction === 'approve' ? 'Approve' : modalAction === 'reject' ? 'Reject' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
