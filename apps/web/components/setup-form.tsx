'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, type BootstrapResponse } from '../lib/api';

export function SetupForm() {
  const router = useRouter();
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function initialize() {
      try {
        const bootstrap = await apiFetch<BootstrapResponse>('/client/bootstrap');
        if (!bootstrap.auth.requiresSetup) {
          router.replace(bootstrap.auth.loginPath);
          return;
        }
      } catch {}

      setCheckingBootstrap(false);
    }

    void initialize();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const bootstrap = await apiFetch<BootstrapResponse>('/client/bootstrap');
      await apiFetch('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          password,
        }),
      });
      router.replace(bootstrap.auth.loginPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '初始化失败');
    } finally {
      setBusy(false);
    }
  }

  if (checkingBootstrap) {
    return <p className="text-sm text-stone-500">正在检查初始化状态...</p>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm text-stone-600" htmlFor="password">
          主密码
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
        disabled={busy || !password.trim()}
        type="submit"
      >
        保存主密码
      </button>
    </form>
  );
}
