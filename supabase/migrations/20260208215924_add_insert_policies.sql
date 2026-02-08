/*
  # Add INSERT policies for data migration

  1. Security Changes
    - Add INSERT policies for trips table (public access for now)
    - Add INSERT policies for source_files table (public access for now)

  Note: In production, these would be restricted to authenticated users
*/

-- Allow public insert for source_files
CREATE POLICY "Allow public insert to source_files"
  ON source_files FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public insert for trips
CREATE POLICY "Allow public insert to trips"
  ON trips FOR INSERT
  TO public
  WITH CHECK (true);
