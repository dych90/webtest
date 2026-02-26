-- 创建用户表
CREATE TABLE IF NOT EXISTS `User` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL DEFAULT 'admin',
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `User_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建学生表
CREATE TABLE IF NOT EXISTS `Student` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `gender` VARCHAR(191),
  `age` INT,
  `phone` VARCHAR(191),
  `parentName` VARCHAR(191),
  `parentPhone` VARCHAR(191),
  `notes` TEXT,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建课程类型表
CREATE TABLE IF NOT EXISTS `CourseType` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `duration` INT NOT NULL,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建收费标准表
CREATE TABLE IF NOT EXISTS `FeeStandard` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT,
  `courseTypeId` INT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `effectiveDate` DATETIME,
  `expireDate` DATETIME,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`courseTypeId`) REFERENCES `CourseType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建缴费记录表
CREATE TABLE IF NOT EXISTS `Payment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT NOT NULL,
  `paymentType` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `bonusLessons` INT NOT NULL DEFAULT 0,
  `totalLessons` DECIMAL(10, 2) NOT NULL,
  `unitPrice` DECIMAL(10, 2) NOT NULL,
  `paymentDate` DATETIME,
  `notes` TEXT,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建课程表
CREATE TABLE IF NOT EXISTS `Course` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT NOT NULL,
  `courseTypeId` INT NOT NULL,
  `startTime` DATETIME,
  `endTime` DATETIME,
  `isRecurring` BOOLEAN NOT NULL DEFAULT 0,
  `recurringPattern` VARCHAR(191),
  `status` VARCHAR(191) NOT NULL DEFAULT 'normal',
  `originalTime` DATETIME,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (`courseTypeId`) REFERENCES `CourseType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建消课记录表
CREATE TABLE IF NOT EXISTS `LessonRecord` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `courseId` INT NOT NULL,
  `studentId` INT NOT NULL,
  `lessonsConsumed` DECIMAL(10, 2) NOT NULL,
  `lessonContent` TEXT,
  `isDeducted` BOOLEAN NOT NULL DEFAULT 0,
  `notes` TEXT,
  `recordDate` DATETIME,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建曲目表
CREATE TABLE IF NOT EXISTS `Repertoire` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT NOT NULL,
  `pieceName` VARCHAR(191) NOT NULL,
  `recordDate` DATETIME,
  `notes` TEXT,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建课费余额表
CREATE TABLE IF NOT EXISTS `LessonBalance` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT NOT NULL,
  `remainingLessons` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `lastUpdated` DATETIME,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `LessonBalance_studentId_key` (`studentId`),
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建提醒表
CREATE TABLE IF NOT EXISTS `Reminder` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(191) NOT NULL,
  `courseId` INT,
  `studentId` INT,
  `reminderTime` DATETIME,
  `isRead` BOOLEAN NOT NULL DEFAULT 0,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入管理员账户（密码：admin123，已使用bcrypt加密）
INSERT INTO `User` (`username`, `password`, `role`, `createdAt`, `updatedAt`) VALUES 
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7Q92V3xUJvQvYQvYvYvY', 'admin', NOW(), NOW())
ON DUPLICATE KEY UPDATE `username`=`username`;

-- 插入课程类型
INSERT INTO `CourseType` (`id`, `name`, `duration`, `createdAt`, `updatedAt`) VALUES 
(1, '一对一（45分钟）', 45, NOW(), NOW()),
(2, '一对一（60分钟）', 60, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name`=`name`;
