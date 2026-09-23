CREATE TABLE `trip_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`photo_key` text NOT NULL,
	`photo_type` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_trip_photos_trip_order` ON `trip_photos` (`trip_id`,`sort_order`);