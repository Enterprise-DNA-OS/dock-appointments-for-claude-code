do $$ begin
if exists(select 1 from sites) then return; end if;
insert into sites(id,code,name,timezone,traffic_plan,review_due) values
('10000000-0000-0000-0000-000000000001','HARBOUR','Harbour Distribution Demo','Pacific/Auckland','Synthetic traffic plan: pedestrian segregation, driver waiting bay and load controller',current_date+30),
('10000000-0000-0000-0000-000000000002','WEST','West Depot Demo','Australia/Sydney',null,current_date-10);
insert into docks(id,site_id,code,name) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','IN-1','Receiving one'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','OUT-1','Dispatch one'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','IN-1','West receiving');
insert into carriers(id,code,name) values
('30000000-0000-0000-0000-000000000001','FERN','Fern Freight Demo'),
('30000000-0000-0000-0000-000000000002','FERN-NORTH','Fern Northern Demo'),
('30000000-0000-0000-0000-000000000003','RIDGE','Ridge Haulage Demo');
insert into appointments(code,dock_id,carrier_id,reference,load_type,starts_at,ends_at,status,arrived_at,started_at,completed_at,departed_at,owner) values
('APT-101','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','PO-4101','inbound',now()-interval '3 hours',now()-interval '2 hours','scheduled',null,null,null,null,'Rae'),
('APT-102','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003','SO-5220','outbound',now()-interval '4 hours',now()-interval '3 hours','arrived',now()-interval '4 hours',null,null,null,'Jules'),
('APT-103','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003','','inbound',now()+interval '2 hours',now()+interval '3 hours','scheduled',null,null,null,null,'Rae'),
('APT-104','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','PO-4104','inbound',now()+interval '2 hours 30 minutes',now()+interval '3 hours 30 minutes','requested',null,null,null,null,'Rae'),
('APT-105','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','PO-4105','inbound',now()-interval '2 days',now()-interval '47 hours','completed',now()-interval '47 hours 30 minutes',now()-interval '47 hours',now()-interval '46 hours',now()-interval '45 hours 30 minutes','Jules'),
('APT-106','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','PO-4106','inbound',now()-interval '1 day',now()-interval '23 hours','no_show',null,null,null,null,'Jules'),
('APT-107','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','SO-5227','outbound',now()-interval '1 day',now()-interval '23 hours','completed',null,null,null,null,'Rae');
insert into events(kind,actor,evidence) values('demo','Demo seed','All businesses, loads and evidence are synthetic. Deliberate conflicts and missing history demonstrate review queues.');
end $$;
