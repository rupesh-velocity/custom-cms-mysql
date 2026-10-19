-- Add one-time access reminder tracking.
-- Used to avoid sending the same 15-day reminder email multiple times.
ALTER TABLE `UserCourseAccess`
ADD COLUMN `renewalReminderSentAt` DATETIME(3) NULL;
