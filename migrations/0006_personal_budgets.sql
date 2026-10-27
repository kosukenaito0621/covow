-- 人ごとの予算と割り勘（docs/superpowers/specs/2026-10-27-personal-budgets-design.md）
-- 1. 予定・支出に「払う人・分ける相手・払う人の割合」を足し、今あるデータは「登録した人が 100%」にする
ALTER TABLE `purchase_plans` ADD `payer_user_id` text REFERENCES `users`(`id`);--> statement-breakpoint
ALTER TABLE `purchase_plans` ADD `split_user_id` text REFERENCES `users`(`id`);--> statement-breakpoint
ALTER TABLE `purchase_plans` ADD `payer_ratio` integer DEFAULT 100 NOT NULL CHECK (`payer_ratio` BETWEEN 10 AND 100 AND `payer_ratio` % 10 = 0 AND ((`split_user_id` IS NULL) = (`payer_ratio` = 100)) AND (`split_user_id` IS NULL OR `split_user_id` != `payer_user_id`));--> statement-breakpoint
UPDATE `purchase_plans` SET `payer_user_id` = `created_by`;--> statement-breakpoint
ALTER TABLE `expenses` ADD `payer_user_id` text REFERENCES `users`(`id`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `split_user_id` text REFERENCES `users`(`id`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `payer_ratio` integer DEFAULT 100 NOT NULL CHECK (`payer_ratio` BETWEEN 10 AND 100 AND `payer_ratio` % 10 = 0 AND ((`split_user_id` IS NULL) = (`payer_ratio` = 100)) AND (`split_user_id` IS NULL OR `split_user_id` != `payer_user_id`));--> statement-breakpoint
UPDATE `expenses` SET `payer_user_id` = `recorded_by`;--> statement-breakpoint
-- 2. 予算を「スペース×人×月」にする。今の予算は、そのときのメンバー全員に同じ金額でコピーする
--    （budgets はほかの表から参照されていないので、作り直しても連鎖して消えるデータはない）
CREATE TABLE `budgets_new` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL,
	`user_id` text NOT NULL,
	`year_month` text NOT NULL,
	`budget_amount` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "budgets_amount_check" CHECK("budget_amount" BETWEEN 0 AND 99999999),
	CONSTRAINT "budgets_month_check" CHECK("year_month" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]')
);--> statement-breakpoint
INSERT INTO `budgets_new` (`id`, `space_id`, `user_id`, `year_month`, `budget_amount`, `created_at`, `updated_at`)
  SELECT lower(hex(randomblob(16))), b.`space_id`, m.`user_id`, b.`year_month`, b.`budget_amount`, b.`created_at`, b.`updated_at`
  FROM `budgets` b JOIN `space_members` m ON m.`space_id` = b.`space_id`;--> statement-breakpoint
DROP TABLE `budgets`;--> statement-breakpoint
ALTER TABLE `budgets_new` RENAME TO `budgets`;--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_space_user_month_unique` ON `budgets` (`space_id`,`user_id`,`year_month`);
