import { supabase } from '../supabase';
import { mapToSnakeCase } from '../utils/supabaseUtils';
import { generateUUID } from '../utils/idUtils';
import { UserAccount, UserRole, UserPermissions } from '../types';
import { IS_DEMO_MODE } from '../constants';
import { sendStaffWelcomeEmail } from '../services/emailService';
import { useData } from '../contexts/DataContext';
import { useNotifications } from './useNotifications';
import { useUI } from '../contexts/UIContext';

export const useAccountOperations = () => {
  const { accounts, setAccounts } = useData();
  const { pushNotification } = useNotifications();
  const { setImportStatus } = useUI();

  const handleAddAccount = async (acc: Partial<UserAccount>) => {
    const baseName = acc.fullName || acc.firstName || acc.name || acc.email;
    
    setImportStatus({
      isVisible: true,
      title: 'Provisioning Account',
      message: `Creating profile for ${baseName}...`
    });

    try {
      const newAccount: UserAccount = {
        ...acc,
        id: generateUUID(),
        status: 'Active',
        lastLogin: new Date().toISOString(),
        name: baseName || 'New User',
        firstName: acc.firstName,
        fullName: acc.fullName || baseName,
        position: acc.position,
        role: acc.role || UserRole.BRANCH_USER
      } as UserAccount;

      if (IS_DEMO_MODE) {
        setAccounts(prev => [...prev, newAccount]);
      } else {
        const { error } = await supabase.from('profiles').insert(mapToSnakeCase(newAccount));
        if (error) throw error;
        setAccounts(prev => [...prev, newAccount]);
      }

      if (acc.email && !IS_DEMO_MODE) {
        // Send welcome email asynchronously without blocking the UI
        sendStaffWelcomeEmail({
          to: acc.email as string,
          name: baseName || ''
        }).catch(err => {
          // sendStaffWelcomeEmail handles its own internal logging, 
          // so we just catch the promise rejection here.
        });
      }
      pushNotification('Account Provisioned', `New user account created for ${baseName}.`, 'system');
    } catch (error: any) {
      console.error('Add Account Error:', error);
      const errorMessage = String(error?.message || '');
      const isRlsFailure = errorMessage.toLowerCase().includes('row-level security');
      pushNotification(
        'Provisioning Failed',
        isRlsFailure
          ? 'Account creation was blocked by Supabase RLS on the profiles table. Apply the latest schema policies, then try again.'
          : 'Could not save profile to database.',
        'system'
      );
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  const handleUpdateAccountStatus = async (id: string, status: 'Active' | 'Inactive') => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    pushNotification('Account Updated', `Access status changed.`, 'system');
    
    if (IS_DEMO_MODE) return;
    try {
      const { error } = await supabase.from('profiles').update(mapToSnakeCase({ status })).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating account status in Supabase', error);
    }
  };

  const handleUpdateAccount = async (id: string, updates: Partial<UserAccount>) => {
    const existing = accounts.find(a => a.id === id);
    if (!existing) return;
    
    const baseName = updates.fullName || updates.firstName || updates.name || existing.name;
    
    setImportStatus({
      isVisible: true,
      title: 'Updating Account',
      message: `Saving changes for ${baseName}...`
    });

    try {
      const updatedAccount: UserAccount = {
        ...existing,
        ...updates,
        name: baseName || existing.name
      };

      setAccounts(prev => prev.map(a => a.id === id ? updatedAccount : a));
      
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('profiles').update(mapToSnakeCase(updates)).eq('id', id);
        if (error) throw error;
      }
      pushNotification('Account Updated', `Profile updated for ${baseName}.`, 'system');
    } catch (error) {
      console.error('Update Account Error:', error);
      pushNotification('Update Failed', 'Changes could not be synced to database.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  const handleBulkDeleteAccounts = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} accounts?`)) return;

    setImportStatus({
      isVisible: true,
      title: 'Deleting Accounts',
      message: `Removing ${ids.length} profiles from database...`,
      progress: { current: 0, total: ids.length }
    });

    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('profiles').delete().in('id', ids);
        if (error) throw error;
      }
      setAccounts(prev => prev.filter(a => !ids.includes(a.id)));
      setImportStatus({
        isVisible: true,
        title: 'Deleting Accounts',
        message: 'Profiles removed successfully.',
        progress: { current: ids.length, total: ids.length }
      });
      pushNotification('Bulk Delete', `Deleted ${ids.length} branch accounts.`, 'system');
    } catch (error) {
      console.error('Bulk Delete Error:', error);
      pushNotification('Bulk Delete Failed', 'Some records could not be removed.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 1000);
    }
  };

  const handleBulkUpdateAccountStatus = async (ids: string[], status: 'Active' | 'Inactive') => {
    setAccounts(prev => prev.map(a => ids.includes(a.id) ? { ...a, status } : a));
    
    if (IS_DEMO_MODE) return;
    try {
      const { error } = await supabase.from('profiles').update(mapToSnakeCase({ status })).in('id', ids);
      if (error) throw error;
      pushNotification('Bulk Status Update', `Updated ${ids.length} accounts.`, 'system');
    } catch (error) {
      console.error('Error bulk updating accounts in Supabase', error);
    }
  };

  const handleBulkUpdatePermissions = async (ids: string[], permissions: UserPermissions) => {
    setAccounts(prev => prev.map(a => ids.includes(a.id) ? { ...a, permissions } : a));
    
    if (IS_DEMO_MODE) {
      pushNotification('Bulk Permissions Update', `Updated permissions for ${ids.length} accounts.`, 'system');
      return;
    }
    
    try {
      const { error } = await supabase.from('profiles').update(mapToSnakeCase({ permissions })).in('id', ids);
      if (error) throw error;
      pushNotification('Bulk Permissions Update', `Updated permissions for ${ids.length} accounts.`, 'system');
    } catch (error) {
      console.error('Error bulk updating permissions in Supabase', error);
      pushNotification('Update Failed', 'Permissions could not be bulk updated in database.', 'system');
    }
  };

  return {
    handleAddAccount,
    handleUpdateAccountStatus,
    handleUpdateAccount,
    handleBulkDeleteAccounts,
    handleBulkUpdateAccountStatus,
    handleBulkUpdatePermissions
  };
};
