import { env } from 'cloudflare:workers';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  // Both memory uploads and independently replaceable covers live in this bucket.
  if (!/^(?:cover-(?:province|city)-)?[a-f0-9-]{1,80}\.(jpg|png|webp)$/.test(id)) return new Response('Not found', { status: 404 });

  const photo = await env.FILES.get(id);
  if (!photo) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  photo.writeHttpMetadata(headers);
  headers.set('etag', photo.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(photo.body, { headers });
}
