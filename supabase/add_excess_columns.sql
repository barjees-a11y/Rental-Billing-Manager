-- Add excess count and rate columns to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS excess_count_bw integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS excess_count_clr integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS excess_rate_bw numeric DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS excess_rate_clr numeric DEFAULT 2.00;

-- Comment on columns
COMMENT ON COLUMN public.contracts.excess_count_bw IS 'Excess count for Black & White';
COMMENT ON COLUMN public.contracts.excess_count_clr IS 'Excess count for Color';
COMMENT ON COLUMN public.contracts.excess_rate_bw IS 'Excess rate for Black & White';
COMMENT ON COLUMN public.contracts.excess_rate_clr IS 'Excess rate for Color';
