-- Create function for vector similarity search
create or replace function match_documents (
  query_embedding vector(3072),
  match_threshold float default 0.7,
  match_count int default 6
)
returns table (
  chunk_id bigint,
  chunk text,
  doc_id uuid,
  score float
)
language sql stable
as $$
  select
    doc_chunks.chunk_id,
    doc_chunks.chunk,
    doc_chunks.doc_id,
    1 - (doc_chunks.embedding <=> query_embedding) as score
  from doc_chunks
  where 1 - (doc_chunks.embedding <=> query_embedding) > match_threshold
  order by doc_chunks.embedding <=> query_embedding
  limit match_count;
$$;
