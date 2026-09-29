-- Add per-post pagination visibility for the image carousel.
ALTER TABLE `Post`
  ADD COLUMN `carouselPagination` BOOLEAN NOT NULL DEFAULT true;
