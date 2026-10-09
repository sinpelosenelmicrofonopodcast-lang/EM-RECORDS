begin;
do $$
declare c uuid:=gen_random_uuid(); u uuid; s uuid; ids uuid[]:='{}'; blocked boolean; i integer;
begin
 select id into u from auth.users where email_confirmed_at is not null and coalesce(is_anonymous,false)=false limit 1;
 if u is null then raise exception 'No verified identity available for transactional verification';end if;
 insert into public.collab_campaigns(id,slug,title,status,voting_start,voting_end)values(c,c::text,'Transactional verification','voting',now()-interval '1 hour',now()+interval '1 hour');
 for i in 1..6 loop
 s:=gen_random_uuid();ids:=array_append(ids,s);
 insert into auth.users(id,email,email_confirmed_at)values(s,'collab-fixture-'||s::text||'@example.invalid',now());
 insert into public.collab_submissions(id,campaign_id,user_id,artist_name,legal_name,email,track_title,pro,ipi,publisher,beat_source,status,demo_path,preview_verified,rights_verified,preview_consent,submission_terms)
 values(s,c,s,'fixture','fixture','fixture@example.invalid','track '||i,'BMI','123456','fixture','external','approved','fixture',true,true,true,'{}');
 end loop;
 for i in 1..5 loop perform public.collab_vote(c,ids[i],u);end loop;
 blocked:=false;begin perform public.collab_vote(c,ids[1],u);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Duplicate vote accepted';end if;
 blocked:=false;begin perform public.collab_vote(c,ids[6],u);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Sixth vote accepted';end if;
 update public.collab_campaigns set status='closed',voting_end=now()-interval '1 minute' where id=c;
 blocked:=false;begin perform public.collab_vote(c,ids[6],u);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Closed vote accepted';end if;
 perform public.collab_select(c,ids[1:5],ids[6:6],u,'Transactional tie verification');
 if (select count(*) from public.collab_submissions where campaign_id=c and status='selected')<>5 then raise exception 'Selection failed';end if;
 blocked:=false;begin perform public.collab_select(c,ids[1:5],ids[6:6],u,'repeat');exception when others then blocked:=true;end;
 if not blocked then raise exception 'Duplicate selection accepted';end if;
 raise notice 'PASS: valid votes, duplicate rejection, five-vote cap, closed voting, five winners, duplicate selection';
end $$;
rollback;
