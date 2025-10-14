-- Add policy to allow moderators/admins to read label images
-- Run this in Supabase SQL Editor

create policy "Moderators can read label images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'label-images' AND
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role in ('admin', 'moderator')
  )
);
