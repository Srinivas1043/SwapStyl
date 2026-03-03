'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

// Phase: 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-newpass'
type Phase = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-newpass';

export default function LoginPage() {
  const router = useRouter();

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [phase, setPhase] = useState<Phase>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current!); return 0; } return prev - 1; });
    }, 1000);
  };

  // ── Normal Login ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const session = data.session;
      if (!session) throw new Error('No session returned');

      // Check admin role in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profile || !['admin', 'moderator'].includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error('Access denied — admin or moderator role required');
      }

      Cookies.set('admin_token', session.access_token, { expires: 7 });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Phase 1: Send OTP ────────────────────────
  const sendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: undefined,
      });
      if (resetError) throw resetError;
      setPhase('forgot-otp');
      startCountdown();
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Phase 2: Verify OTP ──────────────────────
  const verifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: resetOtp.trim(),
        type: 'recovery',
      });
      if (verifyError) throw verifyError;
      setPhase('forgot-newpass');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Phase 3: Set New Password ─────────────────
  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setPhase('login');
      setResetEmail(''); setResetOtp(''); setNewPassword(''); setConfirmNewPassword('');
      setError('');
      alert('✅ Password updated! Please log in with your new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // ── Render: Forgot Password Phases ───────────────────────────
  if (phase !== 'login') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>SwapStyl Admin</h1>
            <p className={styles.subtitle}>
              {phase === 'forgot-email' && 'Reset Password — Step 1 of 3'}
              {phase === 'forgot-otp' && 'Reset Password — Step 2 of 3'}
              {phase === 'forgot-newpass' && 'Reset Password — Step 3 of 3'}
            </p>
          </div>

          {/* Step indicators */}
          <div className={styles.stepBar}>
            {[1, 2, 3].map(s => {
              const active = (phase === 'forgot-email' && s === 1) || (phase === 'forgot-otp' && s === 2) || (phase === 'forgot-newpass' && s === 3);
              const done = (phase === 'forgot-otp' && s === 1) || (phase === 'forgot-newpass' && s <= 2);
              return (
                <div key={s} className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}>
                  {done ? '✓' : s}
                </div>
              );
            })}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {phase === 'forgot-email' && (
            <form onSubmit={sendResetCode} className={styles.form}>
              <p className={styles.hint}>Enter your admin email and we'll send you a 6-digit reset code.</p>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="admin@swapstyl.com" required disabled={loading} />
              </div>
              <button type="submit" className={styles.btn} disabled={loading}>{loading ? 'Sending...' : 'Send Reset Code'}</button>
            </form>
          )}

          {phase === 'forgot-otp' && (
            <form onSubmit={verifyResetCode} className={styles.form}>
              <p className={styles.hint}>Check your email <strong>{resetEmail}</strong> for the 6-digit reset code.</p>
              <div className={styles.formGroup}>
                <label>Reset Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={resetOtp}
                  onChange={e => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="123456"
                  required
                  disabled={loading}
                  className={styles.otpInput}
                  maxLength={8}
                />
              </div>
              <button type="submit" className={styles.btn} disabled={loading || !resetOtp}>{loading ? 'Verifying...' : 'Verify Code'}</button>
              <button type="button" className={styles.resendBtn} disabled={countdown > 0 || loading} onClick={sendResetCode}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
              </button>
            </form>
          )}

          {phase === 'forgot-newpass' && (
            <form onSubmit={submitNewPassword} className={styles.form}>
              <p className={styles.hint}>Choose a strong new password for your admin account.</p>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required disabled={loading} minLength={8} />
              </div>
              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="••••••••" required disabled={loading} />
              </div>
              <button type="submit" className={styles.btn} disabled={loading}>{loading ? 'Updating...' : 'Set New Password'}</button>
            </form>
          )}

          <div className={styles.footer}>
            <button className={styles.backLink} onClick={() => { setPhase('login'); setError(''); }}>← Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Normal Login ──────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>SwapStyl Admin</h1>
          <p className={styles.subtitle}>Moderation &amp; Management Portal</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@swapstyl.com" disabled={loading} required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" disabled={loading} required />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} className={styles.btn}>{loading ? 'Signing in...' : 'Sign In'}</button>

          <button type="button" className={styles.forgotBtn} onClick={() => { setPhase('forgot-email'); setResetEmail(email); setError(''); }}>
            Forgot password?
          </button>
        </form>

        <div className={styles.footer}>
          <p>🔐 Admin Access Only. All actions are logged.</p>
          <p>Don't have an account? <Link href="/signup">Sign up here</Link></p>
        </div>
      </div>
    </div>
  );
}
