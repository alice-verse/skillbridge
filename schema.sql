-- SkillBridge database schema (PostgreSQL on Supabase)
-- Run this whole file once: Supabase dashboard > SQL Editor > New query > paste > Run.

-- 1. TABLES ------------------------------------------------------------
create table profiles (            -- one row per person (linked to Supabase login)
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('student','industry','academician','institution','admin')),
  cgpa numeric(3,1) default 7.5,
  created_at timestamptz default now()
);
create table skill_ratings (       -- the skill assessment answers (0-4 per skill)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  skill text not null,
  level int not null check (level between 0 and 4),
  unique (user_id, skill)
);
create table opportunities (       -- internships, jobs, projects, FDPs, research...
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references profiles(id) on delete cascade,
  company_name text not null,
  title text not null,
  type text not null,
  skills text[] not null default '{}',
  min_cgpa numeric(3,1) default 0,
  status text not null default 'Pending' check (status in ('Pending','Approved')),  -- admin approves before users see it
  created_at timestamptz default now()
);
create table applications (        -- who applied where, and the hiring stage
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  applicant_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'Applied' check (status in ('Applied','Shortlisted','Interview','Selected')),
  created_at timestamptz default now(),
  unique (opportunity_id, applicant_id)
);
create table programs (            -- training programs published by industry
  id uuid primary key default gen_random_uuid(),
  title text not null, provider text not null, skill text not null,
  created_at timestamptz default now()
);
create table announcements (       -- admin messages shown on the home page
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz default now()
);
create table portfolio_items (     -- student portfolio; "verified" is set by a mentor
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null, kind text not null default 'Project',
  verified boolean not null default false,
  created_at timestamptz default now()
);

-- 2. ROLE HELPER ---------------------------------------------------------
create function public.my_role() returns text
language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- 3. ROW LEVEL SECURITY (who can see / change what) ----------------------
alter table profiles enable row level security;
alter table skill_ratings enable row level security;
alter table opportunities enable row level security;
alter table applications enable row level security;
alter table programs enable row level security;
alter table portfolio_items enable row level security;
alter table announcements enable row level security;

create policy "profiles: any signed-in user can read" on profiles for select to authenticated using (true);
create policy "profiles: create own (never as admin)" on profiles for insert to authenticated with check (id = auth.uid() and role <> 'admin');
create policy "profiles: admin edits any" on profiles for update to authenticated using (my_role() = 'admin');
create policy "profiles: admin removes" on profiles for delete to authenticated using (my_role() = 'admin');
create policy "profiles: edit own" on profiles for update to authenticated using (id = auth.uid());

create policy "ratings: read" on skill_ratings for select to authenticated using (true);
create policy "ratings: write own" on skill_ratings for insert to authenticated with check (user_id = auth.uid());
create policy "ratings: update own" on skill_ratings for update to authenticated using (user_id = auth.uid());

create policy "opps: public sees approved; owner and admin see all" on opportunities for select to anon, authenticated
  using (status = 'Approved' or company_id = auth.uid() or my_role() = 'admin');
create policy "opps: industry posts own" on opportunities for insert to authenticated
  with check (company_id = auth.uid() and my_role() = 'industry' and status = 'Pending');
create policy "opps: admin approves" on opportunities for update to authenticated using (my_role() = 'admin');
create policy "opps: admin deletes" on opportunities for delete to authenticated using (my_role() = 'admin');

create policy "apps: applicant, owning company or institution can read" on applications for select to authenticated
  using (applicant_id = auth.uid()
      or my_role() in ('institution','admin')
      or exists (select 1 from opportunities o where o.id = opportunity_id and o.company_id = auth.uid()));
create policy "apps: apply as yourself" on applications for insert to authenticated
  with check (applicant_id = auth.uid() and status = 'Applied');
create policy "apps: company moves its own applicants" on applications for update to authenticated
  using (exists (select 1 from opportunities o where o.id = opportunity_id and o.company_id = auth.uid()));

create policy "programs: public read" on programs for select to anon, authenticated using (true);
create policy "programs: industry or admin publish" on programs for insert to authenticated with check (my_role() in ('industry','admin'));
create policy "programs: admin deletes" on programs for delete to authenticated using (my_role() = 'admin');

create policy "news: public read" on announcements for select to anon, authenticated using (true);
create policy "news: admin publishes" on announcements for insert to authenticated with check (my_role() = 'admin');
create policy "news: admin deletes" on announcements for delete to authenticated using (my_role() = 'admin');

create policy "portfolio: read" on portfolio_items for select to authenticated using (true);
create policy "portfolio: add own, unverified" on portfolio_items for insert to authenticated
  with check (user_id = auth.uid() and verified = false);
create policy "portfolio: mentors verify" on portfolio_items for update to authenticated
  using (my_role() in ('industry','academician'));

-- 4. STARTER DATA -----------------------------------------------------------
insert into programs (title, provider, skill) values
 ('Python for Data (certificate)','Infosys Springboard','python'),
 ('SQL in 10 hours','DataWorks Academy','sql'),
 ('Excel for Analysts','DataWorks Academy','excel'),
 ('Web Dev bootcamp','CodeLabs','web'),
 ('Analytics certification','DataWorks Academy','analytics'),
 ('Business Communication workshop','TalentNest','comm'),
 ('Teamwork and mentoring sessions','TalentNest','team'),
 ('Problem solving challenge','CodeLabs','solve');

-- 5. MAKE YOURSELF ADMIN (run AFTER you have signed up once in the app) -------------
-- Replace the email with the one you signed up with, then run this single line:
-- update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
