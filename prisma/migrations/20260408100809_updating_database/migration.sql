-- AddForeignKey
ALTER TABLE `audit` ADD CONSTRAINT `audit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
