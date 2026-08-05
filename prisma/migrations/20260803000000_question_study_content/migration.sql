-- AlterTable
-- Additive and defaulted, so existing users keep working with English.
ALTER TABLE `User`
    ADD COLUMN `studyLanguage` ENUM('EN', 'AR', 'ES', 'HI', 'UR', 'FR', 'PT', 'ZH', 'RU', 'KO', 'VI', 'TL') NOT NULL DEFAULT 'EN';

-- CreateTable
-- utf8mb4 matches the rest of the schema and is required here: this table
-- stores Arabic, Chinese, Korean, Hindi and Urdu text.
--
-- Status and provenance are per content type, because the three kinds of
-- content on a row are generated independently and can legitimately be in
-- different states and produced by different models.
CREATE TABLE `QuestionStudyContent` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `language` ENUM('EN', 'AR', 'ES', 'HI', 'UR', 'FR', 'PT', 'ZH', 'RU', 'KO', 'VI', 'TL') NOT NULL,

    `explanation` TEXT NULL,
    `translatedQuestion` TEXT NULL,
    `translatedAnswer` TEXT NULL,
    `memoryTip` TEXT NULL,

    `explanationStatus` ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `explanationAiVersion` VARCHAR(191) NULL,
    `explanationGeneratedAt` DATETIME(3) NULL,
    `explanationDurationMs` INTEGER NULL,

    `translationStatus` ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `translationAiVersion` VARCHAR(191) NULL,
    `translationGeneratedAt` DATETIME(3) NULL,
    `translationDurationMs` INTEGER NULL,

    `memoryTipStatus` ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `memoryTipAiVersion` VARCHAR(191) NULL,
    `memoryTipGeneratedAt` DATETIME(3) NULL,
    `memoryTipDurationMs` INTEGER NULL,

    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `QuestionStudyContent_questionId_idx`(`questionId`),
    UNIQUE INDEX `QuestionStudyContent_questionId_language_key`(`questionId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyActionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `action` ENUM('EXPLANATION', 'TRANSLATION', 'MEMORY_TIP', 'LISTEN') NOT NULL,
    `language` ENUM('EN', 'AR', 'ES', 'HI', 'UR', 'FR', 'PT', 'ZH', 'RU', 'KO', 'VI', 'TL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudyActionEvent_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `StudyActionEvent_questionId_action_idx`(`questionId`, `action`),
    INDEX `StudyActionEvent_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuestionStudyContent` ADD CONSTRAINT `QuestionStudyContent_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyActionEvent` ADD CONSTRAINT `StudyActionEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyActionEvent` ADD CONSTRAINT `StudyActionEvent_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
