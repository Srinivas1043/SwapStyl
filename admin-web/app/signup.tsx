'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabase';
import styles from './signup.module.css';

// Step: 'form' | 'otp' | 'done'
type Step = 'form' | 'otp' | 'done';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(t); return 0; } return prev - 1; });
    }, 1000);
  };

  // ── Step 1: Sign up ──────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      // Sign up with Supabase — sends email OTP automatically
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // We're using OTP, not magic link
        },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Signup failed — no user returned');
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: 'signup',
      });
      if (verifyError) throw verifyError;

      const session = data.session;
      if (!session) throw new Error('Verification succeeded but no session was created');

      // Check if this user has admin role (set by existing admin via Admins page)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role && ['admin', 'moderator'].includes(profile.role)) {
        // Already has admin role — log them straight in
        Cookies.set('admin_token', session.access_token, { expires: 7 });
        router.push('/dashboard');
      } else {
        // Email verified but no admin role yet — show pending message
        await supabase.auth.signOut();
        setStep('done');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────
  const resendOtp = async () => {
    setLoading(true); setError('');
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      if (resendError) throw resendError;
      startCountdown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Done screen ───────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successContent}>
            <div className={styles.successIcon}>✓</div>
            <h1>Email Verified!</h1>
            <p>Your account has been created and your email is verified.</p>
            <div className={styles.pendingBox}>
              <p>⏳ <strong>Pending admin approval</strong></p>
              <p>An existing admin needs to assign you the <strong>admin</strong> or <strong>moderator</strong> role before you can access the dashboard.</p>
              <p>Ask an admin to find your account in <em>Users</em> and set your role.</p>
            </div>
            <Link href="/" className={styles.btn}>Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>SwapStyl Admin</h1>
          <p className={styles.subtitle}>
            {step === 'form' ? 'Create Admin Account' : `Verify Email — ${email}`}
          </p>
        </div>

        {/* Step indicators */}
        <div className={styles.stepBar}>
          {['Details', 'Verify Email', 'Access'].map((label, i) => {
            const done = (step === 'otp' && i === 0) || (step === 'done' && i <= 1);
            const active = (step === 'form' && i === 0) || (step === 'otp' && i === 1);
            return (
              <div key={label} className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}>
                <div className={styles.stepCircle}>{done ? '✓' : i + 1}</div>
                <span className={styles.stepLabel}>{label}</span>
              </div>
            );
          })}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {step === 'form' && (
          <form onSubmit={handleSignup} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" disabled={loading} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" disabled={loading} required />
              <p className={styles.hint}>At least 8 characters</p>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" disabled={loading} required />
            </div>
            <button type="submit" disabled={loading} className={styles.btn}>{loading ? 'Creating Account...' : 'Create Account & Send Code'}</button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <p className={styles.hint}>
              We sent a 6-digit verification code to <strong>{email}</strong>. Enter it below.
            </p>
            <div className={styles.formGroup}>
              <label>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="123456"
                className={styles.otpInput}
                maxLength={8}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading || !otp}>{loading ? 'Verifying...' : 'Verify Email'}</button>
            <button type="button" className={styles.resendBtn} disabled={countdown > 0 || loading} onClick={resendOtp}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
          </form>
        )}

        <div className={styles.footer}>
          <p>Already have an account? <Link href="/">Log in here</Link></p>
        </div>
      </div>
    </div>
  );
}
