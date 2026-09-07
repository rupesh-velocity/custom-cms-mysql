-- Add an editable public author biography to CMS users.
SET @schema_name := DATABASE();
SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'User'
      AND COLUMN_NAME = 'bio'
  ),
  'SELECT 1',
  'ALTER TABLE `User` ADD COLUMN `bio` LONGTEXT NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
