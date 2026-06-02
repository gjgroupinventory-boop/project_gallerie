import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserAccount, UserRole, normalizeAccount } from '../types';
import { supabase } from '../supabase';
import { mapFromSnakeCase, mapToSnakeCase } from '../utils/supabaseUtils';
import { IS_DEMO_MODE } from '../constants';

interface AuthContextType {
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  justLoggedIn: boolean;
  setJustLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  isAdmin: boolean;
  isInventory: boolean;
  isSales: boolean;
  isExclusive: boolean;
  handleLogin: (account: UserAccount) => Promise<void>;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_COLUMNS = 'id, name, first_name, full_name, email, role, branch, status, permissions, last_login, position, password';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const persisted = sessionStorage.getItem('artisflow-session-user');
      return persisted ? JSON.parse(persisted) : null;
    } catch {
      return null;
    }
  });
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Sync session changes to sessionStorage
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem('artisflow-session-user', JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem('artisflow-session-user');
      }
    } catch (e) {
      console.error('Failed to sync user session to storage:', e);
    }
  }, [currentUser]);

  // Keep current user's profile updated in real-time from Supabase
  useEffect(() => {
    if (!currentUser?.id || IS_DEMO_MODE) return;

    let active = true;

    const fetchAndSubscribe = async () => {
      // 1. Fetch fresh profile data immediately on boot to sync custom permissions/role updates
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (profile && active) {
          const updated = normalizeAccount(mapFromSnakeCase([profile])[0] as UserAccount);
          if (JSON.stringify(updated) !== JSON.stringify(currentUser)) {
            setCurrentUser(updated);
          }
        }
      } catch (err) {
        console.error('Error fetching fresh profile at boot:', err);
      }

      // 2. Subscribe to realtime updates for this specific profile
      const channel = supabase.channel(`current-user-sync-${currentUser.id}`);
      channel
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${currentUser.id}` 
        }, (payload) => {
          if (!active) return;
          const updated = normalizeAccount(mapFromSnakeCase([payload.new])[0] as UserAccount);
          setCurrentUser(updated);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanupPromise = fetchAndSubscribe();
    return () => {
      active = false;
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, [currentUser?.id]);

  // Presence System using Supabase Realtime
  useEffect(() => {
    if (currentUser?.id && !IS_DEMO_MODE) {
      const channel = supabase.channel(`presence:${currentUser.id}`, {
        config: {
          presence: {
            key: currentUser.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          // Presence sync for real-time collaboration
        })
        .on('presence', { event: 'join' }, () => {
          // User joined presence channel
        })
        .on('presence', { event: 'leave' }, () => {
          // User left presence channel
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user: currentUser.name,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [currentUser?.id, currentUser?.name]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isInventory = currentUser?.role === UserRole.INVENTORY_PERSONNEL;
  const isSales = currentUser?.role === UserRole.BRANCH_USER;
  const isExclusive = currentUser?.role === UserRole.EXCLUSIVE;

  const handleLogin = async (account: UserAccount) => {
    const timestamp = new Date().toISOString();
    const finalAccount = { ...account, lastLogin: timestamp };

    // Update state immediately to make login transition instantaneous
    setJustLoggedIn(true);
    setCurrentUser(normalizeAccount(finalAccount));

    if (!IS_DEMO_MODE) {
      // Run Supabase Auth and database synchronization asynchronously in the background
      void (async () => {
        try {
          let { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) {
              console.error('Background anonymous sign-in failed:', error.message);
              return;
            }
            session = data.session;
          }

          // Hydrate the profile columns if needed
          const { data: profileData } = await supabase
            .from('profiles')
            .select(PROFILE_COLUMNS)
            .eq('id', account.id)
            .maybeSingle();

          if (profileData) {
            const hydratedAccount = {
              ...finalAccount,
              ...(mapFromSnakeCase([profileData])[0] as UserAccount)
            };
            setCurrentUser(normalizeAccount(hydratedAccount));
          }

          // Update last login timestamp in DB
          await supabase
            .from('profiles')
            .update(mapToSnakeCase({ lastLogin: timestamp, status: 'Active' }))
            .eq('id', account.id);

        } catch (error) {
          console.error('Supabase auth background sync process error:', error);
        }
      })();
    }
  };

  const handleLogout = async () => {
    if (!IS_DEMO_MODE) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setJustLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        justLoggedIn,
        setJustLoggedIn,
        isAdmin,
        isInventory,
        isSales,
        isExclusive,
        handleLogin,
        handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
