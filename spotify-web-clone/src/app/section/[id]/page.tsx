import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPage } from "@/components/pages/SectionPage";
import { SECTIONS, SECTION_IDS, type SectionId } from "@/data/catalog";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTION_IDS.map((id) => ({ id }));
}

function asSectionId(id: string): SectionId | null {
  return (SECTION_IDS as string[]).includes(id) ? (id as SectionId) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = asSectionId((await params).id);
  return { title: id ? SECTIONS[id].title : "Not found" };
}

export default async function Section({ params }: Props) {
  const id = asSectionId((await params).id);
  if (!id) notFound();
  return <SectionPage id={id} />;
}
