-- 画面の言語とテーマをアカウントに保存する。決まった値以外は DB でも受け付けない（API の検証に加えた二重の守り）。
ALTER TABLE `users` ADD `locale` text DEFAULT 'en' NOT NULL CHECK (`locale` IN ('en','ja'));--> statement-breakpoint
ALTER TABLE `users` ADD `theme` text DEFAULT 'aurora' NOT NULL CHECK (`theme` IN ('aurora','earthy','tropical','dusk','sakura','frost'));
