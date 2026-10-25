-- 言語に Mix（骨子は英語・意味を読み取る文とデータは日本語）を足す。
-- 古い locale 列の CHECK は en / ja だけで、SQLite では後から変えられない。表を作り直すと、
-- ユーザーを参照しているログイン情報・メンバー情報まで連鎖して消えてしまう（D1 は外部キーを切れない）ため、
-- 新しい language 列を足して値を写し、以後はこちらを使う。古い locale 列は残すが使わない。
ALTER TABLE `users` ADD `language` text DEFAULT 'en' NOT NULL CHECK (`language` IN ('en','ja','mix'));--> statement-breakpoint
UPDATE `users` SET `language` = `locale`;
