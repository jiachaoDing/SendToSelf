'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password,
          deviceName,
        }),
      });

      router.replace('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '登录失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm text-stone-600" htmlFor="device-name">
          设备标识
        </label>
        <input
          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-500"
          disabled={busy}
          id="device-name"
          onChange={(event) => setDeviceName(event.target.value)}
          placeholder="例如：Office Laptop"
          required
          value={deviceName}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-stone-600" htmlFor="password">
          密码
        </label>
        <input
          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-500"
          disabled={busy}
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white"
        disabled={busy || !password.trim() || !deviceName.trim()}
        type="submit"
      >
        登录
      </button>
    </form>
  );
}
