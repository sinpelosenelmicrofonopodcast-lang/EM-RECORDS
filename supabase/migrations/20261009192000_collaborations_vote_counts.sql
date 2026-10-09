create function public.collab_vote_counts()
returns table(submission_id uuid,votes bigint) language sql stable security invoker set search_path='' as $$
 select submission_id,count(*) from public.collab_votes group by submission_id;
$$;
revoke all on function public.collab_vote_counts() from public,anon,authenticated;
grant execute on function public.collab_vote_counts() to service_role;
