-- COWEL との連携（COWEL の docs/superpowers/specs/2026-11-04-covow-sync-design.md）。
-- 支出が増える・直る・消えるたびに、その処理と同じ batch で1行書く記録帳。COWEL は seq（増えるだけの番号）の順に読む。
-- payload は変わった後の中身（COWEL が使う項目だけ。メモ・URL は入れない）。delete は payload なし。行は消さずに残す。
CREATE TABLE `expense_changes` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`space_id` text NOT NULL,
	`expense_id` text NOT NULL,
	`op` text NOT NULL CHECK (`op` IN ('upsert', 'delete')),
	`payload` text,
	`created_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `expense_changes_space_seq` ON `expense_changes` (`space_id`, `seq`);
