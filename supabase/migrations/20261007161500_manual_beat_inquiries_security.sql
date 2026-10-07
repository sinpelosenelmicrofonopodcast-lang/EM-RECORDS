drop policy if exists "beat inquiries deny client access" on public.beat_inquiries;
create policy "beat inquiries deny client access"
on public.beat_inquiries
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "beat inquiry messages deny client access" on public.beat_inquiry_messages;
create policy "beat inquiry messages deny client access"
on public.beat_inquiry_messages
for all
to anon, authenticated
using (false)
with check (false);
