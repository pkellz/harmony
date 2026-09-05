import { ScoreDetailPage } from "@/components/score/ScoreDetailPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ScoreDetailPage scoreId={id} />;
}
