-- Storage policies for label recognition buckets
-- Run this in Supabase SQL Editor

-- Policies for label-images bucket
insert into storage.buckets (id, name, public)
values ('label-images', 'label-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('wine-images', 'wine-images', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder in label-images
create policy "Users can upload label images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own uploaded labels
create policy "Users can read own label images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own labels
create policy "Users can delete own label images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role to do everything (for moderation workflows)
create policy "Service role full access to label-images"
on storage.objects for all
to service_role
using (bucket_id = 'label-images');

create policy "Service role full access to wine-images"
on storage.objects for all
to service_role
using (bucket_id = 'wine-images');

-- Allow moderators/admins to read label-images
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

-- Allow moderators/admins to read wine-images
create policy "Moderators can read wine images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'wine-images' AND
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role in ('admin', 'moderator')
  )
);

