export enum UserRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  ADMINLEVELTWO = 'ADMINLEVELTWO',
  ADMINLEVELTHREE = 'ADMINLEVELTHREE',
  EMPLOYER = 'EMPLOYER',
  CANDIDATE = 'CANDIDATE'
}

export interface RolePermissions {
  canAccessFestiveBoard: boolean;
  canAccessTrestleBoard: boolean;
  canAccessAnnouncements: boolean;
  canAccessDocuments: boolean;
  canAccessUsers: boolean;
  canAccessSettings: boolean;
  canAccessSupport: boolean;
  canAccessLCMTest: boolean;
  canAccessAll: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.MEMBER]: {
    canAccessFestiveBoard: false,
    canAccessTrestleBoard: false,
    canAccessAnnouncements: false,
    canAccessDocuments: false,
    canAccessUsers: false,
    canAccessSettings: false,
    canAccessSupport: false,
    canAccessLCMTest: false,
    canAccessAll: false,
  },
  [UserRole.ADMIN]: {
    canAccessFestiveBoard: true,
    canAccessTrestleBoard: true,
    canAccessAnnouncements: true,
    canAccessDocuments: true,
    canAccessUsers: true,
    canAccessSettings: true,
    canAccessSupport: true,
    canAccessLCMTest: true,
    canAccessAll: true,
  },
  [UserRole.ADMINLEVELTWO]: {
    canAccessFestiveBoard: true,
    canAccessTrestleBoard: false,
    canAccessAnnouncements: false,
    canAccessDocuments: false,
    canAccessUsers: false,
    canAccessSettings: false,
    canAccessSupport: false,
    canAccessLCMTest: false,
    canAccessAll: false,
  },
  [UserRole.ADMINLEVELTHREE]: {
    canAccessFestiveBoard: false,
    canAccessTrestleBoard: true,
    canAccessAnnouncements: true,
    canAccessDocuments: true,
    canAccessUsers: false,
    canAccessSettings: false,
    canAccessSupport: false,
    canAccessLCMTest: false,
    canAccessAll: false,
  },
  [UserRole.EMPLOYER]: {
    canAccessFestiveBoard: false,
    canAccessTrestleBoard: false,
    canAccessAnnouncements: false,
    canAccessDocuments: false,
    canAccessUsers: false,
    canAccessSettings: false,
    canAccessSupport: false,
    canAccessLCMTest: false,
    canAccessAll: false,
  },
  [UserRole.CANDIDATE]: {
    canAccessFestiveBoard: false,
    canAccessTrestleBoard: false,
    canAccessAnnouncements: false,
    canAccessDocuments: false,
    canAccessUsers: false,
    canAccessSettings: false,
    canAccessSupport: false,
    canAccessLCMTest: false,
    canAccessAll: false,
  },
};

export function getRolePermissions(role: string): RolePermissions {
  return ROLE_PERMISSIONS[role as UserRole] || ROLE_PERMISSIONS[UserRole.MEMBER];
}

export function canAccessSection(role: string, section: keyof RolePermissions): boolean {
  const permissions = getRolePermissions(role);
  return permissions[section];
}

export function getDefaultRedirectPath(role: string): string {
  const permissions = getRolePermissions(role);
  
  // Only ADMIN roles can access /admin
  if (permissions.canAccessAll) {
    return '/admin';
  }
  
  if (permissions.canAccessFestiveBoard) {
    return '/admin/festive-board';
  }
  
  if (permissions.canAccessTrestleBoard) {
    return '/admin/trestle-board';
  }
  
  if (permissions.canAccessDocuments) {
    return '/admin/documents';
  }
  
  if (permissions.canAccessAnnouncements) {
    return '/admin/announcements';
  }
  
  // For CANDIDATE and EMPLOYER roles, redirect to a placeholder or keep on login
  // TODO: Create candidate and employer dashboards
  if (role === UserRole.CANDIDATE) {
    // For now, redirect to login with a message (or create /candidate/dashboard)
    return '/auth/login?message=candidate_dashboard_coming_soon';
  }
  
  if (role === UserRole.EMPLOYER) {
    // For now, redirect to login with a message (or create /employer/dashboard)
    return '/auth/login?message=employer_dashboard_coming_soon';
  }
  
  // Fallback: redirect to login for unknown roles
  return '/auth/login?message=unauthorized';
}

export function isAdminRole(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.ADMINLEVELTWO || role === UserRole.ADMINLEVELTHREE;
}

export function getSectionPath(section: string): string {
  const sectionMap: Record<string, string> = {
    'festive-board': '/admin/festive-board',
    'trestle-board': '/admin/trestle-board',
    'announcements': '/admin/announcements',
    'documents': '/admin/documents',
    'users': '/admin/users',
    'settings': '/admin/settings',
    'support': '/admin/support',
    'lcm-test': '/admin/lcm-test',
  };
  
  return sectionMap[section] || '/admin';
}
