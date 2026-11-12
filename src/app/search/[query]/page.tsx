import type { Metadata } from "next";
import { SearchRoute } from "@/components/pages/SearchRoute";
import { safeDecode } from "@/lib/format";

type Props = { params: Promise<{ query: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { query } = await params;
  return { title: `Search for ${safeDecode(query)}` };
}

export default async function SearchAll({ params }: Props) {
  const { query } = await params;
  return <SearchRoute query={safeDecode(query)} filter="all" />;
}
