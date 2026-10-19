-- Mirai Academic OS: schema, row-level security and the confirm_session function.
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to re-run: it drops and recreates the app tables (public schema only; auth users are untouched).

-- Safety check: refuse to run if a table with one of these names exists but was NOT created by this script.
-- (Tables made by this script carry the comment 'mirai-academic-os'.) This protects any other data in your project.
do $$
declare t text;
begin
  foreach t in array array['campuses','batches','faculty','subjects','topics','slots','holidays','sessions','session_topics',
                           'quiz_attempts','notifications','notification_reads','profiles'] loop
    if to_regclass('public.' || t) is not null
       and coalesce(obj_description(to_regclass('public.' || t), 'pg_class'), '') <> 'mirai-academic-os' then
      raise exception 'Stopped: table public.% already exists and was not created by Mirai. Nothing was changed. Use a new Supabase project or rename that table first.', t;
    end if;
  end loop;
end $$;

drop table if exists public.notification_reads, public.notifications, public.quiz_attempts,
  public.session_topics, public.sessions, public.slots, public.topics, public.subjects,
  public.holidays, public.faculty, public.batches, public.campuses, public.profiles cascade;
drop view if exists public.faculty_public;
drop function if exists public.confirm_session(jsonb);
drop function if exists public.can_see_subject(text);
drop function if exists public.my_role(); drop function if exists public.my_campus();
drop function if exists public.my_faculty(); drop function if exists public.my_batch();

-- ---------- Tables ----------
create table public.campuses (
  id text primary key, name text not null, city text not null default '', head text not null default '',
  students int not null default 0 check (students >= 0)
);
create table public.batches (
  id text primary key, name text not null, campus_id text not null references public.campuses(id) on delete cascade,
  semester text not null default '', students int not null default 0 check (students >= 0),
  start_date date not null, end_date date not null, check (end_date >= start_date)
);
create table public.faculty (
  id text primary key, name text not null, email text not null default '',
  campus_id text not null references public.campuses(id) on delete cascade,
  weekly_capacity numeric not null default 0 check (weekly_capacity >= 0), specialty text not null default ''
);
create table public.subjects (
  id text primary key, code text not null, name text not null,
  campus_id text not null references public.campuses(id) on delete cascade,
  batch_id text not null references public.batches(id) on delete cascade,
  faculty_id text references public.faculty(id) on delete set null,
  start_date date not null, target_date date not null, exam_date date not null
);
-- Topic and slot ids are reused across subjects in the app, so the key is (subject_id, id).
create table public.topics (
  subject_id text not null references public.subjects(id) on delete cascade, id text not null,
  unit text not null default '', name text not null, planned_hours numeric not null default 0 check (planned_hours >= 0),
  pct numeric not null default 0 check (pct between 0 and 100), exam_scope boolean not null default true,
  position int not null default 0, primary key (subject_id, id)
);
create table public.slots (
  subject_id text not null references public.subjects(id) on delete cascade, id text not null,
  day int not null check (day between 0 and 6), start text not null, hours numeric not null check (hours > 0),
  primary key (subject_id, id)
);
create table public.holidays (
  id text primary key, date date not null, name text not null, campus_id text not null default 'all'
);
create table public.sessions (
  id text primary key, subject_id text not null references public.subjects(id) on delete cascade,
  faculty_id text references public.faculty(id) on delete set null, date date not null,
  status text not null check (status in ('verified','pending','missed')),
  source text not null check (source in ('voice','text','manual','seed')),
  hours numeric not null default 0 check (hours >= 0), activities text not null default '', homework text not null default '',
  summary text not null default '', notes jsonb, created_at timestamptz not null default now()
);
create table public.session_topics (
  session_id text not null references public.sessions(id) on delete cascade, topic_id text not null,
  pct numeric not null check (pct between 0 and 100), primary key (session_id, topic_id)
);
create table public.quiz_attempts (
  id text primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null, subject_id text not null references public.subjects(id) on delete cascade,
  score int not null check (score >= 0), total int not null check (total > 0), answers jsonb not null default '[]'
);
create table public.notifications (
  id text primary key, title text not null, body text not null default '',
  roles text[] not null, created_at timestamptz not null default now()
);
create table public.notification_reads (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notification_id text not null references public.notifications(id) on delete cascade,
  primary key (user_id, notification_id)
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','manager','faculty','student')),
  name text not null, title text not null default '', email text not null default '',
  campus_id text references public.campuses(id) on delete set null,
  faculty_id text references public.faculty(id) on delete set null,
  batch_id text references public.batches(id) on delete set null,
  email_alerts boolean not null default true, weekly_digest boolean not null default false
);
do $$
declare t text;
begin
  foreach t in array array['campuses','batches','faculty','subjects','topics','slots','holidays','sessions','session_topics',
                           'quiz_attempts','notifications','notification_reads','profiles'] loop
    execute format('comment on table public.%I is %L', t, 'mirai-academic-os');
  end loop;
end $$;
create index on public.subjects (campus_id); create index on public.subjects (batch_id); create index on public.subjects (faculty_id);
create index on public.sessions (subject_id); create index on public.quiz_attempts (user_id);

-- ---------- Who is the caller? (security definer so policies can read profiles without recursion) ----------
create function public.my_role() returns text language sql stable security definer set search_path = public as
  $$ select role from public.profiles where user_id = auth.uid() $$;
create function public.my_campus() returns text language sql stable security definer set search_path = public as
  $$ select campus_id from public.profiles where user_id = auth.uid() $$;
create function public.my_faculty() returns text language sql stable security definer set search_path = public as
  $$ select faculty_id from public.profiles where user_id = auth.uid() $$;
create function public.my_batch() returns text language sql stable security definer set search_path = public as
  $$ select batch_id from public.profiles where user_id = auth.uid() $$;

-- A subject is visible to: admin (all), manager (own campus), faculty (own subjects), student (own batch).
create function public.can_see_subject(sid text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subjects s where s.id = sid and (
      public.my_role() = 'admin'
      or (public.my_role() = 'manager' and s.campus_id = public.my_campus())
      or (public.my_role() = 'faculty' and s.faculty_id = public.my_faculty())
      or (public.my_role() = 'student' and s.batch_id = public.my_batch())
    )
  )
$$;

-- ---------- Row-level security ----------
alter table public.campuses enable row level security;        alter table public.batches enable row level security;
alter table public.faculty enable row level security;         alter table public.subjects enable row level security;
alter table public.topics enable row level security;          alter table public.slots enable row level security;
alter table public.holidays enable row level security;        alter table public.sessions enable row level security;
alter table public.session_topics enable row level security;  alter table public.quiz_attempts enable row level security;
alter table public.notifications enable row level security;   alter table public.notification_reads enable row level security;
alter table public.profiles enable row level security;

-- Reference data: any signed-in user can read, only admin can change.
create policy campuses_read on public.campuses for select to authenticated using (true);
create policy campuses_admin on public.campuses for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy batches_read on public.batches for select to authenticated using (true);
create policy batches_admin on public.batches for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy holidays_read on public.holidays for select to authenticated using (true);
create policy holidays_admin on public.holidays for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Faculty (emails, capacity): admin and the manager of that campus only; a faculty member sees their own row.
create policy faculty_read on public.faculty for select to authenticated using (
  public.my_role() = 'admin' or (public.my_role() = 'manager' and campus_id = public.my_campus()) or id = public.my_faculty());
create policy faculty_admin on public.faculty for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
-- Everyone else sees only names and specialty through this view (it runs with the owner's rights on purpose).
create view public.faculty_public as select id, name, campus_id, specialty from public.faculty;

create policy subjects_read on public.subjects for select to authenticated using (public.can_see_subject(id));
create policy subjects_admin on public.subjects for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy topics_read on public.topics for select to authenticated using (public.can_see_subject(subject_id));
create policy topics_admin on public.topics for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy slots_read on public.slots for select to authenticated using (public.can_see_subject(subject_id));
create policy slots_admin on public.slots for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Sessions: students only ever see verified records. Faculty record sessions through confirm_session().
create policy sessions_read on public.sessions for select to authenticated using (
  public.can_see_subject(subject_id) and (public.my_role() <> 'student' or status = 'verified'));
create policy sessions_admin on public.sessions for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy sessions_discard on public.sessions for delete to authenticated using (
  public.my_role() = 'faculty' and status = 'pending' and public.can_see_subject(subject_id));
create policy session_topics_read on public.session_topics for select to authenticated using (
  exists (select 1 from public.sessions x where x.id = session_id));
create policy session_topics_admin on public.session_topics for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Quiz attempts: a student writes and reads only their own; staff read attempts for subjects they can see.
create policy attempts_insert on public.quiz_attempts for insert to authenticated
  with check (user_id = auth.uid() and public.my_role() = 'student' and public.can_see_subject(subject_id));
create policy attempts_read on public.quiz_attempts for select to authenticated using (
  user_id = auth.uid() or (public.my_role() in ('admin','manager','faculty') and public.can_see_subject(subject_id)));

create policy notifications_read on public.notifications for select to authenticated using (public.my_role() = any (roles));
create policy reads_own on public.notification_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Profiles: you read your own (admin reads all). You can edit only name, email and the two alert switches, never role or scope.
create policy profiles_read on public.profiles for select to authenticated using (user_id = auth.uid() or public.my_role() = 'admin');
create policy profiles_update on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (name, email, email_alerts, weekly_digest) on public.profiles to authenticated;
revoke all on public.faculty_public from anon;
grant select on public.faculty_public to authenticated;

-- ---------- Confirming a session ----------
-- Faculty can only confirm sessions for their own subjects. Progress only ever goes up, capped at 100.
create function public.confirm_session(p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare
  sid text := p->>'subjectId'; v_id text := p->>'id'; v_status text := coalesce(p->>'status','verified'); t jsonb;
begin
  if public.my_role() is null or public.my_role() not in ('faculty','admin') then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.subjects s where s.id = sid) then raise exception 'unknown subject'; end if;
  if public.my_role() = 'faculty' and not exists (select 1 from public.subjects s where s.id = sid and s.faculty_id = public.my_faculty()) then
    raise exception 'not your subject' using errcode = '42501';
  end if;
  if v_status not in ('verified','pending','missed') then raise exception 'bad status'; end if;
  if exists (select 1 from public.sessions x where x.id = v_id and x.subject_id <> sid) then raise exception 'session id belongs to another subject'; end if;

  insert into public.sessions (id, subject_id, faculty_id, date, status, source, hours, activities, homework, summary, notes)
  values (v_id, sid, (select faculty_id from public.subjects where id = sid), (p->>'date')::date, v_status,
          coalesce(p->>'source','manual'), coalesce((p->>'hours')::numeric,0), coalesce(p->>'activities',''), coalesce(p->>'homework',''),
          coalesce(p->>'summary',''), case when p ? 'notes' and jsonb_typeof(p->'notes') = 'object' then p->'notes' end)
  on conflict (id) do update set date = excluded.date, status = excluded.status, source = excluded.source, hours = excluded.hours,
    activities = excluded.activities, homework = excluded.homework, summary = excluded.summary, notes = excluded.notes;

  delete from public.session_topics where session_id = v_id;
  for t in select * from jsonb_array_elements(coalesce(p->'topics','[]'::jsonb)) loop
    insert into public.session_topics (session_id, topic_id, pct) values (v_id, t->>'topicId', least(100, greatest(0, (t->>'pct')::numeric)));
    if v_status = 'verified' then
      update public.topics set pct = greatest(pct, least(100, (t->>'pct')::numeric)) where subject_id = sid and id = t->>'topicId';
    end if;
  end loop;

  if v_status = 'verified' then
    insert into public.notifications (id, title, body, roles)
    values ('n-' || replace(gen_random_uuid()::text, '-', ''), 'Session verified', left(coalesce(p->>'summary',''), 80), array['manager','admin','student']);
  end if;
end $$;
revoke all on function public.confirm_session(jsonb) from public, anon;
grant execute on function public.confirm_session(jsonb) to authenticated;