import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { UserAccount, UserRole, UserPermissions } from '../types';
import { ICONS, getDefaultPermissions, APP_TABS, getDefaultAccessibleTabs } from '../constants';

const emailToName = (email: string): string => {
  if (!email) return '';
  const username = email.split('@')[0];
  return username
    .split(/[._-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface AccountManagementProps {
  accounts: UserAccount[];
  branches?: string[];
  onAddAccount: (account: Partial<UserAccount>) => void;
  onUpdateStatus: (id: string, status: 'Active' | 'Inactive') => void;
  onUpdateAccount: (id: string, updates: Partial<UserAccount>) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkUpdateStatus?: (ids: string[], status: 'Active' | 'Inactive') => void;
  onBulkUpdatePermissions?: (ids: string[], permissions: UserPermissions) => void;
}

interface PermissionsSelectorProps {
  activeModalTab: 'details' | 'permissions' | 'tabs';
  formData: {
    role: UserRole;
    permissions: UserPermissions;
  };
  handlePermissionChange: (key: keyof UserPermissions) => void;
  handleTabPermissionChange: (tabId: string) => void;
  onApplyPreset: (role: UserRole) => void;
}

const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({
  activeModalTab,
  formData,
  handlePermissionChange,
  handleTabPermissionChange,
  onApplyPreset,
}) => (
  <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
    {activeModalTab === 'permissions' && (
      <div className="space-y-6">
        <div>
          <div className="space-y-2 mb-6 bg-neutral-50 p-3.5 rounded border border-neutral-100">
            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] block">Apply Role Preset</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onApplyPreset(UserRole.BRANCH_USER)}
                className="w-full py-2.5 bg-white hover:bg-neutral-900 hover:text-white border border-neutral-200 text-neutral-700 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Branch User
              </button>
              <button
                type="button"
                onClick={() => onApplyPreset(UserRole.INVENTORY_PERSONNEL)}
                className="w-full py-2.5 bg-white hover:bg-neutral-900 hover:text-white border border-neutral-200 text-neutral-700 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer shadow-sm active:scale-95 truncate px-1"
                title="Inventory Personnel"
              >
                Inventory
              </button>
              <button
                type="button"
                onClick={() => onApplyPreset(UserRole.ADMIN)}
                className="w-full py-2.5 bg-white hover:bg-neutral-900 hover:text-white border border-neutral-200 text-neutral-700 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Admin
              </button>
            </div>
          </div>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Access Level & Permissions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'canAddArtwork', label: 'Add Artwork' },
              { key: 'canEditArtwork', label: 'Edit Artwork' },
              { key: 'canManageAccounts', label: 'Manage Accounts' },
              { key: 'canManageEvents', label: 'Manage Events & Auctions' },
              { key: 'canAccessCertificate', label: 'Access Certificates' },
              { key: 'canAttachITDR', label: 'Attach IT/DR/RSA/AR/OR/CR' },
              { key: 'canDeleteArtwork', label: 'Delete Artwork' },
              { key: 'canSellArtwork', label: 'Sell Artwork' },
              { key: 'canReserveArtwork', label: 'Reserve Artwork' },
              { key: 'canTransferArtwork', label: 'Transfer Artwork' },
              { key: 'canViewSalesHistory', label: 'View Sales History' },
              { key: 'canApproveFinance', label: 'Approve Finance' },
              { key: 'canApproveLogistics', label: 'Approve Logistics' },
              { key: 'canAccessAuditLogs', label: 'Access Audit Logs' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${formData.permissions[key as keyof UserPermissions]
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm'
                  : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                  }`}>
                  {formData.permissions[key as keyof UserPermissions] && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={!!formData.permissions[key as keyof UserPermissions]}
                  onChange={() => handlePermissionChange(key as keyof UserPermissions)}
                />
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">View Control</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'canViewReserved', label: 'Reserved Artworks' },
              { key: 'canViewAuctioned', label: 'Auctioned Artworks' },
              { key: 'canViewExhibit', label: 'Exhibit Artworks' },
              { key: 'canViewForFraming', label: 'Framing Artworks' },
              { key: 'canViewBackToArtist', label: 'Back to Artist Artworks' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${formData.permissions[key as keyof UserPermissions]
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm'
                  : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                  }`}>
                  {formData.permissions[key as keyof UserPermissions] && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={!!formData.permissions[key as keyof UserPermissions]}
                  onChange={() => handlePermissionChange(key as keyof UserPermissions)}
                />
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    )}

    {activeModalTab === 'tabs' && (
      <div>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Artflow Tabs (Navigation)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APP_TABS.map((tab) => {
            const isAccessible = (formData.permissions.accessibleTabs && Array.isArray(formData.permissions.accessibleTabs))
              ? formData.permissions.accessibleTabs.includes(tab.id)
              : getDefaultAccessibleTabs(formData.role).includes(tab.id);

            return (
              <label key={tab.id} className="flex items-center space-x-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${isAccessible
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm'
                  : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                  }`}>
                  {isAccessible && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isAccessible}
                  onChange={() => handleTabPermissionChange(tab.id)}
                />
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">{tab.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

const AccountManagement: React.FC<AccountManagementProps> = ({ 
  accounts, 
  branches = [], 
  onAddAccount, 
  onUpdateStatus, 
  onUpdateAccount, 
  onBulkDelete, 
  onBulkUpdateStatus,
  onBulkUpdatePermissions
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning';
  } | null>(null);

  const showToastMessage = (title: string, message: string, variant: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, title, message, variant });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingAccountInfo, setDeletingAccountInfo] = useState<{ id: string; name: string } | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'permissions' | 'tabs'>('details');
  const [activeTab, setActiveTab] = useState<'staff' | 'exclusive'>('staff');
  const [showHiddenTabsPanel, setShowHiddenTabsPanel] = useState(false);
  const [showShortcutPresets, setShowShortcutPresets] = useState(false);
  const [presetTargetRole, setPresetTargetRole] = useState<UserRole>(UserRole.BRANCH_USER);
  const [presetPermissions, setPresetPermissions] = useState<UserPermissions>(getDefaultPermissions(UserRole.BRANCH_USER));
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const hiddenStorageKey = 'sidebar-hidden-tabs';

  useEffect(() => {
    const matching = accounts.find(a => a.role === presetTargetRole);
    if (matching && matching.permissions) {
      setPresetPermissions(matching.permissions);
    } else {
      setPresetPermissions(getDefaultPermissions(presetTargetRole));
    }
  }, [presetTargetRole, accounts]);

  const [formData, setFormData] = useState<{
    firstName: string;
    fullName: string;
    email: string;
    branch: string;
    role: UserRole;
    permissions: UserPermissions;
    password?: string;
  }>({
    firstName: '',
    fullName: '',
    email: '',
    branch: '',
    role: UserRole.BRANCH_USER,
    permissions: getDefaultPermissions(UserRole.BRANCH_USER),
    password: ''
  });

  const hideableTabs = [
    { id: 'chat', label: 'Inbox & Messaging' },
    { id: 'analytics', label: 'Inventory Insights' },
    { id: 'import-history', label: 'Import History' },
    { id: 'snapshots', label: 'Artwork Timeline' }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(hiddenStorageKey);
    if (!raw) {
      const initial = ['analytics'];
      window.localStorage.setItem(hiddenStorageKey, JSON.stringify(initial));
      setHiddenTabs(initial);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHiddenTabs(parsed);
      else setHiddenTabs([]);
    } catch {
      setHiddenTabs([]);
    }
  }, [hiddenStorageKey]);

  const toggleHiddenTab = (tabId: string) => {
    const next = hiddenTabs.includes(tabId)
      ? hiddenTabs.filter(id => id !== tabId)
      : [...hiddenTabs, tabId];
    setHiddenTabs(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(hiddenStorageKey, JSON.stringify(next));
      window.dispatchEvent(new Event('artisflow-hidden-tabs-changed'));
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: getDefaultPermissions(role)
    }));
  };

  const handleApplyPreset = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: getDefaultPermissions(role)
    }));
  };

  const handlePermissionChange = (key: keyof UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleTabPermissionChange = (tabId: string) => {
    setFormData(prev => {
      const currentTabs = prev.permissions.accessibleTabs || getDefaultAccessibleTabs(prev.role);
      const newTabs = currentTabs.includes(tabId)
        ? currentTabs.filter(id => id !== tabId)
        : [...currentTabs, tabId];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          accessibleTabs: newTabs
        }
      };
    });
  };

  const openEditModal = (acc: UserAccount) => {
    setEditingAccount(acc);
    setFormData({
      firstName: acc.firstName || '',
      fullName: acc.fullName || acc.name || '',
      email: acc.email || '',
      branch: acc.branch || '',
      role: acc.role || UserRole.BRANCH_USER,
      permissions: acc.permissions || getDefaultPermissions(acc.role || UserRole.BRANCH_USER),
      password: acc.password || ''
    });
    setShowEditModal(true);
  };

  const seenIds = new Set<string>();
  const filteredAccounts = accounts.filter(acc => {
    if (!acc.id || seenIds.has(acc.id)) return false;
    seenIds.add(acc.id);
    const name = (acc.name || acc.fullName || acc.firstName || '').toString().trim();
    const email = (acc.email || '').toString().trim();
    const hasName = name.length > 0 && name.toLowerCase() !== 'undefined' && name.toLowerCase() !== 'null';
    const hasEmail = email.length > 0 && email.toLowerCase() !== 'undefined' && email.toLowerCase() !== 'null';
    const isValid = (hasName || hasEmail);
    if (!isValid) return false;
    if (activeTab === 'staff') return acc.role !== UserRole.EXCLUSIVE;
    return acc.role === UserRole.EXCLUSIVE;
  });

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredAccounts.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredAccounts.map(acc => acc.id));
    }
  };

  const handleSelectUser = (id: string) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleBulkActivate = () => {
    if (onBulkUpdateStatus && selectedUsers.length > 0) {
      onBulkUpdateStatus(selectedUsers, 'Active');
      setSelectedUsers([]);
    }
  };

  const handleBulkDeactivate = () => {
    if (onBulkUpdateStatus && selectedUsers.length > 0) {
      onBulkUpdateStatus(selectedUsers, 'Inactive');
      setSelectedUsers([]);
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedUsers.length > 0) {
      onBulkDelete(selectedUsers);
      setSelectedUsers([]);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleDeleteSingle = (id: string, name: string) => {
    if (!onBulkDelete) return;
    setDeletingAccountInfo({ id, name });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Branch Account Management</h1>
          <p className="text-sm text-neutral-500">Manage gallery branch accounts, staff access, and role permissions.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              setShowShortcutPresets(prev => !prev);
              setShowHiddenTabsPanel(false);
            }}
            className={`flex items-center space-x-2 px-4 py-3 rounded-md border text-xs font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
              showShortcutPresets 
                ? 'bg-neutral-950 text-white border-neutral-950 font-black' 
                : 'bg-white text-neutral-700 border-neutral-200 hover:text-neutral-900 hover:border-neutral-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Shortcut Presets</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowHiddenTabsPanel(prev => !prev);
              setShowShortcutPresets(false);
            }}
            className={`p-3 rounded-md border text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 bg-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all cursor-pointer ${
              showHiddenTabsPanel ? 'border-neutral-900 text-neutral-900' : 'border-neutral-200'
            }`}
            aria-label="Toggle hidden navigation tabs"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10c0-3.866 3.134-7 8-7s8 3.134 8 7v2a8 8 0 01-16 0v-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10l-2 2H9l-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 13h.01M14 13h.01" />
            </svg>
          </button>
          <button
            onClick={() => {
              const defaultRole = activeTab === 'exclusive' ? UserRole.EXCLUSIVE : UserRole.BRANCH_USER;
              setFormData({
                firstName: '',
                fullName: '',
                email: '',
                branch: '',
                role: defaultRole,
                permissions: getDefaultPermissions(defaultRole),
                password: ''
              });
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 bg-neutral-900 text-white px-6 py-3 rounded-md hover:bg-black transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-bold cursor-pointer"
          >
            {ICONS.Add}
            <span>Create Branch Account</span>
          </button>
        </div>
      </div>

      {showHiddenTabsPanel && (
        <div className="bg-neutral-50 text-neutral-900 rounded-md p-4 space-y-3 border border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10c0-3.866 3.134-7 8-7s8 3.134 8 7v2a8 8 0 01-16 0v-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10l-2 2H9l-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 13h.01M14 13h.01" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Hidden navigation tabs</p>
                <p className="text-xs text-neutral-500">Quickly hide or reveal advanced workspace areas.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHiddenTabsPanel(false)}
              className="text-neutral-400 hover:text-neutral-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {hideableTabs.map(tab => {
              const isHidden = hiddenTabs.includes(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => toggleHiddenTab(tab.id)}
                  className="flex items-center justify-between px-3 py-2 rounded-sm bg-white border border-neutral-200 hover:bg-neutral-50 text-xs shadow-sm"
                >
                  <span className="font-medium">{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isHidden ? 'bg-neutral-100 text-neutral-400' : 'bg-neutral-900 text-white'}`}>
                    {isHidden ? 'Hidden' : 'Visible'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showShortcutPresets && (
        <div className="bg-white text-neutral-900 rounded-md p-6 border border-neutral-200 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900">Filtered Permission Changer (Shortcut Presets)</h3>
                <p className="text-xs text-neutral-500">Toggling any permission below will automatically apply it to ALL accounts matching the selected system role.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowShortcutPresets(false)}
              className="text-neutral-400 hover:text-neutral-900 cursor-pointer transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex space-x-1.5 bg-neutral-100 p-1 rounded-sm w-fit border border-neutral-200/50 shadow-inner">
            {[UserRole.BRANCH_USER, UserRole.INVENTORY_PERSONNEL, UserRole.ADMIN].map(role => {
              const count = accounts.filter(a => a.role === role).length;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setPresetTargetRole(role)}
                  className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    presetTargetRole === role
                      ? 'bg-neutral-900 text-white shadow'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {role} ({count})
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column 1: Access Level & Permissions */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b border-neutral-100 pb-2">Access Level & Permissions</h4>
              <div className="space-y-3">
                {[
                  { key: 'canAddArtwork', label: 'Add Artwork' },
                  { key: 'canEditArtwork', label: 'Edit Artwork' },
                  { key: 'canManageAccounts', label: 'Manage Accounts' },
                  { key: 'canManageEvents', label: 'Manage Events & Auctions' },
                  { key: 'canAccessCertificate', label: 'Access Certificates' },
                  { key: 'canAttachITDR', label: 'Attach IT/DR/RSA/AR/OR/CR' },
                  { key: 'canDeleteArtwork', label: 'Delete Artwork' },
                  { key: 'canSellArtwork', label: 'Sell Artwork' },
                  { key: 'canReserveArtwork', label: 'Reserve Artwork' },
                  { key: 'canTransferArtwork', label: 'Transfer Artwork' },
                  { key: 'canViewSalesHistory', label: 'View Sales History' },
                  { key: 'canApproveFinance', label: 'Approve Finance' },
                  { key: 'canApproveLogistics', label: 'Approve Logistics' },
                  { key: 'canAccessAuditLogs', label: 'Access Audit Logs' },
                ].map(({ key, label }) => {
                  const isChecked = !!presetPermissions[key as keyof UserPermissions];
                  return (
                    <label key={key} className="flex items-center space-x-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
                        isChecked ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm' : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                      }`}>
                        {isChecked && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isChecked}
                        onChange={() => {
                          const nextPermissions = {
                            ...presetPermissions,
                            [key]: !presetPermissions[key as keyof UserPermissions]
                          };
                          setPresetPermissions(nextPermissions);
                        }}
                      />
                      <span className="text-xs font-semibold text-neutral-700 group-hover:text-neutral-900 transition-colors">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Column 2: View Control */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b border-neutral-100 pb-2">View Control</h4>
              <div className="space-y-3">
                {[
                  { key: 'canViewReserved', label: 'Reserved Artworks' },
                  { key: 'canViewAuctioned', label: 'Auctioned Artworks' },
                  { key: 'canViewExhibit', label: 'Exhibit Artworks' },
                  { key: 'canViewForFraming', label: 'Framing Artworks' },
                  { key: 'canViewBackToArtist', label: 'Back to Artist Artworks' },
                ].map(({ key, label }) => {
                  const isChecked = !!presetPermissions[key as keyof UserPermissions];
                  return (
                    <label key={key} className="flex items-center space-x-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
                        isChecked ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm' : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                      }`}>
                        {isChecked && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isChecked}
                        onChange={() => {
                          const nextPermissions = {
                            ...presetPermissions,
                            [key]: !presetPermissions[key as keyof UserPermissions]
                          };
                          setPresetPermissions(nextPermissions);
                        }}
                      />
                      <span className="text-xs font-semibold text-neutral-700 group-hover:text-neutral-900 transition-colors">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Artflow Tabs */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b border-neutral-100 pb-2">Artflow Tabs (Navigation)</h4>
              <div className="space-y-3">
                {APP_TABS.map((tab) => {
                  const isAccessible = (presetPermissions.accessibleTabs && Array.isArray(presetPermissions.accessibleTabs))
                    ? presetPermissions.accessibleTabs.includes(tab.id)
                    : getDefaultAccessibleTabs(presetTargetRole).includes(tab.id);

                  return (
                    <label key={tab.id} className="flex items-center space-x-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
                        isAccessible ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm' : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                      }`}>
                        {isAccessible && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isAccessible}
                        onChange={() => {
                          const currentTabs = presetPermissions.accessibleTabs || getDefaultAccessibleTabs(presetTargetRole);
                          const nextTabs = currentTabs.includes(tab.id)
                            ? currentTabs.filter(id => id !== tab.id)
                            : [...currentTabs, tab.id];
                          
                          const nextPermissions = {
                            ...presetPermissions,
                            accessibleTabs: nextTabs
                          };
                          setPresetPermissions(nextPermissions);
                        }}
                      />
                      <span className="text-xs font-semibold text-neutral-700 group-hover:text-neutral-900 transition-colors">{tab.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => {
                const targetAccounts = accounts.filter(a => a.role === presetTargetRole);
                if (targetAccounts.length === 0) {
                  showToastMessage(
                    'Update Failed',
                    `No accounts currently have the role "${presetTargetRole}". Add accounts of this role first.`,
                    'warning'
                  );
                  return;
                }
                if (onBulkUpdatePermissions) {
                  onBulkUpdatePermissions(targetAccounts.map(a => a.id), presetPermissions);
                }
                showToastMessage(
                  'Presets Applied',
                  `Permissions updated successfully for all ${targetAccounts.length} ${presetTargetRole} accounts!`,
                  'success'
                );
                setShowShortcutPresets(false);
              }}
              className="px-6 py-2.5 bg-neutral-900 text-white hover:bg-black text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-2"
            >
              Save Preset & Apply to Role
            </button>
          </div>
        </div>
      )}

      <div className="flex space-x-1 bg-neutral-100 p-1.5 rounded-sm w-fit mb-4 border border-neutral-200/50 shadow-inner">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-2 rounded-sm text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'staff'
            ? 'bg-white text-neutral-900 shadow-md transform scale-[1.02]'
            : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('exclusive')}
          className={`px-6 py-2 rounded-sm text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'exclusive'
            ? 'bg-white text-neutral-900 shadow-md transform scale-[1.02]'
            : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          Exclusive
        </button>
      </div>

      <div className="bg-white rounded-md border border-neutral-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-6 py-4 w-12">
                <label className="flex items-center cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedUsers.length === filteredAccounts.length && filteredAccounts.length > 0
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                  }`}>
                    {selectedUsers.length === filteredAccounts.length && filteredAccounts.length > 0 && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedUsers.length === filteredAccounts.length && filteredAccounts.length > 0}
                    onChange={handleSelectAll}
                  />
                </label>
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">User Details</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Branch</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredAccounts.map((acc) => (
              <tr key={acc.id} className={`group/row hover:bg-neutral-50/80 transition-all ${selectedUsers.includes(acc.id) ? 'bg-neutral-50' : ''}`}>
                <td className="px-6 py-4">
                  <label className="flex items-center cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedUsers.includes(acc.id)
                      ? 'bg-neutral-900 border-neutral-900 text-white'
                      : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                    }`}>
                      {selectedUsers.includes(acc.id) && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedUsers.includes(acc.id)}
                      onChange={() => handleSelectUser(acc.id)}
                    />
                  </label>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => openEditModal(acc)}
                      className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-black shadow-sm transition-all hover:scale-110 active:scale-95 hover:bg-neutral-900 hover:text-white cursor-pointer group/avatar relative"
                    >
                      <span>{(acc.name?.[0] || acc.fullName?.[0] || acc.firstName?.[0] || acc.email?.[0] || '?').toUpperCase()}</span>
                      <div className="absolute inset-0 rounded-full border-2 border-neutral-900 opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>
                    </button>
                    <div>
                      <p className="text-sm font-bold text-neutral-900">{acc.name || acc.fullName || acc.firstName || acc.email || 'Unknown User'}</p>
                      <p className="text-[11px] text-neutral-400 font-medium">{acc.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-neutral-600 bg-neutral-50 px-2 py-1 rounded-sm border border-neutral-100">
                    {acc.branch || '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => openEditModal(acc)}
                    className={`px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border ${acc.role === UserRole.ADMIN ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' :
                    acc.role === UserRole.INVENTORY_PERSONNEL ? 'bg-neutral-200 text-neutral-900 border-neutral-300' :
                    acc.role === UserRole.EXCLUSIVE ? 'bg-white text-neutral-700 border-neutral-300 shadow-sm' : 'bg-white text-neutral-600 border-neutral-200'
                    }`}>
                    {acc.role}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => onUpdateStatus(acc.id, acc.status === 'Active' ? 'Inactive' : 'Active')}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider border transition-all hover:scale-105 active:scale-95 shadow-sm ${acc.status === 'Active'
                    ? 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-50'
                    : 'bg-neutral-50 text-neutral-400 border-neutral-200 opacity-70 hover:opacity-100'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${acc.status === 'Active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-300'}`}></span>
                    <span>{acc.status}</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-600 text-[10px] font-black uppercase tracking-widest rounded-sm border border-neutral-200 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onUpdateStatus(acc.id, acc.status === 'Active' ? 'Inactive' : 'Active')}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm border transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${acc.status === 'Active'
                        ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'
                      }`}
                    >
                      {acc.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    {onBulkDelete && (
                      <button
                        onClick={() => handleDeleteSingle(acc.id, acc.name || acc.fullName || acc.firstName || acc.email || 'this user')}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm border border-red-200 bg-white text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-neutral-900">{activeTab === 'exclusive' ? 'Provision Exclusive Account' : 'Provision Staff Account'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex border-b border-neutral-100 px-8">
              {['details', 'permissions', 'tabs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveModalTab(tab as any)}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeModalTab === tab
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  {tab === 'tabs' ? 'Artflow Tabs' : tab}
                </button>
              ))}
            </div>

            <div className="p-8 space-y-4">
              {activeModalTab === 'details' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm"
                      value={formData.email}
                      placeholder="e.g. john.doe@artisflow.com"
                      onChange={e => {
                        const email = e.target.value;
                        const guessedName = emailToName(email);
                        setFormData({
                          ...formData,
                          email,
                          firstName: guessedName.split(' ')[0] || '',
                          fullName: guessedName
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Authentication</label>
                    <div className="w-full px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-sm text-sm text-neutral-400">
                      Managed via Google Sign-in
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-4 py-3 pr-12 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                        value={formData.password || ''}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter account password..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {activeTab === 'staff' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Branch Name</label>
                        <input
                          list="add-branches-list"
                          type="text"
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                          value={formData.branch}
                          onChange={e => setFormData({ ...formData, branch: e.target.value })}
                          placeholder="Select or type branch name..."
                        />
                        <datalist id="add-branches-list">
                          {branches.map(b => (
                            <option key={b} value={b} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">System Role</label>
                        <select
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                          value={formData.role}
                          onChange={e => handleRoleChange(e.target.value as UserRole)}
                        >
                          <option value={UserRole.BRANCH_USER}>Branch User</option>
                          <option value={UserRole.INVENTORY_PERSONNEL}>Inventory Personnel</option>
                          <option value={UserRole.ADMIN}>Administrator</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              {(activeModalTab === 'permissions' || activeModalTab === 'tabs') && (
                <PermissionsSelector 
                  activeModalTab={activeModalTab}
                  formData={formData}
                  handlePermissionChange={handlePermissionChange}
                  handleTabPermissionChange={handleTabPermissionChange}
                  onApplyPreset={handleApplyPreset}
                />
              )}

              <div className="pt-6 flex justify-end space-x-3">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-sm font-medium text-neutral-600 hover:bg-neutral-100">Cancel</button>
                <button
                  onClick={() => {
                    onAddAccount({
                      name: formData.fullName || formData.firstName || formData.email,
                      email: formData.email,
                      role: formData.role,
                      firstName: formData.firstName,
                      fullName: formData.fullName,
                      position: formData.role,
                      branch: formData.branch,
                      permissions: formData.permissions,
                      password: formData.password
                    });
                    const defaultRole = UserRole.BRANCH_USER;
                    setShowAddModal(false);
                    setFormData({
                      firstName: '', fullName: '', email: '', branch: '',
                      role: defaultRole,
                      permissions: getDefaultPermissions(defaultRole),
                      password: ''
                    });
                  }}
                  className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-neutral-900">{activeTab === 'exclusive' ? 'Edit Exclusive Account' : 'Edit Staff Account'}</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingAccount(null); }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex border-b border-neutral-100 px-8">
              {['details', 'permissions', 'tabs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveModalTab(tab as any)}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeModalTab === tab
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  {tab === 'tabs' ? 'Artflow Tabs' : tab}
                </button>
              ))}
            </div>

            <div className="p-8 space-y-4">
              {activeModalTab === 'details' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm"
                      value={formData.email}
                      placeholder="e.g. john.doe@artisflow.com"
                      onChange={e => {
                        const email = e.target.value;
                        const guessedName = emailToName(email);
                        setFormData({
                          ...formData,
                          email,
                          firstName: guessedName.split(' ')[0] || '',
                          fullName: guessedName
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Authentication</label>
                    <div className="w-full px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-sm text-sm text-neutral-400">
                      Managed via Google Sign-in
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-4 py-3 pr-12 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                        value={formData.password || ''}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter account password..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {activeTab === 'staff' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Branch Name</label>
                        <input
                          list="edit-branches-list"
                          type="text"
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                          value={formData.branch}
                          onChange={e => setFormData({ ...formData, branch: e.target.value })}
                          placeholder="Select or type branch name..."
                        />
                        <datalist id="edit-branches-list">
                          {branches.map(b => (
                            <option key={b} value={b} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">System Role</label>
                        <select
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                          value={formData.role}
                          onChange={e => handleRoleChange(e.target.value as UserRole)}
                        >
                          <option value={UserRole.BRANCH_USER}>Branch User</option>
                          <option value={UserRole.INVENTORY_PERSONNEL}>Inventory Personnel</option>
                          <option value={UserRole.ADMIN}>Administrator</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              {(activeModalTab === 'permissions' || activeModalTab === 'tabs') && (
                <PermissionsSelector 
                  activeModalTab={activeModalTab}
                  formData={formData}
                  handlePermissionChange={handlePermissionChange}
                  handleTabPermissionChange={handleTabPermissionChange}
                  onApplyPreset={handleApplyPreset}
                />
              )}

              <div className="pt-6 flex justify-end space-x-3">
                <button onClick={() => { setShowEditModal(false); setEditingAccount(null); }} className="px-6 py-2.5 rounded-sm font-medium text-neutral-600 hover:bg-neutral-100">Cancel</button>
                <button
                  onClick={() => {
                    if (!editingAccount) return;
                    onUpdateAccount(editingAccount.id, {
                      name: formData.fullName || formData.firstName || formData.email,
                      email: formData.email,
                      role: formData.role,
                      firstName: formData.firstName,
                      fullName: formData.fullName,
                      position: formData.role,
                      branch: formData.branch,
                      permissions: formData.permissions,
                      password: formData.password
                    });
                    const defaultRole = UserRole.BRANCH_USER;
                    setShowEditModal(false);
                    setEditingAccount(null);
                    setFormData({
                      firstName: '', fullName: '', email: '', branch: '',
                      role: defaultRole,
                      permissions: getDefaultPermissions(defaultRole),
                      password: ''
                    });
                  }}
                  className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">Confirm Bulk Delete</h3>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-sm text-neutral-600">
                Are you sure you want to delete <strong>{selectedUsers.length}</strong> user account{selectedUsers.length > 1 ? 's' : ''}?
              </p>
              <div className="bg-neutral-50 rounded-sm p-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Users to be deleted:</p>
                <ul className="space-y-1">
                  {selectedUsers.map(id => {
                    const user = accounts.find(acc => acc.id === id);
                    return user ? (
                      <li key={id} className="text-sm text-neutral-700">• {user.name || user.fullName || user.firstName || user.email} ({user.email})</li>
                    ) : null;
                  })}
                </ul>
              </div>
              <p className="text-xs text-neutral-500">This action cannot be undone.</p>
            </div>
            <div className="px-8 py-6 bg-neutral-50 flex justify-end space-x-3">
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="px-6 py-2.5 rounded-sm font-medium text-neutral-600 hover:bg-white transition-colors">Cancel</button>
              <button onClick={handleBulkDelete} className="px-8 py-2.5 bg-red-600 text-white rounded-sm font-bold hover:bg-red-700 transition-colors">
                Delete {selectedUsers.length} User{selectedUsers.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingAccountInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">Delete Staff Account</h3>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-sm text-neutral-600">
                Are you sure you want to delete the account for <strong className="text-neutral-900 font-bold">"{deletingAccountInfo.name}"</strong>?
              </p>
              <p className="text-xs text-neutral-500 bg-red-50 text-red-700/80 p-3 rounded-sm border border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="px-8 py-6 bg-neutral-50 flex justify-end space-x-3 border-t border-neutral-100">
              <button 
                onClick={() => setDeletingAccountInfo(null)} 
                className="px-6 py-2.5 rounded-sm font-medium text-neutral-600 hover:bg-white border border-neutral-200 transition-colors cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (onBulkDelete && deletingAccountInfo) {
                    onBulkDelete([deletingAccountInfo.id]);
                  }
                  setDeletingAccountInfo(null);
                }} 
                className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-sm font-bold transition-all shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUsers.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-neutral-900 text-white rounded-md shadow-2xl px-6 py-4 flex items-center space-x-6 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-sm font-bold">{selectedUsers.length}</span>
              </div>
              <span className="text-sm font-medium">{selectedUsers.length} selected</span>
            </div>
            <div className="h-6 w-px bg-white/20"></div>
            <div className="flex items-center space-x-2">
              <button onClick={handleBulkActivate} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-sm text-sm font-bold transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Activate</span>
              </button>
              <button onClick={handleBulkDeactivate} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-sm text-sm font-bold transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span>Deactivate</span>
              </button>
              <button onClick={() => setShowBulkDeleteConfirm(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-sm text-sm font-bold transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span>Delete</span>
              </button>
            </div>
            <button onClick={() => setSelectedUsers([])} className="ml-2 text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {toast && toast.show && (
        <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-xl border shadow-xl flex items-start gap-3.5 max-w-sm ${
            toast.variant === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-100/50' 
              : toast.variant === 'error'
              ? 'bg-rose-50 border-rose-100 text-rose-900 shadow-rose-100/50'
              : 'bg-amber-50 border-amber-100 text-amber-900 shadow-amber-100/50'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toast.variant === 'success' 
                ? 'bg-emerald-500 text-white' 
                : toast.variant === 'error'
                ? 'bg-rose-500 text-white'
                : 'bg-amber-500 text-white'
            }`}>
              {toast.variant === 'success' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.variant === 'error' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.variant === 'warning' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-wider">{toast.title}</h4>
              <p className="text-xs font-medium opacity-90 leading-tight">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-neutral-400 hover:text-neutral-900 shrink-0 ml-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
