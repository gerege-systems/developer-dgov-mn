// Монгол / Англи i18n dictionary. Шинэ admin/manager/user UI болон цэсийг
// хоёр хэлээр үзүүлнэ. Түлхүүрийг кодод ашиглаж, мөрийг энд төвлөрүүлсэн.

export type Lang = 'mn' | 'en';

export const dict = {
  mn: {
    // Систем / цэс
    'sys.admin': 'Админ систем',
    'sys.manager': 'Менежер систем',
    'sys.user': 'Хэрэглэгч систем',
    'group.general': 'Ерөнхий',
    'group.management': 'Удирдлага',
    'group.manager': 'Менежер',
    'group.personal': 'Хувийн',
    'nav.dashboard': 'Хяналтын самбар',
    'nav.users': 'Хэрэглэгчид',
    'nav.roles': 'Эрх (RBAC)',
    'nav.settings': 'Тохиргоо',
    'nav.managerDashboard': 'Менежерийн самбар',
    'nav.profile': 'Профайл',
    'nav.security': 'Аюулгүй байдал',
    'nav.help': 'Тусламж',
    'nav.signout': 'Гарах',
    'shell.menu': 'Цэс',
    // Хуудасны толгой
    'admin.dashboard.sub': 'Доорх хэсгүүдээс удирдлагаа сонгоно уу.',
    'admin.users.sub': 'Хэрэглэгчдийн эрх, төлөвийг удирдана.',
    'admin.roles.sub': 'Role болон permission-уудын матриц. Admin бүх эрхийг автоматаар авна.',
    'admin.settings.sub': 'Системийн тохиргоо. (Энэ template-д суурь тохиргоо орхигдсон — өргөтгөх боломжтой.)',
    'manager.dashboard.sub': 'Менежерийн удирдлагын хэсэг.',
    'manager.users.sub': 'Хэрэглэгчдийг хянах, удирдах.',
    // Dashboard картууд
    'card.users.desc': 'Хэрэглэгч жагсаах, role солих, идэвхжүүлэх/устгах.',
    'card.roles.desc': 'Role болон permission матрицыг удирдах.',
    'card.settings.desc': 'Системийн тохиргоо.',
    'card.managerUsers.desc': 'Хэрэглэгчдийг хянах, удирдах.',
    'settings.ownNote': 'Өөрийн бүртгэлийн аюулгүй байдал (нууц үг солих)-ийг Хэрэглэгч → Аюулгүй байдал хэсгээс хийнэ.',
    // Хэрэглэгчдийн хүснэгт
    'users.col.name': 'Нэр',
    'users.col.email': 'И-мэйл',
    'users.col.role': 'Эрх',
    'users.col.status': 'Төлөв',
    'users.col.created': 'Үүссэн',
    'users.you': 'Та',
    'users.active': 'Идэвхтэй',
    'users.inactive': 'Идэвхгүй',
    'users.loading': 'Ачаалж байна…',
    'users.empty': 'Хэрэглэгч алга.',
    'users.loadError': 'Хэрэглэгчдийг ачаалж чадсангүй.',
    'users.actionError': 'Үйлдэл амжилтгүй.',
    'users.deleteConfirm': 'Энэ хэрэглэгчийг устгах уу?',
    'users.activate': 'Идэвхжүүлэх',
    'users.deactivate': 'Идэвхгүй болгох',
    'common.delete': 'Устгах',
    'common.save': 'Хадгалах',
    'common.create': 'Үүсгэх',
    'common.cancel': 'Болих',
    // RBAC
    'roles.add': 'Эрх нэмэх',
    'roles.col.permission': 'Эрх (permission)',
    'roles.name': 'Нэр',
    'roles.namePh': 'Жишээ: Борлуулалтын менежер',
    'roles.key': 'Түлхүүр (заавал биш)',
    'roles.loadError': 'Эрхүүдийг ачаалж чадсангүй.',
    'roles.saveError': 'Хадгалах амжилтгүй.',
    'roles.createError': 'Эрх үүсгэх амжилтгүй.',
    'roles.deleteError': 'Устгах амжилтгүй.',
    'roles.deleteConfirm': 'эрхийг устгах уу?',
    // Системийн role нэрс (backend key-ээр) — custom role нь өөрийн нэрээрээ.
    'role.admin': 'Админ',
    'role.user': 'Хэрэглэгч',
    'role.manager': 'Менежер',
    // Permission label-ууд (backend key-ээр) — каталог тогтмол.
    'perm.dashboard.view': 'Хяналтын самбар үзэх',
    'perm.settings.manage': 'Тохиргоо удирдах',
    'perm.users.manage': 'Хэрэглэгч удирдах',
    'perm.roles.manage': 'Эрх (role) удирдах',
    'perm.manager.view': 'Менежерийн хэсэг',
    'perm.personal.view': 'Хувийн хэсэг',
  },
  en: {
    'sys.admin': 'Admin system',
    'sys.manager': 'Manager system',
    'sys.user': 'User system',
    'group.general': 'General',
    'group.management': 'Management',
    'group.manager': 'Manager',
    'group.personal': 'Personal',
    'nav.dashboard': 'Dashboard',
    'nav.users': 'Users',
    'nav.roles': 'Roles (RBAC)',
    'nav.settings': 'Settings',
    'nav.managerDashboard': 'Manager dashboard',
    'nav.profile': 'Profile',
    'nav.security': 'Security',
    'nav.help': 'Help',
    'nav.signout': 'Sign out',
    'shell.menu': 'Menu',
    'admin.dashboard.sub': 'Choose a management section below.',
    'admin.users.sub': 'Manage user roles and status.',
    'admin.roles.sub': 'Role and permission matrix. Admin gets all permissions automatically.',
    'admin.settings.sub': 'System settings. (Left out in this template — extend as needed.)',
    'manager.dashboard.sub': 'Manager controls.',
    'manager.users.sub': 'Monitor and manage users.',
    'card.users.desc': 'List users, change roles, activate/delete.',
    'card.roles.desc': 'Manage the role and permission matrix.',
    'card.settings.desc': 'System settings.',
    'card.managerUsers.desc': 'Monitor and manage users.',
    'settings.ownNote': 'Manage your own account security (change password) under User → Security.',
    'users.col.name': 'Name',
    'users.col.email': 'Email',
    'users.col.role': 'Role',
    'users.col.status': 'Status',
    'users.col.created': 'Created',
    'users.you': 'You',
    'users.active': 'Active',
    'users.inactive': 'Inactive',
    'users.loading': 'Loading…',
    'users.empty': 'No users.',
    'users.loadError': 'Failed to load users.',
    'users.actionError': 'Action failed.',
    'users.deleteConfirm': 'Delete this user?',
    'users.activate': 'Activate',
    'users.deactivate': 'Deactivate',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.create': 'Create',
    'common.cancel': 'Cancel',
    'roles.add': 'Add role',
    'roles.col.permission': 'Permission',
    'roles.name': 'Name',
    'roles.namePh': 'e.g. Sales manager',
    'roles.key': 'Key (optional)',
    'roles.loadError': 'Failed to load roles.',
    'roles.saveError': 'Failed to save.',
    'roles.createError': 'Failed to create role.',
    'roles.deleteError': 'Failed to delete.',
    'roles.deleteConfirm': 'Delete role?',
    'role.admin': 'Admin',
    'role.user': 'User',
    'role.manager': 'Manager',
    'perm.dashboard.view': 'View dashboard',
    'perm.settings.manage': 'Manage settings',
    'perm.users.manage': 'Manage users',
    'perm.roles.manage': 'Manage roles',
    'perm.manager.view': 'Manager area',
    'perm.personal.view': 'Personal area',
  },
} as const;

export type DictKey = keyof (typeof dict)['mn'];

export function t(lang: Lang, key: DictKey): string {
  return dict[lang]?.[key] ?? dict.mn[key] ?? key;
}

// Backend-ийн динамик нэрсийг key-ээр орчуулна. Каталогт байхгүй бол (custom
// role, шинэ permission) DB-ийн fallback нэрийг хэвээр буцаана.
function lookup(lang: Lang, dk: string, fallback: string): string {
  const table = dict[lang] as Record<string, string>;
  const mn = dict.mn as Record<string, string>;
  return table[dk] ?? mn[dk] ?? fallback;
}

/** Role нэрийг backend key-ээр орчуулна (admin/user/manager); custom бол fallback. */
export function roleName(lang: Lang, roleKey: string, fallback: string): string {
  return lookup(lang, `role.${roleKey}`, fallback);
}

/** Permission label-г backend key-ээр орчуулна; каталогт байхгүй бол fallback. */
export function permLabel(lang: Lang, permKey: string, fallback: string): string {
  return lookup(lang, `perm.${permKey}`, fallback);
}
