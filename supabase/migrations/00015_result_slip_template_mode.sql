alter table public.lab_settings
  add column if not exists result_slip_template_mode text not null default 'profile';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lab_settings_result_slip_template_mode_check'
  ) then
    alter table public.lab_settings
      add constraint lab_settings_result_slip_template_mode_check
      check (result_slip_template_mode in ('profile', 'letterhead'));
  end if;
end $$;
