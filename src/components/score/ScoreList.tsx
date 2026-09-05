import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ScoreSummary } from "@/lib/scoreTypes";

type ScoreListProps = {
  items: ScoreSummary[];
};

const STATUS_VARIANT: Record<
  ScoreSummary["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  ready: "default",
  converting: "secondary",
  uploaded: "outline",
  failed: "destructive",
};

export function ScoreList({ items }: ScoreListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No scores yet. Upload one above.</p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {items.map((score) => (
        <li key={score.id}>
          <Link
            href={`/scores/${score.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/60"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{score.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {score.originalFilename}
                {score.voices?.length
                  ? ` · ${score.voices.map((v) => v.label).join(", ")}`
                  : null}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[score.status]}>{score.status}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
