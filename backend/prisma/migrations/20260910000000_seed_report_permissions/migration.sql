-- 1. Upsert permissions (idempotent via ON CONFLICT)
INSERT INTO permission (resource, action, code)
VALUES
  ('report', 'read',       'report.read'),
  ('report', 'read_group', 'report.read_group'),
  ('report', 'read_all',   'report.read_all')
ON CONFLICT (code) DO NOTHING;

-- 2. Assign permissions to roles (resolve by name, not ID)
-- admin → report.read + report.read_all
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'admin'
  AND p.code IN ('report.read', 'report.read_all')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- manager → report.read + report.read_group
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'manager'
  AND p.code IN ('report.read', 'report.read_group')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- staff → report.read
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'staff'
  AND p.code = 'report.read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
