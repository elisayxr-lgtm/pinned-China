import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const placeCovers = sqliteTable('place_covers', {
  id: text('id').primaryKey(),
  scope: text('scope').notNull(),
  province: text('province').notNull(),
  city: text('city').notNull().default(''),
  photoKey: text('photo_key').notNull(),
  photoType: text('photo_type').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_place_covers_location').on(table.scope, table.province, table.city)]);

export const trips = sqliteTable(
  'trips',
  {
    id: text('id').primaryKey(),
    province: text('province').notNull(),
    city: text('city').notNull(),
    spot: text('spot').notNull(),
    visitedAt: text('visited_at').notNull(),
    story: text('story').notNull(),
    summary: text('summary'),
    photoKey: text('photo_key').notNull(),
    photoType: text('photo_type').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_trips_city_visited_at').on(table.city, table.visitedAt),
    index('idx_trips_province').on(table.province),
  ],
);

export const tripPhotos = sqliteTable(
  'trip_photos',
  {
    id: text('id').primaryKey(),
    tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
    photoKey: text('photo_key').notNull(),
    photoType: text('photo_type').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [index('idx_trip_photos_trip_order').on(table.tripId, table.sortOrder)],
);
