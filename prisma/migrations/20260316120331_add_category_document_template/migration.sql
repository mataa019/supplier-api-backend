/*
  Warnings:

  - You are about to drop the column `responses` on the `application` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `application` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `category` table. All the data in the column will be lost.
  - You are about to drop the `formtemplate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `Requirements` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `application` DROP FOREIGN KEY `Application_templateId_fkey`;

-- DropForeignKey
ALTER TABLE `category` DROP FOREIGN KEY `Category_templateId_fkey`;

-- AlterTable
ALTER TABLE `application` DROP COLUMN `responses`,
    DROP COLUMN `templateId`;

-- AlterTable
ALTER TABLE `category` DROP COLUMN `templateId`,
    ADD COLUMN `Requirements` VARCHAR(191) NOT NULL,
    MODIFY `documentTemplate` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `formtemplate`;
