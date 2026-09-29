-- Add a post-specific image carousel. Images reference the existing Media library,
-- and are deleted automatically when their post or media item is removed.
CREATE TABLE `PostCarouselImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postId` INTEGER NOT NULL,
    `mediaId` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `caption` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PostCarouselImage_postId_mediaId_key`(`postId`, `mediaId`),
    INDEX `PostCarouselImage_postId_sortOrder_idx`(`postId`, `sortOrder`),
    INDEX `PostCarouselImage_mediaId_idx`(`mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PostCarouselImage`
  ADD CONSTRAINT `PostCarouselImage_postId_fkey`
  FOREIGN KEY (`postId`) REFERENCES `Post`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PostCarouselImage`
  ADD CONSTRAINT `PostCarouselImage_mediaId_fkey`
  FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
