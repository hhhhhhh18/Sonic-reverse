import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchPage } from "@/components/pages/SearchPage";
import { safeDecode } from "@/lib/format";
import { filterFromSegment } from "@/lib/search";

type Props = { params: Promise<{ query: string; filter: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { query } = await params;
  return { title: `Search for ${safeDecode(query)}` };
}

export default async function SearchFiltered({ params }: Props) {
  const { query, filter: segment } = await params;
  const filter = filterFromSegment(segment);
  if (!filter || filter === "all") notFound(); // "all" has no URL segment
  return <SearchPage query={safeDecode(query)} filter={filter} />;
}
