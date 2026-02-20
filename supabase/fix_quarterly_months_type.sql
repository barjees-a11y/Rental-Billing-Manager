-- ----------------------------------------------------------------------------
-- Fix for 400 Bad Request Error During Excel Import
-- ----------------------------------------------------------------------------
-- The error "invalid input syntax for type integer: 'FEB-MAY-AUG-NOV'"
-- indicates that the 'quarterly_months' column was created as an INTEGER
-- in your live Supabase database, but the app expects to store a TEXT 
-- string like 'FEB-MAY-AUG-NOV'.
--
-- This script safely alters the column type to TEXT.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    -- Check if the quarterly_months column exists and needs type change
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'contracts'
          AND column_name = 'quarterly_months'
    ) THEN
        -- Alter the column type to text
        -- We drop any existing default or data if it's strictly integer and casting fails,
        -- but USING quarterly_months::text helps convert existing ints to text safely.
        ALTER TABLE public.contracts 
        ALTER COLUMN quarterly_months TYPE text USING quarterly_months::text;
    ELSE
        -- If it doesn't exist at all, add it as text
        ALTER TABLE public.contracts
        ADD COLUMN quarterly_months text;
    END IF;
END $$;
