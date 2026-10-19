-- CreateTable
CREATE TABLE `CourseSubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `courseId` INTEGER NOT NULL,
    `courseAccessPlanId` INTEGER NULL,
    `stripeCustomerId` VARCHAR(191) NULL,
    `stripeSubscriptionId` VARCHAR(191) NOT NULL,
    `stripePriceId` VARCHAR(191) NULL,
    `latestInvoiceId` VARCHAR(191) NULL,
    `latestPaymentIntentId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `currentPeriodStart` DATETIME(3) NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `canceledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CourseSubscription_stripeSubscriptionId_key`(`stripeSubscriptionId`),
    INDEX `CourseSubscription_userId_idx`(`userId`),
    INDEX `CourseSubscription_courseId_idx`(`courseId`),
    INDEX `CourseSubscription_courseAccessPlanId_idx`(`courseAccessPlanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CourseSubscription` ADD CONSTRAINT `CourseSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseSubscription` ADD CONSTRAINT `CourseSubscription_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseSubscription` ADD CONSTRAINT `CourseSubscription_courseAccessPlanId_fkey` FOREIGN KEY (`courseAccessPlanId`) REFERENCES `CourseAccessPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
