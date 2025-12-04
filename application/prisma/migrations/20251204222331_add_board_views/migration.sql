-- AlterTable
ALTER TABLE "board" ADD COLUMN     "defaultView" TEXT NOT NULL DEFAULT 'kanban';

-- CreateTable
CREATE TABLE "board_view" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_view_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "board_view" ADD CONSTRAINT "board_view_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
