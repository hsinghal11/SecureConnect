/*
  Warnings:

  - You are about to drop the column `chatName` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `groupPic` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `isGroupChat` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `latestMessage` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the `_GroupAdmins` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `content` on the `Message` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_chatId_fkey";

-- DropForeignKey
ALTER TABLE "_GroupAdmins" DROP CONSTRAINT "_GroupAdmins_A_fkey";

-- DropForeignKey
ALTER TABLE "_GroupAdmins" DROP CONSTRAINT "_GroupAdmins_B_fkey";

-- DropIndex
DROP INDEX "Message_senderId_chatId_idx";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "chatName",
DROP COLUMN "groupPic",
DROP COLUMN "isGroupChat",
DROP COLUMN "latestMessage";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- DropTable
DROP TABLE "_GroupAdmins";
