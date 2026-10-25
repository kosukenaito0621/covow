-- 1つのスペースは最大4人（ひとり・ペア・グループで使えるように、2人から広げる）。
-- API の確認に加えて DB でも保証する（同時に参加しても5人目は入らない）。
DROP TRIGGER IF EXISTS `space_members_limit`;--> statement-breakpoint
CREATE TRIGGER `space_members_limit`
BEFORE INSERT ON `space_members`
WHEN (SELECT COUNT(*) FROM `space_members` WHERE `space_id` = NEW.`space_id`) >= 4
BEGIN
  SELECT RAISE(ABORT, 'SPACE_FULL');
END;
