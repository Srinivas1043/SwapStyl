'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

interface Item {
  id: string;
  title: string;
  images: string[];
  brand: string;
  size: string;
  owner: { id: string; full_name: string };
  created_at: string;
}

export default function ProductsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [modalItem, setModalItem] = useState<Item | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, [page]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const resp = await apiCall('GET', `/admin/items/pending?page=${page}&page_size=20`);
      setItems(resp.items || []);
      setHasMore(resp.has_more);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async () => {
    if (!modalItem || !modalAction) return;
    try {
      setSubmitting(true);
      await apiCall('POST', `/admin/items/${modalItem.id}/moderate`, {
        action: modalAction,
        reason: reason || undefined,
      });
      setModalItem(null);
      setModalAction(null);
      setReason('');
      loadItems();
    } catch (err) {
      alert('Failed to moderate item');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && items.length === 0) {
    return <div className={styles.loading}>Loading pending items...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Product Review</h1>
        <p>Approve or reject items pending manual review</p>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p>✓ No pending items - all products are approved!</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Brand</th>
                  <th>Owner</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.images?.[0] && (
                        <div className={styles.imageCell}>
                          <img src={item.images[0]} alt={item.title} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles.titleCell}>
                        <strong>{item.title}</strong>
                        <span className={styles.size}>{item.size}</span>
                      </div>
                    </td>
                    <td>{item.brand}</td>
                    <td>{item.owner.full_name}</td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.approveBtn}
                          onClick={() => {
                            setModalItem(item);
                            setModalAction('approve');
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => {
                            setModalItem(item);
                            setModalAction('reject');
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {modalItem && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{modalAction === 'reject' ? 'Reject Item' : 'Approve Item'}</h2>
            <div className={styles.itemPreview}>
              {modalItem.images?.[0] && (
                <img src={modalItem.images[0]} alt={modalItem.title} />
              )}
              <div>
                <p><strong>{modalItem.title}</strong></p>
                <p>{modalItem.brand} • {modalItem.size}</p>
                <p>By {modalItem.owner.full_name}</p>
              </div>
            </div>

            {modalAction === 'reject' && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Rejection reason (required for rejections)"
                className={styles.reasonInput}
                required
              />
            )}

            <div className={styles.modalButtons}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setModalItem(null);
                  setModalAction(null);
                  setReason('');
                }}
              >
                Cancel
              </button>
              <button
                className={modalAction === 'reject' ? styles.rejectConfirmBtn : styles.approveConfirmBtn}
                onClick={handleModerate}
                disabled={submitting || (modalAction === 'reject' && !reason.trim())}
              >
                {submitting ? 'Processing...' : modalAction === 'reject' ? 'Reject' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
