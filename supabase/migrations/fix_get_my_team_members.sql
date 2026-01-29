-- ============================================
-- 修复 get_my_team_members 函数中的列名冲突
-- 错误：column reference "id" is ambiguous
-- ============================================

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
  SELECT current_team_id INTO v_team_id 
  FROM profiles 
  WHERE profiles.id = auth.uid();
  
  IF v_team_id IS NULL THEN
    -- 如果没有团队，尝试从 team_members 获取
    SELECT team_members.team_id INTO v_team_id 
    FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  -- 如果还是没有团队，返回空结果
  IF v_team_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    team_members.id,                    -- 明确指定表别名
    team_members.email,
    team_members.name,
    team_members.role,
    team_members.status,
    team_members.user_id,
    profiles.avatar_url,                -- 明确指定表别名
    team_members.invited_at,
    team_members.joined_at
  FROM team_members
  LEFT JOIN profiles ON profiles.id = team_members.user_id
  WHERE team_members.team_id = v_team_id
  ORDER BY 
    CASE team_members.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'member' THEN 3 
      ELSE 4 
    END,
    team_members.joined_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_my_team_members IS '获取当前用户的团队成员列表（已修复列名冲突）';

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ get_my_team_members 函数已修复！';
  RAISE NOTICE '';
  RAISE NOTICE '修复内容:';
  RAISE NOTICE '  - 明确指定所有列的表别名';
  RAISE NOTICE '  - 修复了 "column reference id is ambiguous" 错误';
END $$;

