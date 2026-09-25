-- Deduplicate the watches table and prevent future duplicates.
--
-- The scrapers used to call upsert() without an onConflict key, so every run
-- inserted fresh copies of the same watches. This script:
--   1. adds a stable per-source key (source_id) and backfills it from raw_data
--   2. keeps the oldest row per (source, source_id) and repoints every table
--      that references a duplicate onto that keeper
--   3. deletes the duplicates
--   4. adds a unique index so upsert(..., { onConflict: 'source,source_id' }) works
--
-- Runs in one transaction: if any step fails, nothing is changed.
-- Run it in the Supabase SQL editor.

begin;

-- 1. Stable key per source
alter table watches add column if not exists source_id text;

update watches set source_id = raw_data->>'watchId'
where source = 'Watch Database API' and source_id is null;

update watches set source_id = raw_data->'listing'->>'href'
where source in ('Jomashop', 'Chrono24') and source_id is null;

-- 2. Map each duplicate to the row being kept (oldest, id as tiebreak)
create temp table watch_dupes on commit drop as
select id as dupe_id, keeper_id
from (
  select id,
         first_value(id) over (partition by source, source_id order by created_at, id) as keeper_id
  from watches
  where source_id is not null
) ranked
where id <> keeper_id;

create index on watch_dupes (dupe_id);

select count(*) as duplicate_rows_to_delete from watch_dupes;

-- Per-user tables: drop rows that would become duplicates once repointed
-- (user already has the keeper, or has several copies of the same watch)
delete from favorites f
using (
  select f2.id,
         row_number() over (partition by f2.user_id, coalesce(d.keeper_id, f2.watch_id) order by (d.dupe_id is not null), f2.id) as rn
  from favorites f2
  left join watch_dupes d on d.dupe_id = f2.watch_id
) r
where f.id = r.id and r.rn > 1;

delete from watch_list_items w
using (
  select w2.id,
         row_number() over (partition by w2.list_id, coalesce(d.keeper_id, w2.watch_id) order by (d.dupe_id is not null), w2.id) as rn
  from watch_list_items w2
  left join watch_dupes d on d.dupe_id = w2.watch_id
) r
where w.id = r.id and r.rn > 1;

-- 3. Repoint references to the keeper
update favorites        t set watch_id = d.keeper_id from watch_dupes d where t.watch_id = d.dupe_id;
update watch_list_items t set watch_id = d.keeper_id from watch_dupes d where t.watch_id = d.dupe_id;
update user_collection  t set watch_id = d.keeper_id from watch_dupes d where t.watch_id = d.dupe_id;
update price_alerts     t set watch_id = d.keeper_id from watch_dupes d where t.watch_id = d.dupe_id;
update price_history    t set watch_id = d.keeper_id from watch_dupes d where t.watch_id = d.dupe_id;

-- affiliate_clicks may not exist yet (it's written to by the backend but not created in every environment)
do $$
begin
  if to_regclass('public.affiliate_clicks') is not null then
    update affiliate_clicks t set watch_id = d.keeper_id from watch_dupes d where t.watch_id = d.dupe_id;
  end if;
end $$;

-- 4. Remove duplicates and lock it in
delete from watches w using watch_dupes d where w.id = d.dupe_id;

create unique index if not exists watches_source_source_id_key on watches (source, source_id);

commit;
