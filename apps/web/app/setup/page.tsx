import { SetupForm } from '../../components/setup-form';

export default function SetupPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Send to Self</h1>
        <p className="mt-2 text-sm text-stone-500">
          首次使用请先设置一次主密码。
        </p>
        <div className="mt-6">
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
