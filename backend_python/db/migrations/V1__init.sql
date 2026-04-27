-- 개발 초기화용 전체 재생성 스키마
-- 기존 테이블과 함수는 모두 제거하고 다시 만든다.
drop table if exists rag_chunks cascade;
drop table if exists analysis_results cascade;
drop table if exists application_entries cascade;
drop table if exists experience_entries cascade;
drop table if exists crawl_snapshots cascade;
drop table if exists crawl_sources cascade;
drop table if exists companies cascade;
drop function if exists set_updated_at() cascade;

create extension if not exists vector;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists companies (
  id bigserial primary key,

  company_name text not null,
  normalized_company_name text not null,

  company_url text,
  normalized_url text,
  company_domain text,
  url_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_normalized_name
  on companies (normalized_company_name);

create index if not exists idx_companies_domain
  on companies (company_domain);

create index if not exists idx_companies_normalized_url
  on companies (normalized_url);

create unique index if not exists uq_companies_url_hash
  on companies (url_hash)
  where url_hash is not null;

create unique index if not exists uq_companies_normalized_url
  on companies (normalized_url)
  where normalized_url is not null;

drop trigger if exists trg_companies_updated_at on companies;
create trigger trg_companies_updated_at
before update on companies
for each row execute function set_updated_at();

create table if not exists crawl_sources (
  id bigserial primary key,

  company_id bigint references companies(id) on delete set null,

  source_type text not null,
  original_url text not null,
  normalized_url text not null,
  url_hash text not null,

  etag text,
  last_modified text,
  content_hash text,

  http_status int,
  crawl_status text not null default 'pending',

  fetched_at timestamptz,
  next_fetch_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_crawl_sources_status
    check (crawl_status in ('pending', 'fetching', 'fetched', 'not_modified', 'failed', 'skipped'))
);

create unique index if not exists uq_crawl_sources_url_hash
  on crawl_sources (url_hash);

create index if not exists idx_crawl_sources_company_id
  on crawl_sources (company_id);

create index if not exists idx_crawl_sources_source_type
  on crawl_sources (source_type);

create index if not exists idx_crawl_sources_normalized_url
  on crawl_sources (normalized_url);

create index if not exists idx_crawl_sources_next_fetch_at
  on crawl_sources (next_fetch_at);

create index if not exists idx_crawl_sources_content_hash
  on crawl_sources (content_hash);

drop trigger if exists trg_crawl_sources_updated_at on crawl_sources;
create trigger trg_crawl_sources_updated_at
before update on crawl_sources
for each row execute function set_updated_at();

create table if not exists crawl_snapshots (
  id bigserial primary key,

  crawl_source_id bigint not null references crawl_sources(id) on delete cascade,
  content_hash text not null,

  raw_html text,
  extracted_text text,

  fetched_at timestamptz not null default now(),
  is_latest boolean not null default true
);

create index if not exists idx_crawl_snapshots_source_id
  on crawl_snapshots (crawl_source_id);

create index if not exists idx_crawl_snapshots_content_hash
  on crawl_snapshots (content_hash);

create unique index if not exists uq_crawl_snapshots_source_content
  on crawl_snapshots (crawl_source_id, content_hash);

create unique index if not exists uq_crawl_snapshots_latest
  on crawl_snapshots (crawl_source_id)
  where is_latest;

create table if not exists experience_entries (
  id bigserial primary key,

  user_id text not null,
  title text,
  raw_text text not null,
  content_hash text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experience_entries_user_id
  on experience_entries (user_id);

create index if not exists idx_experience_entries_content_hash
  on experience_entries (content_hash);

drop trigger if exists trg_experience_entries_updated_at on experience_entries;
create trigger trg_experience_entries_updated_at
before update on experience_entries
for each row execute function set_updated_at();

create table if not exists application_entries (
  id bigserial primary key,

  user_id text not null,
  company_id bigint references companies(id) on delete set null,
  target_position text,

  company_url text,
  job_post_url text,

  raw_text text not null,
  content_hash text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_application_entries_user_id
  on application_entries (user_id);

create index if not exists idx_application_entries_company_id
  on application_entries (company_id);

create index if not exists idx_application_entries_target_position
  on application_entries (target_position);

create index if not exists idx_application_entries_content_hash
  on application_entries (content_hash);

create index if not exists idx_application_entries_job_post_url
  on application_entries (job_post_url);

drop trigger if exists trg_application_entries_updated_at on application_entries;
create trigger trg_application_entries_updated_at
before update on application_entries
for each row execute function set_updated_at();

create table if not exists rag_chunks (
  id bigserial primary key,

  user_id text not null default 'public',
  source_type text not null,
  source_table text not null,
  source_id bigint not null,

  chunk_index int not null,
  chunk_text text not null,
  chunk_hash text not null,

  embedding vector(1536) not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint chk_rag_chunks_source_type
    check (source_type in ('company_profile', 'job_post', 'experience', 'essay_prompt')),

  constraint chk_rag_chunks_source_table
    check (source_table in ('crawl_snapshots', 'experience_entries', 'application_entries'))
);

create unique index if not exists uq_rag_chunks_source_chunk
  on rag_chunks (source_table, source_id, chunk_index);

create index if not exists idx_rag_chunks_chunk_hash
  on rag_chunks (chunk_hash);

create index if not exists idx_rag_chunks_source_chunk_hash
  on rag_chunks (user_id, source_table, source_id, chunk_hash);

create index if not exists idx_rag_chunks_user_id
  on rag_chunks (user_id);

create index if not exists idx_rag_chunks_source_type
  on rag_chunks (source_type);

create index if not exists idx_rag_chunks_source_ref
  on rag_chunks (source_table, source_id);

create index if not exists idx_rag_chunks_embedding
  on rag_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create table if not exists analysis_results (
  id bigserial primary key,

  user_id text not null,

  company_id bigint references companies(id) on delete set null,
  application_id bigint references application_entries(id) on delete set null,
  experience_id bigint references experience_entries(id) on delete set null,

  company_name text,
  target_position text,
  essay_prompt text not null,

  essay_emotion_text text,
  essay_formal_text text,

  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_results_user_id
  on analysis_results (user_id);

create index if not exists idx_analysis_results_company_id
  on analysis_results (company_id);

create index if not exists idx_analysis_results_application_id
  on analysis_results (application_id);

create index if not exists idx_analysis_results_experience_id
  on analysis_results (experience_id);

create index if not exists idx_analysis_results_created_at
  on analysis_results (created_at desc);
