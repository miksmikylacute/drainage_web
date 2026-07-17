-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_no bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  issue text NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'In Progress'::text,
  date_submitted timestamp with time zone NOT NULL DEFAULT now(),
  submitted_by text,
  contact_no text,
  description text NOT NULL,
  remarks text,
  map_coords jsonb,
  lat_lng_label text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id)
);
CREATE TABLE public.residents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'Active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT residents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);