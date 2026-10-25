-- 体験版（ログインせずに試す）。仮のアカウントの印と期限、作った回数の記録。
CREATE TABLE `trial_quota` (
	`key` text NOT NULL,
	`day` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`key`, `day`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `is_guest` integer DEFAULT 0 NOT NULL CHECK (`is_guest` IN (0, 1));--> statement-breakpoint
ALTER TABLE `users` ADD `guest_expires_at` text;--> statement-breakpoint
-- 期限切れの仮のアカウントを毎日探すための索引
CREATE INDEX `users_guest_expiry_idx` ON `users` (`is_guest`, `guest_expires_at`);
