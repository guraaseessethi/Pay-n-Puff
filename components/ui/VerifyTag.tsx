import { isReviewMode } from "@/lib/auth/session";

/** `[verify]` marker, visible only in ?review=1 mode. Lists live in docs/CONTENT_TODO.md. */
export async function VerifyTag({ note }: { note: string }) {
  if (!(await isReviewMode())) return null;
  return (
    <span className="verify-tag" title={note}>
      [verify] <span className="sr-only">{note}</span>
    </span>
  );
}
