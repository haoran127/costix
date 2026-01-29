-- ============================================
-- 清理未激活用户脚本
-- 删除未验证邮箱的用户记录
-- ============================================

-- ============================================
-- 1. 查看未激活的用户（仅查看，不删除）
-- ============================================
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  p.id as profile_exists
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email_confirmed_at IS NULL
ORDER BY u.created_at DESC;

-- ============================================
-- 2. 删除未激活的用户（谨慎使用！）
-- ============================================
-- ⚠️ 警告：这会删除未验证邮箱的用户及其所有关联数据
-- ⚠️ 建议：先执行上面的查询，确认要删除的用户后再执行删除

-- 删除未激活的用户（会级联删除 profiles 等关联数据）
-- DELETE FROM auth.users 
-- WHERE email_confirmed_at IS NULL 
-- AND created_at < NOW() - INTERVAL '7 days';  -- 只删除 7 天前注册的未激活用户

-- ============================================
-- 3. 清理孤立的 profiles 记录（如果存在）
-- ============================================
-- 如果 profiles 中有记录但 auth.users 中没有对应的用户
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- 4. 清理孤立的团队记录（如果存在）
-- ============================================
-- 删除没有成员的团队
DELETE FROM teams
WHERE id NOT IN (
  SELECT DISTINCT team_id 
  FROM team_members 
  WHERE team_id IS NOT NULL
)
AND owner_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ 清理完成！';
  RAISE NOTICE '';
  RAISE NOTICE '已清理:';
  RAISE NOTICE '  - 孤立的 profiles 记录';
  RAISE NOTICE '  - 孤立的团队记录';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 注意：未激活的 auth.users 记录需要手动删除';
  RAISE NOTICE '   建议：只删除 7 天前注册的未激活用户';
END $$;

