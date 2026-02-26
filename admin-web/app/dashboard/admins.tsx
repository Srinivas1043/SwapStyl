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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'moderator'>('admin');
  const [creatingUser, setCreatingUser] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');

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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setTempPassword('');
    setCreatingUser(true);

    try {
      const token = Cookies.get('admin_token');
      const res = await fetch(`${API_URL}/admin/users/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create admin');
      }

      const data = await res.json();
      setTempPassword(data.user.temp_password);
      setMessage(`Admin created! Temporary password: ${data.user.temp_password}`);
      setEmail('');
      setRole('admin');
      
      // Refresh admins list
      await fetchAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRevokeAccess = async (userId: string, userEmail: string) => {
    if (!confirm(`Revoke admin access for ${userEmail}?`)) return;

    try {
      const token = Cookies.get('admin_token');
      const res = await fetch(`${API_URL}/admin/users/${userId}/admin-revoke`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to revoke access');

      setMessage(`Admin access revoked for ${userEmail}`);
      await fetchAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Management</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={styles.createBtn}
        >
          {showCreateForm ? 'Cancel' : '+ Create Admin'}
        </button>
      </div>

      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {showCreateForm && (
        <form onSubmit={handleCreateAdmin} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={creatingUser}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'moderator')}
              disabled={creatingUser}
            >
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>

          <button type="submit" disabled={creatingUser} className={styles.submitBtn}>
            {creatingUser ? 'Creating...' : 'Create Admin User'}
          </button>

          {tempPassword && (
            <div className={styles.passwordBox}>
              <p className={styles.passwordLabel}>Temporary Password:</p>
              <code className={styles.passwordCode}>{tempPassword}</code>
              <p className={styles.passwordNote}>
                ⚠️ Share this password with the user. They should change it on first login.
              </p>
            </div>
          )}
        </form>
      )}

      <div className={styles.tableContainer}>
        {loading ? (
          <p>Loading...</p>
        ) : admins.length === 0 ? (
          <p className={styles.emptyState}>No admin users yet</p>
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
                      {admin.role}
                    </span>
                  </td>
                  <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => handleRevokeAccess(admin.id, admin.email)}
                      className={styles.revokeBtn}
                    >
                      Revoke Access
                    </button>
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
