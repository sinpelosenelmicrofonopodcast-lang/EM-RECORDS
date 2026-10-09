-- Private demos, versioned agreements and atomic voting. Only the server service role
-- can access these records; every HTTP operation separately checks verified identity.
create table public.collab_campaigns (
 id uuid primary key default gen_random_uuid(), slug text not null unique,
 title text not null, description text not null default '', project_artist text not null default 'RBELD',
 status text not null default 'draft' check(status in ('draft','submissions','voting','closed','production','released')),
 legal_entity text not null default '', eligibility text not null default '', promotion_commitment text not null default '',
 submissions_start timestamptz, submissions_end timestamptz, voting_start timestamptz, voting_end timestamptz,
 max_submissions integer not null default 20 check(max_submissions between 5 and 50),
 legal_reviewed boolean not null default false, rules_version integer not null default 1,
 rules jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.collab_beats (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.collab_campaigns(id),
 source_beat_id uuid references public.beats(id), title text not null, producer text not null, rights_confirmed boolean not null default false,
 license_notes text not null default '', active boolean not null default true
);
create table public.collab_submissions (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.collab_campaigns(id),
 user_id uuid not null references auth.users(id), artist_name text not null, legal_name text not null,
 email text not null, track_title text not null, pro text not null, ipi text not null,
 publisher text not null, publisher_ipi text not null default '', message text not null default '',
 beat_source text not null check(beat_source in ('catalog','external')),
 beat_id uuid references public.collab_beats(id), beat_rights text not null default '',
 status text not null default 'uploading' check(status in ('uploading','received','rights_pending','approved','selected','reserve','rejected','production','released')),
 demo_path text not null, document_path text, preview_path text, preview_verified boolean not null default false,
 rights_verified boolean not null default false, preview_consent boolean not null default false,
 submission_terms jsonb not null, accepted_at timestamptz not null default now(),
 notes text not null default '', splits jsonb not null default '{}',
 contract_ready boolean not null default false, contract_revision integer not null default 1,
 contract_snapshot jsonb, contract_text text, contract_hash text,
 contract_signature jsonb, production_checklist jsonb not null default '{}',
 created_at timestamptz not null default now(), unique(campaign_id,user_id)
);
create index collab_submissions_campaign_status on public.collab_submissions(campaign_id,status);
create table public.collab_uploads (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.collab_submissions(id) on delete cascade,
 path text not null unique, kind text not null check(kind in ('demo','document','preview','contract')),
 bytes bigint not null check(bytes>0 and bytes<=5242880), completed boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.collab_votes (
 campaign_id uuid not null references public.collab_campaigns(id),
 submission_id uuid not null references public.collab_submissions(id),
 user_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(campaign_id,submission_id,user_id)
);
create index collab_votes_user on public.collab_votes(campaign_id,user_id);
create table public.collab_audit (
 id uuid primary key default gen_random_uuid(), campaign_id uuid references public.collab_campaigns(id),
 submission_id uuid references public.collab_submissions(id), actor_id uuid references auth.users(id),
 action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.collab_campaigns enable row level security;
alter table public.collab_beats enable row level security;
alter table public.collab_submissions enable row level security;
alter table public.collab_uploads enable row level security;
alter table public.collab_votes enable row level security;
alter table public.collab_audit enable row level security;
revoke all on public.collab_campaigns,public.collab_beats,public.collab_submissions,public.collab_uploads,public.collab_votes,public.collab_audit from anon,authenticated;
grant all on public.collab_campaigns,public.collab_beats,public.collab_submissions,public.collab_uploads,public.collab_votes,public.collab_audit to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('collaboration-private','collaboration-private',false,5242880,array['audio/mpeg','audio/wav','application/pdf'])
on conflict(id) do nothing;
-- Storage has no public/user policies for this bucket. Upload tokens are scoped by server.
create function public.collab_reserve_upload(p_submission uuid,p_path text,p_kind text,p_bytes bigint)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_existing bigint; v_reserved bigint;
begin
 perform pg_advisory_xact_lock(918241);
 select coalesce(sum((metadata->>'size')::bigint),0) into v_existing from storage.objects;
 select coalesce(sum(u.bytes),0) into v_reserved from public.collab_uploads u
 where not exists(select 1 from storage.objects o where o.bucket_id='collaboration-private' and o.name=u.path);
 if v_existing+v_reserved+p_bytes > 943718400 then raise exception 'Storage safety limit reached'; end if;
 if (select coalesce(sum(bytes),0) from public.collab_uploads)+p_bytes > 104857600 then raise exception 'Collaboration upload budget reached'; end if;
 if (select count(*) from public.collab_uploads where submission_id=p_submission) >= 12 then raise exception 'Upload limit reached'; end if;
 insert into public.collab_uploads(submission_id,path,kind,bytes) values(p_submission,p_path,p_kind,p_bytes) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.collab_reserve_upload(uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.collab_reserve_upload(uuid,text,text,bigint) to service_role;
create function public.collab_vote(p_campaign uuid,p_submission uuid,p_user uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare c public.collab_campaigns;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_campaign::text,0));
 select * into c from public.collab_campaigns where id=p_campaign for share;
 if c.status<>'voting' or now()<c.voting_start or now()>c.voting_end or c.voting_start is null or c.voting_end is null then raise exception 'Voting is closed'; end if;
 -- Verified email is checked by the server Auth API before this service-role-only RPC.
 if not exists(select 1 from public.collab_submissions where id=p_submission and campaign_id=p_campaign and status='approved' and rights_verified and preview_verified and preview_consent) then raise exception 'Track is not eligible'; end if;
 if exists(select 1 from public.collab_votes where campaign_id=p_campaign and submission_id=p_submission and user_id=p_user) then raise exception 'You already voted for this track'; end if;
 if (select count(*) from public.collab_votes where campaign_id=p_campaign and user_id=p_user)>=5 then raise exception 'Maximum five different tracks'; end if;
 insert into public.collab_votes values(p_campaign,p_submission,p_user,now());
end $$;
revoke all on function public.collab_vote(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.collab_vote(uuid,uuid,uuid) to service_role;
create function public.collab_create_submission(p_campaign uuid,p_user uuid,p_data jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.collab_campaigns; v_id uuid;
begin
 select * into c from public.collab_campaigns where id=p_campaign for update;
 if c.status<>'submissions' or now()<c.submissions_start or now()>c.submissions_end or c.submissions_start is null or c.submissions_end is null then raise exception 'Submissions are closed'; end if;
 if (select count(*) from public.collab_submissions where campaign_id=p_campaign)>=c.max_submissions then raise exception 'Submission limit reached'; end if;
 -- Verified email is checked by the server Auth API before this service-role-only RPC.
 if p_data->>'beat_source'='catalog' and not exists(select 1 from public.collab_beats where id=(p_data->>'beat_id')::uuid and campaign_id=p_campaign and rights_confirmed and active) then raise exception 'Beat unavailable'; end if;
 insert into public.collab_submissions(campaign_id,user_id,artist_name,legal_name,email,track_title,pro,ipi,publisher,publisher_ipi,message,beat_source,beat_id,beat_rights,demo_path,preview_consent,submission_terms)
 values(p_campaign,p_user,p_data->>'artist_name',p_data->>'legal_name',p_data->>'email',p_data->>'track_title',p_data->>'pro',p_data->>'ipi',p_data->>'publisher',coalesce(p_data->>'publisher_ipi',''),coalesce(p_data->>'message',''),p_data->>'beat_source',nullif(p_data->>'beat_id','')::uuid,coalesce(p_data->>'beat_rights',''),'',(p_data->>'preview_consent')::boolean,p_data->'submission_terms') returning id into v_id;
 return v_id;
end $$;
revoke all on function public.collab_create_submission(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.collab_create_submission(uuid,uuid,jsonb) to service_role;
insert into public.collab_campaigns(slug,title,description,rules)
values('romance-urbano-vol-1','Romance Urbano Vol. 1','Cinco temas seleccionados por la comunidad. Un proyecto de RBELD publicado por EM Records.',
'{"master_em":50,"master_artist":50,"duration":"copyright_term","recoupment":false,"winners":5,"reserves":2,"preview_seconds":30,"max_votes":5,"tie_break":"Evaluación de RBELD: adecuación al concepto, composición e interpretación; decisión documentada.","withdrawal":"Se puede retirar antes del cierre de recepción; después, se gestionan solicitudes y permisos concedidos según las bases.","included":"Arte, promoción orgánica definida, distribución, mezcla y beat cuando sean necesarios. Sin promesa de reproducciones o ingresos.","external_beats":"Propiedad o licencia suficiente, con autorizaciones para distribución, promoción audiovisual y monetización; composición sujeta a titulares existentes."}'::jsonb);
create function public.collab_select(p_campaign uuid,p_winners uuid[],p_reserves uuid[],p_actor uuid,p_reason text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.collab_campaigns where id=p_campaign and status='closed' and voting_end<now() for update;
 if not found then raise exception 'Campaign is not closed'; end if;
 if exists(select 1 from public.collab_submissions where campaign_id=p_campaign and status in ('selected','reserve','production','released')) then raise exception 'Selection already completed'; end if;
 if cardinality(p_winners)<>5 then raise exception 'Five winners required';end if;
 update public.collab_submissions set status='selected' where campaign_id=p_campaign and id=any(p_winners) and status='approved';
 if (select count(*) from public.collab_submissions where campaign_id=p_campaign and status='selected')<>5 then raise exception 'Invalid winners';end if;
 update public.collab_submissions set status='reserve' where campaign_id=p_campaign and id=any(p_reserves) and status='approved';
 insert into public.collab_audit(campaign_id,actor_id,action,details) values(p_campaign,p_actor,'selection_completed',jsonb_build_object('winners',p_winners,'reserves',p_reserves,'reason',p_reason));
end $$;
revoke all on function public.collab_select(uuid,uuid[],uuid[],uuid,text) from public,anon,authenticated;
grant execute on function public.collab_select(uuid,uuid[],uuid[],uuid,text) to service_role;
