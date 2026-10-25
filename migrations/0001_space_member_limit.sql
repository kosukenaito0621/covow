-- 1つのスペースは最大2人。API の検証に加えて DB でも保証する（同時参加でも3人目が入らない）。
CREATE TRIGGER `space_members_limit`
BEFORE INSERT ON `space_members`
WHEN (SELECT COUNT(*) FROM `space_members` WHERE `space_id` = NEW.`space_id`) >= 2
BEGIN
  SELECT RAISE(ABORT, 'SPACE_FULL');
END;
