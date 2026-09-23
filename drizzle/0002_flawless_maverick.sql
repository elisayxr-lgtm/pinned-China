CREATE TABLE `place_covers` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`province` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`photo_key` text NOT NULL,
	`photo_type` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_place_covers_location` ON `place_covers` (`scope`,`province`,`city`);