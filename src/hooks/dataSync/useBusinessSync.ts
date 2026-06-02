import { Dispatch, SetStateAction, useEffect } from 'react';
import { supabase } from '../../supabase';
import { ExhibitionEvent, SaleRecord, UserAccount } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { mapFromSnakeCase } from '../../utils/supabaseUtils';
import { isSupabaseBadQueryError, isSupabaseMissingRelationError } from './shared';
import { removeRealtimeRecord, updateRealtimeRecord, upsertRealtimeRecord, getGlobalSyncChannel, subscribeGlobalSyncChannel, unsubscribeGlobalSyncChannel } from './shared';

interface UseBusinessSyncParams {
  currentUser: UserAccount | null;
  shouldLoadFullBusinessData: boolean;
  setSales: Dispatch<SetStateAction<SaleRecord[]>>;
  setEvents: Dispatch<SetStateAction<ExhibitionEvent[]>>;
  setIsLoadingSales: Dispatch<SetStateAction<boolean>>;
  setIsLoadingEvents: Dispatch<SetStateAction<boolean>>;
}

export const useBusinessSync = ({
  currentUser,
  shouldLoadFullBusinessData,
  setSales,
  setEvents,
  setIsLoadingSales,
  setIsLoadingEvents
}: UseBusinessSyncParams) => {
  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id) return;

    const selectSalesWithFallback = async () => {
      const queries = shouldLoadFullBusinessData
        ? [
            () => supabase.from('sales').select('*'),
            () => supabase.from('sales').select('id, artwork_id, client_name, client_email, client_contact, agent_name, agent_id, sale_date, delivery_date, is_delivered, is_cancelled, status, sold_at_event_id, sold_at_event_name, downpayment, is_downpayment, installments, artwork_snapshot, requested_attachments, decline_reason, itdr_url, rsa_url, or_cr_url, delivery_request')
          ]
        : [
            () => supabase
              .from('sales')
              .select('id, artwork_id, client_name, client_email, client_contact, agent_name, agent_id, sale_date, delivery_date, is_delivered, is_cancelled, status, sold_at_event_id, sold_at_event_name, downpayment, is_downpayment, installments, artwork_snapshot, requested_attachments, decline_reason, itdr_url, rsa_url, or_cr_url, delivery_request')
              .order('sale_date', { ascending: false })
              .limit(80),
            () => supabase
              .from('sales')
              .select('id, artwork_id, client_name, client_email, client_contact, agent_name, agent_id, sale_date, delivery_date, is_delivered, is_cancelled, status, sold_at_event_id, sold_at_event_name, downpayment, is_downpayment, installments, artwork_snapshot, requested_attachments, decline_reason, itdr_url, rsa_url, or_cr_url, delivery_request')
              .order('sale_date', { ascending: false })
              .limit(80)
          ];

      let lastResponse: any = null;
      for (const runQuery of queries) {
        const response = await runQuery();
        if (!response.error) return response;
        lastResponse = response;
        if (!isSupabaseBadQueryError(response.error)) return response;
      }

      return lastResponse;
    };

    const parseSaleRecord = (sale: any): SaleRecord => {
      const s = mapFromSnakeCase(sale);
      const artworkSnapshot = typeof s.artworkSnapshot === 'string' ? JSON.parse(s.artworkSnapshot) : s.artworkSnapshot;
      return {
        ...s,
        installments: typeof s.installments === 'string' ? JSON.parse(s.installments) : (s.installments || []),
        artworkSnapshot,
        discountPercentage: s.discountPercentage !== undefined && s.discountPercentage !== null ? s.discountPercentage : artworkSnapshot?.discountPercentage,
        discountedPrice: s.discountedPrice !== undefined && s.discountedPrice !== null ? s.discountedPrice : artworkSnapshot?.discountedPrice,
        requestedAttachments: typeof s.requestedAttachments === 'string' ? JSON.parse(s.requestedAttachments) : (s.requestedAttachments || []),
        itdrUrl: typeof s.itdrUrl === 'string' ? JSON.parse(s.itdrUrl) : (s.itdrUrl || []),
        rsaUrl: typeof s.rsaUrl === 'string' ? JSON.parse(s.rsaUrl) : (s.rsaUrl || []),
        orCrUrl: typeof s.orCrUrl === 'string' ? JSON.parse(s.orCrUrl) : (s.orCrUrl || []),
        pendingDownpaymentEdit: typeof s.pendingDownpaymentEdit === 'string' ? JSON.parse(s.pendingDownpaymentEdit) : s.pendingDownpaymentEdit,
        deliveryRequest: typeof s.deliveryRequest === 'string' ? JSON.parse(s.deliveryRequest) : s.deliveryRequest
      };
    };

    const syncBusinessData = async () => {
      setIsLoadingSales(true);
      setIsLoadingEvents(true);
      try {
        const eventsQuery = shouldLoadFullBusinessData
          ? supabase.from('events').select('*')
          : supabase
              .from('events')
              .select('*')
              .order('start_date', { ascending: false })
              .limit(24);

        const [salesRes, eventsRes] = await Promise.all([
          selectSalesWithFallback(),
          eventsQuery
        ]);
        if (salesRes.error && !isSupabaseMissingRelationError(salesRes.error)) {
          console.warn('[Business Sync] Sales query failed:', salesRes.error.message);
        }
        if (salesRes.data) {
          setSales(salesRes.data.map(parseSaleRecord));
        }
        if (eventsRes.data) {
          setEvents((mapFromSnakeCase(eventsRes.data) as ExhibitionEvent[]).map(e => ({
            ...e,
            artworkIds: Array.isArray(e.artworkIds) ? e.artworkIds : []
          })));
        }
      } finally {
        setIsLoadingSales(false);
        setIsLoadingEvents(false);
      }
    };

    const handleSalesRealtime = (payload: any) => {
      if (payload.eventType === 'DELETE') {
        setSales(prev => removeRealtimeRecord(prev, payload.old.id));
        return;
      }

      const mappedSale = parseSaleRecord(payload.new);
      if (payload.eventType === 'INSERT') {
        setSales(prev => upsertRealtimeRecord(prev, mappedSale));
        return;
      }

      if (payload.eventType === 'UPDATE') {
        setSales(prev => updateRealtimeRecord(prev, mappedSale));
      }
    };

    const handleEventsRealtime = (payload: any) => {
      if (payload.eventType === 'DELETE') {
        setEvents(prev => removeRealtimeRecord(prev, payload.old.id));
        return;
      }

      const mappedEvent = {
        ...(mapFromSnakeCase(payload.new) as ExhibitionEvent),
        artworkIds: Array.isArray(payload.new?.artwork_ids) ? payload.new.artwork_ids : []
      };

      if (payload.eventType === 'INSERT') {
        setEvents(prev => upsertRealtimeRecord(prev, mappedEvent));
        return;
      }

      if (payload.eventType === 'UPDATE') {
        setEvents(prev => updateRealtimeRecord(prev, mappedEvent));
      }
    };

    void syncBusinessData();
    const channel = supabase.channel(`artisflow-business-sync-${currentUser.id}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, handleSalesRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, handleEventsRealtime);
      
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, setEvents, setIsLoadingEvents, setIsLoadingSales, setSales, shouldLoadFullBusinessData]);
};
