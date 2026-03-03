'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Cookies from 'js-cookie';
import styles from './page.module.css';

interface User {
  id: string; full_name: string; email: string; username: string;
  avatar_url: string; role: string; is_verified: boolean;
  suspended_at: string | null; suspension_reason: string | null; created_at: string;
}
type Filter = 'all' | 'suspended' | 'verified';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalType, setModalType] = useState<'suspend' | 'unsuspend' | 'role' | null>(null);
  const [reason, setReason] = useState('');
  const [newRole, setNewRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get admin user id from cookie
  const getAdminId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || '';
  };

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let query = supabase.from('profiles')
        .select('id, full_name, username, avatar_url, role, is_verified, suspended_at, suspension_reason, created_at', { count: 'exact' });
      if (filter === 'suspended') query = query.not('suspended_at', 'is', null);
      if (filter === 'verified') query = query.eq('is_verified', true);
      const from = (page - 1) * PAGE_SIZE;
      const { data, count, error: err } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (err) throw err;
      // Merge emails from auth via Supabase admin — not available on anon key, so skip
      setUsers((data || []) as User[]);
      setTotal(count || 0);
    } catch (e: any) { setError(e.message || 'Failed to load users'); }
    finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      const q = search.toLowerCase();
      const { data } = await supabase.from('profiles')
        .select('id, full_name, username, avatar_url, role, is_verified, suspended_at, created_at')
        .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(30);
      setSearchResults((data || []) as User[]);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const logAction = async (actionType: string, targetId: string, reason?: string) => {
    const adminId = await getAdminId();
    await supabase.from('moderation_log').insert({
      moderator_id: adminId, action_type: actionType, target_type: 'user',
      target_id: targetId, reason: reason || null,
    });
  };

  const handleAction = async () => {
    if (!selectedUser || !modalType) return;
    setSubmitting(true); setError('');
    try {
      if (modalType === 'suspend') {
        await supabase.from('profiles').update({ suspended_at: new Date().toISOString(), suspension_reason: reason || 'No reason provided' }).eq('id', selectedUser.id);
        await logAction('user_suspended', selectedUser.id, reason);
      } else if (modalType === 'unsuspend') {
        await supabase.from('profiles').update({ suspended_at: null, suspension_reason: null }).eq('id', selectedUser.id);
        await logAction('user_restored', selectedUser.id);
      } else if (modalType === 'role') {
        await supabase.from('profiles').update({ role: newRole }).eq('id', selectedUser.id);
        await logAction('user_role_changed', selectedUser.id, `Role set to: ${newRole}`);
      }
      setSelectedUser(null); setModalType(null); setReason(''); setNewRole('');
      loadUsers();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const displayUsers = searchResults !== null ? searchResults : users;
  const hasMore = page * PAGE_SIZE < total;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div><h1>User Management</h1><p>Manage users, roles, verifications, and suspensions</p></div>
        <span className={styles.totalBadge}>{total.toLocaleString()} users</span>
      </div>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <div className={styles.searchBar}>
        <input type="text" placeholder="🔍  Search by name or username..." value={search}
          onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
        {search && <button onClick={() => { setSearch(''); setSearchResults(null); }} className={styles.clearBtn}>✕</button>}
      </div>
      <div className={styles.filterBar}>
        {(['all', 'suspended', 'verified'] as Filter[]).map(f => (
          <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => { setFilter(f); setPage(1); setSearchResults(null); setSearch(''); }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading && displayUsers.length === 0 ? <div className={styles.loading}>Loading users...</div>
        : displayUsers.length === 0 ? <div className={styles.empty}><p>No users found</p></div>
          : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>User</th><th>Role</th><th>Verified</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {displayUsers.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className={styles.userCell}>
                            {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className={styles.avatar} />
                              : <div className={styles.avatarFallback}>{(user.full_name || '?')[0].toUpperCase()}</div>}
                            <div>
                              <span className={styles.userName}>{user.full_name || '—'}</span>
                              {user.username && <span className={styles.userHandle}>@{user.username}</span>}
                            </div>
                          </div>
                        </td>
                        <td><span className={`${styles.roleBadge} ${styles[user.role || 'user']}`}>{user.role || 'user'}</span></td>
                        <td>{user.is_verified ? <span className={styles.verifiedBadge}>✓ Verified</span> : <span className={styles.unverifiedBadge}>—</span>}</td>
                        <td>{user.suspended_at ? <span className={styles.suspendedStatus}>🔒 Suspended</span> : <span className={styles.activeStatus}>● Active</span>}</td>
                        <td className={styles.date}>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className={styles.actions}>
                            <button className={user.suspended_at ? styles.restoreBtn : styles.suspendBtn}
                              onClick={() => { setSelectedUser(user); setModalType(user.suspended_at ? 'unsuspend' : 'suspend'); }}>
                              {user.suspended_at ? 'Restore' : 'Suspend'}
                            </button>
                            <button className={styles.roleBtn} onClick={() => { setSelectedUser(user); setModalType('role'); setNewRole(user.role || 'user'); }}>Role</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {searchResults === null && (
                <div className={styles.pagination}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                  <span>Page {page} of {Math.ceil(total / PAGE_SIZE) || 1}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}>Next →</button>
                </div>
              )}
            </>
          )}
      {selectedUser && modalType && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{modalType === 'suspend' ? '🔒 Suspend' : modalType === 'unsuspend' ? '🔓 Restore' : '🎖 Change Role'}</h2>
            <div className={styles.userPreview}>
              {selectedUser.avatar_url && <img src={selectedUser.avatar_url} alt="" className={styles.avatar} />}
              <div><p><strong>{selectedUser.full_name}</strong></p></div>
            </div>
            {modalType === 'suspend' && <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Suspension reason..." className={styles.reasonInput} />}
            {modalType === 'role' && (
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className={styles.roleSelect}>
                <option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
              </select>
            )}
            {error && <p className={styles.modalError}>{error}</p>}
            <div className={styles.modalButtons}>
              <button className={styles.cancelBtn} onClick={() => { setSelectedUser(null); setModalType(null); setError(''); }}>Cancel</button>
              <button className={modalType === 'suspend' ? styles.suspendConfirmBtn : styles.restoreConfirmBtn} onClick={handleAction} disabled={submitting}>
                {submitting ? 'Processing...' : modalType === 'role' ? 'Save Role' : modalType === 'suspend' ? 'Suspend' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
