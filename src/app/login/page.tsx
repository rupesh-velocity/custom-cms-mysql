'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';

import { BASE_PATH } from '@/lib/config';
import styles from './login.module.css';

type LoginMode = 'password' | 'phone_otp' | 'both';

export default function LoginPage() {
  const router = useRouter();

  const [loginMode, setLoginMode] = useState<LoginMode | null>(null);
  const [activeLoginMode, setActiveLoginMode] = useState<'password' | 'phone_otp'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [siteLogo, setSiteLogo] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`${BASE_PATH}/api/settings`).then((res) => res.json()),
      fetch(`${BASE_PATH}/api/auth/login`, { cache: 'no-store' }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load login configuration.');
        return data;
      }),
    ])
      .then(([settings, auth]) => {
        if (cancelled) return;
        setSiteLogo(settings.site_logo || settings.site_icon || '');
        setLoginMode(auth.mode === 'phone_otp' || auth.mode === 'both' ? auth.mode : 'password');
      })
      .catch((err) => {
        if (cancelled) return;
        setSiteLogo('');
        setError(err instanceof Error ? err.message : 'Could not load login configuration.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_PATH}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_PATH}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (res.ok && data.requiresOtp) {
        setOtpRequired(true);
        setPhoneHint(data.phoneHint || phone);
        setOtpCode('');
        setResendCooldown(Number(data.resendAfter || 30));
      } else {
        setError(data.error || 'Could not send verification code');
      }
    } catch {
      setError('An error occurred while sending the verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_PATH}/api/auth/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch {
      setError('An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_PATH}/api/auth/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendCooldown(Number(data.resendAfter || 30));
      } else {
        if (data.retryAfter) setResendCooldown(Number(data.retryAfter));
        setError(data.error || 'Could not resend code');
      }
    } catch {
      setError('Could not resend verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const changePhoneNumber = async () => {
    try {
      await fetch(`${BASE_PATH}/api/auth/otp`, { method: 'DELETE' });
    } catch {
      // The local UI can still reset; a later Send OTP request replaces the pending cookie.
    }
    setOtpRequired(false);
    setOtpCode('');
    setPhoneHint('');
    setResendCooldown(0);
    setError('');
  };

  const currentMode = loginMode === 'both' ? activeLoginMode : loginMode;
  const formSubmit = otpRequired
    ? handleOtp
    : currentMode === 'phone_otp'
      ? handlePhoneLogin
      : handlePasswordLogin;

  const title = otpRequired ? 'Verify OTP' : 'Sign In';
  const description = otpRequired
    ? `Enter the verification code sent to ${phoneHint || 'your phone'}.`
    : currentMode === 'phone_otp'
      ? 'Enter your registered mobile number to receive a one-time verification code.'
      : 'Enter your details to access your account.';

  const buttonText = otpRequired
    ? (isLoading ? 'Verifying...' : 'Verify & Login')
    : currentMode === 'phone_otp'
      ? (isLoading ? 'Sending code...' : 'Send OTP')
      : (isLoading ? 'Signing in...' : 'Sign in');

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginBox}>
        <div className={styles.dividerLock}>
          <Lock size={18} strokeWidth={2} />
        </div>

        <section className={styles.leftSide}>
          <div>
            <div className={styles.logoWrap}>
              {siteLogo && (
                <img
                  src={siteLogo}
                  alt="Site Logo"
                  className={styles.logo}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>

            <h2 className={styles.welcomeTitle}>Welcome Back!</h2>
            <p className={styles.welcomeText}>
              {currentMode === 'phone_otp'
                ? 'Use your registered mobile number for secure password-free access.'
                : 'Sign in to securely access your account.'}
            </p>

            <div className={styles.securityCard}>
              <div className={styles.securityIcon}>
                <ShieldCheck size={22} strokeWidth={2} />
              </div>
              <div>
                <div className={styles.securityCardTitle}>Secure Account Access</div>
                <p className={styles.securityCardText}>
                  {currentMode === 'phone_otp'
                    ? 'Your one-time code is verified securely through Twilio.'
                    : 'Your login information is securely protected.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.rightSide}>
          <div className={styles.mobileLogo}>
            {siteLogo && (
              <img
                src={siteLogo}
                alt="Site Logo"
                className={styles.logo}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>

          <div className={styles.heading}>
            <h1 className={styles.loginTitle}>{title}</h1>
            <p className={styles.loginDescription}>{description}</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {loginMode === null ? (
            <div className={styles.loadingState}>Loading secure login…</div>
          ) : (
            <>
            {loginMode === 'both' && !otpRequired && (
              <div
                style={{
                  marginBottom: '24px',
                  padding: '14px 16px',
                  border: '1px solid #eee0ff',
                  borderRadius: '12px',
                  background: '#fffaff',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '12px',
                    color: '#15133a',
                  }}
                >
                  Choose Login Method
                </div>

                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    padding: '4px',
                    borderRadius: '14px',
                    background: '#f5ecff',
                    border: '1px solid #ead7ff',
                    gap: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveLoginMode('password')}
                    style={{
                      width: '50%',
                      padding: '11px 8px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      background: activeLoginMode === 'password' ? '#ffffff' : 'transparent',
                      color: activeLoginMode === 'password' ? '#8b32d1' : '#555',
                      fontWeight: activeLoginMode === 'password' ? 600 : 500,
                      boxShadow: activeLoginMode === 'password' ? '0 2px 8px rgba(139,50,209,0.12)' : 'none',
                    }}
                  >
                    Username & Password
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLoginMode('phone_otp')}
                    style={{
                      width: '50%',
                      padding: '11px 8px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      background: activeLoginMode === 'phone_otp' ? '#ffffff' : 'transparent',
                      color: activeLoginMode === 'phone_otp' ? '#8b32d1' : '#555',
                      fontWeight: activeLoginMode === 'phone_otp' ? 600 : 500,
                      boxShadow: activeLoginMode === 'phone_otp' ? '0 2px 8px rgba(139,50,209,0.12)' : 'none',
                    }}
                  >
                    Phone OTP
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={formSubmit}>
              {otpRequired ? (
                <>
                  <div className={styles.formGroup}>
                    <label htmlFor="otp" className={styles.label}>Verification Code</label>
                    <div className={styles.inputWrap}>
                      <ShieldCheck size={18} strokeWidth={2} className={styles.inputIcon} />
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        autoFocus
                        placeholder="6-digit code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={styles.otpActions}>
                    <button
                      type="button"
                      onClick={resendOtp}
                      disabled={isLoading || resendCooldown > 0}
                      className={styles.textAction}
                    >
                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                    <button type="button" onClick={changePhoneNumber} disabled={isLoading} className={styles.textAction}>
                      Change phone number
                    </button>
                  </div>
                </>
              ) : currentMode === 'phone_otp' ? (
                <div className={styles.formGroup}>
                  <label htmlFor="phone" className={styles.label}>Phone Number</label>
                  <div className={styles.inputWrap}>
                    <Phone size={18} strokeWidth={2} className={styles.inputIcon} />
                    <input
                      id="phone"
                      type="tel"
                      required
                      autoFocus
                      autoComplete="tel"
                      placeholder="+15551234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <p className={styles.fieldHelp}>Use the mobile number saved on your CMS user account, including country code.</p>
                </div>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label htmlFor="username" className={styles.label}>Username or Email</label>
                    <div className={styles.inputWrap}>
                      <User size={18} strokeWidth={2} className={styles.inputIcon} />
                      <input
                        id="username"
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="Enter username or email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <div className={styles.inputWrap}>
                      <Lock size={18} strokeWidth={2} className={styles.inputIcon} />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                      />
                      <button
                        type="button"
                        className={styles.passwordButton}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button type="submit" disabled={isLoading} className={styles.loginButton}>
                <span>{buttonText}</span>
                {!isLoading && <ArrowRight size={18} />}
              </button>

              <div className={styles.secureMessage}>
                <ShieldCheck size={16} />
                <span>{currentMode === 'phone_otp' ? 'Secure OTP login • Password not required' : 'Secure login • Your data is protected'}</span>
              </div>
            </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
