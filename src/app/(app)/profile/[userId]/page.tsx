import { ProfilePage } from '@/features/profile/ProfilePage';

export default async function Profile({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <ProfilePage userId={userId} />;
}
