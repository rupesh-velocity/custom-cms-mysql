'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';

import { BASE_PATH } from '@/lib/config';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [siteLogo, setSiteLogo] = useState('');

  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.site_logo) {
          setSiteLogo(data.site_logo);
        } else {
          setSiteLogo(`${BASE_PATH}/velocity-logo.png`);
        }
      })
      .catch(() => {
        setSiteLogo(`${BASE_PATH}/velocity-logo.png`);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_PATH}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
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

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginBox}>

        {/* Center Divider Lock */}
        <div className={styles.dividerLock}>
          <Lock size={18} strokeWidth={2} />
        </div>

        {/* LEFT SIDE */}
        <section className={styles.leftSide}>
          <div>
            {/* Logo */}
            <div className={styles.logoWrap}>
              {siteLogo && (
                <img
                  src={siteLogo}
                  alt="Site Logo"
                  className={styles.logo}
                  onError={(e) => {
                    e.currentTarget.src =
                      `${BASE_PATH}/velocity-logo.png`;
                  }}
                />
              )}
            </div>

            <h2 className={styles.welcomeTitle}>
              Welcome Back!
            </h2>

            <p className={styles.welcomeText}>
              Sign in to securely access your account.
            </p>

            {/* Security Card */}
            <div className={styles.securityCard}>
              <div className={styles.securityIcon}>
                <ShieldCheck size={22} strokeWidth={2} />
              </div>

              <div>
                <div className={styles.securityCardTitle}>
                  Secure Account Access
                </div>

                <p className={styles.securityCardText}>
                  Your login information is securely protected.
                </p>
              </div>
            </div>
          </div>

         
        </section>

        {/* RIGHT SIDE */}
        <section className={styles.rightSide}>

          {/* Logo for mobile */}
          <div className={styles.mobileLogo}>
            {siteLogo && (
              <img
                src={siteLogo}
                alt="Site Logo"
                className={styles.logo}
                onError={(e) => {
                  e.currentTarget.src =
                    `${BASE_PATH}/velocity-logo.png`;
                }}
              />
            )}
          </div>

          {/* Heading */}
          <div className={styles.heading}>
            <h1 className={styles.loginTitle}>
              Sign In
            </h1>

            <p className={styles.loginDescription}>
              Enter your details to access your account.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>

            {/* Username */}
            <div className={styles.formGroup}>
              <label
                htmlFor="username"
                className={styles.label}
              >
                Username or Email
              </label>

              <div className={styles.inputWrap}>
                <User
                  size={18}
                  strokeWidth={2}
                  className={styles.inputIcon}
                />

                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Enter username or email"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  className={styles.input}
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.formGroup}>
              <label
                htmlFor="password"
                className={styles.label}
              >
                Password
              </label>

              <div className={styles.inputWrap}>
                <Lock
                  size={18}
                  strokeWidth={2}
                  className={styles.inputIcon}
                />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  className={styles.input}
                />

                <button
                  type="button"
                  className={styles.passwordButton}
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={styles.loginButton}
            >
              {isLoading ? (
                'Signing in...'
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Secure Message */}
            <div className={styles.secureMessage}>
              <ShieldCheck size={16} />

              <span>
                Secure login • Your data is protected
              </span>
            </div>

          </form>
        </section>
      </div>
    </main>
  );
}