import { LobbyPage } from '@/features/lobby/LobbyPage';

export default async function Lobby({ params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params;
  return <LobbyPage lobbyId={lobbyId} />;
}
