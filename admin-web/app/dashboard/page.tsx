'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

interface DashboardStats {
  pending_reviews: number;
  open_reports: number;
  suspended_users: number;
  total_items: number;
  total_users: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await apiCall('GET', '/admin/dashboard');
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading dashboard...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Dashboard</h1>
      <div className={styles.grid}>
        <StatCard
          title="Pending Reviews"
          value={stats?.pending_reviews || 0}
          color="#FF6B35"
          icon="📦"
        />
        <StatCard
          title="Open Reports"
          value={stats?.open_reports || 0}
          color="#FF1744"
          icon="🚩"
        />
        <StatCard
          title="Suspended Users"
          value={stats?.suspended_users || 0}
          color="#F57C00"
          icon="🔒"
        />
        <StatCard
          title="Total Items"
          value={stats?.total_items || 0}
          color="#2196F3"
          icon="💼"
        />
        <StatCard
          title="Total Users"
          value={stats?.total_users || 0}
          color="#4CAF50"
          icon="👥"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div className={styles.card} style={{ borderLeftColor: color }}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className={styles.cardValue} style={{ color }}>
        {value}
      </div>
    </div>
  );
}
