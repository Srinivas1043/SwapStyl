'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface Profile {
    id: string; full_name: string; username: string; avatar_url: string; email?: string; created_at: string; verified_at?: string;
}

export default function VerificationsPage() {
    const [verified, setVerified] = useState<Profile[]>([]);
    const [unverified, setUnverified] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'verified' | 'unverified'>('verified');
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [v, u] = await Promise.all([
                supabase.from('profiles').select('id, full_name, username, avatar_url, created_at, verified_at').eq('is_verified', true).order('verified_at', { ascending: false }),
                supabase.from('profiles').select('id, full_name, username, avatar_url, created_at').eq('is_verified', false).is('deactivated_at', null).order('created_at', { ascending: false }).limit(50),
            ]);
            setVerified((v.data || []) as Profile[]);
            setUnverified((u.data || []) as Profile[]);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const log = async (action: string, userId: string) => {
        const { data } = await supabase.auth.getUser();
        await supabase.from('moderation_log').insert({ moderator_id: data.user?.id, action_type: action, target_type: 'user', target_id: userId });
    };

    const grant = async (userId: string) => {
        setSubmitting(userId);
        try {
            await supabase.from('profiles').update({ is_verified: true, verified_at: new Date().toISOString() }).eq('id', userId);
            await log('verification_granted', userId);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSubmitting(null); }
    };

    const revoke = async (userId: string) => {
        if (!confirm('Revoke verification badge?')) return;
        setSubmitting(userId);
        try {
            await supabase.from('profiles').update({ is_verified: false, verified_at: null }).eq('id', userId);
            await log('verification_revoked', userId);
            await load();
        } catch (e: any) { setError(e.message); }
        finally { setSubmitting(null); }
    };

    const q = search.toLowerCase();
    const filteredV = verified.filter(u => !q || u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));
    const filteredU = unverified.filter(u => !q || u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div><h1>Verification Management</h1><p>Grant or revoke verified badges</p></div>
                <div className={styles.headerStats}>
                    <span className={styles.statChip} style={{ background: '#EAF6E9', color: '#27ae60' }}>✓ {verified.length} verified</span>
                    <span className={styles.statChip} style={{ background: '#FFF3CD', color: '#856404' }}>⏳ {unverified.length} unverified</span>
                </div>
            </div>
            {error && <div className={styles.errorBanner}>{error}</div>}
            <div className={styles.searchBar}>
                <input type="text" placeholder="🔍  Search..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
                {search && <button onClick={() => setSearch('')} className={styles.clearBtn}>✕</button>}
            </div>
            <div className={styles.filterBar}>
                <button className={`${styles.filterBtn} ${tab === 'verified' ? styles.active : ''}`} onClick={() => setTab('verified')}>✓ Verified ({verified.length})</button>
                <button className={`${styles.filterBtn} ${tab === 'unverified' ? styles.active : ''}`} onClick={() => setTab('unverified')}>⏳ Unverified ({unverified.length})</button>
            </div>
            {loading ? <div className={styles.loading}>Loading...</div> : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead><tr><th>User</th><th>{tab === 'verified' ? 'Verified At' : 'Joined'}</th><th>Action</th></tr></thead>
                        <tbody>
                            {(tab === 'verified' ? filteredV : filteredU).map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userCell}>
                                            {user.avatar_url ? <img src={user.avatar_url} alt="" className={styles.avatar} /> : <div className={styles.avatarFallback}>{(user.full_name || '?')[0]}</div>}
                                            <div>
                                                <div className={styles.userName}>{user.full_name}{tab === 'verified' && <span className={styles.verifiedBadge}> ✓</span>}</div>
                                                {user.username && <div className={styles.userHandle}>@{user.username}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{new Date(tab === 'verified' ? (user.verified_at || user.created_at) : user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {tab === 'verified'
                                            ? <button className={styles.revokeBtn} onClick={() => revoke(user.id)} disabled={submitting === user.id}>{submitting === user.id ? '...' : '✗ Revoke'}</button>
                                            : <button className={styles.grantBtn} onClick={() => grant(user.id)} disabled={submitting === user.id}>{submitting === user.id ? '...' : '✓ Grant Badge'}</button>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(tab === 'verified' ? filteredV : filteredU).length === 0 && <div className={styles.empty}><p>No users in this view</p></div>}
                </div>
            )}
        </div>
    );
}
