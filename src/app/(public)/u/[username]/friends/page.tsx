import { ProfileFriendsPage } from '@/features/profile/ProfileFriendsPage';

export default async function UserProfileFriends({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfileFriendsPage username={decodeURIComponent(username)} />;
}
