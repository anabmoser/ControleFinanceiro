/*
  # Add Storage Policies for Public Access

  ## Changes
  1. Create policies for public bucket 'documents'
  2. Allow public access to:
     - Upload files (INSERT)
     - Read files (SELECT)
     - Update files (UPDATE)
     - Delete files (DELETE)

  ## Security
  - No authentication required (public app)
  - All operations allowed on documents bucket
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from documents bucket" ON storage.objects;

-- Policy: Allow anyone to upload to documents bucket
CREATE POLICY "Allow public uploads to documents bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Policy: Allow anyone to read from documents bucket
CREATE POLICY "Allow public reads from documents bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy: Allow anyone to update in documents bucket
CREATE POLICY "Allow public updates to documents bucket"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy: Allow anyone to delete from documents bucket
CREATE POLICY "Allow public deletes from documents bucket"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'documents');
