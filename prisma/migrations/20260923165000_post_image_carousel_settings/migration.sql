-- Add per-post carousel display settings without changing existing carousel images.
ALTER TABLE `Post`
  ADD COLUMN `carouselHeading` VARCHAR(191) NULL,
  ADD COLUMN `carouselSlidesPerView` INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN `carouselAutoplay` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `carouselAutoplayDelay` INTEGER NOT NULL DEFAULT 3000;
