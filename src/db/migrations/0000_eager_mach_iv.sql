CREATE TABLE `context_memory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`category` text DEFAULT 'fact' NOT NULL,
	`importance` integer DEFAULT 5,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `context_memory_key_unique` ON `context_memory` (`key`);--> statement-breakpoint
CREATE TABLE `insights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`type` text DEFAULT 'opportunity_alert' NOT NULL,
	`priority` text DEFAULT 'medium',
	`is_read` integer DEFAULT false,
	`is_sent_to_telegram` integer DEFAULT false,
	`created_at` integer,
	`related_task_id` integer,
	`related_opportunity_id` integer
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`channel` text DEFAULT 'web' NOT NULL,
	`session_id` text NOT NULL,
	`created_at` integer,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`type` text DEFAULT 'side_hustle' NOT NULL,
	`stage` text DEFAULT 'identified' NOT NULL,
	`estimated_revenue` real,
	`actual_revenue` real,
	`time_to_revenue_days` integer,
	`effort_level` text DEFAULT 'medium',
	`notes` text,
	`action_items` text,
	`created_at` integer,
	`updated_at` integer,
	`source` text DEFAULT 'assistant'
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`category` text DEFAULT 'personal' NOT NULL,
	`due_at` integer,
	`completed_at` integer,
	`created_at` integer,
	`updated_at` integer,
	`source` text DEFAULT 'manual',
	`telegram_message_id` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `telegram_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` text NOT NULL,
	`username` text,
	`first_name` text,
	`session_data` text,
	`is_authorized` integer DEFAULT false,
	`created_at` integer,
	`last_seen_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_sessions_chat_id_unique` ON `telegram_sessions` (`chat_id`);