'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  suspended_at: string | null;
  suspension_reason: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'all' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [action, setAction] = useState<'suspend' | 'unsuspend' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filter, page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const url = filter === 'suspended' 
        ? `/admin/users?suspended_only=true&page=${page}&page_size=20`
        : `/admin/users?page=${page}&page_size=20`;
      const resp = await apiCall('GET', url);
      setUsers(resp.users || []);
      setHasMore(resp.has_more);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to load users. Please try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async () => {
    if (!selectedUser || !action) return;
    try {
      setSubmitting(true);
      setError('');
      if (action === 'suspend') {
        await apiCall('POST', `/admin/users/${selectedUser.id}/suspend`, {
          reason: reason || 'No reason provided',
        });
      } else {
        await apiCall('POST', `/admin/users/${selectedUser.id}/unsuspend`);
      }
      setSelectedUser(null);
      setAction(null);
      setReason('');
      loadUsers();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} user`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && users.length === 0) {
    return <div className={styles.loading}>Loading users...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>User Management</h1>
        <p>Manage users, view profiles, and handle suspensions</p>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.filterBar}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => {
            setFilter('all');
            setPage(1);
          }}
        >
          All Users
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'suspended' ? styles.active : ''}`}
          onClick={() => {
            setFilter('suspended');
            setPage(1);
          }}
        >
          Suspended ({users.filter(u => u.suspended_at).length})
        </button>
      </div>

      {users.length === 0 ? (
        <div className={styles.empty}>
          <p>No users found</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Since</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userCell}>
                        {user.avatar_url && (
                          <img src={user.avatar_url} alt={user.full_name} />
                        )}
                        <span>{user.full_name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {user.suspended_at ? (
                        <span className={styles.suspendedStatus}>🔒 Suspended</span>
                      ) : (
                        <span className={styles.activeStatus}>✓ Active</span>
                      )}
                    </td>
                    <td>
                      {user.suspended_at 
                        ? new Date(user.suspended_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td>
                      <button
                        className={user.suspended_at ? styles.restoreBtn : styles.suspendBtn}
                        onClick={() => {
                          setSelectedUser(user);
                          setAction(user.suspended_at ? 'unsuspend' : 'suspend');
                        }}
                      >
                        {user.suspended_at ? 'Restore' : 'Suspend'}
                      </button>
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

      {selectedUser && action && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{action === 'suspend' ? 'Suspend User' : 'Restore User'}</h2>
            <div className={styles.userPreview}>
              {selectedUser.avatar_url && (
                <img src={selectedUser.avatar_url} alt={selectedUser.full_name} />
              )}
              <div>
                <p><strong>{selectedUser.full_name}</strong></p>
                <p>{selectedUser.email}</p>
              </div>
            </div>

            {action === 'suspend' && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Suspension reason"
                className={styles.reasonInput}
              />
            )}

            <div className={styles.modalButtons}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setSelectedUser(null);
                  setAction(null);
                  setReason('');
                }}
              >
                Cancel
              </button>
              <button
                className={action === 'suspend' ? styles.suspendConfirmBtn : styles.restoreConfirmBtn}
                onClick={handleUserAction}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : action === 'suspend' ? 'Suspend' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
