import { GameRoomPage } from '@/features/room/GameRoomPage';

export default async function Room({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <GameRoomPage matchId={matchId} />;
}
