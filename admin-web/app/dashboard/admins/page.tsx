'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import styles from './admins.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get('admin_token');
    if (!token) {
      router.push('/');
      return;
    }

    fetchAdmins();
  }, [router]);

  const fetchAdmins = async () => {
    try {
      const token = Cookies.get('admin_token');
      const res = await fetch(`${API_URL}/admin/users/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch admins');

      const data = await res.json();
      setAdmins(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleSetRole = async (userId: string, newRole: string) => {
    setMessage('');
    setError('');
    setChangingRole(userId);

    try {
      const token = Cookies.get('admin_token');
      const res = await fetch(`${API_URL}/admin/users/${userId}/set-role?role=${newRole}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update role');
      }

      setMessage(`Role updated successfully to ${newRole}`);
      await fetchAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setChangingRole(null);
    }
  };

  const handleRevokeAccess = async (userId: string, userEmail: string) => {
    if (!confirm(`Revoke admin access for ${userEmail}?`)) return;

    try {
      await handleSetRole(userId, 'null');
    } catch (err) {
      setError('Failed to revoke access');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Management</h1>
        <p className={styles.subtitle}>Manage admin and moderator users. New users should sign up first, then be approved here.</p>
      </div>

      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.infoBox}>
        <p>✨ <strong>Signup Process:</strong></p>
        <ol>
          <li>New users sign up at <code>/admin/signup</code></li>
          <li>Their account is created in the system</li>
          <li>Existing admins approve them here by setting their role to "admin" or "moderator"</li>
          <li>Users can then log in and access the dashboard</li>
        </ol>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <p>Loading...</p>
        ) : admins.length === 0 ? (
          <p className={styles.emptyState}>No admin users yet. Users will appear here once they sign up.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.email}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[admin.role]}`}>
                      {admin.role || 'unset'}
                    </span>
                  </td>
                  <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td className={styles.actions}>
                    {admin.role !== 'admin' && (
                      <button
                        onClick={() => handleSetRole(admin.id, 'admin')}
                        disabled={changingRole === admin.id}
                        className={styles.approveBtn}
                      >
                        {changingRole === admin.id ? '...' : 'Make Admin'}
                      </button>
                    )}
                    {admin.role !== 'moderator' && (
                      <button
                        onClick={() => handleSetRole(admin.id, 'moderator')}
                        disabled={changingRole === admin.id}
                        className={styles.moderatorBtn}
                      >
                        {changingRole === admin.id ? '...' : 'Make Moderator'}
                      </button>
                    )}
                    {admin.role && (
                      <button
                        onClick={() => handleRevokeAccess(admin.id, admin.email)}
                        disabled={changingRole === admin.id}
                        className={styles.revokeBtn}
                      >
                        {changingRole === admin.id ? '...' : 'Revoke Access'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

