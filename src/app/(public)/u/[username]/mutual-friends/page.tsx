import { ProfileMutualFriendsPage } from '@/features/profile/ProfileMutualFriendsPage';

export default async function UserProfileMutualFriends({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfileMutualFriendsPage username={decodeURIComponent(username)} />;
}
