-- Super administrators can manage staff profiles in their laboratory.

create policy "profiles_update_super_admin_same_lab"
  on public.profiles for update to authenticated
  using (
    laboratory_id = public.current_laboratory_id()
    and public.current_user_role() = 'super_admin'
  )
  with check (
    laboratory_id = public.current_laboratory_id()
    and public.current_user_role() = 'super_admin'
  );

create policy "profiles_insert_super_admin_same_lab"
  on public.profiles for insert to authenticated
  with check (
    laboratory_id = public.current_laboratory_id()
    and public.current_user_role() = 'super_admin'
  );
