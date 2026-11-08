-- COWEL との連携の番号と鍵（COWEL の docs/superpowers/plans/2026-11-04-covow-sync.md の Task 4）。
-- 番号は設定で出す8桁（10分・1回限り）、鍵は COWEL が読み取りの窓口に使う。どちらもハッシュ（SHA-256）だけを保存する。
CREATE TABLE `sync_link_codes` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL REFERENCES `spaces`(`id`) ON DELETE CASCADE,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`expires_at` text NOT NULL,
	`used_at` text
);--> statement-breakpoint
CREATE TABLE `sync_links` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL REFERENCES `spaces`(`id`) ON DELETE CASCADE,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`key_hash` text NOT NULL UNIQUE,
	`created_at` text NOT NULL,
	`revoked_at` text
);--> statement-breakpoint
CREATE INDEX `sync_links_space_user` ON `sync_links` (`space_id`, `user_id`);
