import { Dispatch, SetStateAction, useEffect } from 'react';
import { supabase } from '../../supabase';
import { AppNotification, ChatMessage, Conversation, UserAccount } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { mapFromSnakeCase } from '../../utils/supabaseUtils';
import {
  NOTIFICATION_BOOT_DELAY_MS,
  OPERATIONS_ROW_LIMITS,
  removeRealtimeRecord,
  updateRealtimeRecord,
  upsertRealtimeRecord,
  getGlobalSyncChannel,
  subscribeGlobalSyncChannel,
  unsubscribeGlobalSyncChannel
} from './shared';

interface UseMessagingSyncParams {
  currentUser: UserAccount | null;
  shouldSyncMessaging: boolean;
  conversations: Conversation[];
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

export const useMessagingSync = ({
  currentUser,
  shouldSyncMessaging,
  conversations,
  setNotifications,
  setConversations,
  setMessages
}: UseMessagingSyncParams) => {
  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id) return;

    const syncNotifications = async () => {
      const notifRes = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(OPERATIONS_ROW_LIMITS.notifications);
      if (notifRes.data) setNotifications(mapFromSnakeCase(notifRes.data) as AppNotification[]);
    };

    const timer = window.setTimeout(() => {
      void syncNotifications();
    }, NOTIFICATION_BOOT_DELAY_MS);

    const handleNotificationRealtime = (payload: any) => {
      if (payload.eventType === 'DELETE') {
        setNotifications(prev => removeRealtimeRecord(prev, payload.old.id));
        return;
      }

      const mappedNotification = mapFromSnakeCase(payload.new) as AppNotification;
      if (payload.eventType === 'INSERT') {
        setNotifications(prev => upsertRealtimeRecord(prev, mappedNotification, OPERATIONS_ROW_LIMITS.notifications));
        
        const lowerTitle = (mappedNotification.title || '').toLowerCase();
        const lowerMsg = (mappedNotification.message || '').toLowerCase();
        if (lowerTitle.includes('transfer') || lowerMsg.includes('transfer')) {
          window.dispatchEvent(new CustomEvent('artisflow-refetch-transfers'));
        }
        if (lowerTitle.includes('sale') || lowerMsg.includes('sale') || lowerTitle.includes('payment') || lowerMsg.includes('payment') || lowerTitle.includes('logistics') || lowerMsg.includes('logistics') || lowerTitle.includes('delivery') || lowerMsg.includes('delivery')) {
          window.dispatchEvent(new CustomEvent('artisflow-refetch-sales'));
        }
        if (lowerTitle.includes('event') || lowerMsg.includes('event')) {
          window.dispatchEvent(new CustomEvent('artisflow-refetch-events'));
        }
        if (lowerTitle.includes('artwork') || lowerMsg.includes('artwork') || lowerTitle.includes('import') || lowerMsg.includes('import')) {
          window.dispatchEvent(new CustomEvent('artisflow-refetch-artworks'));
        }
        if (lowerTitle.includes('branch') || lowerMsg.includes('branch')) {
          window.dispatchEvent(new CustomEvent('artisflow-refetch-branches'));
        }
        if (lowerTitle.includes('account') || lowerMsg.includes('account') || lowerTitle.includes('permissions') || lowerMsg.includes('permissions')) {
          window.dispatchEvent(new CustomEvent('artisflow-refetch-accounts'));
        }
        return;
      }

      if (payload.eventType === 'UPDATE') {
        setNotifications(prev => updateRealtimeRecord(prev, mappedNotification));
      }
    };

    const channel = supabase.channel(`artisflow-notifications-sync-${currentUser.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, handleNotificationRealtime);
    
    channel.subscribe();
    return () => {
      window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, setNotifications]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || !shouldSyncMessaging) {
      return;
    }

    const syncMessaging = async () => {
      const convRes = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUser.id])
        .order('updated_at', { ascending: false });
      if (convRes.data) setConversations(mapFromSnakeCase(convRes.data) as Conversation[]);
    };

    const handleConversationRealtime = (payload: any) => {
      if (payload.eventType === 'DELETE') {
        setConversations(prev => removeRealtimeRecord(prev, payload.old.id));
        return;
      }

      const mappedConversation = mapFromSnakeCase(payload.new) as Conversation;
      const participantIds = Array.isArray(mappedConversation.participantIds) ? mappedConversation.participantIds : [];
      if (!participantIds.includes(currentUser.id)) {
        setConversations(prev => removeRealtimeRecord(prev, mappedConversation.id));
        return;
      }

      if (payload.eventType === 'INSERT') {
        setConversations(prev => upsertRealtimeRecord(prev, mappedConversation));
        return;
      }

      if (payload.eventType === 'UPDATE') {
        setConversations(prev => updateRealtimeRecord(prev, mappedConversation));
      }
    };

    void syncMessaging();
    const channel = supabase.channel(`artisflow-conversations-sync-${currentUser.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, handleConversationRealtime);
    
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, shouldSyncMessaging, setConversations]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || !shouldSyncMessaging || conversations.length === 0) {
      if (!shouldSyncMessaging || conversations.length === 0) setMessages([]);
      return;
    }

    const syncMessages = async () => {
      const convIds = conversations.map(c => c.id);
      const { data } = await supabase.from('messages').select('*').in('conversation_id', convIds).order('created_at', { ascending: true });
      if (data) setMessages(mapFromSnakeCase(data) as ChatMessage[]);
    };

    void syncMessages();
    const channel = supabase.channel(`artisflow-messages-sync-${currentUser.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = mapFromSnakeCase([payload.new])[0] as ChatMessage;
        if (payload.eventType === 'INSERT') {
          setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === newMessage.id ? newMessage : m));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      });
      
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, shouldSyncMessaging, conversations, setMessages]);
};
