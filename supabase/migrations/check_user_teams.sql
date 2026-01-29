-- ============================================
-- 检查用户团队数据
-- 查看注册用户是否有对应的团队记录
-- ============================================

-- 1. 查看所有用户及其团队信息
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  p.id as profile_id,
  p.current_team_id,
  t.id as team_id,
  t.name as team_name,
  tm.id as team_member_id,
  tm.role as team_role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN teams t ON t.id = p.current_team_id OR t.owner_id = u.id
LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = u.id
ORDER BY u.created_at DESC;

-- 2. 查看没有团队的用户
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.current_team_id
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email_confirmed_at IS NOT NULL  -- 只查看已验证的用户
  AND (p.current_team_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM teams WHERE id = p.current_team_id OR owner_id = u.id
  ))
ORDER BY u.created_at DESC;

-- 3. 查看所有团队及其成员
SELECT 
  t.id,
  t.name,
  t.owner_id,
  u.email as owner_email,
  COUNT(tm.id) as member_count
FROM teams t
LEFT JOIN auth.users u ON u.id = t.owner_id
LEFT JOIN team_members tm ON tm.team_id = t.id
GROUP BY t.id, t.name, t.owner_id, u.email
ORDER BY t.created_at DESC;

