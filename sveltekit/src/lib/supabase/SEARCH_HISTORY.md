# Search History Supabase Schema

This document outlines the database schema and required setup for the search history feature.

## Table Structure

You need to create a new table in Supabase called `search_history` with the following structure:

```sql
CREATE TABLE public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination TEXT,
    date_range TEXT,
    budget JSONB,
    rooms INTEGER,
    preferences TEXT,
    search_query JSONB NOT NULL,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Row Level Security Policies

To ensure proper data protection, add the following RLS policies:

```sql
-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own search history
CREATE POLICY "Users can view their own search history"
    ON public.search_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own search history
CREATE POLICY "Users can insert their own search history"
    ON public.search_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own search history
CREATE POLICY "Users can update their own search history"
    ON public.search_history
    FOR UPDATE
    USING (auth.uid() = user_id);
```

## Indexes

For better performance, add these indexes:

```sql
CREATE INDEX search_history_user_id_idx ON public.search_history (user_id);
CREATE INDEX search_history_created_at_idx ON public.search_history (created_at);
```

## Fields Description

- `id`: Unique identifier for the search history entry
- `user_id`: The authenticated user ID (references auth.users)
- `destination`: The location/destination searched for
- `date_range`: The date range in text format (e.g., "Next Week for 1 Month")
- `budget`: JSON object containing min and max budget values
- `rooms`: Number of rooms requested
- `preferences`: Text containing user preferences for the search
- `search_query`: Complete JSON of the search query for future reference
- `results_count`: Number of results returned for this search
- `created_at`: Timestamp when the search was created
- `updated_at`: Timestamp when the search was last updated
