-- CreateTable
CREATE TABLE "user" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "email_address" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "user_type" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_address_key" ON "user"("email_address");
