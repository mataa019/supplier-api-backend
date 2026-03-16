-- CreateTable
CREATE TABLE `formtemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `schema` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `formtemplate_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `category`
    ADD COLUMN `templateId` VARCHAR(191) NULL,
    MODIFY `documentTemplate` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `application`
    ADD COLUMN `templateId` VARCHAR(191) NULL,
    ADD COLUMN `responses` JSON NULL;

-- AddForeignKey
ALTER TABLE `category` ADD CONSTRAINT `Category_templateId_fkey`
    FOREIGN KEY (`templateId`) REFERENCES `formtemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application` ADD CONSTRAINT `Application_templateId_fkey`
    FOREIGN KEY (`templateId`) REFERENCES `formtemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
