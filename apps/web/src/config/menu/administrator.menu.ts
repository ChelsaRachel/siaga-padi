import type { IMenu } from '@/types/menu'

// Admin panel menus — only visible to users with role 'admin'.
// Rendered in the admin sidebar, not in AppHeader.
// IDs must be unique across ALL_MENUS — checked against skills/reactjs-menu-config/SKILL.md.

export const ADMINISTRATOR_MENU: IMenu[] = [
  // Add administrator menus here when implementing the admin panel.
  // Example shape:
  // {
  //   id: 'xxxxx',
  //   idParent: '',
  //   display: 'User Management',
  //   name: 'userManagement',
  //   path: '/administrator/users',
  //   show: true,
  //   search: true,
  //   enabled: true,
  //   group: 'system',
  //   type: 'menu',
  //   icon: 'users',
  //   seo: { title: 'User Management', description: '' },
  //   additional: {
  //     container: 'boxed',
  //     iconType: 'phosphor',
  //     iconStyle: 'regular',
  //     iconStyleActive: 'fill',
  //     mainPage: false,
  //     redirectToEnabled: false,
  //     redirectTo: '',
  //   },
  //   privileges: [
  //     { label: 'View', value: 'view', description: '', type: 'administrator' },
  //     { label: 'Create & Update', value: 'create_update', description: '', type: 'administrator' },
  //     { label: 'Delete', value: 'delete', description: '', type: 'administrator' },
  //   ],
  // },
]
