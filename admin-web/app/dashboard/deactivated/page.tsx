'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

interface DeactivatedUser {
    id: string; full_name: string; username: string;
    avatar_url: string; deactivated_at: string; created_at: string; days_remaining: number;
}

export default function DeactivatedPage() {
    const [users, setUsers] = useState<DeactivatedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const resp = await apiCall('GET', '/admin/users/deactivated');
            setUsers(resp.users || []);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const restore = async (userId: string) => {
        setSubmitting(userId);
        try {
            await apiCall('POST', `/admin/users/${userId}/restore`);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSubmitting(null); }
    };

    const deletePermanently = async (userId: string) => {
        if (!confirm('⚠️ Permanently delete this account? This cannot be undone.')) return;
        setSubmitting(userId);
        try {
            await apiCall('DELETE', `/admin/users/${userId}/delete-permanently`);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSubmitting(null); }
    };

    const urgencyColor = (days: number) => {
        if (days <= 2) return '#e74c3c';
        if (days <= 5) return '#f39c12';
        return '#27ae60';
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>Deactivated Accounts</h1>
                    <p>Accounts pending permanent deletion (14-day window)</p>
                </div>
                <span className={styles.totalBadge}>{users.length} pending</span>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.infoBox}>
                ℹ️ Accounts are permanently deleted after 14 days. You can restore them before that deadline.
            </div>

            {loading ? (
                <div className={styles.loading}>Loading deactivated accounts...</div>
            ) : users.length === 0 ? (
                <div className={styles.empty}>
                    <p>✓ No accounts pending deletion</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Deactivated On</th>
                                <th>Joined</th>
                                <th>Days Remaining</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userCell}>
                                            {user.avatar_url
                                                ? <img src={user.avatar_url} alt={user.full_name} className={styles.avatar} />
                                                : <div className={styles.avatarFallback}>{(user.full_name || '?')[0]}</div>
                                            }
                                            <div>
                                                <div className={styles.userName}>{user.full_name || '—'}</div>
                                                {user.username && <div className={styles.userHandle}>@{user.username}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{new Date(user.deactivated_at).toLocaleDateString()}</td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <span className={styles.daysChip} style={{ background: urgencyColor(user.days_remaining) + '22', color: urgencyColor(user.days_remaining) }}>
                                            {user.days_remaining === 0 ? '🔴 Due today' : `${user.days_remaining}d left`}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <button className={styles.restoreBtn} onClick={() => restore(user.id)} disabled={submitting === user.id}>
                                                {submitting === user.id ? '...' : '↩ Restore'}
                                            </button>
                                            <button className={styles.deleteBtn} onClick={() => deletePermanently(user.id)} disabled={submitting === user.id}>
                                                🗑 Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
