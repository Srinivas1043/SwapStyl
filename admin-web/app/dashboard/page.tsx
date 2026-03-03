'use client';

import { useEffect, useState, useRef } from 'react';
import { apiCall } from '@/lib/api';
import styles from './page.module.css';

interface DashboardStats {
  pending_reviews: number;
  open_reports: number;
  suspended_users: number;
  total_items: number;
  total_users: number;
}
interface Analytics {
  signups_chart: { date: string; count: number }[];
  approval_stats: { approved: number; rejected: number; pending: number };
}
interface SwapStats {
  total: number; completed: number; pending: number; cancelled: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [swapStats, setSwapStats] = useState<SwapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const barRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    Promise.all([
      apiCall('GET', '/admin/dashboard'),
      apiCall('GET', '/admin/analytics'),
      apiCall('GET', '/admin/swaps/stats'),
    ]).then(([s, a, sw]) => {
      setStats(s);
      setAnalytics(a);
      setSwapStats(sw);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Draw bar chart manually (no Chart.js dependency needed)
  useEffect(() => {
    if (!analytics || !barRef.current) return;
    const canvas = barRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = analytics.signups_chart;
    const max = Math.max(...data.map(d => d.count), 1);
    const W = canvas.width, H = canvas.height;
    const padL = 32, padB = 40, padT = 12, padR = 12;
    const graphW = W - padL - padR;
    const graphH = H - padT - padB;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#F7F9FC';
    ctx.fillRect(0, 0, W, H);
    const barW = (graphW / data.length) * 0.7;
    const gap = (graphW / data.length) * 0.3;
    data.forEach((d, i) => {
      const x = padL + i * (graphW / data.length) + gap / 2;
      const barH = (d.count / max) * graphH;
      const y = padT + graphH - barH;
      const grad = ctx.createLinearGradient(x, y, x, padT + graphH);
      grad.addColorStop(0, '#4F7942');
      grad.addColorStop(1, '#A8C4AC');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 3);
      ctx.fill();
      // x label every 5
      if (i % 5 === 0) {
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText(d.date.slice(5), x, H - 8);
      }
    });
    // Y axis labels
    for (let t = 0; t <= 4; t++) {
      const v = Math.round((max / 4) * t);
      const y = padT + graphH - (t / 4) * graphH;
      ctx.fillStyle = '#aaa';
      ctx.font = '10px sans-serif';
      ctx.fillText(String(v), 0, y + 4);
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(padL, y); ctx.lineTo(W - padR, y);
      ctx.stroke();
    }
  }, [analytics]);

  // Draw donut chart
  useEffect(() => {
    if (!analytics || !donutRef.current) return;
    const { approved, rejected, pending } = analytics.approval_stats;
    const total = approved + rejected + pending || 1;
    const canvas = donutRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2, r = 70, ir = 45;
    const segments = [
      { value: approved, color: '#4F7942', label: 'Approved' },
      { value: rejected, color: '#E74C3C', label: 'Rejected' },
      { value: pending, color: '#F39C12', label: 'Pending' },
    ];
    let start = -Math.PI / 2;
    segments.forEach(seg => {
      const angle = (seg.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      // Punch hole
      ctx.beginPath();
      ctx.arc(cx, cy, ir, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      start += angle;
    });
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(total), cx, cy + 6);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('total', cx, cy + 22);
  }, [analytics]);

  if (loading) return <div className={styles.loading}>Loading dashboard...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <span className={styles.timestamp}>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Stat Cards */}
      <div className={styles.grid}>
        <StatCard title="Pending Reviews" value={stats?.pending_reviews || 0} color="#FF6B35" icon="📦" />
        <StatCard title="Open Reports" value={stats?.open_reports || 0} color="#FF1744" icon="🚩" />
        <StatCard title="Suspended Users" value={stats?.suspended_users || 0} color="#F57C00" icon="🔒" />
        <StatCard title="Total Items" value={stats?.total_items || 0} color="#2196F3" icon="💼" />
        <StatCard title="Total Users" value={stats?.total_users || 0} color="#4CAF50" icon="👥" />
      </div>

      {/* Swap Stats */}
      {swapStats && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Swap Activity</h2>
          <div className={styles.swapGrid}>
            <SwapCard label="Total Swaps" value={swapStats.total} color="#6C5CE7" />
            <SwapCard label="Completed" value={swapStats.completed} color="#00B894" />
            <SwapCard label="Pending" value={swapStats.pending} color="#FDCB6E" />
            <SwapCard label="Cancelled" value={swapStats.cancelled} color="#D63031" />
          </div>
        </div>
      )}

      {/* Charts Row */}
      {analytics && (
        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <h3>New Signups — Last 30 Days</h3>
            <canvas ref={barRef} width={520} height={180} style={{ width: '100%', height: 180 }} />
          </div>
          <div className={styles.chartCard}>
            <h3>Item Moderation</h3>
            <div className={styles.donutWrapper}>
              <canvas ref={donutRef} width={160} height={160} />
              <div className={styles.donutLegend}>
                {[
                  { color: '#4F7942', label: 'Approved', val: analytics.approval_stats.approved },
                  { color: '#E74C3C', label: 'Rejected', val: analytics.approval_stats.rejected },
                  { color: '#F39C12', label: 'Pending', val: analytics.approval_stats.pending },
                ].map(l => (
                  <div key={l.label} className={styles.legendRow}>
                    <span className={styles.legendDot} style={{ background: l.color }} />
                    <span>{l.label}</span>
                    <strong>{l.val}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) {
  return (
    <div className={styles.card} style={{ borderLeftColor: color }}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className={styles.cardValue} style={{ color }}>{value.toLocaleString()}</div>
    </div>
  );
}

function SwapCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.swapCard}>
      <span className={styles.swapValue} style={{ color }}>{value.toLocaleString()}</span>
      <span className={styles.swapLabel}>{label}</span>
    </div>
  );
}
