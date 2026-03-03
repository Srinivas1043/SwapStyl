'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

type Tab = 'pending' | 'all';
type StatusFilter = 'all' | 'approved' | 'rejected';

interface Item {
  id: string; title: string; images: string[]; brand: string; size: string;
  moderation_status: string; created_at: string;
  owner: { id: string; full_name: string; username: string } | null;
}

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [modalItem, setModalItem] = useState<Item | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadItems(); }, [tab, statusFilter, page]);

  const loadItems = async () => {
    setLoading(true); setError('');
    try {
      let query = supabase.from('items')
        .select('id, title, images, brand, size, moderation_status, created_at, owner:owner_id(id, full_name, username)', { count: 'exact' })
        .is('deleted_at', null);
      if (tab === 'pending') query = query.eq('moderation_status', 'pending_review');
      else if (statusFilter !== 'all') query = query.eq('moderation_status', statusFilter);
      const from = (page - 1) * PAGE_SIZE;
      const { data, count, error: err } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (err) throw err;
      setItems(data as unknown as Item[]);
      setTotal(count || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const getAdminId = async () => { const { data } = await supabase.auth.getUser(); return data.user?.id || ''; };

  const log = async (action: string, itemId: string, reason?: string) => {
    const mid = await getAdminId();
    await supabase.from('moderation_log').insert({ moderator_id: mid, action_type: action, target_type: 'item', target_id: itemId, reason: reason || null });
  };

  const handleAction = async () => {
    if (!modalItem || !modalAction) return;
    setSubmitting(true);
    try {
      if (modalAction === 'delete') {
        await supabase.from('items').update({ deleted_at: new Date().toISOString(), status: 'deleted' }).eq('id', modalItem.id);
        await supabase.from('wishlists').delete().eq('item_id', modalItem.id);
        await supabase.from('swipes').delete().eq('item_id', modalItem.id);
        await log('delete', modalItem.id, reason || 'Admin deletion');
      } else {
        const newStatus = modalAction === 'approve' ? 'approved' : 'rejected';
        const mid = await getAdminId();
        await supabase.from('items').update({ moderation_status: newStatus, reviewed_by: mid, reviewed_at: new Date().toISOString(), ...(reason ? { moderation_reason: reason } : {}) }).eq('id', modalItem.id);
        await log(modalAction, modalItem.id, reason);
      }
      setModalItem(null); setModalAction(null); setReason('');
      loadItems();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const statusColor: Record<string, string> = { approved: '#27ae60', rejected: '#e74c3c', pending_review: '#f39c12' };
  const hasMore = page * PAGE_SIZE < total;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div><h1>Product Moderation</h1><p>Review, approve, reject, or delete listed items</p></div>
        <span className={styles.totalBadge}>{total.toLocaleString()} items</span>
      </div>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <div className={styles.filterBar}>
        <button className={`${styles.filterBtn} ${tab === 'pending' ? styles.active : ''}`} onClick={() => { setTab('pending'); setPage(1); }}>📋 Pending Review</button>
        <button className={`${styles.filterBtn} ${tab === 'all' ? styles.active : ''}`} onClick={() => { setTab('all'); setPage(1); }}>📦 All Items</button>
      </div>
      {tab === 'all' && (
        <div className={styles.subFilter}>
          {(['all', 'approved', 'rejected'] as StatusFilter[]).map(s => (
            <button key={s} className={`${styles.subBtn} ${statusFilter === s ? styles.subActive : ''}`} onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}
      {loading && items.length === 0 ? <div className={styles.loading}>Loading...</div>
        : items.length === 0 ? <div className={styles.empty}><p>✓ No items in this view</p></div>
          : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Image</th><th>Title</th><th>Brand / Size</th><th>Owner</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>{item.images?.[0] ? <img src={item.images[0]} alt={item.title} className={styles.itemThumb} /> : <div className={styles.noImage}>📷</div>}</td>
                        <td><strong>{item.title}</strong></td>
                        <td><span className={styles.meta}>{item.brand} · {item.size}</span></td>
                        <td>{(item.owner as any)?.full_name || '—'}</td>
                        <td><span className={styles.statusBadge} style={{ color: statusColor[item.moderation_status] || '#888' }}>● {item.moderation_status?.replace('_', ' ')}</span></td>
                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className={styles.actions}>
                            {item.moderation_status === 'pending_review' && (
                              <>
                                <button className={styles.approveBtn} onClick={() => { setModalItem(item); setModalAction('approve'); }}>✓</button>
                                <button className={styles.rejectBtn} onClick={() => { setModalItem(item); setModalAction('reject'); }}>✕</button>
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
            <h2>{modalAction === 'approve' ? '✓ Approve' : modalAction === 'reject' ? '✕ Reject' : '🗑 Delete'} Item</h2>
            <div className={styles.itemPreview}>
              {modalItem.images?.[0] && <img src={modalItem.images[0]} alt={modalItem.title} className={styles.previewImg} />}
              <div><p><strong>{modalItem.title}</strong></p><p className={styles.meta}>{modalItem.brand} · {modalItem.size}</p></div>
            </div>
            {(modalAction === 'reject' || modalAction === 'delete') && (
              <textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder={modalAction === 'reject' ? 'Rejection reason (required)' : 'Reason (optional)'}
                className={styles.reasonInput} required={modalAction === 'reject'} />
            )}
            <div className={styles.modalButtons}>
              <button className={styles.cancelBtn} onClick={() => { setModalItem(null); setModalAction(null); setReason(''); }}>Cancel</button>
              <button className={modalAction === 'approve' ? styles.approveConfirmBtn : modalAction === 'reject' ? styles.rejectConfirmBtn : styles.deleteConfirmBtn}
                onClick={handleAction} disabled={submitting || (modalAction === 'reject' && !reason.trim())}>
                {submitting ? '...' : modalAction === 'approve' ? 'Approve' : modalAction === 'reject' ? 'Reject' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
