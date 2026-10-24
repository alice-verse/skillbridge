/* SkillBridge: Academia-Industry Collaboration Portal
   Sections: 1 Config  2 Data layer (+live log)  3 Auth  4 Helpers  5 Views  6 Actions  7 Boot
   Two modes, same code: LIVE = real Supabase database; DEMO = fake database in the browser. */
"use strict";

/* 1. CONFIG ------------------------------------------------------------ */
const CFG = window.APP_CONFIG || {};
const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
const sb = LIVE ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
const $ = id => document.getElementById(id);
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SKILLS = [["python","Python","Technical"],["sql","SQL","Technical"],["excel","Excel","Technical"],["web","Web development","Technical"],["analytics","Data analysis","Technical"],["comm","Communication","Soft"],["team","Teamwork","Soft"],["solve","Problem solving","Soft"]];
const NAME = Object.fromEntries(SKILLS.map(s => [s[0], s[1]]));
const STAGES = ["Applied","Shortlisted","Interview","Selected"];
const FACULTY = ["Faculty internship","FDP","Research","Consultancy","Guest lecture"];
const TYPES = ["Internship","Job","Apprenticeship","Live project", ...FACULTY];
const TABLES = ["profiles","skill_ratings","opportunities","applications","programs","portfolio_items","announcements"];

/* 2. DATA LAYER: every database call goes through run(), which records it in LOG ---- */
const LOG = [];
const q = v => typeof v === "string" ? "'" + v.replace(/'/g, "''") + "'" : Array.isArray(v) ? "'{" + v.join(",") + "}'" : String(v);
function sqlOf(op, t, x = {}) {
  const where = o => Object.entries(o || {}).map(([k, v]) => `${k} = ${q(v)}`).join(" AND ");
  if (op === "select") return `SELECT * FROM ${t}` + (x.eq && Object.keys(x.eq).length ? " WHERE " + where(x.eq) : "") + (x.order ? ` ORDER BY ${x.order} DESC` : "") + ";";
  if (op === "insert") return `INSERT INTO ${t} (${Object.keys(x.row).join(", ")}) VALUES (${Object.values(x.row).map(q).join(", ")});`;
  if (op === "update") return `UPDATE ${t} SET ${where(x.patch).replace(/ AND /g, ", ")} WHERE id = ${q(x.id)};`;
  if (op === "upsert") return `INSERT INTO ${t} (${Object.keys(x.row).join(", ")}) VALUES (${Object.values(x.row).map(q).join(", ")}) ON CONFLICT (${x.on}) DO UPDATE SET level = ${q(x.row.level)};`;
  if (op === "delete") return `DELETE FROM ${t} WHERE id = ${q(x.id)};`;
  return x.sql || op;
}
async function run(op, t, x, fn) {
  const t0 = performance.now(); let out, err;
  try { out = await fn(); } catch (e) { err = e; }
  LOG.unshift({ at: new Date().toLocaleTimeString(), op, t, sql: sqlOf(op, t, x), ms: Math.round(performance.now() - t0), n: Array.isArray(out) ? out.length : out ? 1 : 0, err: err && err.message });
  if (LOG.length > 80) LOG.pop();
  if (err) throw err;
  return out;
}
/* demo database: lives in localStorage, same shape as the real tables */
const KEY = "skillbridge_demo_v2";
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
function seedDemo() {
  const R = (a, b, c, d, e, f, g, h) => ({ python: a, sql: b, excel: c, web: d, analytics: e, comm: f, team: g, solve: h });
  const people = [["u-adm","admin@demo.com","Alice (Admin)","admin",0],["u-ind","industry@demo.com","DataWorks","industry",0],["u-stu","student@demo.com","Demo Student","student",7.5],["u-fac","prof@demo.com","Dr. Rao","academician",0],["u-ins","dean@demo.com","IITM Delhi","institution",0],["u-s1","aarav@demo.com","Aarav Mehta","student",8.2],["u-s2","isha@demo.com","Isha Kapoor","student",7.1],["u-s3","rohan@demo.com","Rohan Das","student",6.4]];
  const rate = { "u-stu": R(2,2,3,1,2,3,3,2), "u-s1": R(4,3,3,2,4,3,3,3), "u-s2": R(1,2,4,1,2,4,4,2), "u-s3": R(3,3,2,4,2,2,2,3) };
  const M = { users: people.map(p => ({ id: p[0], email: p[1], password: "demo123" })), profiles: people.map(p => ({ id: p[0], name: p[2], role: p[3], cgpa: p[4], created_at: new Date().toISOString() })), skill_ratings: [], opportunities: [], applications: [], programs: [], portfolio_items: [], announcements: [], session: null };
  Object.entries(rate).forEach(([u, r]) => Object.entries(r).forEach(([s, l]) => M.skill_ratings.push({ id: rid(), user_id: u, skill: s, level: l })));
  [["Data Analyst Intern","Internship",["python","sql","analytics"],7],["Frontend Developer","Job",["web","solve","team"],7],["Operations Intern","Internship",["excel","comm","team"],6.5],["Dashboard build","Live project",["sql","analytics","excel"],0],["Faculty internship: Data Engineering","Faculty internship",["python","sql"],0],["FDP: Industry-ready curriculum","FDP",["comm","team"],0],["Growth Intern (waiting for admin)","Internship",["comm","excel"],0,"Pending"]]
    .forEach((o, i) => M.opportunities.push({ id: "o" + i, company_id: "u-ind", company_name: "DataWorks", title: o[0], type: o[1], skills: o[2], min_cgpa: o[3], status: o[4] || "Approved", created_at: new Date(Date.now() - i * 6e4).toISOString() }));
  [["o0","u-s1","Interview"],["o0","u-s3","Applied"],["o1","u-s3","Shortlisted"],["o2","u-s2","Selected"]].forEach(a => M.applications.push({ id: rid(), opportunity_id: a[0], applicant_id: a[1], status: a[2], created_at: new Date().toISOString() }));
  [["Python for Data (certificate)","Infosys Springboard","python"],["SQL in 10 hours","DataWorks Academy","sql"],["Excel for Analysts","DataWorks Academy","excel"],["Web Dev bootcamp","CodeLabs","web"],["Analytics certification","DataWorks Academy","analytics"],["Business Communication workshop","TalentNest","comm"],["Teamwork and mentoring sessions","TalentNest","team"],["Problem solving challenge","CodeLabs","solve"]]
    .forEach(p => M.programs.push({ id: rid(), title: p[0], provider: p[1], skill: p[2], created_at: new Date().toISOString() }));
  M.portfolio_items.push({ id: rid(), user_id: "u-stu", title: "FeedbackLens project", kind: "Project", verified: true, created_at: new Date().toISOString() });
  M.announcements.push({ id: rid(), message: "Welcome to SkillBridge! New openings are live: complete your skill assessment to get matched.", created_at: new Date().toISOString() });
  return M;
}
let M = null;
if (!LIVE) { try { M = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} M = M || seedDemo(); }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) {} };
const db = {
  select: (t, x = {}) => run("select", t, x, async () => {
    if (LIVE) { let r = sb.from(t).select("*"); for (const [k, v] of Object.entries(x.eq || {})) r = r.eq(k, v); if (x.order) r = r.order(x.order, { ascending: false }); const { data, error } = await r; if (error) throw error; return data; }
    let rows = M[t].filter(r => Object.entries(x.eq || {}).every(([k, v]) => r[k] === v));
    if (x.order) rows = rows.slice().sort((a, b) => String(b[x.order]).localeCompare(String(a[x.order])));
    return rows.map(r => ({ ...r }));
  }),
  insert: (t, row) => run("insert", t, { row }, async () => {
    if (LIVE) { const { data, error } = await sb.from(t).insert(row).select().single(); if (error) throw error; return data; }
    const r = { id: rid(), created_at: new Date().toISOString(), ...row };
    if (t === "applications") { if (M[t].some(a => a.opportunity_id === r.opportunity_id && a.applicant_id === r.applicant_id)) throw new Error("Already applied"); r.status = "Applied"; }
    if (t === "portfolio_items") r.verified = false;
    M[t].push(r); persist(); return r;
  }),
  update: (t, id, patch) => run("update", t, { id, patch }, async () => {
    if (LIVE) { const { data, error } = await sb.from(t).update(patch).eq("id", id).select().single(); if (error) throw error; return data; }
    const r = M[t].find(r => r.id === id); Object.assign(r, patch); persist(); return { ...r };
  }),
  delete: (t, id) => run("delete", t, { id }, async () => {
    if (LIVE) { const { error } = await sb.from(t).delete().eq("id", id); if (error) throw error; return 1; }
    const i = M[t].findIndex(r => r.id === id); if (i > -1) M[t].splice(i, 1);
    if (t === "opportunities") M.applications = M.applications.filter(a => a.opportunity_id !== id);
    persist(); return 1;
  }),
  upsert: (t, row, on) => run("upsert", t, { row, on }, async () => {
    if (LIVE) { const { data, error } = await sb.from(t).upsert(row, { onConflict: on }).select().single(); if (error) throw error; return data; }
    const keys = on.split(","); let r = M[t].find(r => keys.every(k => r[k] === row[k]));
    if (r) Object.assign(r, row); else { r = { id: rid(), ...row }; M[t].push(r); } persist(); return { ...r };
  })
};

/* 3. AUTH ---------------------------------------------------------------- */
let ME = null;                                   // the signed-in person's row from `profiles`
const auth = {
  async signUp(email, password, name, role) {
    let id;
    if (LIVE) {
      const { data, error } = await run("auth", "auth.users", { sql: `-- Supabase Auth: sign up ${email}` }, async () => sb.auth.signUp({ email, password }));
      if (error) throw error;
      if (!data.session) throw new Error("Supabase is asking for email confirmation. Turn it off (Authentication > Providers > Email), then sign up again.");
      id = data.user.id;
    } else {
      await run("auth", "auth.users", { sql: `-- demo auth: create user ${email}` }, async () => {
        if (M.users.some(u => u.email === email)) throw new Error("Email already registered");
        id = "u-" + rid(); M.users.push({ id, email, password }); M.session = id; persist(); return 1;
      });
    }
    return db.insert("profiles", { id, name, role, cgpa: 7.5 });
  },
  async signIn(email, password) {
    let id;
    if (LIVE) {
      const { data, error } = await run("auth", "auth.users", { sql: `-- Supabase Auth: sign in ${email}` }, async () => sb.auth.signInWithPassword({ email, password }));
      if (error) throw error; id = data.user.id;
    } else {
      await run("auth", "auth.users", { sql: `-- demo auth: check password for ${email}` }, async () => {
        const u = M.users.find(u => u.email === email && u.password === password); if (!u) throw new Error("Wrong email or password"); id = u.id; M.session = id; persist(); return 1;
      });
    }
    return (await db.select("profiles", { eq: { id } }))[0];
  },
  async restore() {
    let id;
    if (LIVE) { const { data } = await sb.auth.getSession(); id = data.session && data.session.user.id; } else id = M.session;
    return id ? (await db.select("profiles", { eq: { id } }))[0] : null;
  },
  async signOut() { if (LIVE) await sb.auth.signOut(); else { M.session = null; persist(); } }
};

/* 4. HELPERS -------------------------------------------------------------- */
let TAB = "home", ADM = "overview", AUTHMODE = "in", DRAFT = null;
const levels = (rows, uid) => { const o = {}; rows.filter(r => r.user_id === uid).forEach(r => o[r.skill] = r.level); return o; };
const match = (r, skills) => Math.round(100 * skills.reduce((a, k) => a + Math.min(r[k] || 0, 3) / 3, 0) / (skills.length || 1));
const tags = (r, sk) => sk.map(k => `<span class="t ${(r[k] || 0) >= 3 ? "y" : "n"}">${(r[k] || 0) >= 3 ? "✓" : "✗"} ${NAME[k]}</span>`).join("");
const bar = (v, gap) => `<div class="bar ${gap ? "gap" : ""}"><i style="width:${v}%"></i></div>`;
function toast(m) { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }
const stuTypes = o => !FACULTY.includes(o.type) && o.status === "Approved";

/* 5. VIEWS ---------------------------------------------------------------- */
function loginView() {
  const up = AUTHMODE === "up";
  return `<div class="cd" style="max-width:420px;margin:0 auto"><h2>${up ? "Create account" : "Sign in"}</h2>
  ${up ? `<div class="row"><input id="nm" placeholder="Name or organisation"></div><div class="row"><select id="rl"><option value="student">Student</option><option value="industry">Industry</option><option value="academician">Academician</option><option value="institution">Institution</option></select></div>` : ""}
  <div class="row"><input id="em" type="email" placeholder="Email"></div><div class="row"><input id="pw" type="password" placeholder="Password (min 6 characters)"></div>
  <div class="row"><button class="p" data-act="${up ? "signup" : "signin"}">${up ? "Sign up" : "Sign in"}</button><button data-act="authmode" data-a="${up ? "in" : "up"}">${up ? "I have an account" : "Create an account"}</button></div>
  ${LIVE ? "" : `<h3>Try a demo account (password demo123)</h3><div class="row">${[["student@demo.com","Student"],["industry@demo.com","Industry"],["prof@demo.com","Academician"],["dean@demo.com","Institution"],["admin@demo.com","Admin"]].map(d => `<button class="s" data-act="demo" data-a="${d[0]}">${d[1]}</button>`).join("")}</div>`}</div>`;
}
async function studentView() {
  const [rs, ops, apps, prs, port] = await Promise.all([db.select("skill_ratings", { eq: { user_id: ME.id } }), db.select("opportunities", { order: "created_at" }), db.select("applications", { eq: { applicant_id: ME.id } }), db.select("programs"), db.select("portfolio_items", { eq: { user_id: ME.id } })]);
  const saved = levels(rs, ME.id), has = rs.length > 0; DRAFT = DRAFT || { ...saved };
  const list = ops.filter(stuTypes), gaps = SKILLS.filter(s => (saved[s[0]] || 0) < 3);
  let h = `<div class="g"><div class="cd"><h2>1. Skill assessment</h2><small>Rate yourself 0 (none) to 4 (expert). Saving writes to the <code>skill_ratings</code> table.</small>` +
    SKILLS.map(s => `<div class="sk"><span>${s[1]}</span><input type="range" min="0" max="4" value="${DRAFT[s[0]] || 0}" data-rate="${s[0]}"><b>${DRAFT[s[0]] || 0}</b></div>`).join("") +
    `<div class="row"><button class="p" data-act="saverate">Save my skill profile</button></div><div class="row"><label>My CGPA <input id="cg" type="number" step="0.1" min="0" max="10" value="${ME.cgpa}" style="width:80px"></label><button data-act="savecgpa">Save</button></div></div>`;
  if (!has) return h + `<div class="cd"><h2>2. Your skill profile</h2><p class="mu">Save the assessment to see strengths, gaps, role matches and learning programs.</p></div></div>`;
  h += `<div class="cd"><h2>2. Skill profile</h2>` + SKILLS.map(s => { const v = saved[s[0]] || 0; return `<div class="sk"><span>${s[1]}</span>${bar(v * 25, v < 3)}<b>${v < 3 ? "gap" : "ok"}</b></div>`; }).join("") +
    `<p><b>Strengths:</b> ${SKILLS.filter(s => (saved[s[0]] || 0) >= 3).map(s => s[1]).join(", ") || "none yet"}<br><b>Gaps:</b> ${gaps.map(s => s[1]).join(", ") || "none"}</p></div></div>`;
  const ranked = list.map(o => ({ o, m: match(saved, o.skills) })).sort((a, b) => b.m - a.m);
  h += `<div class="g"><div class="cd"><h2>3. Recommended roles</h2>` + ranked.slice(0, 4).map(x => `<div class="it"><b>${esc(x.o.title)}</b> <span class="m">${x.m}% match</span><br><small>${esc(x.o.company_name)} · ${esc(x.o.type)}</small><div>${tags(saved, x.o.skills)}</div></div>`).join("") + `</div>` +
    `<div class="cd"><h2>4. Programs for your gaps</h2>` + (gaps.length ? prs.filter(p => (saved[p.skill] || 0) < 3).map(p => `<div class="it"><b>${esc(p.title)}</b><br><small>${esc(p.provider)} · closes the ${NAME[p.skill] || p.skill} gap</small></div>`).join("") : `<p class="ok">No gaps. You are ready to apply.</p>`) + `</div></div>`;
  const applied = new Map(apps.map(a => [a.opportunity_id, a]));
  h += `<div class="g"><div class="cd"><h2>5. Internships and jobs</h2>` + ranked.map(x => { const a = applied.get(x.o.id), ok = ME.cgpa >= x.o.min_cgpa;
    return `<div class="it"><b>${esc(x.o.title)}</b> <span class="m">${x.m}%</span><br><small>${esc(x.o.company_name)} · ${esc(x.o.type)} · min CGPA ${x.o.min_cgpa}</small><div class="row">${a ? `<span class="ok">Applied</span>` : ok ? `<button class="s" data-act="apply" data-a="${x.o.id}">Apply</button>` : `<span class="wn">Not eligible (CGPA)</span>`}</div></div>`; }).join("") + `</div>` +
    `<div class="cd"><h2>6. Application tracker</h2>` + (apps.length ? apps.map(a => { const o = ops.find(o => o.id === a.opportunity_id) || {}; return `<div class="it"><b>${esc(o.title)}</b><br><small>${esc(o.company_name)}</small><div>${STAGES.map((n, i) => `<span class="t ${i <= STAGES.indexOf(a.status) ? "y" : ""}">${n}</span>`).join("")}</div></div>`; }).join("") : `<p class="mu">Apply to an opportunity to track it here.</p>`) + `</div></div>`;
  return h + `<div class="cd"><h2>7. Digital portfolio</h2>` + (port.map(p => `<div class="it"><b>${esc(p.title)}</b> <small>${esc(p.kind)}</small> ${p.verified ? `<span class="ok">✓ verified by a mentor</span>` : `<span class="wn">awaiting verification</span>`}</div>`).join("") || `<p class="mu">Nothing yet.</p>`) + `<div class="row"><input id="pt" placeholder="Certificate, project or internship"><button data-act="addport">Add</button></div></div>`;
}
async function industryView() {
  const [mine, apps, profs, rts, port, prs] = await Promise.all([db.select("opportunities", { eq: { company_id: ME.id }, order: "created_at" }), db.select("applications"), db.select("profiles"), db.select("skill_ratings"), db.select("portfolio_items"), db.select("programs")]);
  let h = `<div class="g"><div class="cd"><h2>Post an opportunity</h2><div class="row"><input id="ot" placeholder="Title"><select id="oy">${TYPES.map(t => `<option>${t}</option>`).join("")}</select></div>
  <div class="row"><input id="os" placeholder="Skills: python, sql, comm"><input id="oc" type="number" step="0.1" value="6.5" style="max-width:80px" title="Minimum CGPA"></div><small>Skill keys: ${SKILLS.map(s => s[0]).join(", ")}</small><div class="row"><button class="p" data-act="post">Post</button></div></div>
  <div class="cd"><h2>Publish a learning program</h2><div class="row"><input id="lt" placeholder="Course or workshop title"><select id="ls">${SKILLS.map(s => `<option value="${s[0]}">${s[1]}</option>`).join("")}</select><button data-act="program">Publish</button></div><small>${prs.length} programs published so far</small></div></div>`;
  if (!mine.length) return h + `<div class="cd"><p class="mu">You have not posted anything yet.</p></div>`;
  h += `<h2>Your opportunities and applicants</h2>`;
  for (const o of mine) {
    const list = apps.filter(a => a.opportunity_id === o.id).map(a => { const p = profs.find(p => p.id === a.applicant_id) || {}, r = levels(rts, a.applicant_id); return { a, p, r, m: match(r, o.skills), el: (p.cgpa || 0) >= o.min_cgpa }; }).sort((x, y) => y.m - x.m);
    h += `<div class="cd"><b>${esc(o.title)}</b> ${o.status === "Approved" ? `<span class="ok">live</span>` : `<span class="wn">waiting for admin approval</span>`} <small>${esc(o.type)} · needs ${o.skills.map(k => NAME[k] || k).join(", ")} · min CGPA ${o.min_cgpa}</small>` + (list.map(x => { const nx = STAGES[STAGES.indexOf(x.a.status) + 1], pf = port.filter(i => i.user_id === x.a.applicant_id);
      return `<div class="it"><b>${esc(x.p.name)}</b> <span class="m">${x.m}% match</span> ${x.el ? "" : `<span class="wn">below CGPA cut-off</span>`} <small>CGPA ${x.p.cgpa} · stage: ${x.a.status}</small><div>${tags(x.r, o.skills)}</div><div class="row">${nx && x.el ? `<button class="s" data-act="stage" data-a="${x.a.id}" data-b="${nx}">Move to ${nx}</button>` : ""}${pf.map(i => i.verified ? `<span class="ok">✓ ${esc(i.title)}</span>` : `<button class="s" data-act="verify" data-a="${i.id}">Verify: ${esc(i.title)}</button>`).join("")}</div></div>`; }).join("") || `<p class="mu">No applicants yet.</p>`) + `</div>`;
  }
  return h;
}
async function academicianView() {
  const [ops, apps] = await Promise.all([db.select("opportunities", { order: "created_at" }), db.select("applications", { eq: { applicant_id: ME.id } })]);
  const done = new Set(apps.map(a => a.opportunity_id));
  return `<div class="cd"><h2>Academician portal</h2><p class="mu">Faculty internships, FDPs, research, consultancy and guest lectures posted by industry.</p>` + (ops.filter(o => FACULTY.includes(o.type) && o.status === "Approved").map(o => `<div class="it"><b>${esc(o.title)}</b><br><small>${esc(o.company_name)} · ${esc(o.type)}</small><div class="row">${done.has(o.id) ? `<span class="ok">Registered</span>` : `<button class="s" data-act="apply" data-a="${o.id}">Register interest</button>`}</div></div>`).join("") || `<p class="mu">Nothing posted yet. Ask an industry account to post one.</p>`) + `</div>`;
}
async function institutionView() {
  const [profs, rts, ops, apps] = await Promise.all([db.select("profiles"), db.select("skill_ratings"), db.select("opportunities"), db.select("applications")]);
  const st = profs.filter(p => p.role === "student"), L = st.map(p => levels(rts, p.id));
  const ready = st.length ? Math.round(100 * L.reduce((a, r) => a + SKILLS.reduce((b, s) => b + Math.min(r[s[0]] || 0, 3) / 3, 0) / SKILLS.length, 0) / st.length) : 0;
  const dm = {}; ops.forEach(o => o.skills.forEach(k => dm[k] = (dm[k] || 0) + 1)); const mx = Math.max(1, ...Object.values(dm));
  const gap = SKILLS.map(s => ({ n: s[1], c: L.filter(r => (r[s[0]] || 0) < 3).length })).sort((a, b) => b.c - a.c).slice(0, 5);
  const fn = STAGES.map((_, i) => apps.filter(a => STAGES.indexOf(a.status) >= i).length);
  return `<div class="g"><div class="cd"><h2>Placement readiness</h2><p style="font-size:28px;margin:0"><b>${ready}%</b></p><small>Average across ${st.length} students</small><h3>Recruitment funnel</h3><div class="fn">${fn.map((v, i) => `<div><b>${v}</b>${STAGES[i]}</div>`).join("")}</div></div>
  <div class="cd"><h2>Skill demand from postings</h2>${Object.keys(dm).sort((a, b) => dm[b] - dm[a]).map(k => `<div class="sk"><span>${NAME[k] || k}</span>${bar(dm[k] / mx * 100)}<b>${dm[k]}</b></div>`).join("") || `<p class="mu">No postings.</p>`}</div>
  <div class="cd"><h2>Biggest student skill gaps</h2>${gap.map(x => `<div class="sk"><span>${x.n}</span>${bar(st.length ? x.c / st.length * 100 : 0, true)}<b>${x.c}/${st.length}</b></div>`).join("")}<small>Use this to plan courses and workshops.</small></div></div>`;
}
function logView() {
  return `<div class="cd"><h2>Under the hood: live request log</h2><p class="mu">Every time the app talks to the database, it shows up here with the SQL it is equal to. Click around the app, then come back to watch.</p>
  <ol><li>You click a button in the browser.</li><li><code>app.js</code> calls the data layer (<code>db.select / insert / update / upsert</code>).</li><li>${LIVE ? "The Supabase client sends it to the Postgres database over HTTPS. Row Level Security decides what you are allowed to read or change." : "In demo mode the same call is answered from a fake database kept in your browser."}</li><li>The rows come back and the page is redrawn.</li></ol>
  <div class="row"><button class="s" data-act="clearlog">Clear log</button>${LIVE ? "" : `<button class="s" data-act="resetmock">Reset demo data</button>`}</div></div>
  <div class="cd">${LOG.map(l => `<div class="lg"><b>${l.op.toUpperCase()}</b> ${esc(l.t)} <small>· ${l.at} · ${l.ms} ms · ${l.err ? `<span class="e">error: ${esc(l.err)}</span>` : l.n + " row(s)"}</small><pre>${esc(l.sql)}</pre></div>`).join("") || `<p class="mu">No calls yet.</p>`}</div>`;
}
async function dbView() {
  let h = `<div class="cd"><h2>Database viewer</h2><p class="mu">${LIVE ? "Live rows from your Supabase database (you only see rows your role is allowed to read). The full database is also in the Supabase dashboard under Table Editor." : "Rows of the demo database. In real mode this shows your Supabase tables."}</p></div>`;
  for (const t of TABLES) {
    let rows; try { rows = await db.select(t); } catch (e) { rows = []; }
    const cols = rows.length ? Object.keys(rows[0]).filter(c => c !== "created_at") : [];
    h += `<div class="cd"><h3>${t} <small>(${rows.length} rows)</small></h3><div class="scroll">${rows.length ? `<table><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>${rows.slice(0, 40).map(r => `<tr>${cols.map(c => `<td>${esc(Array.isArray(r[c]) ? r[c].join(", ") : r[c])}</td>`).join("")}</tr>`).join("")}</table>` : `<small>empty</small>`}</div></div>`;
  }
  return h;
}

async function homeView() {
  const [ops, news, prs] = await Promise.all([db.select("opportunities", { eq: { status: "Approved" }, order: "created_at" }), db.select("announcements", { order: "created_at" }), db.select("programs")]);
  const card = (t, d) => `<div class="cd"><h3>${t}</h3><p class="mu">${d}</p></div>`;
  return `<div class="hero"><h1>Bridge the gap between classrooms and careers</h1><p>SkillBridge connects students, companies, teachers and institutions. Find out what skills you need, get matched to internships and jobs, and track every step.</p><div class="row" style="justify-content:center"><button class="p" data-act="goup">Create free account</button><button data-act="tab" data-a="app">Sign in</button></div><small>${ops.length} live openings · ${prs.length} learning programs</small></div>
  ${news.length ? `<div class="cd"><h2>Announcements</h2>${news.slice(0, 3).map(n => `<div class="it">📣 ${esc(n.message)}</div>`).join("")}</div>` : ""}
  <h2>Who is it for?</h2><div class="g">${card("Students", "Take a skill assessment, see your gaps, get matched to roles and apply in one place.")}${card("Industry", "Post openings, get applicants ranked by skill match and run your hiring pipeline.")}${card("Academicians", "Find faculty internships, FDPs, research and consultancy with industry.")}${card("Institutions", "Track placement readiness, skill gaps and hiring outcomes on a dashboard.")}</div>
  <h2>Latest openings</h2><div class="cd">${ops.slice(0, 5).map(o => `<div class="it"><b>${esc(o.title)}</b> <small>${esc(o.company_name)} · ${esc(o.type)} · needs ${o.skills.map(k => NAME[k] || k).join(", ")}</small></div>`).join("") || `<p class="mu">No openings yet.</p>`}<small>Sign in to see your match score and apply.</small></div>
  <h2>How it works</h2><div class="g">${card("1. Assess", "Rate your skills. The platform builds your skill profile.")}${card("2. Match", "See which roles fit you and which skills to learn.")}${card("3. Apply", "Apply to approved openings and track your stage.")}${card("4. Get hired", "Companies shortlist by skill match and eligibility.")}</div>`;
}
async function adminView() {
  const [profs, ops, apps, prs, news] = await Promise.all([db.select("profiles"), db.select("opportunities", { order: "created_at" }), db.select("applications"), db.select("programs"), db.select("announcements", { order: "created_at" })]);
  const pend = ops.filter(o => o.status !== "Approved");
  const subs = [["overview", "Overview"], ["approvals", `Approvals (${pend.length})`], ["users", "Users"], ["programs", "Programs"], ["news", "Announcements"]];
  let h = `<div class="cd"><h2>Admin panel</h2><p class="mu">You control what users see on the website: approve postings, manage users and programs, and publish announcements.</p><div class="tabs">${subs.map(x => `<button class="s ${ADM === x[0] ? "on" : ""}" data-act="admtab" data-a="${x[0]}">${x[1]}</button>`).join("")}</div></div>`;
  if (ADM === "overview") {
    const by = r => profs.filter(p => p.role === r).length;
    h += `<div class="cd"><div class="fn">${["student", "industry", "academician", "institution"].map(r => `<div><b>${by(r)}</b>${r}s</div>`).join("")}</div><div class="fn"><div><b>${ops.length - pend.length}</b>live openings</div><div><b>${pend.length}</b>waiting approval</div><div><b>${apps.length}</b>applications</div><div><b>${prs.length}</b>programs</div></div><h3>Applications by stage</h3><div class="fn">${STAGES.map(s => `<div><b>${apps.filter(a => a.status === s).length}</b>${s}</div>`).join("")}</div></div>`;
  } else if (ADM === "approvals") {
    h += `<div class="cd"><h2>Postings waiting for approval</h2>${pend.map(o => `<div class="it"><b>${esc(o.title)}</b> <small>${esc(o.company_name)} · ${esc(o.type)} · needs ${o.skills.map(k => NAME[k] || k).join(", ")}</small><div class="row"><button class="s p" data-act="approve" data-a="${o.id}">Approve</button><button class="s" data-act="reject" data-a="${o.id}">Reject and delete</button></div></div>`).join("") || `<p class="mu">Nothing waiting. New postings from industry accounts appear here first.</p>`}</div>`;
  } else if (ADM === "users") {
    h += `<div class="cd"><h2>Users (${profs.length})</h2>${profs.map(p => `<div class="it"><b>${esc(p.name)}</b> <small>${p.role}</small><div class="row"><select id="r_${p.id}">${["student", "industry", "academician", "institution", "admin"].map(r => `<option ${r === p.role ? "selected" : ""}>${r}</option>`).join("")}</select><button class="s" data-act="setrole" data-a="${p.id}">Save role</button>${p.id === ME.id ? "" : `<button class="s" data-act="deluser" data-a="${p.id}">Remove</button>`}</div></div>`).join("")}</div>`;
  } else if (ADM === "programs") {
    h += `<div class="cd"><h2>Learning programs</h2><div class="row"><input id="lt" placeholder="Course or workshop title"><select id="ls">${SKILLS.map(x => `<option value="${x[0]}">${x[1]}</option>`).join("")}</select><button class="p" data-act="program">Add</button></div>${prs.map(p => `<div class="it"><b>${esc(p.title)}</b> <small>${esc(p.provider)} · ${NAME[p.skill] || p.skill}</small> <button class="s" data-act="delprog" data-a="${p.id}">Delete</button></div>`).join("")}</div>`;
  } else {
    h += `<div class="cd"><h2>Announcements</h2><small>Shown on the public home page.</small><div class="row"><input id="an" placeholder="Write an announcement"><button class="p" data-act="addnews">Publish</button></div>${news.map(n => `<div class="it">${esc(n.message)} <button class="s" data-act="delnews" data-a="${n.id}">Delete</button></div>`).join("")}</div>`;
  }
  return h;
}

/* 6. ACTIONS/* 6. ACTIONS (all button clicks, handled in one place) ------------------------------ */
const val = id => ($(id).value || "").trim();
const ACT = {
  tab: a => { TAB = a; },
  goup: () => { TAB = "app"; AUTHMODE = "up"; },
  admtab: a => { ADM = a; },
  approve: async a => { await db.update("opportunities", a, { status: "Approved" }); toast("Approved: now visible to users"); },
  reject: async a => { await db.delete("opportunities", a); toast("Removed"); },
  setrole: async a => { await db.update("profiles", a, { role: $("r_" + a).value }); toast("Role updated"); },
  deluser: async a => { await db.delete("profiles", a); toast("User removed"); },
  delprog: async a => { await db.delete("programs", a); },
  addnews: async () => { if (!val("an")) throw new Error("Write an announcement"); await db.insert("announcements", { message: val("an") }); toast("Announcement published"); },
  delnews: async a => { await db.delete("announcements", a); },
  authmode: a => { AUTHMODE = a; },
  signin: async () => { ME = await auth.signIn(val("em"), $("pw").value); DRAFT = null; TAB = "app"; },
  demo: async a => { ME = await auth.signIn(a, "demo123"); DRAFT = null; TAB = "app"; },
  signup: async () => { if (!val("nm") || !val("em") || $("pw").value.length < 6) throw new Error("Fill all fields (password 6+ characters)"); ME = await auth.signUp(val("em"), $("pw").value, val("nm"), val("rl")); DRAFT = null; TAB = "app"; },
  signout: async () => { await auth.signOut(); ME = null; DRAFT = null; TAB = "home"; },
  saverate: async () => { await Promise.all(SKILLS.map(s => db.upsert("skill_ratings", { user_id: ME.id, skill: s[0], level: DRAFT[s[0]] || 0 }, "user_id,skill"))); toast("Skill profile saved"); },
  savecgpa: async () => { const v = parseFloat(val("cg")); if (!(v >= 0 && v <= 10)) throw new Error("CGPA must be 0 to 10"); ME = await db.update("profiles", ME.id, { cgpa: v }); toast("CGPA saved"); },
  apply: async a => { const o = (await db.select("opportunities", { eq: { id: a } }))[0]; if (o.min_cgpa > ME.cgpa) throw new Error("Not eligible"); await db.insert("applications", { opportunity_id: a, applicant_id: ME.id, status: "Applied" }); toast("Applied"); },
  addport: async () => { if (val("pt")) await db.insert("portfolio_items", { user_id: ME.id, title: val("pt"), kind: "Added by me", verified: false }); },
  post: async () => { const sk = val("os").toLowerCase().split(",").map(x => x.trim()).filter(k => NAME[k]); if (!val("ot") || !sk.length) throw new Error("Add a title and at least one valid skill key"); await db.insert("opportunities", { company_id: ME.id, company_name: ME.name, title: val("ot"), type: val("oy"), skills: sk, min_cgpa: parseFloat(val("oc")) || 0, status: "Pending" }); toast("Sent to admin for approval"); },
  program: async () => { if (!val("lt")) throw new Error("Add a title"); await db.insert("programs", { title: val("lt"), provider: ME.name, skill: val("ls") }); toast("Program published"); },
  stage: async (a, b) => { await db.update("applications", a, { status: b }); },
  verify: async a => { await db.update("portfolio_items", a, { verified: true }); },
  clearlog: () => { LOG.length = 0; },
  resetmock: () => { M = seedDemo(); persist(); ME = null; TAB = "home"; toast("Demo data reset"); }
};
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  try { await ACT[b.dataset.act](b.dataset.a, b.dataset.b); } catch (err) { toast(err.message || String(err)); }
  render();
});
document.addEventListener("input", e => { const k = e.target.dataset.rate; if (k) { DRAFT[k] = +e.target.value; e.target.nextElementSibling.textContent = e.target.value; } });

/* 7. BOOT: draw the page ----------------------------------------------------------- */
async function render() {
  const roleView = { student: studentView, industry: industryView, academician: academicianView, institution: institutionView, admin: adminView };
  $("mode").className = "banner " + (LIVE ? "live" : "");
  $("mode").textContent = LIVE ? "Connected to a real Supabase database." : "Demo mode: data is stored in this browser only. Add Supabase keys in config.js for the real database.";
  $("who").innerHTML = ME ? `<span class="m">${ME.role}</span> ${esc(ME.name)} <button class="s" data-act="signout">Sign out</button>` : `<button class="s p" data-act="goup">Sign up</button>`;
  const nav = [["home", "Home"], ["app", ME ? (ME.role === "admin" ? "Admin panel" : "My dashboard") : "Sign in"], ["log", "Under the hood"], ["db", "Database"]];
  $("tabs").innerHTML = nav.map(t => `<button class="${TAB === t[0] ? "on" : ""}" data-act="tab" data-a="${t[0]}">${t[1]}</button>`).join("");
  try { $("v").innerHTML = TAB === "home" ? await homeView() : TAB === "log" ? logView() : TAB === "db" ? await dbView() : !ME ? loginView() : await roleView[ME.role](); }
  catch (err) { $("v").innerHTML = `<div class="cd"><h2>Something went wrong</h2><p>${esc(err.message)}</p></div>`; }
}
(async () => { try { ME = await auth.restore(); if (ME) TAB = "app"; } catch (e) {} render(); })();
