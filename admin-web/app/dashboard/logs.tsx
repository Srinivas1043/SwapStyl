'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import styles from './logs.module.css';

interface ModerationLog {
  id: string;
  moderator_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      // Placeholder: would fetch from /admin/logs endpoint
      // For now showing empty state
      setLogs([]);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      approve: '✅',
      reject: '❌',
      delete: '🗑️',
      user_suspended: '🔒',
      user_restored: '🔓',
      flag_resolved: '🚩',
    };
    return icons[action] || '📝';
  };

  if (loading) {
    return <div className={styles.loading}>Loading logs...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Moderation Logs</h1>
        <p>Audit trail of all admin actions and moderation decisions</p>
      </div>

      {logs.length === 0 ? (
        <div className={styles.empty}>
          <p>📋 No logs available yet</p>
          <p>All moderation actions will appear here for audit purposes</p>
        </div>
      ) : (
        <div className={styles.logsContainer}>
          {logs.map((log) => (
            <div key={log.id} className={styles.logEntry}>
              <span className={styles.icon}>{getActionIcon(log.action_type)}</span>
              <div className={styles.logInfo}>
                <div className={styles.action}>{log.action_type.replace(/_/g, ' ').toUpperCase()}</div>
                <div className={styles.details}>
                  {log.target_type}: {log.target_id.substring(0, 8)}...
                </div>
                {log.reason && <div className={styles.reason}>{log.reason}</div>}
                <div className={styles.time}>
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
