CREATE TABLE `expense_category_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`rule` text NOT NULL,
	`category` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rules_user_idx` ON `expense_category_rules` (`user_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`paid_by_user_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`category` text DEFAULT 'miscellaneous' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `pools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `expenses_pool_idx` ON `expenses` (`pool_id`);--> statement-breakpoint
CREATE INDEX `expenses_paid_by_idx` ON `expenses` (`paid_by_user_id`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`friend_user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`friend_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `friendships_user_idx` ON `friendships` (`user_id`);--> statement-breakpoint
CREATE INDEX `friendships_friend_idx` ON `friendships` (`friend_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `friendships_user_friend_unique` ON `friendships` (`user_id`,`friend_user_id`);--> statement-breakpoint
CREATE TABLE `pool_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'PARTICIPANT' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `pools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pool_memberships_pool_idx` ON `pool_memberships` (`pool_id`);--> statement-breakpoint
CREATE INDEX `pool_memberships_user_idx` ON `pool_memberships` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pool_memberships_pool_user_unique` ON `pool_memberships` (`pool_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `pools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pools_created_at_idx` ON `pools` (`created_at`);--> statement-breakpoint
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
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `settlements_pool_idx` ON `settlements` (`pool_id`);--> statement-breakpoint
CREATE INDEX `settlements_from_user_idx` ON `settlements` (`from_user_id`);--> statement-breakpoint
CREATE INDEX `settlements_to_user_idx` ON `settlements` (`to_user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`bio` text,
	`venmo_handle` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);