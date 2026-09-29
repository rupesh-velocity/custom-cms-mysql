ALTER TABLE `Course` ADD COLUMN `pricingType` VARCHAR(191) NOT NULL DEFAULT 'SIMPLE';

CREATE TABLE `CourseAccessPlan` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `courseId` INTEGER NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `durationMonths` INTEGER NOT NULL,
  `regularPrice` DOUBLE NOT NULL,
  `salePrice` DOUBLE NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `CourseAccessPlan_courseId_sortOrder_idx`(`courseId`, `sortOrder`),
  CONSTRAINT `CourseAccessPlan_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OrderItem` ADD COLUMN `courseId` INTEGER NULL,
  ADD COLUMN `courseAccessPlanId` INTEGER NULL;
ALTER TABLE `UserCourseAccess` ADD COLUMN `courseAccessPlanId` INTEGER NULL,
  ADD COLUMN `orderId` INTEGER NULL,
  ADD COLUMN `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `expiresAt` DATETIME(3) NULL,
  ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'legacy',
  ADD COLUMN `adminNote` LONGTEXT NULL,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

CREATE INDEX `OrderItem_courseId_idx` ON `OrderItem`(`courseId`);
CREATE INDEX `OrderItem_courseAccessPlanId_idx` ON `OrderItem`(`courseAccessPlanId`);
CREATE INDEX `UserCourseAccess_courseAccessPlanId_idx` ON `UserCourseAccess`(`courseAccessPlanId`);
CREATE INDEX `UserCourseAccess_orderId_idx` ON `UserCourseAccess`(`orderId`);

ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_courseAccessPlanId_fkey` FOREIGN KEY (`courseAccessPlanId`) REFERENCES `CourseAccessPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `UserCourseAccess` ADD CONSTRAINT `UserCourseAccess_courseAccessPlanId_fkey` FOREIGN KEY (`courseAccessPlanId`) REFERENCES `CourseAccessPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `UserCourseAccess` ADD CONSTRAINT `UserCourseAccess_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
