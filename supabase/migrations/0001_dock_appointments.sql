create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'Evidence records are append only'; end $$;
create table sites (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, timezone text not null,
 traffic_plan text, review_due date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table docks (
 id uuid primary key default gen_random_uuid(), site_id uuid not null references sites, code text not null, name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(site_id,code)
);
create table carriers (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table appointments (
 id uuid primary key default gen_random_uuid(), code text not null unique, dock_id uuid not null references docks, carrier_id uuid not null references carriers,
 reference text not null default '', load_type text not null check(load_type in ('inbound','outbound','other')),
 starts_at timestamptz not null, ends_at timestamptz not null, status text not null default 'scheduled' check(status in ('requested','scheduled','arrived','in_progress','completed','canceled','no_show')),
 arrived_at timestamptz, started_at timestamptz, completed_at timestamptz, departed_at timestamptz,
 free_minutes integer not null default 120 check(free_minutes>=0 and free_minutes<=10080), owner text not null,
 local_changed boolean not null default false, source text, source_id text, exported_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at>starts_at), check(started_at is null or arrived_at is null or started_at>=arrived_at),
 check(completed_at is null or started_at is null or completed_at>=started_at),
 check(departed_at is null or completed_at is null or departed_at>=completed_at),
 check(departed_at is null or arrived_at is null or departed_at>=arrived_at), unique(source,source_id)
);
create table safety_checks (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null references appointments,
 controller text not null, load_information text not null, restraint text not null, exclusion_zone text not null, driver_brief text not null,
 actor text not null, checked_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table events (
 id uuid primary key default gen_random_uuid(), appointment_id uuid references appointments, kind text not null, actor text not null, evidence text not null,
 payload jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table imports (
 id uuid primary key default gen_random_uuid(), source text not null, exported_at timestamptz not null, sha256 text not null,
 original_csv text not null, mapping jsonb not null, actor text not null, row_count integer not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table source_versions (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null references appointments, import_id uuid not null references imports,
 raw jsonb not null, normalized jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['sites','docks','carriers','appointments','safety_checks','events','imports','source_versions'] loop
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 end loop;
 foreach t in array array['safety_checks','events','imports','source_versions'] loop
 execute format('create trigger immutable before update or delete on %I for each row execute function immutable_record()',t);
 end loop;
end $$;
create index appointments_dock_time on appointments(dock_id,starts_at,ends_at);
create view v_appointments as
select a.*,s.code site,s.name site_name,s.timezone,d.code dock,c.code carrier,c.name carrier_name,
 to_char(a.starts_at at time zone s.timezone,'YYYY-MM-DD HH24:MI') local_start,
 to_char(a.ends_at at time zone s.timezone,'YYYY-MM-DD HH24:MI') local_end,
 case when a.arrived_at is not null then round(extract(epoch from (a.arrived_at-a.starts_at))/60)::int end arrival_delta_minutes,
 case when a.arrived_at is not null and a.started_at is not null then round(extract(epoch from (a.started_at-a.arrived_at))/60)::int end wait_minutes,
 case when a.arrived_at is not null then greatest(0,round(extract(epoch from (coalesce(a.departed_at,now())-a.arrived_at))/60)::int-a.free_minutes) end excess_minutes
from appointments a join docks d on d.id=a.dock_id join sites s on s.id=d.site_id join carriers c on c.id=a.carrier_id;
create view v_conflicts as
select a.id,a.code appointment,b.code conflicting_appointment,a.dock_id,a.starts_at,a.ends_at
from appointments a join appointments b on a.dock_id=b.dock_id and a.id<b.id and a.starts_at<b.ends_at and b.starts_at<a.ends_at
where a.status in ('requested','scheduled','arrived','in_progress') and b.status in ('requested','scheduled','arrived','in_progress');
create view v_attention as
select id,code,site,dock,carrier,owner,'arrival_overdue' reason,local_start detail from v_appointments where status='scheduled' and starts_at<now()
union all select id,code,site,dock,carrier,owner,'request_unapproved',local_start from v_appointments where status='requested' and starts_at<now()+interval '1 day'
union all select id,code,site,dock,carrier,owner,'detention_review',excess_minutes::text||' minutes beyond agreed free time; not a charge' from v_appointments where arrived_at is not null and departed_at is null and excess_minutes>0 and status not in ('canceled','no_show')
union all select id,code,site,dock,carrier,owner,'missing_reference','Confirm the shipment reference' from v_appointments where reference='' and status not in ('canceled','no_show')
union all select a.id,a.code,a.site,a.dock,a.carrier,a.owner,'dock_conflict','Overlaps '||c.conflicting_appointment from v_appointments a join v_conflicts c on a.id=c.id;
create view v_compliance as
select a.id,a.code,'LOAD-EVIDENCE' rule,'Loading record has no recorded safety check' finding from appointments a where a.status in ('in_progress','completed') and not exists(select 1 from safety_checks c where c.appointment_id=a.id)
union all select a.id,a.code,'TIMELINE','Arrival, loading or completion timestamp missing' from appointments a where (status in ('arrived','in_progress','completed') and arrived_at is null) or (status in ('in_progress','completed') and started_at is null) or (status='completed' and completed_at is null)
union all select a.id,a.code,'DEPARTURE','Completed load has no departure time' from appointments a where status='completed' and departed_at is null
union all select s.id,s.code,'TRAFFIC-PLAN','Site traffic plan or review date missing or overdue' from sites s where nullif(s.traffic_plan,'') is null or s.review_due is null or s.review_due<current_date;
create view v_carrier_scorecard as
select carrier,count(*)::int appointments,count(*) filter(where arrived_at is not null)::int observed_arrivals,
 count(*) filter(where arrival_delta_minutes>15)::int late_over_15_minutes,
 count(*) filter(where status='no_show')::int no_shows,
 round(avg(wait_minutes),1) average_wait_minutes,
 count(*) filter(where status='completed' and departed_at is null)::int missing_departures
from v_appointments group by carrier;
