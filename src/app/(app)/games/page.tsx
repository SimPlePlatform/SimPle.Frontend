import { LibraryPage } from '@/features/games/LibraryPage';

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const { query } = await searchParams;
  return <LibraryPage initialQuery={query ?? ''} />;
}
