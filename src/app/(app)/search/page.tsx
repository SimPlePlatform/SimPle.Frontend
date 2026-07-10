import { SearchResultsPage } from '@/features/search/SearchResultsPage';

export default async function Search({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const { type, q } = await searchParams;
  return <SearchResultsPage initialType={type ?? 'people'} initialQuery={q ?? ''} />;
}
