import { LegacyProfileRedirect } from '@/features/profile/LegacyProfileRedirect';

export default async function Profile({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <LegacyProfileRedirect userId={userId} />;
}
