/*
  Warnings:

  - You are about to drop the `NewPrescription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NewPrescription" DROP CONSTRAINT "NewPrescription_userId_fkey";

-- DropTable
DROP TABLE "NewPrescription";
