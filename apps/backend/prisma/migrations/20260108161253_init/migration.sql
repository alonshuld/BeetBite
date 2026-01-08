/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Corporation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Corporation_name_key" ON "Corporation"("name");
