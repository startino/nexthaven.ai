# Search Results Supabase Schema

This document outlines the database schema and required setup for storing detailed search results.

## Table Structure

You need to create a new table in Supabase called `search_results` with the following structure:

```sql
CREATE TABLE public.search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID NOT NULL REFERENCES public.search_history(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    property_url TEXT,
    price NUMERIC,
    location TEXT,
    rooms INTEGER,
    baths INTEGER,
    amenities JSONB,
    score NUMERIC,
    image_url TEXT,
    gallery JSONB,
    property_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Row Level Security Policies

To ensure proper data protection, add the following RLS policies:

```sql
-- Enable RLS
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own search results
-- This uses a join with search_history to check ownership
CREATE POLICY "Users can view their own search results"
    ON public.search_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.search_history
            WHERE search_history.id = search_results.search_id
            AND search_history.user_id = auth.uid()
        )
    );

-- Create policy to allow insertion of search results
CREATE POLICY "Users can insert search results for their searches"
    ON public.search_results
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.search_history
            WHERE search_history.id = search_results.search_id
            AND search_history.user_id = auth.uid()
        )
    );

-- Create policy to allow deletion of search results
CREATE POLICY "Users can delete their own search results"
    ON public.search_results
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.search_history
            WHERE search_history.id = search_results.search_id
            AND search_history.user_id = auth.uid()
        )
    );
```

## Indexes

For better performance, add these indexes:

```sql
CREATE INDEX search_results_search_id_idx ON public.search_results (search_id);
CREATE INDEX search_results_score_idx ON public.search_results (score);
```

## Fields Description

- `id`: Unique identifier for each search result
- `search_id`: Foreign key reference to the search_history table
- `property_name`: Name of the property
- `property_url`: URL to the property page on the original site
- `price`: Numeric price of the property
- `location`: Text description of the property location
- `rooms`: Number of rooms in the property
- `baths`: Number of bathrooms in the property
- `amenities`: JSON array of amenities available at the property
- `score`: Numeric score/rating of the property (from AI evaluation)
- `image_url`: Main image URL for the property
- `gallery`: JSON array of additional image URLs
- `property_data`: Complete JSON data of the property (for future-proofing)
- `created_at`: Timestamp when the record was created
