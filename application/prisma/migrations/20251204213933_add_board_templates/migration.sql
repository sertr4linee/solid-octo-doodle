-- CreateTable
CREATE TABLE "board_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "coverImage" TEXT,
    "isPredefined" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variables" TEXT,
    "createdById" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_list" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT,
    "emoji" TEXT,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "template_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "emoji" TEXT,
    "coverColor" TEXT,
    "coverImage" TEXT,
    "labels" TEXT,
    "variables" TEXT,
    "listId" TEXT NOT NULL,

    CONSTRAINT "template_task_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "template_list" ADD CONSTRAINT "template_list_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "board_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_task" ADD CONSTRAINT "template_task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "template_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;
