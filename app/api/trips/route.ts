import { env } from 'cloudflare:workers';

async function ensureSchema() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY, province TEXT NOT NULL, city TEXT NOT NULL,
    spot TEXT NOT NULL, visited_at TEXT NOT NULL, story TEXT NOT NULL,
    summary TEXT, photo_key TEXT NOT NULL, photo_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  const columns = await env.DB.prepare("PRAGMA table_info('trips')").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === 'summary')) {
    await env.DB.prepare('ALTER TABLE trips ADD COLUMN summary TEXT').run();
  }
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS trip_photos (
    id TEXT PRIMARY KEY, trip_id TEXT NOT NULL, photo_key TEXT NOT NULL,
    photo_type TEXT NOT NULL, sort_order INTEGER NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  )`).run();
  await env.DB.batch([
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_trips_city_visited_at ON trips(city, visited_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_trips_province ON trips(province)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_order ON trip_photos(trip_id, sort_order)'),
  ]);
}

export async function GET() {
  await ensureSchema();
  const { results } = await env.DB.prepare(
    'SELECT id, province, city, spot, visited_at AS visitedAt, story, summary, photo_key AS photoKey, created_at AS createdAt FROM trips ORDER BY visited_at DESC, created_at DESC',
  ).all();
  const { results: photoRows } = await env.DB.prepare(
    'SELECT trip_id AS tripId, photo_key AS photoKey, sort_order AS sortOrder FROM trip_photos ORDER BY trip_id, sort_order',
  ).all();
  const photosByTrip = new Map<string, string[]>();
  for (const row of photoRows as Array<{ tripId: string; photoKey: string }>) {
    const photos = photosByTrip.get(row.tripId) ?? [];
    photos.push(`/api/photos/${row.photoKey}`);
    photosByTrip.set(row.tripId, photos);
  }
  return Response.json({
    trips: results.map((trip) => ({
      ...trip,
      photoUrl: `/api/photos/${trip.photoKey}`,
      photos: photosByTrip.get(String(trip.id)) ?? [`/api/photos/${trip.photoKey}`],
    })),
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const photos = form.getAll('photos').filter((item): item is File => item instanceof File && item.size > 0);
  const province = String(form.get('province') ?? '').trim();
  const city = String(form.get('city') ?? '').trim();
  const spot = String(form.get('spot') ?? '').trim();
  const visitedAt = String(form.get('visitedAt') ?? '').trim();
  const story = String(form.get('story') ?? '').trim();
  const summary = String(form.get('summary') ?? '').trim();

  if (!photos.length || !province || !city || !spot || !visitedAt || !story) {
    return Response.json({ error: '请把旅行信息填写完整。' }, { status: 400 });
  }
  if (Array.from(summary).length > 100) {
    return Response.json({ error: '一句话总结不能超过 100 字。' }, { status: 400 });
  }
  if (photos.length > 20) {
    return Response.json({ error: '一次最多上传 20 张照片。' }, { status: 400 });
  }
  if (photos.some((photo) => !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type))) {
    return Response.json({ error: '照片仅支持 JPG、PNG 或 WebP。' }, { status: 400 });
  }
  if (photos.some((photo) => photo.size > 10 * 1024 * 1024)) {
    return Response.json({ error: '每张照片不能超过 10MB。' }, { status: 400 });
  }
  if (photos.reduce((sum, photo) => sum + photo.size, 0) > 80 * 1024 * 1024) {
    return Response.json({ error: '一次上传的照片总量不能超过 80MB。' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const uploads = photos.map((photo, index) => {
    const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    return { photo, id: crypto.randomUUID(), key: `${id}-${index}.${extension}`, index };
  });

  await ensureSchema();

  await Promise.all(uploads.map(({ photo, key }) => env.FILES.put(key, photo.stream(), {
    httpMetadata: { contentType: photo.type, cacheControl: 'public, max-age=31536000, immutable' },
  })));

  try {
    const statements = [
      env.DB.prepare(
        'INSERT INTO trips (id, province, city, spot, visited_at, story, summary, photo_key, photo_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(id, province, city, spot, visitedAt, story, summary || null, uploads[0].key, uploads[0].photo.type, createdAt),
      ...uploads.map((upload) => env.DB.prepare(
        'INSERT INTO trip_photos (id, trip_id, photo_key, photo_type, sort_order) VALUES (?, ?, ?, ?, ?)',
      ).bind(upload.id, id, upload.key, upload.photo.type, upload.index)),
    ];
    await env.DB.batch(statements);
  } catch (error) {
    await Promise.all(uploads.map((upload) => env.FILES.delete(upload.key)));
    throw error;
  }

  return Response.json({
    id,
    province,
    city,
    spot,
    visitedAt,
    story,
    summary,
    photoUrl: `/api/photos/${uploads[0].key}`,
    photos: uploads.map((upload) => `/api/photos/${upload.key}`),
  }, { status: 201 });
}
