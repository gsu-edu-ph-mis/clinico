/**
 * Roles are a group of permissions.
 */

//// Core modules

//// External modules

//// Modules
const allPermissions = require('./permissions-list');

const ROLES = [
    {
        key: 'root',
        name: 'Super Admin',
        description: 'Can do anything.',
        permissions: allPermissions
    },
    {
        key: 'admin',
        name: 'System Admin',
        description: 'Can do mostly anything.',
        permissions: allPermissions
    },
    {
        key: 'student',
        name: 'Student',
        description: 'Can access student account.',
        permissions: [
            'use_student_account',
        ]
    },
]

module.exports = ROLES