import { env } from 'cloudflare:workers';

export async function GET() {
  const { results } = await env.DB.prepare(
    'SELECT scope, province, city, photo_key AS photoKey, updated_at AS updatedAt FROM place_covers ORDER BY updated_at DESC',
  ).all();
  const covers = results as Array<{ scope: string; province: string; city: string; photoKey: string; updatedAt: string }>;
  return Response.json({
    covers: covers.map((cover) => ({
      ...cover,
      photoUrl: `/api/photos/${cover.photoKey}`,
    })),
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const scopeValue = form.get('scope');
  const provinceValue = form.get('province');
  const cityValue = form.get('city');
  const scope = typeof scopeValue === 'string' ? scopeValue.trim() : '';
  const province = typeof provinceValue === 'string' ? provinceValue.trim() : '';
  const city = scope === 'city' && typeof cityValue === 'string' ? cityValue.trim() : '';
  const photo = form.get('photo');

  if (
    (scope !== 'province' && scope !== 'city') ||
    !province ||
    (scope === 'city' && !city) ||
    !(photo instanceof File) ||
    !photo.size
  ) {
    return Response.json(
      { error: '请重新选择一张封面照片。' },
      { status: 400 },
    );
  }
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) ||
    photo.size > 10 * 1024 * 1024
  ) {
    return Response.json(
      { error: '封面仅支持 10MB 以内的 JPG、PNG 或 WebP。' },
      { status: 400 },
    );
  }

  const previous = await env.DB.prepare(
    'SELECT photo_key AS photoKey FROM place_covers WHERE scope = ? AND province = ? AND city = ?',
  )
    .bind(scope, province, city)
    .first<{ photoKey: string }>();
  const extension =
    photo.type === 'image/png'
      ? 'png'
      : photo.type === 'image/webp'
        ? 'webp'
        : 'jpg';
  const photoKey = `cover-${scope}-${crypto.randomUUID()}.${extension}`;
  const updatedAt = new Date().toISOString();

  await env.FILES.put(photoKey, photo.stream(), {
    httpMetadata: {
      contentType: photo.type,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  try {
    await env.DB.prepare(`
      INSERT INTO place_covers (id, scope, province, city, photo_key, photo_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope, province, city) DO UPDATE SET
        photo_key = excluded.photo_key,
        photo_type = excluded.photo_type,
        updated_at = excluded.updated_at
    `)
      .bind(
        crypto.randomUUID(),
        scope,
        province,
        city,
        photoKey,
        photo.type,
        updatedAt,
      )
      .run();
  } catch (error) {
    await env.FILES.delete(photoKey);
    throw error;
  }

  if (previous?.photoKey && previous.photoKey !== photoKey)
    await env.FILES.delete(previous.photoKey).catch((error) => console.error('Old cover cleanup failed', error));
  return Response.json(
    { scope, province, city, photoUrl: `/api/photos/${photoKey}`, updatedAt },
    { status: 201 },
  );
}
