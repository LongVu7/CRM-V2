const lookupDependencies = {
  'school.options':      ['school.read', 'student.create', 'student.update'],
  'status_data.read':    ['status_data.read', 'inquiry.create', 'inquiry.update'],
  'source_data.read':    ['source_data.read', 'inquiry.create', 'inquiry.update', 'report.read'],
  'major_data.read':     ['major_data.read', 'student.create', 'student.update', 'report.read'],
  'old_province.read':   ['old_province.read', 'student.create', 'student.update', 'report.read'],
  'new_province.read':   ['new_province.read', 'student.create', 'student.update'],
  'country.read':        ['country.read', 'student.create', 'student.update'],
  'inquiry.assign' : ['inquiry.assign']

}

const authorizeLookup = (lookupKey) => (req, res, next) => {
  const allowed = lookupDependencies[lookupKey]
  if (!allowed) {
    return res.status(500).json({ error: `Unknown lookup key: ${lookupKey}` })
  }
  
  if (!req.user || !req.user.permissions) {
    return res.status(403).json({
      error: 'Forbidden',
      reason: 'NO_PERMISSIONS',
      message: 'No permissions found for this user'
    })
  }

  if (allowed.some(p => req.user.permissions.has(p))) return next()
  
  return res.status(403).json({
    error: 'Forbidden',
    reason: 'MISSING_LOOKUP_PERMISSION',
    requiredAnyOf: allowed,
    message: `You need one of: ${allowed.join(', ')}`
  })
}

module.exports = { lookupDependencies, authorizeLookup }
