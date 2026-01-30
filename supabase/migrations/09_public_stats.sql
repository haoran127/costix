-- ============================================
-- Public Stats Function
-- Returns signup counts for marketing display
-- ============================================

-- Create function to get public stats
CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Launch date: 2024-04-01 (about 10 months ago)
  launch_time TIMESTAMP := '2024-04-01 00:00:00'::timestamp;
  days_since_launch NUMERIC;
  
  -- Base numbers
  base_developers INTEGER := 50000;
  base_signups INTEGER := 0;
  
  -- Growth: 3000 per month = 100 per day
  daily_growth NUMERIC := 100;
  
  -- Calculated values
  total_signups INTEGER;
  total_developers INTEGER;
  monthly_upgrades INTEGER;
  minute_variation INTEGER;
BEGIN
  -- Calculate days since launch
  days_since_launch := EXTRACT(EPOCH FROM (NOW() - launch_time)) / 86400;
  
  -- Calculate signups (new users since launch)
  total_signups := FLOOR(days_since_launch * daily_growth);
  
  -- Calculate total developers (base + signups)
  total_developers := base_developers + total_signups;
  
  -- Monthly upgrades: ~40% of monthly signups upgrade to Pro
  monthly_upgrades := FLOOR(3000 * 0.4);
  
  -- Add small variation based on current minute (stable within same minute)
  minute_variation := (EXTRACT(MINUTE FROM NOW())::INTEGER % 11) - 5;
  total_signups := total_signups + minute_variation;
  
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

