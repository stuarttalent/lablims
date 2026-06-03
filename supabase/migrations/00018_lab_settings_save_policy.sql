-- Allow lab managers (and admins) to save lab profile / settings for their laboratory.

drop policy if exists "lab_settings_update_admin" on public.lab_settings;

create policy "lab_settings_update_privileged"
  on public.lab_settings
  for update
  to authenticated
  using (
    laboratory_id = public.current_laboratory_id()
    and public.current_user_role() in ('admin', 'super_admin', 'lab_manager')
  )
  with check (
    laboratory_id = public.current_laboratory_id()
    and public.current_user_role() in ('admin', 'super_admin', 'lab_manager')
  );

create policy "lab_settings_insert_privileged"
  on public.lab_settings
  for insert
  to authenticated
  with check (
    laboratory_id = public.current_laboratory_id()
    and public.current_user_role() in ('admin', 'super_admin', 'lab_manager')
  );
