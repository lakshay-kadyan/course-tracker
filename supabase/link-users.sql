-- Run AFTER you create the four users in Supabase > Authentication > Users > Add user (tick "Auto Confirm User").
-- It links each login to a role and scope. The email on each line must match the user you created.
-- If you used different emails, edit them below (only the first column of each row).

insert into public.profiles (user_id, role, name, title, email, campus_id, faculty_id, batch_id, email_alerts, weekly_digest)
select u.id, v.role, v.name, v.title, u.email, v.campus_id, v.faculty_id, v.batch_id, true, v.role in ('admin','manager')
from auth.users u
join (values
  ('neha.kapoor@mirai.demo',  'admin',   'Neha Kapoor',    'Program Manager',                null,  null, null),
  ('rohan.iyer@mirai.demo',   'manager', 'Rohan Iyer',     'Campus Manager · Bengaluru',    'blr', null, null),
  ('priya.nair@mirai.demo',   'faculty', 'Dr. Priya Nair', 'Faculty · Chemistry',           'blr', 'f1', null),
  ('aarav.mehta@mirai.demo',  'student', 'Aarav Mehta',    'Student · BLR-CS-2026 A',       'blr', null, 'b1')
) as v(email, role, name, title, campus_id, faculty_id, batch_id) on lower(u.email) = v.email
on conflict (user_id) do update set role = excluded.role, name = excluded.name, title = excluded.title,
  campus_id = excluded.campus_id, faculty_id = excluded.faculty_id, batch_id = excluded.batch_id;

-- Shows what was linked. You should see 4 rows.
select p.role, p.name, p.email from public.profiles p order by p.role;
