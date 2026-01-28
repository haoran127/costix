-- 修复 get_my_team_members 函数中的 SQL 错误
-- 错误：column reference "id" is ambiguous
-- 原因：JOIN 查询中需要明确指定表别名

CREATE OR REPLACE FUNCTION get_my_team_members()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  name VARCHAR,
  role VARCHAR,
  status VARCHAR,
  user_id UUID,
  avatar_url TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ
) AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- 获取当前用户的团队
  SELECT current_team_id INTO v_team_id FROM profiles WHERE id = auth.uid();
  
  IF v_team_id IS NULL THEN
    -- 如果没有团队，尝试从 team_members 获取
    SELECT tm.team_id INTO v_team_id 
    FROM team_members tm 
    WHERE tm.user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  -- 如果还是没有团队，返回空结果
  IF v_team_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    tm.id,                    -- 明确指定表别名
    tm.email,
    tm.name,
    tm.role,
    tm.status,
    tm.user_id,
    p.avatar_url,
    tm.invited_at,
    tm.joined_at
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = v_team_id
  ORDER BY 
    CASE tm.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'member' THEN 3 
      ELSE 4 
    END,
    tm.joined_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

