import { ProfilePage } from '@/features/profile/ProfilePage';

export default async function UserProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfilePage username={decodeURIComponent(username)} />;
}
