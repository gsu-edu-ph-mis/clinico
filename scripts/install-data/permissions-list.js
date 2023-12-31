/**
 * Permission checks are hardcoded in route middlewares.
 * Code should be updated together with this list.
 */

//// Core modules

//// External modules

//// Modules

module.exports = [

    // Employees
    'read_all_employee',
    'create_employee',
    'read_employee',
    'update_employee',
    'delete_employee',

    // Medical Record Card
    'read_all_mrc',
    'create_mrc',
    'read_mrc',
    'print_mrc',
    'update_mrc',
    'delete_mrc',

    // 'use_student_account', // Student account only

    ////// Sys admin stuff ////
    'read_all_permission',
    'create_permission',
    'read_permission',
    'update_permission',
    'delete_permission',

    'read_all_role',
    'create_role',
    'read_role',
    'update_role',
    'delete_role',

    'read_all_user',
    'create_user',
    'read_user',
    'update_user',
    'delete_user',

]