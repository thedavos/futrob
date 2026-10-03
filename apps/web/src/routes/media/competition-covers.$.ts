import { createFileRoute } from "@tanstack/react-router";
import { getWorkerBindings } from "@/modules/identity/server/worker-bindings.ts";
import { readMedia } from "@/shared/infrastructure/media/media-storage.ts";

/** Public, immutable covers. Keys are organization-scoped and unguessable per creation. */
export const Route = createFileRoute("/media/competition-covers/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { MEDIA_BUCKET } = await getWorkerBindings();
        if (!MEDIA_BUCKET) return new Response(null, { status: 503 });
        return readMedia(MEDIA_BUCKET, `competition-covers/${params._splat ?? ""}`);
      },
    },
  },
});
