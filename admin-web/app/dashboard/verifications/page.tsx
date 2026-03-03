'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

interface VerifiedUser {
    id: string; full_name: string; username: string;
    avatar_url: string; email: string; verified_at: string; created_at: string;
}
interface UnverifiedUser {
    id: string; full_name: string; username: string;
    avatar_url: string; email: string; created_at: string;
}

export default function VerificationsPage() {
    const [verified, setVerified] = useState<VerifiedUser[]>([]);
    const [unverified, setUnverified] = useState<UnverifiedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'verified' | 'unverified'>('verified');
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const resp = await apiCall('GET', '/admin/verifications');
            setVerified(resp.verified || []);
            setUnverified(resp.unverified || []);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const grant = async (userId: string) => {
        setSubmitting(userId);
        try {
            await apiCall('POST', `/admin/verifications/${userId}/grant`);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSubmitting(null); }
    };

    const revoke = async (userId: string) => {
        if (!confirm('Revoke verification badge from this user?')) return;
        setSubmitting(userId);
        try {
            await apiCall('POST', `/admin/verifications/${userId}/revoke`);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSubmitting(null); }
    };

    const filteredVerified = verified.filter(u =>
        !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    );
    const filteredUnverified = unverified.filter(u =>
        !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>Verification Management</h1>
                    <p>Grant or revoke the verified badge from users</p>
                </div>
                <div className={styles.headerStats}>
                    <span className={styles.statChip} style={{ background: '#EAF6E9', color: '#27ae60' }}>✓ {verified.length} verified</span>
                    <span className={styles.statChip} style={{ background: '#FFF3CD', color: '#856404' }}>⏳ {unverified.length} unverified</span>
                </div>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.searchBar}>
                <input type="text" placeholder="🔍  Search by name or email..." value={search}
                    onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
                {search && <button onClick={() => setSearch('')} className={styles.clearBtn}>✕</button>}
            </div>

            <div className={styles.filterBar}>
                <button className={`${styles.filterBtn} ${tab === 'verified' ? styles.active : ''}`} onClick={() => setTab('verified')}>
                    ✓ Verified ({verified.length})
                </button>
                <button className={`${styles.filterBtn} ${tab === 'unverified' ? styles.active : ''}`} onClick={() => setTab('unverified')}>
                    ⏳ Unverified ({unverified.length})
                </button>
            </div>

            {loading ? <div className={styles.loading}>Loading...</div> : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>{tab === 'verified' ? 'Verified At' : 'Joined'}</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(tab === 'verified' ? filteredVerified : filteredUnverified).map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userCell}>
                                            {user.avatar_url
                                                ? <img src={user.avatar_url} alt={user.full_name} className={styles.avatar} />
                                                : <div className={styles.avatarFallback}>{(user.full_name || '?')[0]}</div>
                                            }
                                            <div>
                                                <div className={styles.userName}>
                                                    {user.full_name}
                                                    {tab === 'verified' && <span className={styles.verifiedBadge}> ✓</span>}
                                                </div>
                                                {user.username && <div className={styles.userHandle}>@{user.username}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className={styles.email}>{user.email || '—'}</td>
                                    <td>{new Date(tab === 'verified' ? (user as VerifiedUser).verified_at || user.created_at : user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {tab === 'verified' ? (
                                            <button
                                                className={styles.revokeBtn}
                                                onClick={() => revoke(user.id)}
                                                disabled={submitting === user.id}
                                            >
                                                {submitting === user.id ? '...' : '✗ Revoke'}
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.grantBtn}
                                                onClick={() => grant(user.id)}
                                                disabled={submitting === user.id}
                                            >
                                                {submitting === user.id ? '...' : '✓ Grant Badge'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(tab === 'verified' ? filteredVerified : filteredUnverified).length === 0 && (
                        <div className={styles.empty}><p>No users in this view</p></div>
                    )}
                </div>
            )}
        </div>
    );
}
