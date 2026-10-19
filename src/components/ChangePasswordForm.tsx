'use client';

import { useState } from 'react';

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePasswordForm() {
  const [form, setForm] = useState<FormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill all password fields.');
      return;
    }

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update password.');
      }

      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password updated successfully. Please use your new password from now on.');
    } catch (err: any) {
      setError(err?.message || 'Unable to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-3">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-gray-700">Current Password</span>
        <input
          type="password"
          value={form.currentPassword}
          onChange={(event) => updateField('currentPassword', event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#5e3fde] focus:ring-2 focus:ring-[#5e3fde]/10"
          autoComplete="current-password"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-gray-700">New Password</span>
        <input
          type="password"
          value={form.newPassword}
          onChange={(event) => updateField('newPassword', event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#5e3fde] focus:ring-2 focus:ring-[#5e3fde]/10"
          autoComplete="new-password"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-gray-700">Confirm New Password</span>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(event) => updateField('confirmPassword', event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#5e3fde] focus:ring-2 focus:ring-[#5e3fde]/10"
          autoComplete="new-password"
        />
      </label>

      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-[#5e3fde] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5e3fde]/20 transition hover:bg-[#4c32c4] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Updating...' : 'Update Password'}
        </button>

        {message && <span className="text-sm font-semibold text-green-700">{message}</span>}
        {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
      </div>
    </form>
  );
}
