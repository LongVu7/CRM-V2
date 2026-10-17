-- Remove non-credential lookup/reference permissions
DELETE FROM role_permission WHERE permission_id IN (
  SELECT id FROM permission WHERE resource IN ('major_data', 'source_data', 'status_data', 'country', 'old_province', 'new_province')
);

DELETE FROM group_permission WHERE permission_id IN (
  SELECT id FROM permission WHERE resource IN ('major_data', 'source_data', 'status_data', 'country', 'old_province', 'new_province')
);

DELETE FROM permission WHERE resource IN ('major_data', 'source_data', 'status_data', 'country', 'old_province', 'new_province');
