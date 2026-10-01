-- 1. Upsert permissions (idempotent via ON CONFLICT)
INSERT INTO permission (resource, action, code, description)
VALUES
  ('student', 'export', 'student.export', 'Export students to Excel'),
  ('inquiry', 'export', 'inquiry.export', 'Export inquiries to Excel')
ON CONFLICT (code) DO NOTHING;

-- 2. Assign permissions to roles (resolve by name, not ID)
-- admin -> student.export + inquiry.export
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'admin'
  AND p.code IN ('student.export', 'inquiry.export')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- manager -> student.export + inquiry.export
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'manager'
  AND p.code IN ('student.export', 'inquiry.export')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- test -> student.export + inquiry.export
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'test'
  AND p.code IN ('student.export', 'inquiry.export')
ON CONFLICT (role_id, permission_id) DO NOTHING;
