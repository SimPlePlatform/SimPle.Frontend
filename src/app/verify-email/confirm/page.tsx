import { VerifyEmailConfirmPage } from '@/features/auth/VerifyEmailConfirmPage';

export default async function VerifyEmailConfirm({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <VerifyEmailConfirmPage token={token ?? ''} />;
}
