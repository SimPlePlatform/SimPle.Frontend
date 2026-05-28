import { GameDetailPage } from '@/features/games/GameDetailPage';

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <GameDetailPage gameId={gameId} />;
}
