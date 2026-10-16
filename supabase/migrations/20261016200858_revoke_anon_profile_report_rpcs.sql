-- Supabase's default privileges grant EXECUTE on new public functions to anon
-- directly, so REVOKE ... FROM PUBLIC alone left these three callable without
-- a session. Each one already rejects a null auth.uid(), but anon has no
-- business reaching them (security advisor 0028).
REVOKE EXECUTE ON FUNCTION submit_profile_report(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION review_profile_report(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION list_profile_reports(integer) FROM anon;
