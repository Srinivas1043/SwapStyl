/**
 * Email Authentication Utilities
 * Manages email verification, password reset, and related flows
 */

import { supabase } from './supabase';

export interface EmailVerificationStatus {
    verified: boolean;
    verified_at: string | null;
    last_email_sent: string | null;
}

export interface PasswordResetState {
    email: string;
    sent: boolean;
    sent_at: string;
}

/**
 * Get the current user's email verification status
 */
export async function getEmailVerificationStatus(userId: string): Promise<EmailVerificationStatus | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('email_verified, email_verified_at, last_verification_email_sent')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching email verification status:', error);
            return null;
        }

        return {
            verified: data?.email_verified || false,
            verified_at: data?.email_verified_at || null,
            last_email_sent: data?.last_verification_email_sent || null,
        };
    } catch (error) {
        console.error('Error in getEmailVerificationStatus:', error);
        return null;
    }
}

/**
 * Check if current user's email is verified
 */
export async function isEmailVerified(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        return user.email_confirmed_at !== null;
    } catch (error) {
        console.error('Error checking email verification:', error);
        return false;
    }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });

        if (error) {
            return {
                success: false,
                message: error.message || 'Failed to resend verification email',
            };
        }

        // Update the last_verification_email_sent timestamp in profiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('profiles')
                .update({ last_verification_email_sent: new Date().toISOString() })
                .eq('id', user.id);
        }

        return {
            success: true,
            message: 'Verification email sent successfully',
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'An error occurred while resending verification email',
        };
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string, redirectUrl: string): Promise<{ success: boolean; message: string }> {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        if (error) {
            return {
                success: false,
                message: error.message || 'Failed to send password reset email',
            };
        }

        // Log the password reset attempt
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('password_reset_attempts')
                    .insert([
                        {
                            user_id: user.id,
                            email: email,
                        }
                    ]);
            }
        } catch (e) {
            console.warn('Could not log password reset attempt:', e);
        }

        return {
            success: true,
            message: 'Password reset email sent successfully',
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'An error occurred while sending password reset email',
        };
    }
}

/**
 * Update password (used after clicking reset link)
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            return {
                success: false,
                message: error.message || 'Failed to update password',
            };
        }

        // Log password reset completion
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('password_reset_attempts')
                    .update({ reset_completed_at: new Date().toISOString() })
                    .eq('user_id', user.id)
                    .order('requested_at', { ascending: false })
                    .limit(1);
            }
        } catch (e) {
            console.warn('Could not log password reset completion:', e);
        }

        return {
            success: true,
            message: 'Password updated successfully',
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'An error occurred while updating password',
        };
    }
}

/**
 * Check if email verification is required before accessing the app
 */
export async function requireEmailVerification(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Check if email is confirmed in auth
        const isConfirmed = user.email_confirmed_at !== null;
        
        // Also check profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('email_verified')
            .eq('id', user.id)
            .single();

        const profileVerified = profile?.email_verified || false;

        // Require verification if not confirmed in either place
        return !isConfirmed && !profileVerified;
    } catch (error) {
        console.error('Error checking email verification requirement:', error);
        return false;
    }
}

/**
 * Format email for display (truncate long emails)
 */
export function formatEmailForDisplay(email: string): string {
    if (email.length <= 20) return email;
    const [name, domain] = email.split('@');
    return `${name.substring(0, 8)}...@${domain}`;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Track email verification event (for analytics)
 */
export async function trackEmailVerificationEvent(eventType: 'sent' | 'verified' | 'failed'): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Could be used for analytics tracking later
        console.log(`Email verification event: ${eventType} for user: ${user.id}`);
    } catch (error) {
        console.warn('Could not track email verification event:', error);
    }
}
