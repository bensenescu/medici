-- Add settlements table for individual debt payments
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text NOT NULL,
	`amount` real NOT NULL,
	`note` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_by_user_id` text NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `pools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `settlements_pool_idx` ON `settlements` (`pool_id`);
--> statement-breakpoint
CREATE INDEX `settlements_from_user_idx` ON `settlements` (`from_user_id`);
--> statement-breakpoint
CREATE INDEX `settlements_to_user_idx` ON `settlements` (`to_user_id`);
