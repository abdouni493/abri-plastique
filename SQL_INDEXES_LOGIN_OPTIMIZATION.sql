-- ============================================================================
-- Login Performance Optimization Indexes
-- ============================================================================
-- This script creates indexes to speed up the login process.
-- Run these queries in your Supabase SQL editor.
--
-- IMPORTANT: These queries are essential for optimal login performance!
-- ============================================================================

-- Index on auth_user_id (used to look up user profile by auth ID during login)
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id 
ON public.users(auth_user_id);

-- Index on username for user lookups
CREATE INDEX IF NOT EXISTS idx_users_username 
ON public.users(username);

-- Index on user_permissions for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id 
ON public.user_permissions(user_id);

-- Composite index for faster permission checks
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_granted 
ON public.user_permissions(user_id, granted);

-- ============================================================================
-- Verify indexes were created (optional - run to confirm):
-- ============================================================================
-- SELECT 
--   schemaname,
--   tablename,
--   indexname
-- FROM pg_indexes 
-- WHERE tablename = 'users' OR tablename = 'user_permissions';
--
-- ============================================================================
-- Optional: Enable query planning to analyze login performance:
-- ============================================================================
-- EXPLAIN ANALYZE SELECT 
--   u.id, u.name, u.username, u.email, u.role, u.phone,
--   array_agg(row_to_json(up.*)) as user_permissions
-- FROM public.users u
-- LEFT JOIN public.user_permissions up ON u.id = up.user_id
-- WHERE u.auth_user_id = 'your-auth-id-here'
-- GROUP BY u.id;
