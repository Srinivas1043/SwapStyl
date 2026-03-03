'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface DeactivatedUser {
    id: string; full_name: string; username: string; avatar_url: string;
    deactivated_at: string; created_at: string;
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
            const { data, error: err } = await supabase.from('profiles')
                .select('id, full_name, username, avatar_url, deactivated_at, created_at')
                .not('deactivated_at', 'is', null)
                .is('deleted_at', null)
                .order('deactivated_at', { ascending: false });
            if (err) throw err;
            setUsers(data as DeactivatedUser[]);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const log = async (action: string, userId: string) => {
        const { data } = await supabase.auth.getUser();
        await supabase.from('moderation_log').insert({ moderator_id: data.user?.id, action_type: action, target_type: 'user', target_id: userId });
    };

    const restore = async (userId: string) => {
        setSubmitting(userId);
        try {
            await supabase.from('profiles').update({ deactivated_at: null }).eq('id', userId);
            await log('account_restored', userId);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSubmitting(null); }
    };

    const deletePermanently = async (userId: string) => {
        if (!confirm('⚠️ Permanently delete this account? This cannot be undone.')) return;
        setSubmitting(userId);
        try {
            await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', userId);
            await log('account_deleted', userId);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSubmitting(null); }
    };

    const daysRemaining = (deactivatedAt: string) => {
        const deactivated = new Date(deactivatedAt);
        const deleteOn = new Date(deactivated.getTime() + 14 * 86400000);
        return Math.max(0, Math.ceil((deleteOn.getTime() - Date.now()) / 86400000));
    };
    const urgencyColor = (days: number) => days <= 2 ? '#e74c3c' : days <= 5 ? '#f39c12' : '#27ae60';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div><h1>Deactivated Accounts</h1><p>Accounts pending permanent deletion (14-day window)</p></div>
                <span className={styles.totalBadge}>{users.length} pending</span>
            </div>
            {error && <div className={styles.errorBanner}>{error}</div>}
            <div className={styles.infoBox}>ℹ️ Accounts are permanently deleted after 14 days. You can restore them before the deadline.</div>
            {loading ? <div className={styles.loading}>Loading...</div>
                : users.length === 0 ? <div className={styles.empty}><p>✓ No accounts pending deletion</p></div>
                    : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead><tr><th>User</th><th>Deactivated On</th><th>Joined</th><th>Days Remaining</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {users.map(user => {
                                        const days = daysRemaining(user.deactivated_at);
                                        return (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className={styles.userCell}>
                                                        {user.avatar_url ? <img src={user.avatar_url} alt="" className={styles.avatar} /> : <div className={styles.avatarFallback}>{(user.full_name || '?')[0]}</div>}
                                                        <div>
                                                            <div className={styles.userName}>{user.full_name || '—'}</div>
                                                            {user.username && <div className={styles.userHandle}>@{user.username}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{new Date(user.deactivated_at).toLocaleDateString()}</td>
                                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={styles.daysChip} style={{ background: urgencyColor(days) + '22', color: urgencyColor(days) }}>
                                                        {days === 0 ? '🔴 Due today' : `${days}d left`}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.actions}>
                                                        <button className={styles.restoreBtn} onClick={() => restore(user.id)} disabled={submitting === user.id}>{submitting === user.id ? '...' : '↩ Restore'}</button>
                                                        <button className={styles.deleteBtn} onClick={() => deletePermanently(user.id)} disabled={submitting === user.id}>🗑 Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
        </div>
    );
}
