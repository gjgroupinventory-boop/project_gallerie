import { Dispatch, SetStateAction, useEffect } from 'react';
import { supabase } from '../../supabase';
import { UserAccount, normalizeAccount } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { mapFromSnakeCase } from '../../utils/supabaseUtils';
import { LOGIN_PROFILE_COLUMNS, PROFILE_COLUMNS, getGlobalSyncChannel, subscribeGlobalSyncChannel, unsubscribeGlobalSyncChannel } from './shared';

interface UseAccountsSyncParams {
  currentUser: UserAccount | null;
  activeTab: string;
  accounts: UserAccount[];
  setAccounts: Dispatch<SetStateAction<UserAccount[]>>;
  setIsLoadingUsers: Dispatch<SetStateAction<boolean>>;
  handleSyncError: (error: any, context: string) => void;
}

export const useAccountsSync = ({
  currentUser,
  activeTab,
  accounts,
  setAccounts,
  setIsLoadingUsers,
  handleSyncError
}: UseAccountsSyncParams) => {
  useEffect(() => {
    if (IS_DEMO_MODE) return;
    if (!currentUser?.id) {
      const syncAccountsOnly = async (blockUi: boolean) => {
        if (blockUi) setIsLoadingUsers(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select(LOGIN_PROFILE_COLUMNS)
            .eq('status', 'Active')
            .order('name', { ascending: true })
            .limit(100);
          
          if (error) {
            handleSyncError(error, 'Branch Accounts');
          } else if (data) {
            setAccounts(normalizeAccount(mapFromSnakeCase(data) as UserAccount[]));
          }
        } finally {
          setIsLoadingUsers(false);
        }
      };

      if (accounts.length > 0) {
        setIsLoadingUsers(false);
        void syncAccountsOnly(false);
      } else {
        void syncAccountsOnly(true);
      }
      return;
    }

    // Ensure currentUser is in the accounts list if not already there, 
    // but only do it once to avoid loops.
    if (currentUser?.id && !accounts.some(acc => acc.id === currentUser.id)) {
      setAccounts(prev => [currentUser, ...prev]);
    }

    const shouldSyncAccounts = activeTab === 'accounts' || activeTab === 'chat';
    if (!shouldSyncAccounts) {
      setIsLoadingUsers(false);
      return;
    }

    const syncAccounts = async () => {
      setIsLoadingUsers(true);
      try {
        const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).limit(300);
        if (error) {
          handleSyncError(error, 'Profiles List');
        } else if (data) {
          setAccounts(normalizeAccount(mapFromSnakeCase(data) as UserAccount[]));
        }
      } finally {
        setIsLoadingUsers(false);
      }
    };

    void syncAccounts();

    const handleRefetchAccountsEvent = () => {
      void syncAccounts();
    };
    window.addEventListener('artisflow-refetch-accounts', handleRefetchAccountsEvent);

    const channel = supabase.channel(`artisflow-accounts-sync-${currentUser.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newUser = normalizeAccount(mapFromSnakeCase([payload.new])[0] as UserAccount);
          setAccounts(prev => prev.some(a => a.id === newUser.id) ? prev : [...prev, newUser]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = normalizeAccount(mapFromSnakeCase([payload.new])[0] as UserAccount);
          setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
        } else if (payload.eventType === 'DELETE') {
          setAccounts(prev => prev.filter(a => a.id !== payload.old.id));
        }
      });

    channel.subscribe();
    return () => {
      window.removeEventListener('artisflow-refetch-accounts', handleRefetchAccountsEvent);
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeTab, accounts.length, setAccounts, setIsLoadingUsers]);
};
