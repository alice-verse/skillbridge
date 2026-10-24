# SkillBridge: Academia–Industry Collaboration Portal

**Live demo:** https://skillbridge-portal.netlify.app

A full website with two sides: a **public and user side** (students, companies, teachers, institutions) and an **admin side** that controls what everyone sees. It has sign-up, a real database and role-based security.

## Try it in 1 minute
Open the live demo and click a demo account (password `demo123`):
- **Admin** (the owner's side): approve or reject job postings, manage users and roles, manage programs, publish announcements.
- **Student, Industry, Academician, Institution** (the user side).

Two extra tabs show how it works behind the scenes: **Under the hood** (every database call with its SQL) and **Database** (live table rows).

## How the two sides connect
1. A company (Industry account) posts an opening. It is saved as **Pending**.
2. The Admin sees it under **Approvals** and clicks **Approve**.
3. Now it appears on the public home page and in students' dashboards, where they get a match score and can apply.
4. The company ranks applicants and moves them through stages. The Admin and the Institution see the totals.

## Features by role
| Role | What they can do |
|---|---|
| Public visitor | Home page with announcements, live openings and programs |
| Student | Skill assessment, strengths and gaps, role matches, learning programs, apply, 4-stage tracker, digital portfolio |
| Industry | Post openings, publish programs, applicants ranked by skill match and CGPA check, move stages, verify portfolio items |
| Academician | Register for faculty internships, FDPs, research, consultancy, guest lectures |
| Institution | Placement readiness, skill demand, skill gaps, recruitment funnel |
| **Admin** | Overview numbers, approve or reject postings, change roles or remove users, add or delete programs, post announcements |

## How it works
```
Browser (index.html + app.js)  --->  Supabase (Postgres database + login + security rules)
```
- `app.js` has one data layer (`db.select / insert / update / delete / upsert`). Every call is logged for the Under the hood tab.
- **Match score:** for each skill a role needs, the rating (0 to 4) is capped at 3 and divided by 3; the average is the match %. Below the role's CGPA cut-off means not eligible.
- **Security:** Row Level Security rules in `supabase/schema.sql` decide who can read or change each row. Examples: only an admin can approve postings, only the posting company sees its applicants, nobody can sign up as admin.
- **Two modes, same code:** empty keys in `config.js` = demo mode (fake database in the browser). With Supabase keys = real database.

## Database tables
`profiles`, `skill_ratings`, `opportunities`, `applications`, `programs`, `portfolio_items`, `announcements`. See `supabase/schema.sql` (commented).

## Run it on your own real database (about 10 minutes)
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor > New query**, paste all of `supabase/schema.sql`, click **Run**.
3. **Authentication > Providers > Email**: turn **off** "Confirm email".
4. **Project Settings > API**: copy the Project URL and the anon public key into `config.js`.
5. Open the app and **sign up** once with your own email (any role).
6. In the SQL Editor run this one line to become admin (use your email):
   `update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
7. Sign out and sign in again. You now see the **Admin panel**. Create an Industry and a Student account in other browsers to see both sides working.

## Deploy
Upload the files to a public GitHub repo, then import the repo in Netlify (no build settings needed).

## Project structure
```
index.html          page shell (navigation bar, content area, footer)
app.js              all logic: data layer, auth, views, admin panel, actions
style.css           styles (light and dark mode)
config.js           your Supabase keys (empty = demo mode)
supabase/schema.sql tables, security rules, starter data
```

## Not built yet
Document uploads, integrations with learning platforms and institute databases, AI career guidance, email notifications.

## Author
Alice Singhal · [LinkedIn](https://www.linkedin.com/in/alicesinghal) · [GitHub](https://github.com/alice-verse)
