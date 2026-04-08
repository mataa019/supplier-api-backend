-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('supplier', 'admin', 'manager', 'viewer') NOT NULL;
