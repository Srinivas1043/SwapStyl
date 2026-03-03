'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface SwapStats { total: number; completed: number; pending: number; cancelled: number; }
interface ApprovalStats { approved: number; rejected: number; pending: number; }
interface DashboardCounts {
  pending_reviews: number; open_reports: number; suspended_users: number;
  total_items: number; total_users: number;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [swapStats, setSwapStats] = useState<SwapStats | null>(null);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [signups, setSignups] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const barRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [
        pendingRes, reportsRes, suspendedRes, itemsRes, usersRes,
        swapsTotalRes, swapsCompRes, swapsPendRes, swapsCancRes,
        approvedRes, rejectedRes, pendingItemsRes,
      ] = await Promise.all([
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending_review'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).not('suspended_at', 'is', null),
        supabase.from('items').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('swaps').select('*', { count: 'exact', head: true }),
        supabase.from('swaps').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('swaps').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('swaps').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending_review'),
      ]);

      setCounts({
        pending_reviews: pendingRes.count || 0,
        open_reports: reportsRes.count || 0,
        suspended_users: suspendedRes.count || 0,
        total_items: itemsRes.count || 0,
        total_users: usersRes.count || 0,
      });
      setSwapStats({
        total: swapsTotalRes.count || 0,
        completed: swapsCompRes.count || 0,
        pending: swapsPendRes.count || 0,
        cancelled: swapsCancRes.count || 0,
      });
      setApprovalStats({
        approved: approvedRes.count || 0,
        rejected: rejectedRes.count || 0,
        pending: pendingItemsRes.count || 0,
      });

      // Signups last 30 days
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: signupData } = await supabase.from('profiles').select('created_at').gte('created_at', since);
      const byDay: Record<string, number> = {};
      (signupData || []).forEach(r => { const d = r.created_at.slice(0, 10); byDay[d] = (byDay[d] || 0) + 1; });
      const chart = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        chart.push({ date: d, count: byDay[d] || 0 });
      }
      setSignups(chart);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!signups.length || !barRef.current) return;
    const canvas = barRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const max = Math.max(...signups.map(d => d.count), 1);
    const W = canvas.width, H = canvas.height;
    const padL = 32, padB = 40, padT = 12, padR = 12;
    const graphW = W - padL - padR, graphH = H - padT - padB;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#FAFBFF'; ctx.fillRect(0, 0, W, H);
    signups.forEach((d, i) => {
      const x = padL + i * (graphW / signups.length) + (graphW / signups.length) * 0.15;
      const barW = (graphW / signups.length) * 0.7;
      const barH = (d.count / max) * graphH;
      const y = padT + graphH - barH;
      const grad = ctx.createLinearGradient(x, y, x, padT + graphH);
      grad.addColorStop(0, '#4F7942'); grad.addColorStop(1, '#A8C4AC');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(x, y, barW, barH, 3); ctx.fill();
      if (i % 5 === 0) { ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.fillText(d.date.slice(5), x, H - 8); }
    });
    for (let t = 0; t <= 4; t++) {
      const v = Math.round((max / 4) * t);
      const y = padT + graphH - (t / 4) * graphH;
      ctx.fillStyle = '#aaa'; ctx.font = '10px sans-serif'; ctx.fillText(String(v), 0, y + 4);
      ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    }
  }, [signups]);

  useEffect(() => {
    if (!approvalStats || !donutRef.current) return;
    const { approved, rejected, pending } = approvalStats;
    const total = approved + rejected + pending || 1;
    const canvas = donutRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2, r = 70, ir = 45;
    const segs = [{ value: approved, color: '#4F7942' }, { value: rejected, color: '#E74C3C' }, { value: pending, color: '#F39C12' }];
    let start = -Math.PI / 2;
    segs.forEach(s => {
      const angle = (s.value / total) * 2 * Math.PI;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + angle); ctx.closePath();
      ctx.fillStyle = s.color; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, ir, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
      start += angle;
    });
    ctx.fillStyle = '#333'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(total), cx, cy + 6);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#888'; ctx.fillText('items', cx, cy + 22);
  }, [approvalStats]);

  if (loading) return <div className={styles.loading}>Loading dashboard...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <span className={styles.timestamp}>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      <div className={styles.grid}>
        <StatCard title="Pending Reviews" value={counts?.pending_reviews || 0} color="#FF6B35" icon="📦" />
        <StatCard title="Open Reports" value={counts?.open_reports || 0} color="#FF1744" icon="🚩" />
        <StatCard title="Suspended Users" value={counts?.suspended_users || 0} color="#F57C00" icon="🔒" />
        <StatCard title="Total Items" value={counts?.total_items || 0} color="#2196F3" icon="💼" />
        <StatCard title="Total Users" value={counts?.total_users || 0} color="#4CAF50" icon="👥" />
      </div>

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

      {approvalStats && (
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
                  { color: '#4F7942', label: 'Approved', val: approvalStats.approved },
                  { color: '#E74C3C', label: 'Rejected', val: approvalStats.rejected },
                  { color: '#F39C12', label: 'Pending', val: approvalStats.pending },
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
      <div className={styles.cardHeader}><span className={styles.cardIcon}>{icon}</span><h3>{title}</h3></div>
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
