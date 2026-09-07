-- Ensure SEO Redirections / 404 Monitor storage matches the current Prisma schema.
-- Safe for imported/evolved MySQL databases where old migrations were marked as applied.
SET @schema_name := DATABASE();

CREATE TABLE IF NOT EXISTS `Redirection` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `sourceUrl` LONGTEXT NOT NULL,
  `ignoreCase` BOOLEAN NOT NULL DEFAULT false,
  `destinationUrl` LONGTEXT NOT NULL,
  `redirectType` VARCHAR(191) NOT NULL DEFAULT '301',
  `status` BOOLEAN NOT NULL DEFAULT true,
  `hits` INTEGER NOT NULL DEFAULT 0,
  `lastAccessed` DATETIME(3) NULL,
  `category` VARCHAR(191) NOT NULL DEFAULT 'Uncategorized',
  `isTrashed` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='Redirection' AND COLUMN_NAME='hits'), 'SELECT 1', 'ALTER TABLE `Redirection` ADD COLUMN `hits` INTEGER NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='Redirection' AND COLUMN_NAME='lastAccessed'), 'SELECT 1', 'ALTER TABLE `Redirection` ADD COLUMN `lastAccessed` DATETIME(3) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='Redirection' AND COLUMN_NAME='category'), 'SELECT 1', 'ALTER TABLE `Redirection` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT ''Uncategorized''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@schema_name AND TABLE_NAME='Redirection' AND COLUMN_NAME='isTrashed'), 'SELECT 1', 'ALTER TABLE `Redirection` ADD COLUMN `isTrashed` BOOLEAN NOT NULL DEFAULT false');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `NotFoundLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `url` VARCHAR(191) NOT NULL,
  `hits` INTEGER NOT NULL DEFAULT 1,
  `lastAccessed` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `NotFoundLog_url_key`(`url`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
