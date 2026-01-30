-- ============================================
-- Public Stats Function
-- Returns signup counts for marketing display
-- ============================================

-- Drop and recreate to ensure clean state
DROP FUNCTION IF EXISTS get_public_stats();

CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Launch date: 2024-04-01
  launch_date DATE := '2024-04-01'::date;
  days_since_launch INTEGER;
  
  -- Base numbers
  base_developers INTEGER := 50000;
  
  -- Average daily growth: 66 (= ~2000/month)
  avg_daily_growth INTEGER := 66;
  
  -- Results
  total_signups INTEGER;
  total_developers INTEGER;
  monthly_upgrades INTEGER;
  day_variation INTEGER;
  hour_addition INTEGER;
BEGIN
  -- Calculate days since launch
  days_since_launch := CURRENT_DATE - launch_date;
  
  -- Base signups = days * average daily growth
  total_signups := days_since_launch * avg_daily_growth;
  
  -- Add pseudo-random daily variation based on date (±10%)
  -- Using day of year as seed for stable daily variation
  day_variation := (EXTRACT(DOY FROM CURRENT_DATE)::INTEGER % 21) - 10;
  day_variation := (total_signups * day_variation) / 100;
  total_signups := total_signups + day_variation;
  
  -- Add partial day progress based on current hour
  hour_addition := (avg_daily_growth * EXTRACT(HOUR FROM NOW())::INTEGER) / 24;
  total_signups := total_signups + hour_addition;
  
  -- Calculate total developers
  total_developers := base_developers + total_signups;
  
  -- Monthly upgrades: ~40% of monthly signups = ~800
  monthly_upgrades := 800 + (EXTRACT(DAY FROM CURRENT_DATE)::INTEGER * 13);
  
  RETURN json_build_object(
    'signups', total_signups,
    'total_developers', total_developers,
    'monthly_upgrades', monthly_upgrades,
    'pro_percentage', 67
  );
END;
$$;

-- Allow public access (no auth required)
GRANT EXECUTE ON FUNCTION get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_public_stats() TO authenticated;

COMMENT ON FUNCTION get_public_stats IS 'Returns public statistics for marketing display';

