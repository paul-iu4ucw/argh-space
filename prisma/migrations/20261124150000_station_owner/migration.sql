-- Stazioni create dagli utenti: hanno un proprietario e devono essere approvate dall'admin prima di comparire nella dashboard.
-- Le stazioni esistenti (create dall'admin) restano approvate.
ALTER TABLE "rfi_stations" ADD COLUMN "owner_id" INTEGER;
ALTER TABLE "rfi_stations" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "rfi_stations_owner_id_idx" ON "rfi_stations"("owner_id");
ALTER TABLE "rfi_stations" ADD CONSTRAINT "rfi_stations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
