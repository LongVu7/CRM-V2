-- 1. Upsert action-scoped and group administrative permissions
INSERT INTO permission (resource, action, code, description)
VALUES
  ('inquiry', 'read', 'inquiry.read_all', 'View all inquiries across the CRM'),
  ('inquiry', 'read', 'inquiry.read_group', 'View inquiries assigned to members of the user led group'),
  ('inquiry', 'read', 'inquiry.read_assigned', 'View inquiries assigned directly to the user'),
  ('inquiry', 'update', 'inquiry.update_all', 'Update any inquiry in the CRM'),
  ('inquiry', 'update', 'inquiry.update_group', 'Update inquiries assigned within the user led group'),
  ('inquiry', 'update', 'inquiry.update_assigned', 'Update inquiries assigned directly to the user'),
  ('inquiry', 'delete', 'inquiry.delete_all', 'Delete any inquiry in the CRM'),
  ('inquiry', 'delete', 'inquiry.delete_assigned', 'Delete inquiries assigned directly to the user'),
  ('group', 'assign_leader', 'group.leader.assign', 'Assign, replace, or remove group leaders'),
  ('group', 'assign_perm', 'group.permission.assign', 'Assign or modify group permission matrix')
ON CONFLICT (code) DO NOTHING;

-- 2. Assign full action permissions and group admin permissions to 'admin' role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'admin'
  AND p.code IN (
    'inquiry.read_all',
    'inquiry.read_group',
    'inquiry.read_assigned',
    'inquiry.update_all',
    'inquiry.update_group',
    'inquiry.update_assigned',
    'inquiry.delete_all',
    'inquiry.delete_assigned',
    'group.leader.assign',
    'group.permission.assign'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Assign appropriate permissions to 'manager' role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'manager'
  AND p.code IN (
    'inquiry.read_all',
    'inquiry.read_group',
    'inquiry.read_assigned',
    'inquiry.update_group',
    'inquiry.update_assigned',
    'inquiry.delete_assigned'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Assign assigned-only permissions to 'staff' role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'staff'
  AND p.code IN (
    'inquiry.read_assigned',
    'inquiry.update_assigned',
    'inquiry.delete_assigned'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
