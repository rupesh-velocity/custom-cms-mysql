-- Align CourseSubscription table with the current Prisma schema.
-- The first live migration created CourseSubscription without orderId, but the schema and admin UI use it.

ALTER TABLE `CourseSubscription`
  ADD COLUMN `orderId` INTEGER NULL;

CREATE INDEX `CourseSubscription_orderId_idx` ON `CourseSubscription`(`orderId`);

ALTER TABLE `CourseSubscription`
  ADD CONSTRAINT `CourseSubscription_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
