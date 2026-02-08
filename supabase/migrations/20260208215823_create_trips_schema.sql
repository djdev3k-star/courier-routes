/*
  # LastMile Ledger - Trips Schema

  1. New Tables
    - `trips` - Atomic trip records (no derived metrics)
      - `trip_id` (uuid, primary key, auto-generated)
      - `external_trip_id` (text, nullable, platform's trip ID)
      - `platform` (text, uber_eats, doordash, etc.)
      - `driver_id` (text, hashed/anonymized identifier)
      - `timestamp_start` (timestamptz, trip request time)
      - `timestamp_end` (timestamptz, trip completion time)
      - `restaurant` (text, restaurant name)
      - `pickup_address` (text, full pickup address)
      - `pickup_lat` (numeric, pickup latitude)
      - `pickup_lng` (numeric, pickup longitude)
      - `dropoff_address` (text, full dropoff address)
      - `dropoff_lat` (numeric, dropoff latitude)
      - `dropoff_lng` (numeric, dropoff longitude)
      - `gross_pay` (numeric, total pay before deductions)
      - `base_fare` (numeric, base delivery fee)
      - `tips` (numeric, customer tips)
      - `bonuses` (numeric, incentives + quests)
      - `fees` (numeric, order refunds/adjustments)
      - `net_earnings` (numeric, computed as gross_pay + tips + bonuses - fees)
      - `distance` (numeric, miles)
      - `duration` (interval, trip duration)
      - `service_type` (text, rush/standard/etc.)
      - `product_type` (text, Eats/Delivery/etc.)
      - `status` (text, completed/canceled/etc.)
      - `source_file_id` (uuid, nullable, audit trail)
      - `created_at` (timestamptz, record creation time)

    - `source_files` - Import audit trail
      - `id` (uuid, primary key)
      - `filename` (text, original file name)
      - `imported_at` (timestamptz, import timestamp)
      - `record_count` (integer, number of trips imported)

  2. Security
    - Enable RLS on all tables
    - Public read access for demo (can be restricted per driver later)

  3. Indexes
    - Index on timestamp_start for date range queries
    - Index on restaurant for filtering
    - Index on external_trip_id for deduplication
*/

-- Create source_files table for audit trail
CREATE TABLE IF NOT EXISTS source_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  imported_at timestamptz DEFAULT now(),
  record_count integer DEFAULT 0
);

-- Create trips table (atomic, no derived metrics)
CREATE TABLE IF NOT EXISTS trips (
  trip_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_trip_id text,
  platform text NOT NULL DEFAULT 'uber_eats',
  driver_id text NOT NULL DEFAULT 'default_driver',
  timestamp_start timestamptz NOT NULL,
  timestamp_end timestamptz NOT NULL,
  restaurant text NOT NULL,
  pickup_address text NOT NULL,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_address text NOT NULL,
  dropoff_lat numeric,
  dropoff_lng numeric,
  gross_pay numeric NOT NULL DEFAULT 0,
  base_fare numeric NOT NULL DEFAULT 0,
  tips numeric NOT NULL DEFAULT 0,
  bonuses numeric NOT NULL DEFAULT 0,
  fees numeric NOT NULL DEFAULT 0,
  net_earnings numeric NOT NULL DEFAULT 0,
  distance numeric NOT NULL DEFAULT 0,
  duration interval NOT NULL,
  service_type text DEFAULT 'standard',
  product_type text DEFAULT 'Eats',
  status text NOT NULL DEFAULT 'completed',
  source_file_id uuid REFERENCES source_files(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_earnings CHECK (gross_pay >= 0),
  CONSTRAINT valid_distance CHECK (distance >= 0),
  CONSTRAINT valid_timestamps CHECK (timestamp_end >= timestamp_start)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trips_timestamp_start ON trips(timestamp_start);
CREATE INDEX IF NOT EXISTS idx_trips_restaurant ON trips(restaurant);
CREATE INDEX IF NOT EXISTS idx_trips_external_id ON trips(external_trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_files ENABLE ROW LEVEL SECURITY;

-- Public read access (for demo - can restrict to authenticated users later)
CREATE POLICY "Allow public read access to trips"
  ON trips FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to source_files"
  ON source_files FOR SELECT
  TO public
  USING (true);

-- Create view for daily stats (computed, not stored)
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
  DATE(timestamp_start) as date,
  COUNT(*) as trip_count,
  SUM(net_earnings) as total_earnings,
  SUM(tips) as total_tips,
  SUM(distance) as total_distance,
  AVG(net_earnings) as avg_earnings_per_trip,
  SUM(EXTRACT(EPOCH FROM duration)) / 3600 as total_hours
FROM trips
WHERE status = 'completed'
GROUP BY DATE(timestamp_start)
ORDER BY date DESC;

-- Create view for restaurant performance (computed, not stored)
CREATE OR REPLACE VIEW restaurant_stats AS
SELECT 
  restaurant,
  COUNT(*) as trip_count,
  SUM(net_earnings) as total_earnings,
  AVG(net_earnings) as avg_earnings_per_trip,
  SUM(distance) as total_distance,
  AVG(distance) as avg_distance
FROM trips
WHERE status = 'completed'
GROUP BY restaurant
ORDER BY trip_count DESC;
