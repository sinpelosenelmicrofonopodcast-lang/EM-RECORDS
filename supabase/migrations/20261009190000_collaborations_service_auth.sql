create or replace function public.collab_vote(p_campaign uuid,p_submission uuid,p_user uuid)
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
create or replace function public.collab_create_submission(p_campaign uuid,p_user uuid,p_data jsonb)
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