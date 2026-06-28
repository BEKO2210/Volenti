import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <AuthForm mode="login" />
    </main>
  );
}
