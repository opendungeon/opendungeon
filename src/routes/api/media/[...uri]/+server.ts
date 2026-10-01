import { files } from "$lib/server/files";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const { uri } = params;
  const file = files.file(uri);

  const exists = await file.exists();
  if (!exists) {
    error(404, "Media not found.");
  }

  const stream = file.stream();
  return new Response(stream, {
    headers: { "Content-Type": file.type, "Transfer-Encoding": "chunked" },
  });
};
