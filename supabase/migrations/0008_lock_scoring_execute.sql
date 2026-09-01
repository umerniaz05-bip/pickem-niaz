-- Supabase ships ALTER DEFAULT PRIVILEGES that grant EXECUTE on every new
-- public function to anon + authenticated. `revoke ... from public` in 0005
-- did not remove those role-specific grants, so an authenticated user could
-- call the SECURITY DEFINER scoring functions directly. Revoke explicitly.

revoke execute on function public.score_game(uuid) from anon, authenticated;
revoke execute on function public.refresh_week_totals(int, int) from anon, authenticated;
revoke execute on function public.finalize_week(int, int) from anon, authenticated;
revoke execute on function public.rescore_week(int, int) from anon, authenticated;

-- Trusted server code only.
grant execute on function public.score_game(uuid) to service_role;
grant execute on function public.finalize_week(int, int) to service_role;
grant execute on function public.rescore_week(int, int) to service_role;
