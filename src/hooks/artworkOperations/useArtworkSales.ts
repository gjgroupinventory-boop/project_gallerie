import { supabase } from '../../supabase';
import { mapToSnakeCase } from '../../utils/supabaseUtils';
import { Artwork, ArtworkStatus, SaleRecord, SaleStatus, UserRole, DeliveryRequest, DeliveryRequestStatus, InstallmentRecord } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { buildBulkSale, applySingleSale, applyCancelSale, applyDispatch, applyDelivery } from '../../services/salesService';
import { uploadAttachmentsToStorage } from '../../services/supabaseStorageService';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useNotifications } from '../useNotifications';
import { useActivityLogs } from '../useActivityLogs';
import { findArtwork, syncArtwork, getPendingSalesForArtwork } from './shared';

const generateId = () => window.crypto.randomUUID();

export const useArtworkSales = () => {
  const {
    artworks, setArtworks,
    allArtworksIncludingDeleted, setAllArtworksIncludingDeleted,
    sales, setSales,
    accounts
  } = useData();

  const { currentUser } = useAuth();
  const userRole = currentUser?.role ?? UserRole.ADMIN;
  const { setImportStatus } = useUI();
  const { pushNotification } = useNotifications();
  const { logActivity } = useActivityLogs();
  const currentUserName = currentUser?.name || currentUser?.fullName || 'Admin';

  const sendDeclineFeedbackToAgent = async (sale: SaleRecord, reason?: string, requestedFiles?: string[]) => {
    if (IS_DEMO_MODE || !currentUser) return;

    const agent = accounts.find(a => a.id === sale.agentId) || 
                  accounts.find(a => a.name === sale.agentName && a.role !== UserRole.ADMIN);
    
    if (!agent || agent.id === currentUser.id) return;

    try {
      const artworkTitle = sale.artworkSnapshot?.title || findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted)?.title || 'the artwork';
      const feedback = reason?.trim() || 'The sale declaration needs revision before it can be approved.';
      
      let messageText = `🚫 SALE DECLINED\nArtwork: ${artworkTitle}\nClient: ${sale.clientName}\nReason: ${feedback}`;
      
      if (requestedFiles && requestedFiles.length > 0) {
        const fileLabels = requestedFiles.map(f => {
          if (f === 'itdr') return 'IT/DR';
          if (f === 'rsa') return 'RSA/AR';
          if (f === 'orcr') return 'OR/CR';
          return f.toUpperCase();
        }).join(', ');
        messageText += `\n\n♻️ RE-UPLOAD REQUESTED: ${fileLabels}`;
      }

      const now = new Date().toISOString();

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUser.id, agent.id])
        .limit(1)
        .maybeSingle();

      let conversationId = existingConversation?.id as string | undefined;

      if (!conversationId) {
        const newConversation = {
          participantIds: [currentUser.id, agent.id],
          participantNames: {
            [currentUser.id]: currentUserName,
            [agent.id]: agent.name || 'Agent'
          },
          updatedAt: now,
          unreadCount: {
            [currentUser.id]: 0,
            [agent.id]: 1
          },
          lastMessage: {
            text: messageText,
            senderName: currentUserName,
            timestamp: now
          }
        };

        const { data: createdConversation, error: createConversationError } = await supabase
          .from('conversations')
          .insert(mapToSnakeCase(newConversation))
          .select()
          .single();

        if (createConversationError) throw createConversationError;
        conversationId = createdConversation.id;
      } else {
        const unreadCount = { ...(existingConversation.unread_count || {}) };
        unreadCount[agent.id] = (unreadCount[agent.id] || 0) + 1;

        const { error: convUpdateError } = await supabase
          .from('conversations')
          .update(mapToSnakeCase({
            lastMessage: {
              text: messageText,
              senderName: currentUserName,
              timestamp: now
            },
            updatedAt: now,
            unreadCount: unreadCount
          }))
          .eq('id', conversationId);
        
        if (convUpdateError) throw convUpdateError;
      }

      const newMessage = {
        conversationId,
        senderId: currentUser.id,
        senderName: currentUserName,
        text: messageText,
        timestamp: now,
        readBy: [currentUser.id]
      };

      const { error: messageError } = await supabase
        .from('messages')
        .insert(mapToSnakeCase(newMessage));

      if (messageError) throw messageError;

      pushNotification(
        'Sale Declaration Declined',
        `Admin declined sale for "${artworkTitle}". Reason: ${feedback.slice(0, 50)}${feedback.length > 50 ? '...' : ''}`,
        'sales',
        sale.artworkId
      );

    } catch (error) {
      console.error('[sendDeclineFeedbackToAgent] Error:', error);
    }
  };

  const handleSale = async (
    id: string,
    clientName: string,
    clientEmail: string,
    clientContact: string,
    delivered: boolean,
    eventInfo?: any,
    attachment?: string,
    itdr?: string[],
    rsa?: string[],
    orcr?: string[],
    downpayment?: number,
    isDownpayment?: boolean,
    remarks?: string,
    discountPercentage?: number,
    discountedPrice?: number
  ) => {
    const existingPendingSales = getPendingSalesForArtwork(id, sales);
    if (existingPendingSales.length > 0) {
      pushNotification('Sale Already Pending', 'This artwork already has a sale waiting for approval.', 'system');
      return false;
    }

    const previousArtworks = artworks;
    const previousArtwork = artworks.find(a => String(a.id) === String(id));
    let agentName = currentUser?.name || 'Unknown';
    if (remarks && remarks.includes('Handling Agent:')) {
      const match = remarks.match(/Handling Agent:\s*(.*)$/);
      if (match && match[1]) {
        const inputtedAgent = match[1].trim();
        const branchName = currentUser?.branch || 'Main';
        agentName = `${branchName} — ${inputtedAgent}`;
      }
    }
    const agentId = currentUser?.id;
    const { updatedArtworks, newSale } = applySingleSale(
      artworks,
      id,
      clientName,
      clientEmail,
      clientContact,
      agentName,
      delivered,
      eventInfo,
      attachment,
      itdr,
      rsa,
      orcr,
      downpayment,
      agentId,
      isDownpayment,
      discountPercentage,
      discountedPrice
    );
    if (!newSale) return;
    const updatedArt = updatedArtworks.find(a => String(a.id) === String(id)) || previousArtwork;
    setSales(prev => [...prev, newSale]);
    setArtworks(updatedArtworks);
    setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? (updatedArtworks.find(ua => String(ua.id) === String(id)) || a) : a));
    logActivity(id, 'Sale Declared', `Client: ${clientName}. Remarks: ${remarks}`, updatedArt);
    pushNotification(
      'Sale Declared',
      `New sale declaration submitted by ${agentName} for client "${clientName}". Awaiting approval.`,
      'sales',
      id
    );
    if (IS_DEMO_MODE) return true;

    // Upload Attachments to Storage
    const secureItdr = await uploadAttachmentsToStorage(itdr, 'images', 'attachments') as string[] | undefined;
    const secureRsa = await uploadAttachmentsToStorage(rsa, 'images', 'attachments') as string[] | undefined;
    const secureOrcr = await uploadAttachmentsToStorage(orcr, 'images', 'attachments') as string[] | undefined;

    // Guard: Only allow sale if currently AVAILABLE
    const success = await syncArtwork({
      id,
      updates: {
        status: ArtworkStatus.FOR_SALE_APPROVAL,
        itdrImageUrl: secureItdr ? JSON.stringify(secureItdr) : undefined,
        rsaImageUrl: secureRsa ? JSON.stringify(secureRsa) : undefined,
        orCrImageUrl: secureOrcr ? JSON.stringify(secureOrcr) : undefined
      },
      expectedStatus: ArtworkStatus.AVAILABLE,
      setArtworks,
      setAllArtworksIncludingDeleted,
      pushNotification
    });

    if (!success) {
      setSales(prev => prev.filter(s => String(s.id) !== String(newSale.id)));
      setArtworks(previousArtworks);
      setAllArtworksIncludingDeleted(previousArtworks);
      return false;
    }

    const serializedSale = {
      id: newSale.id,
      artworkId: newSale.artworkId,
      clientName: newSale.clientName,
      clientEmail: newSale.clientEmail || null,
      clientContact: newSale.clientContact || null,
      agentName: newSale.agentName,
      agentId: newSale.agentId || null,
      saleDate: newSale.saleDate,
      deliveryDate: newSale.deliveryDate || null,
      isDelivered: !!newSale.isDelivered,
      isCancelled: !!newSale.isCancelled,
      status: newSale.status || null,
      soldAtEventId: newSale.soldAtEventId || null,
      soldAtEventName: newSale.soldAtEventName || null,
      downpayment: newSale.downpayment || 0,
      isDownpayment: !!newSale.isDownpayment,
      installments: newSale.installments ? JSON.stringify(newSale.installments) : '[]',
      artworkSnapshot: newSale.artworkSnapshot ? JSON.stringify(newSale.artworkSnapshot) : null,
      itdrUrl: secureItdr && secureItdr.length > 0 ? JSON.stringify(secureItdr) : null,
      rsaUrl: secureRsa && secureRsa.length > 0 ? JSON.stringify(secureRsa) : null,
      orCrUrl: secureOrcr && secureOrcr.length > 0 ? JSON.stringify(secureOrcr) : null,
    };
    const { error } = await supabase.from('sales').insert(mapToSnakeCase(serializedSale));
    if (error) {
      console.error('Create Sale Error:', error);
      setSales(prev => prev.filter(s => s.id !== newSale.id));
      setArtworks(previousArtworks);
      pushNotification('Sale Submission Failed', 'The sale could not be submitted. No approval request was created.', 'system');

      if (previousArtwork) {
        await supabase
          .from('artworks')
          .update(mapToSnakeCase({
            status: previousArtwork.status,
            soldAtBranch: previousArtwork.soldAtBranch ?? null,
            reservedForEventId: previousArtwork.reservedForEventId ?? null,
            reservedForEventName: previousArtwork.reservedForEventName ?? null
          }))
          .eq('id', id);
      }

      return false;
    }

    return true;
  };

  const handleBulkSale = async (
    ids: string[],
    client: string,
    delivered: boolean | Record<string, boolean>,
    eventInfo?: any,
    attachments?: any,
    downpayment?: number,
    clientEmail?: string,
    clientContact?: string,
    perArtworkDownpayments?: Record<string, number>,
    isDownpayment?: boolean,
    discountPercentage?: Record<string, number> | number,
    remarks?: string
  ) => {
    const duplicateIds = ids.filter(id => getPendingSalesForArtwork(id, sales).length > 0);
    if (duplicateIds.length > 0) {
      pushNotification('Pending Sales Found', `${duplicateIds.length} selected artwork${duplicateIds.length === 1 ? '' : 's'} already have a sale awaiting approval.`, 'system');
      return false;
    }

    let agentName = currentUser?.name || 'Unknown';
    if (remarks && remarks.includes('Handling Agent:')) {
      const match = remarks.match(/Handling Agent:\s*(.*)$/);
      if (match && match[1]) {
        const inputtedAgent = match[1].trim();
        const branchName = currentUser?.branch || 'Main';
        agentName = `${branchName} — ${inputtedAgent}`;
      }
    }
    const agentId = currentUser?.id;
    const previousArtworks = [...artworks];
    const { updatedArtworks, newSales } = buildBulkSale(
      artworks,
      ids,
      client,
      clientEmail,
      clientContact,
      agentName,
      delivered,
      eventInfo,
      attachments,
      downpayment,
      agentId,
      perArtworkDownpayments,
      isDownpayment,
      discountPercentage,
      remarks
    );
    setArtworks(updatedArtworks);
    setAllArtworksIncludingDeleted(updatedArtworks);
    setSales(prev => [...prev, ...newSales]);
    pushNotification(
      'Bulk Sales Declared',
      `New bulk sale declaration (${newSales.length} items) submitted by ${agentName} for client "${client}". Awaiting approval.`,
      'sales'
    );
    if (IS_DEMO_MODE) return true;

    const processedNewSales = await Promise.all(newSales.map(async (sale) => {
      const itdrUpload = await uploadAttachmentsToStorage(sale.itdrUrl, 'images', 'attachments') as string[] | undefined;
      const rsaUpload = await uploadAttachmentsToStorage(sale.rsaUrl, 'images', 'attachments') as string[] | undefined;
      const orcrUpload = await uploadAttachmentsToStorage(sale.orCrUrl, 'images', 'attachments') as string[] | undefined;
      return { ...sale, itdrUrl: itdrUpload, rsaUrl: rsaUpload, orCrUrl: orcrUpload };
    }));

    const { error: artError } = await supabase.from('artworks').update(mapToSnakeCase({ status: ArtworkStatus.FOR_SALE_APPROVAL })).in('id', ids);
    if (artError) {
      console.error('Bulk Sale Artwork Update Error:', artError);
      setArtworks(previousArtworks);
      setSales(prev => prev.filter(s => !newSales.some(ns => ns.id === s.id)));
      pushNotification('Bulk Sale Failed', 'Could not update artwork status. Sales not recorded.', 'system');
      return false;
    }

    const persistedSales = processedNewSales.map((sale) => ({
      id: sale.id,
      artworkId: sale.artworkId,
      clientName: sale.clientName,
      clientEmail: sale.clientEmail || null,
      clientContact: sale.clientContact || null,
      agentName: sale.agentName,
      agentId: sale.agentId || null,
      saleDate: sale.saleDate,
      deliveryDate: sale.deliveryDate || null,
      isDelivered: !!sale.isDelivered,
      isCancelled: !!sale.isCancelled,
      status: sale.status || null,
      soldAtEventId: sale.soldAtEventId || null,
      soldAtEventName: sale.soldAtEventName || null,
      downpayment: sale.downpayment || 0,
      isDownpayment: !!sale.isDownpayment,
      installments: sale.installments ? JSON.stringify(sale.installments) : '[]',
      artworkSnapshot: sale.artworkSnapshot ? JSON.stringify(sale.artworkSnapshot) : null,
      itdrUrl: sale.itdrUrl && sale.itdrUrl.length > 0 ? JSON.stringify(sale.itdrUrl) : null,
      rsaUrl: sale.rsaUrl && sale.rsaUrl.length > 0 ? JSON.stringify(sale.rsaUrl) : null,
      orCrUrl: sale.orCrUrl && sale.orCrUrl.length > 0 ? JSON.stringify(sale.orCrUrl) : null,
    }));
    
    const { error: saleError } = await supabase.from('sales').insert(mapToSnakeCase(persistedSales));
    if (saleError) {
      console.error('Bulk Sale Record Error:', saleError);
      setArtworks(previousArtworks);
      setSales(prev => prev.filter(s => !newSales.some(ns => ns.id === s.id)));
      
      // Revert database status of artworks back to their previous status
      await Promise.all(ids.map(async (id) => {
        const prevArt = previousArtworks.find(a => String(a.id) === String(id));
        if (prevArt) {
          await supabase.from('artworks').update(mapToSnakeCase({
            status: prevArt.status,
            soldAtBranch: prevArt.soldAtBranch ?? null,
            reservedForEventId: prevArt.reservedForEventId ?? null,
            reservedForEventName: prevArt.reservedForEventName ?? null,
            remarks: prevArt.remarks ?? null
          })).eq('id', id);
        }
      }));

      pushNotification('Bulk Sale Record Failed', 'Artwork statuses updated but sales records failed.', 'system');
      return false;
    }
  };

  const handleCancelSale = async (artworkId: string) => {
    if (!window.confirm('Cancel this sale?')) return;
    const { updatedArtworks, updatedSales } = applyCancelSale(artworks, sales, artworkId);
    setArtworks(updatedArtworks);
    setAllArtworksIncludingDeleted(updatedArtworks);
    setSales(updatedSales);
    const sale = updatedSales.find(s => String(s.artworkId) === String(artworkId) && s.isCancelled);

    const art = updatedArtworks.find(a => String(a.id) === String(artworkId));
    logActivity(artworkId, 'Sale Cancelled', `Sale to ${sale?.clientName || 'Unknown'} was cancelled`, art);

    pushNotification(
      'Sale Cancelled',
      `Sale order for artwork "${art?.title || 'Unknown'}" has been cancelled.`,
      'sales',
      artworkId
    );

    if (IS_DEMO_MODE) return true;
    if (!sale) return false;
    await supabase.from('artworks').update(mapToSnakeCase({ status: ArtworkStatus.AVAILABLE })).eq('id', artworkId);
    await supabase.from('sales').update(mapToSnakeCase({ isCancelled: true })).eq('id', sale.id);
  };

  const handleDeleteSaleRecord = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return false;

    const artworkTitle = sale.artworkSnapshot?.title || findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted)?.title || 'this sale record';
    if (!window.confirm(`Delete the sale record for "${artworkTitle}"? This removes it from the sales dashboard only.`)) {
      return false;
    }

    const previousSales = sales;
    setSales(prev => prev.filter(s => String(s.id) !== String(saleId)));
    logActivity(
      sale.artworkId,
      'Sale Record Deleted',
      `Removed sale record for ${sale.clientName}`,
      findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted)
    );

    if (IS_DEMO_MODE) return true;

    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    if (error) {
      console.error('Delete Sale Record Error:', error);
      setSales(previousSales);
      pushNotification('Delete Failed', 'The sale record could not be removed.', 'system');
      return false;
    }

    return true;
  };

  const handleBulkDeletePayments = async (items: { saleId: string, paymentId: string }[]) => {
    if (!window.confirm(`Are you sure you want to permanently delete the selected payment record(s)?`)) {
      return false;
    }

    const previousSales = sales;
    let updatedSalesList = [...sales];

    for (const item of items) {
      const sale = updatedSalesList.find(s => s.id === item.saleId);
      if (!sale) continue;

      let updatedSale: SaleRecord = { ...sale };
      const isDownpayment = item.paymentId === 'downpayment' || item.paymentId.endsWith('-dp');

      if (isDownpayment) {
        updatedSale.downpayment = undefined;
        updatedSale.downpaymentRecordedAt = undefined;
        updatedSale.pendingDownpaymentEdit = undefined;
      } else {
        if (sale.installments) {
          updatedSale.installments = sale.installments.map(inst => {
            if (inst.id === item.paymentId) {
              if (inst.isPending) {
                return null;
              }
              if (inst.pendingEdit) {
                return { ...inst, pendingEdit: undefined };
              }
              return null;
            }
            return inst;
          }).filter((inst): inst is InstallmentRecord => inst !== null);
        }
      }

      updatedSalesList = updatedSalesList.map(s => s.id === item.saleId ? updatedSale : s);
    }

    setSales(updatedSalesList);

    if (IS_DEMO_MODE) return true;

    try {
      const uniqueSaleIds = Array.from(new Set(items.map(i => i.saleId)));
      for (const saleId of uniqueSaleIds) {
        const updatedSale = updatedSalesList.find(s => s.id === saleId);
        if (updatedSale) {
          const { error } = await supabase.from('sales').update(mapToSnakeCase({
            downpayment: updatedSale.downpayment ?? null,
            downpaymentRecordedAt: updatedSale.downpaymentRecordedAt ?? null,
            pendingDownpaymentEdit: updatedSale.pendingDownpaymentEdit ?? null,
            installments: updatedSale.installments ?? null
          })).eq('id', saleId);

          if (error) throw error;
        }
      }
      return true;
    } catch (error: any) {
      console.error('Error deleting payments:', error);
      setSales(previousSales);
      pushNotification('Delete Failed', 'The payment record(s) could not be removed.', 'system');
      return false;
    }
  };


  const handleApproveSale = async (saleId: string, remarks?: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const previousSales = sales;
    const previousArtworks = artworks;
    const art = artworks.find(a => String(a.id) === String(sale.artworkId));

    setImportStatus({
      isVisible: true,
      title: 'Approving Sale',
      message: `Finalizing sale for "${sale.clientName}"...`,
      progress: { current: 0, total: 100 }
    });

    try {
      const isDelivered = sale.isDelivered;
      const siblingPendingSales = getPendingSalesForArtwork(sale.artworkId, sales).filter(s => s.id !== saleId);
      const siblingPendingSaleIds = siblingPendingSales.map(s => s.id);

      const updatedSale = {
        ...sale,
        status: SaleStatus.APPROVED,
        requestedAttachments: undefined,
        declineReason: undefined
      };
      setSales(prev => prev.map(s => {
        if (String(s.id) === String(saleId)) return updatedSale;
        if (siblingPendingSaleIds.map(String).includes(String(s.id))) return { ...s, status: SaleStatus.DECLINED };
        return s;
      }));

      const updatedStatus = isDelivered ? ArtworkStatus.DELIVERED : ArtworkStatus.SOLD;
      setArtworks(prev => prev.map(a => String(a.id) === String(sale.artworkId) ? {
        ...a,
        status: updatedStatus,
        itdrImageUrl: (Array.isArray(sale.itdrUrl) ? sale.itdrUrl[0] : sale.itdrUrl) || a.itdrImageUrl,
        rsaImageUrl: (Array.isArray(sale.rsaUrl) ? sale.rsaUrl[0] : sale.rsaUrl) || a.rsaImageUrl,
        orCrImageUrl: (Array.isArray(sale.orCrUrl) ? sale.orCrUrl[0] : sale.orCrUrl) || a.orCrImageUrl
      } : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(sale.artworkId) ? {
        ...a,
        status: updatedStatus,
        itdrImageUrl: (Array.isArray(sale.itdrUrl) ? sale.itdrUrl[0] : sale.itdrUrl) || a.itdrImageUrl,
        rsaImageUrl: (Array.isArray(sale.rsaUrl) ? sale.rsaUrl[0] : sale.rsaUrl) || a.rsaImageUrl,
        orCrImageUrl: (Array.isArray(sale.orCrUrl) ? sale.orCrUrl[0] : sale.orCrUrl) || a.orCrImageUrl
      } : a));

      setImportStatus(prev => ({ ...prev, progress: { current: 50, total: 100 } }));

      if (!IS_DEMO_MODE) {
        const { error: saleError } = await supabase.from('sales').update(mapToSnakeCase({
          status: SaleStatus.APPROVED,
          requestedAttachments: null,
          declineReason: null
        })).eq('id', saleId);
        if (saleError) throw saleError;

        if (siblingPendingSaleIds.length > 0) {
          const { error: siblingsError } = await supabase.from('sales').update(mapToSnakeCase({ status: SaleStatus.DECLINED })).in('id', siblingPendingSaleIds);
          if (siblingsError) throw siblingsError;
        }

        const success = await syncArtwork({
          id: sale.artworkId,
          updates: {
            status: updatedStatus,
            itdrImageUrl: Array.isArray(sale.itdrUrl) ? sale.itdrUrl[0] : sale.itdrUrl,
            rsaImageUrl: Array.isArray(sale.rsaUrl) ? sale.rsaUrl[0] : sale.rsaUrl,
            orCrImageUrl: Array.isArray(sale.orCrUrl) ? sale.orCrUrl[0] : sale.orCrUrl
          },
          expectedStatus: [ArtworkStatus.FOR_SALE_APPROVAL, ArtworkStatus.AVAILABLE],
          setArtworks,
          setAllArtworksIncludingDeleted,
          pushNotification
        });

        if (!success) throw new Error('Artwork status sync failed. It may have been updated by another process.');
      }

      logActivity(sale.artworkId, 'Sale Approved', `Invoice finalized.${remarks ? ` Remarks: ${remarks}` : ''}`, art);
      setImportStatus(prev => ({ ...prev, message: 'Sale approved successfully!', progress: { current: 100, total: 100 } }));

      if (!isDelivered) {
        pushNotification('Action Required', `Sale for "${sale.clientName}" approved. Please schedule delivery in the Logistics > Pending tab.`, 'system', sale.artworkId);
      }

      return true;
    } catch (error: any) {
      console.error('Approve Sale Error:', error);
      setSales(previousSales);
      setArtworks(previousArtworks);
      pushNotification('Approval Failed', error.message || 'Could not complete the approval process.', 'system');
      return false;
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 800);
    }
  };

  const handleDeclineSale = async (saleId: string, reason?: string, requestedFiles?: string[], remarks?: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const previousSales = sales;
    const previousArtworks = artworks;

    setImportStatus({
      isVisible: true,
      title: 'Declining Sale',
      message: `Syncing decline for "${sale.clientName}"...`,
      progress: { current: 0, total: 100 }
    });

    try {
      const otherPendingSales = getPendingSalesForArtwork(sale.artworkId, sales).filter(s => s.id !== saleId);
      const artworkShouldBeAvailable = otherPendingSales.length === 0;

      setSales(prev => prev.map(s =>
        String(s.id) === String(saleId)
          ? { ...s, status: SaleStatus.DECLINED, declineReason: reason, requestedAttachments: requestedFiles as any }
          : s
      ));

      if (artworkShouldBeAvailable) {
        setArtworks(prev => prev.map(a => String(a.id) === String(sale.artworkId) ? { ...a, status: ArtworkStatus.AVAILABLE } : a));
        setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(sale.artworkId) ? { ...a, status: ArtworkStatus.AVAILABLE } : a));
      }

      setImportStatus(prev => ({ ...prev, progress: { current: 50, total: 100 } }));

      if (!IS_DEMO_MODE) {
        const { error: saleError } = await supabase
          .from('sales')
          .update(mapToSnakeCase({
            status: SaleStatus.DECLINED,
            declineReason: reason,
            requestedAttachments: requestedFiles
          }))
          .eq('id', saleId);

        if (saleError) throw saleError;

        if (artworkShouldBeAvailable) {
          const success = await syncArtwork({
            id: sale.artworkId,
            updates: { status: ArtworkStatus.AVAILABLE },
            expectedStatus: ArtworkStatus.FOR_SALE_APPROVAL,
            setArtworks,
            setAllArtworksIncludingDeleted,
            pushNotification
          });

          if (!success) {
            console.warn('[handleDeclineSale] Artwork status sync skipped or failed (possibly already updated).');
          }
        }

        await sendDeclineFeedbackToAgent(sale, reason, requestedFiles);
      }

      logActivity(sale.artworkId, 'Sale Declined', `Reason: ${reason || 'No reason provided'}.${remarks ? ` Remarks: ${remarks}` : ''}`, findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted));
      setImportStatus(prev => ({ ...prev, message: 'Sale declined successfully.', progress: { current: 100, total: 100 } }));
      return true;
    } catch (error: any) {
      console.error('[handleDeclineSale] CRITICAL ERROR:', error);
      setSales(previousSales);
      setArtworks(previousArtworks);
      pushNotification('Decline Failed', error.message || 'Could not sync decline status.', 'system');
      return false;
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 800);
    }
  };

  const handleDeclineSaleWithMessaging = async (saleId: string, reason?: string, requestedFiles?: string[], remarks?: string) => {
    return handleDeclineSale(saleId, reason, requestedFiles, remarks);
  };

  const handleAddInstallment = async (saleId: string, amount: number, date: string, reference?: string, attachments?: string[], remarks?: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    setImportStatus({
      isVisible: true,
      title: 'Recording Payment',
      message: `Adding payment of ₱${amount.toLocaleString()}...`,
      progress: { current: 0, total: 100 }
    });

    try {
      const installment: InstallmentRecord = {
        id: generateId(),
        amount,
        date,
        recordedBy: currentUser?.name || 'Unknown',
        reference,
        createdAt: new Date().toISOString(),
        attachmentUrls: attachments || [],
        isPending: true
      };

      const updatedInstallments = [...(sale.installments || []), installment];
      const updatedSale = { ...sale, installments: updatedInstallments };

      setSales(prev => prev.map(s => String(s.id) === String(saleId) ? updatedSale : s));
      setImportStatus(prev => ({ ...prev, progress: { current: 50, total: 100 } }));

      if (!IS_DEMO_MODE) {
        const { error } = await supabase
          .from('sales')
          .update(mapToSnakeCase({ installments: updatedInstallments }))
          .eq('id', saleId);

        if (error) throw error;
      }

      setImportStatus(prev => ({ ...prev, progress: { current: 100, total: 100 }, message: 'Payment recorded successfully!' }));

      const totalPaid = (sale.downpayment || 0) + (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0);
      const newAmount = totalPaid + amount;
      logActivity(sale.artworkId, 'Payment Verified', `Amount: ${newAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}. Remarks: ${remarks}`, findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted));

      setTimeout(() => setImportStatus({ isVisible: false }), 800);
      pushNotification('Payment Recorded', `₱${amount.toLocaleString()} has been added to the payment history for ${sale.clientName}.`, 'system');

    } catch (err: any) {
      console.error('Error recording installment:', err);
      setSales(prev => prev.map(s => String(s.id) === String(saleId) ? sale : s));
      setImportStatus({ isVisible: false });
      pushNotification('Payment Failed', `Could not record payment: ${err.message}`, 'system');
    }
  };

  const handleEditPayment = async (saleId: string, paymentId: string, updates: { amount: number; date?: string; reference?: string; attachmentUrls?: string[] }) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const isDownpayment = paymentId === 'downpayment';
    const createdAt = isDownpayment ? sale.downpaymentRecordedAt : (sale.installments?.find(i => i.id === paymentId)?.createdAt);
    const isNew = createdAt && (new Date().getTime() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000);
    const isAdmin = userRole === UserRole.ADMIN;

    const art = findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted);
    const totalOthers = isDownpayment
      ? (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)
      : (sale.downpayment || 0) + (sale.installments || []).filter(i => i.id !== paymentId && !i.isPending).reduce((sum, inst) => sum + inst.amount, 0);
    const isOverpayment = (totalOthers + updates.amount) > (art?.price || 0) + 0.01;

    if ((isNew && !isOverpayment) || isAdmin) {
      let updatedSale: SaleRecord;

      if (isDownpayment) {
        updatedSale = { ...sale, downpayment: updates.amount };
      } else {
        const updatedInstallments = (sale.installments || []).map(i =>
          i.id === paymentId ? { 
            ...i, 
            amount: updates.amount, 
            date: updates.date || i.date, 
            reference: updates.reference || i.reference,
            attachmentUrls: updates.attachmentUrls || i.attachmentUrls
          } : i
        );
        updatedSale = { ...sale, installments: updatedInstallments };
      }

      setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
      logActivity(sale.artworkId, 'Payment Edited', `Updated ${isDownpayment ? 'downpayment' : 'installment'} to ₱${updates.amount.toLocaleString()}`, findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted));

      try {
        if (!IS_DEMO_MODE) {
          const { error } = await supabase.from('sales').update(mapToSnakeCase({
            downpayment: updatedSale.downpayment,
            installments: updatedSale.installments
          })).eq('id', saleId);

          if (error) throw error;
        }
      } catch (error: any) {
        alert(`Database Error (Edit Payment): ${error.message}`);
        setSales(prev => prev.map(s => s.id === saleId ? sale : s));
        return;
      }
    } else {
      const previousSales = sales;
      let updatedSale: SaleRecord;

      const pendingEdit = {
        amount: updates.amount,
        date: updates.date || '',
        reference: updates.reference || '',
        requestedAt: new Date().toISOString(),
        requestedBy: currentUser?.name || 'Unknown',
        status: 'Pending' as const,
        attachmentUrls: updates.attachmentUrls
      };

      if (isDownpayment) {
        updatedSale = { ...sale, pendingDownpaymentEdit: pendingEdit };
      } else {
        const updatedInstallments = (sale.installments || []).map(i =>
          i.id === paymentId ? { ...i, pendingEdit } : i
        );
        updatedSale = { ...sale, installments: updatedInstallments };
      }

      setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
      pushNotification('Edit Requested', 'Change submitted for admin approval.', 'system');

      try {
        if (!IS_DEMO_MODE) {
          const { error } = await supabase.from('sales').update(mapToSnakeCase({
            pendingDownpaymentEdit: updatedSale.pendingDownpaymentEdit,
            installments: updatedSale.installments
          })).eq('id', saleId);

          if (error) throw error;
        }
      } catch (error: any) {
        alert(`Database Error (Request Payment Edit): ${error.message}`);
        setSales(previousSales);
        return;
      }
    }
  };

  const handleApprovePaymentEdit = async (saleId: string, paymentId: string, remarks?: string) => {
    if (userRole !== UserRole.ADMIN) return;
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    let updatedSale: SaleRecord;
    const isDownpayment = paymentId === 'downpayment';

    if (isDownpayment && sale.pendingDownpaymentEdit) {
      updatedSale = {
        ...sale,
        downpayment: sale.pendingDownpaymentEdit.amount,
        pendingDownpaymentEdit: undefined
      };
    } else {
      const updatedInstallments = (sale.installments || []).map(i => {
        if (i.id === paymentId) {
          if (i.isPending) return { ...i, isPending: false };
          if (i.pendingEdit) {
            return {
              ...i,
              amount: i.pendingEdit.amount,
              date: i.pendingEdit.date || i.date,
              reference: i.pendingEdit.reference || i.reference,
              pendingEdit: undefined
            };
          }
        }
        return i;
      });
      updatedSale = { ...sale, installments: updatedInstallments };
    }

    setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
    const installment = !isDownpayment ? (sale.installments || []).find(i => i.id === paymentId) : null;
    const logType = (installment?.isPending) ? 'Payment Accepted' : 'Payment Edit Approved';
    const logMsg = installment?.isPending 
      ? `Approved ₱${installment.amount.toLocaleString()} payment`
      : `Approved edit for ${isDownpayment ? 'downpayment' : 'installment'}`;

    logActivity(sale.artworkId, logType, `${logMsg}.${remarks ? ` Remarks: ${remarks}` : ''}`, findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted));

    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('sales').update(mapToSnakeCase({
          downpayment: updatedSale.downpayment,
          pendingDownpaymentEdit: null,
          installments: updatedSale.installments
        })).eq('id', saleId);

        if (error) throw error;
      }
    } catch (error: any) {
      alert(`Database Error (Approve Payment): ${error.message}`);
      setSales(prev => prev.map(s => s.id === saleId ? sale : s));
      return;
    }
  };

  const handleDeclinePaymentEdit = async (saleId: string, paymentId: string, remarks?: string) => {
    if (userRole !== UserRole.ADMIN) return;
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    let updatedSale: SaleRecord;
    const isDownpayment = paymentId === 'downpayment';

    if (isDownpayment) {
      updatedSale = { ...sale, pendingDownpaymentEdit: undefined };
    } else {
      const updatedInstallments = (sale.installments || []).map(i => {
        if (i.id === paymentId) {
          if (i.isPending) {
            return { ...i, isPending: false, isDeclined: true, declinedAt: new Date().toISOString() };
          }
          return { ...i, pendingEdit: undefined };
        }
        return i;
      });
      updatedSale = { ...sale, installments: updatedInstallments };
    }

    const installment = !isDownpayment ? (sale.installments || []).find(i => i.id === paymentId) : null;
    const isNewPaymentDecline = installment?.isPending;
    const logType = isNewPaymentDecline ? 'Payment Declined' : 'Payment Edit Declined';
    const amount = isDownpayment ? (sale.pendingDownpaymentEdit?.amount || 0) : (installment?.pendingEdit?.amount || installment?.amount || 0);
    const logMsg = `${isNewPaymentDecline ? 'Declined' : 'Declined edit for'} ₱${amount.toLocaleString()} ${isDownpayment ? 'downpayment' : 'installment'}`;

    logActivity(sale.artworkId, logType, `${logMsg}.${remarks ? ` Remarks: ${remarks}` : ''}`, findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted));
    setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
    pushNotification('Edit Declined', 'Payment edit request has been declined.', 'system');

    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('sales').update(mapToSnakeCase({
          pendingDownpaymentEdit: null,
          installments: updatedSale.installments
        })).eq('id', saleId);

        if (error) throw error;
      }
    } catch (error: any) {
      alert(`Database Error (Decline Payment): ${error.message}`);
      setSales(prev => prev.map(s => s.id === saleId ? sale : s));
      return;
    }
  };

  const handleUpdateSale = async (saleId: string, updates: Partial<SaleRecord>) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return false;

    setSales(prev => prev.map(s => s.id === saleId ? { ...s, ...updates } : s));
    
    if (IS_DEMO_MODE) return true;

    try {
      const { error } = await supabase
        .from('sales')
        .update(mapToSnakeCase(updates))
        .eq('id', saleId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update Sale Error:', error);
      pushNotification('Update Failed', 'Sale record could not be updated.', 'system');
      return false;
    }
  };

  const handleDispatch = async (artworkId: string, remarks?: string) => {
    const sale = sales.find(s => String(s.artworkId) === String(artworkId) && !s.isCancelled);
    if (!sale) return false;

    const { updatedSales } = applyDispatch(sales, artworkId, currentUser?.name || 'Logistics');
    setSales(updatedSales);
    
    const art = artworks.find(a => String(a.id) === String(artworkId));
    logActivity(artworkId, 'Dispatched', `Item is out for delivery to ${sale.clientName}.${remarks ? ` Remarks: ${remarks}` : ''}`, art);

    if (IS_DEMO_MODE) return true;

    try {
      const updatedSale = updatedSales.find(s => s.id === sale.id);
      if (updatedSale) {
        const { error } = await supabase
          .from('sales')
          .update(mapToSnakeCase({
            deliveryRequest: updatedSale.deliveryRequest
          }))
          .eq('id', sale.id);
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Dispatch Error:', error);
      pushNotification('Dispatch Failed', 'Could not record dispatch event.', 'system');
      return false;
    }
  };

  const handleApproveDeliveryRequest = async (saleId: string, remarks?: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || !sale.deliveryRequest) return false;

    const nowStr = new Date().toISOString();
    const updatedRequest: DeliveryRequest = {
      ...sale.deliveryRequest,
      status: DeliveryRequestStatus.DISPATCHED,
      approvedAt: nowStr,
      approvedBy: currentUser?.name || 'Admin',
      dispatchedAt: nowStr,
      dispatchedBy: currentUser?.name || 'Admin'
    };

    const success = await handleUpdateSale(saleId, { deliveryRequest: updatedRequest });
    
    if (success) {
      const art = artworks.find(a => String(a.id) === String(sale.artworkId));
      logActivity(sale.artworkId, 'Dispatched', `Delivery request approved. Item is out for delivery to ${sale.clientName}.${remarks ? ` Remarks: ${remarks}` : ''}`, art);
    }

    return success;
  };


  const handleDeclineDeliveryRequest = async (saleId: string, reason: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || !sale.deliveryRequest) return false;

    const updatedRequest: DeliveryRequest = {
      ...sale.deliveryRequest,
      status: DeliveryRequestStatus.DECLINED,
      declineReason: reason
    };

    const success = await handleUpdateSale(saleId, { deliveryRequest: updatedRequest });
    if (!success) return false;

    logActivity(
      sale.artworkId, 
      'Delivery Request Declined', 
      `The delivery request was declined. Reason: ${reason}`,
      findArtwork(sale.artworkId, artworks, allArtworksIncludingDeleted)
    );
    return true;
  };

  const handleDeliver = async (id: string, itdr: string | string[] = '', rsa: string | string[] = '', orcr: string | string[] = '', carrier?: string, referenceNumber?: string, remarks?: string) => {
    const serializeAttachmentLocal = (val: string | string[] | undefined | null): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.length > 0 ? JSON.stringify(val) : '';
      return val;
    };

    const secureItdrArr = await uploadAttachmentsToStorage(itdr, 'images', 'attachments');
    const secureRsaArr = await uploadAttachmentsToStorage(rsa, 'images', 'attachments');
    const secureOrcrArr = await uploadAttachmentsToStorage(orcr, 'images', 'attachments');

    const itdrStrFinal = serializeAttachmentLocal(secureItdrArr);
    const rsaStrFinal = serializeAttachmentLocal(secureRsaArr);
    const orcrStrFinal = serializeAttachmentLocal(secureOrcrArr);

    const { updatedArtworks, updatedSales } = applyDelivery(artworks, sales, id, itdrStrFinal, rsaStrFinal, orcrStrFinal, carrier, referenceNumber);
    setArtworks(updatedArtworks);
    setSales(updatedSales);
    const art = updatedArtworks.find(a => String(a.id) === String(id));
    const sale = updatedSales.find(s => String(s.artworkId) === String(id));
    
    if (art) {
      logActivity(id, 'Delivered', `Artwork delivered to ${sale?.clientName || 'Client'}. ${carrier ? `Carrier: ${carrier}. ` : ''}${referenceNumber ? `Ref: ${referenceNumber}.` : ''}${remarks ? ` Remarks: ${remarks}` : ''}`, art);
    }
    if (IS_DEMO_MODE) return true;
    if (!art || !sale) {
      console.error('handleDeliver: Artwork or Sale not found.', { id, art, sale });
      alert(`Delivery Error: Could not find artwork or sale record in local state for ID: ${id}`);
      return false;
    }

    try {
      const artRes = await supabase.from('artworks').update(mapToSnakeCase({
        status: art.status,
        itdrImageUrl: itdrStrFinal,
        rsaImageUrl: rsaStrFinal,
        orCrImageUrl: orcrStrFinal
      })).eq('id', id);
      if (artRes.error) throw artRes.error;

      const saleUpdates = {
        isDelivered: true,
        deliveryDate: sale.deliveryDate,
        itdrUrl: sale.itdrUrl,
        rsaUrl: sale.rsaUrl,
        orCrUrl: sale.orCrUrl,
        deliveryRequest: sale.deliveryRequest
      };

      const saleRes = await supabase.from('sales').update(mapToSnakeCase(saleUpdates)).eq('id', sale.id);
      if (saleRes.error) throw saleRes.error;

      return true;
    } catch (err: any) {
      console.error('Failed to update delivery in Supabase:', err);
      alert(`Database Error (Delivery): ${err.message || err}`);
      return false;
    }
  };

  return {
    handleSale,
    handleBulkSale,
    handleCancelSale,
    handleDeleteSaleRecord,
    handleApproveSale,
    handleDeclineSale,
    handleDeclineSaleWithMessaging,
    handleEditPayment,
    handleApprovePaymentEdit,
    handleDeclinePaymentEdit,
    handleAddInstallment,
    handleUpdateSale,
    handleDispatch,
    handleApproveDeliveryRequest,
    handleDeclineDeliveryRequest,
    handleDeliver,
    handleBulkDeletePayments
  };
};
