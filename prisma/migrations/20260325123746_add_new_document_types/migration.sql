/*
  Warnings:

  - The values [bank_letter,insurance,other] on the enum `Document_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `document` MODIFY `type` ENUM('application_form', 'business_registration', 'tax_certificate', 'company_profile', 'references') NOT NULL;
