-- Fitnessarts CMS add-ons merge
-- Safe for an existing/evolved MySQL/MariaDB database:
-- each added column is checked before ALTER TABLE runs.

SET @schema_name := DATABASE();

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'User'
      AND COLUMN_NAME = 'phone'
  ),
  'SELECT 1',
  'ALTER TABLE `User` ADD COLUMN `phone` VARCHAR(191) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'User'
      AND COLUMN_NAME = 'twilioTwoFactorEnabled'
  ),
  'SELECT 1',
  'ALTER TABLE `User` ADD COLUMN `twilioTwoFactorEnabled` BOOLEAN NOT NULL DEFAULT false'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'Media'
      AND COLUMN_NAME = 'originalFilename'
  ),
  'SELECT 1',
  'ALTER TABLE `Media` ADD COLUMN `originalFilename` VARCHAR(191) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'Media'
      AND COLUMN_NAME = 'originalMimeType'
  ),
  'SELECT 1',
  'ALTER TABLE `Media` ADD COLUMN `originalMimeType` VARCHAR(191) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'Media'
      AND COLUMN_NAME = 'originalSize'
  ),
  'SELECT 1',
  'ALTER TABLE `Media` ADD COLUMN `originalSize` INTEGER NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'Media'
      AND COLUMN_NAME = 'originalUrl'
  ),
  'SELECT 1',
  'ALTER TABLE `Media` ADD COLUMN `originalUrl` VARCHAR(191) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'Media'
      AND COLUMN_NAME = 'optimized'
  ),
  'SELECT 1',
  'ALTER TABLE `Media` ADD COLUMN `optimized` BOOLEAN NOT NULL DEFAULT false'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `Revision` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `contentType` VARCHAR(191) NOT NULL,
  `contentId` INTEGER NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `snapshot` LONGTEXT NOT NULL,
  `authorId` INTEGER NULL,
  `authorName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Revision_contentType_contentId_createdAt_idx`(`contentType`, `contentId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Popup` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `contentHtml` LONGTEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
  `triggerType` VARCHAR(191) NOT NULL DEFAULT 'delay',
  `delaySeconds` INTEGER NOT NULL DEFAULT 3,
  `scrollPercent` INTEGER NOT NULL DEFAULT 50,
  `displayMode` VARCHAR(191) NOT NULL DEFAULT 'all',
  `pageRules` LONGTEXT NULL,
  `startAt` DATETIME(3) NULL,
  `endAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Popup_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Setting` (`key`,`value`,`createdAt`,`updatedAt`) VALUES
('addon_image_optimization_enabled','true',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('image_optimize_new_uploads','true',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('image_convert_webp','true',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('image_quality','82',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('image_max_width','2560',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('image_keep_originals','true',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_revisions_enabled','true',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('revision_max_per_item','20',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_smtp_enabled','true',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_google_reviews_enabled','false',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_backup_restore_enabled','false',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_maintenance_enabled','false',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_analytics_enabled','false',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_cookie_consent_enabled','false',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_popup_builder_enabled','false',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_twilio_enabled','false',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
('addon_import_export_enabled','false',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `key`=VALUES(`key`);
