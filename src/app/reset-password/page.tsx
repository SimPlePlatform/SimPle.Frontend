import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordPage token={token ?? ''} />;
}
