/*
  Warnings:

  - Made the column `details` on table `audit` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `audit` MODIFY `details` TEXT NOT NULL;
