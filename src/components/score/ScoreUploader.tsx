"use client";

import { useCallback, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useScoreUpload } from "@/hooks/useScoreUpload";

type ScoreUploaderProps = {
  onUploaded?: () => void;
};

export function ScoreUploader({ onUploaded }: ScoreUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { run, isPending, error } = useScoreUpload();

  const onChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        const score = await run(file);
        if (!score) return;
        toast.success(`Uploaded ${score.title}`);
        onUploaded?.();
        router.push(`/scores/${score.id}`);
      } catch {
        toast.error("Upload failed");
      }
    },
    [onUploaded, router, run],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a score</CardTitle>
        <CardDescription>
          PDF goes through Audiveris OMR. MusicXML (`.xml` / `.musicxml` / `.mxl`)
          skips OMR and is playable as soon as the worker picks it up.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xml,.musicxml,.mxl,application/pdf,application/xml,text/xml"
          className="hidden"
          onChange={onChange}
        />
        <Button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? "Uploading…" : "Choose PDF or MusicXML"}
        </Button>
        {error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
