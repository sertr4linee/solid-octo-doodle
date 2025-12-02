-- AlterTable
ALTER TABLE "board" ADD COLUMN     "backgroundBlur" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backgroundType" TEXT DEFAULT 'color',
ADD COLUMN     "darkMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "theme" TEXT;

-- AlterTable
ALTER TABLE "list" ADD COLUMN     "color" TEXT,
ADD COLUMN     "emoji" TEXT;

-- AlterTable
ALTER TABLE "task" ADD COLUMN     "coverColor" TEXT,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "emoji" TEXT;

-- CreateTable
CREATE TABLE "task_reaction" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_reaction_taskId_userId_emoji_key" ON "task_reaction"("taskId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "task_reaction" ADD CONSTRAINT "task_reaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reaction" ADD CONSTRAINT "task_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
