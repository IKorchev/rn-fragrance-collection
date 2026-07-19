-- Header photo uploads now go through the upload-header-photo edge function,
-- which runs an NSFWJS scan before anything is stored (service-role upload).
-- Dropping the client INSERT policy makes the function the only write path —
-- same reasoning as wear_events' REVOKE. SELECT (owner listing) and DELETE
-- (the client-side "remove photo" flow) stay.
DROP POLICY IF EXISTS "own profile header insert" ON storage.objects;
