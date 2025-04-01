# Anonymous User Search Limit

This document outlines the database schema for tracking search usage by anonymous users.

## Table Structure

You need to create a new table in Supabase called `anonymous_search_limits` with the following structure:

```sql
CREATE TABLE public.anonymous_search_limits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    search_count INTEGER DEFAULT 0 NOT NULL,
    last_search_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Row Level Security Policies

To ensure proper data protection, add the following RLS policies:

```sql
-- Enable RLS
ALTER TABLE public.anonymous_search_limits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own search usage
CREATE POLICY "Users can view their own search limits"
    ON public.anonymous_search_limits
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow system to update search limits
CREATE POLICY "System can update search limits"
    ON public.anonymous_search_limits
    FOR ALL
    USING (true);
```

## Indexes

For better performance, add these indexes:

```sql
CREATE INDEX anonymous_search_limits_user_id_idx ON public.anonymous_search_limits (user_id);
CREATE INDEX anonymous_search_limits_created_at_idx ON public.anonymous_search_limits (created_at);
```

## Fields Description

- `user_id`: The authenticated user ID (references auth.users)
- `search_count`: Number of searches performed by this anonymous user
- `last_search_at`: Timestamp of the most recent search
- `created_at`: Timestamp when the record was created
