-- CreateTable
CREATE TABLE `AIGenerationLog` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NULL,
    `language` ENUM('EN', 'AR', 'ES', 'HI', 'UR', 'FR', 'PT', 'ZH', 'RU', 'KO', 'VI', 'TL') NOT NULL,
    `contentType` ENUM('EXPLANATION', 'TRANSLATION', 'MEMORY_TIP') NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `promptTokens` INTEGER NOT NULL,
    `completionTokens` INTEGER NOT NULL,
    `totalTokens` INTEGER NOT NULL,
    `estimatedCostUsd` DOUBLE NULL,
    `durationMs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AIGenerationLog_createdAt_idx`(`createdAt`),
    INDEX `AIGenerationLog_contentType_idx`(`contentType`),
    INDEX `AIGenerationLog_language_idx`(`language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
