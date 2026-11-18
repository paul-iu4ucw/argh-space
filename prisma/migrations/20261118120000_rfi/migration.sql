-- CreateTable
CREATE TABLE "rfi_stations" (
    "id" SERIAL NOT NULL,
    "station_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "alt_m" DOUBLE PRECISION,
    "api_key_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "rfi_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfi_reports" (
    "id" SERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "schema" TEXT,
    "sweeps" INTEGER,
    "quality_index" DOUBLE PRECISION,
    "quality_class" TEXT,
    "occupancy_protected_pct" DOUBLE PRECISION,
    "occupancy_hi_window_pct" DOUBLE PRECISION,
    "occupancy_adjacent_pct" DOUBLE PRECISION,
    "noise_floor_dbfs" DOUBLE PRECISION,
    "noise_rise_db" DOUBLE PRECISION,
    "rfi_events_protected" INTEGER,
    "impulsive_pct" DOUBLE PRECISION,
    "max_excess_protected_db" DOUBLE PRECISION,
    "max_excess_adjacent_db" DOUBLE PRECISION,
    "cpu_temp_c" DOUBLE PRECISION,
    "uptime_h" DOUBLE PRECISION,
    "raw_json" JSONB NOT NULL,

    CONSTRAINT "rfi_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfi_signals" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "freq_mhz" DOUBLE PRECISION NOT NULL,
    "occupancy_pct" DOUBLE PRECISION NOT NULL,
    "max_excess_db" DOUBLE PRECISION NOT NULL,
    "in_protected_band" BOOLEAN NOT NULL,

    CONSTRAINT "rfi_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rfi_stations_station_id_key" ON "rfi_stations"("station_id");
CREATE UNIQUE INDEX "rfi_stations_api_key_hash_key" ON "rfi_stations"("api_key_hash");
CREATE UNIQUE INDEX "rfi_reports_station_id_period_start_key" ON "rfi_reports"("station_id", "period_start");
CREATE INDEX "rfi_reports_period_start_idx" ON "rfi_reports"("period_start");
CREATE INDEX "rfi_reports_valid_period_start_idx" ON "rfi_reports"("valid", "period_start");
CREATE INDEX "rfi_signals_report_id_idx" ON "rfi_signals"("report_id");
CREATE INDEX "rfi_signals_freq_mhz_idx" ON "rfi_signals"("freq_mhz");

-- AddForeignKey
ALTER TABLE "rfi_reports" ADD CONSTRAINT "rfi_reports_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "rfi_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rfi_signals" ADD CONSTRAINT "rfi_signals_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "rfi_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
