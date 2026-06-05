import { supabase } from '../supabase';
import { mapToSnakeCase } from '../utils/supabaseUtils';
import { AppNotification } from '../types';
import { IS_DEMO_MODE } from '../constants';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { generateUUID } from '../utils/idUtils';

const generateId = () => generateUUID();
const MAX_NOTIFICATIONS = 500;

export const useNotifications = () => {
  const { setNotifications } = useData();
  const { currentUser } = useAuth();

  const pushNotification = (
    title: string, 
    message: string, 
    type: 'inventory' | 'sales' | 'system' = 'system', 
    artworkId?: string, 
    items?: { id: string; title: string; code: string; imageUrl?: string; status?: 'success' | 'failed'; error?: string }[],
    isImportant?: boolean
  ) => {
    const newNotif: AppNotification = {
      id: generateId(),
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      type,
      artworkId,
      items,
      userName: currentUser?.name || undefined,
      agent: currentUser?.branch || undefined,
      isImportant
    };

    setNotifications(prev => {
      const next = [newNotif, ...prev];
      return next.length > MAX_NOTIFICATIONS ? next.slice(0, MAX_NOTIFICATIONS) : next;
    });

    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const { isImportant, ...dbNotif } = {
          ...newNotif,
          items: newNotif.items?.map(item => ({
            ...item,
            imageUrl: undefined // Remove base64 data to save DB space
          }))
        };
        const { error } = await supabase.from('notifications').insert(mapToSnakeCase(dbNotif));
        if (error) throw error;
      } catch (error) {
        console.error('Error saving notification to Supabase', error);
      }
    })();
  };

  const markNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (IS_DEMO_MODE) return;
    try {
        await supabase.from('notifications').update(mapToSnakeCase({ isRead: true })).eq('is_read', false);
    } catch (error) {
        console.error('Error marking notifications read in Supabase', error);
    }
  };

  return { pushNotification, markNotificationsAsRead };
};
