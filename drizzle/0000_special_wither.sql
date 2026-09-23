CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`province` text NOT NULL,
	`city` text NOT NULL,
	`spot` text NOT NULL,
	`visited_at` text NOT NULL,
	`story` text NOT NULL,
	`photo_key` text NOT NULL,
	`photo_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_trips_city_visited_at` ON `trips` (`city`,`visited_at`);--> statement-breakpoint
CREATE INDEX `idx_trips_province` ON `trips` (`province`);