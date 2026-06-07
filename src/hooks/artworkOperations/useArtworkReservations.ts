import { supabase } from '../../supabase';
import { mapToSnakeCase } from '../../utils/supabaseUtils';
import { Artwork, ArtworkStatus, Branch } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../useNotifications';
import { useActivityLogs } from '../useActivityLogs';
import { findArtwork, syncArtwork } from './shared';

export const useArtworkReservations = () => {
  const {
    artworks, setArtworks,
    allArtworksIncludingDeleted, setAllArtworksIncludingDeleted
  } = useData();

  const { pushNotification } = useNotifications();
  const { logActivity } = useActivityLogs();

  const handleReserveArtwork = async (id: string, details: string, expiryDate?: string, reservedForEventId?: string, reservedForEventName?: string, remarks?: string) => {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const updates = { status: ArtworkStatus.RESERVED, remarks: remarks ? `${details} | Notes: ${remarks}` : details, reservationExpiry: expiryDate, reservedForEventId, reservedForEventName };
    const updated = { ...art, ...updates };
    setArtworks(prev => prev.map(a => String(a.id) === String(id) ? updated : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? updated : a));
    logActivity(id, 'Reserved', details, updated);
    const success = await syncArtwork({
      id,
      updates,
      expectedStatus: ArtworkStatus.AVAILABLE,
      setArtworks,
      setAllArtworksIncludingDeleted,
      pushNotification
    });
    if (!success) {
      setArtworks(prev => prev.map(a => String(a.id) === String(id) ? art : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? art : a));
      return false;
    }

    if (reservedForEventId) {
      pushNotification(
        'Artwork Reserved for Exhibit',
        `Artwork "${art.title}" (${art.code}) has been reserved for exhibit "${reservedForEventName}".`,
        'inventory',
        id
      );
    } else {
      pushNotification(
        'Artwork Reserved',
        `Artwork "${art.title}" (${art.code}) has been reserved for client. Remarks: ${details}`,
        'inventory',
        id
      );
    }

    return true;
  };

  const handleBulkReserve = async (ids: string[], details: string, expiryDate?: string, reservedForEventId?: string, reservedForEventName?: string) => {
    const updates = { status: ArtworkStatus.RESERVED, remarks: details, reservationExpiry: expiryDate, reservedForEventId, reservedForEventName };
    const targetIds = ids.map(String);
    setArtworks(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    if (reservedForEventId) {
      pushNotification('Bulk Artwork Reserved for Exhibit', `${ids.length} artworks reserved for exhibit "${reservedForEventName}".`, 'inventory');
    } else {
      pushNotification('Bulk Artwork Reserved', `${ids.length} artworks reserved for client.`, 'inventory');
    }
    if (IS_DEMO_MODE) return true;
    await supabase.from('artworks').update(mapToSnakeCase(updates)).in('id', ids);
    return true;
  };

  const handleCancelReservation = async (id: string) => {
    const art = artworks.find(a => String(a.id) === String(id));
    if (!art) return;
    const updates = {
      status: ArtworkStatus.AVAILABLE,
      remarks: '',
      reservationExpiry: undefined,
      reservedForEventId: undefined,
      reservedForEventName: undefined
    };
    setArtworks(prev => prev.map(a => String(a.id) === String(id) ? { ...a, ...updates } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? { ...a, ...updates } : a));
    logActivity(id, 'Reservation Cancelled', '', { ...art, ...updates });
    const success = await syncArtwork({
      id,
      updates,
      expectedStatus: ArtworkStatus.RESERVED,
      setArtworks,
      setAllArtworksIncludingDeleted,
      pushNotification
    });
    if (!success) {
      setArtworks(prev => prev.map(a => String(a.id) === String(id) ? art : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? art : a));
      return false;
    }

    pushNotification(
      'Reservation Cancelled',
      `Reservation for artwork "${art.title}" (${art.code}) has been cancelled.`,
      'inventory',
      id
    );

    return true;
  };

  const handleBulkCancelReservation = async (ids: string[]) => {
    const updates = {
      status: ArtworkStatus.AVAILABLE,
      remarks: '',
      reservationExpiry: undefined,
      reservedForEventId: undefined,
      reservedForEventName: undefined
    };
    const targetIds = ids.map(String);
    setArtworks(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    
    pushNotification(
      'Bulk Reservations Cancelled',
      `${ids.length} artwork reservation(s) have been cancelled.`,
      'inventory'
    );

    if (IS_DEMO_MODE) return true;
    await supabase.from('artworks').update(mapToSnakeCase(updates)).in('id', ids);
    return true;
  };

  const handleAddToAuction = async (ids: string[], auctionId: string, auctionName: string, remarks?: string) => {
    const updates = {
      status: ArtworkStatus.RESERVED,
      remarks: remarks ? `[Auction: ${auctionName}] ${remarks}` : `[Reserved For Auction: ${auctionName}]`,
      reservedForEventId: auctionId,
      reservedForEventName: auctionName,
      currentBranch: 'Auction' as Branch,
      updatedAt: new Date().toISOString()
    };

    const targetIds = ids.map(String);
    setArtworks(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));

    pushNotification(
      'Sent to Auction',
      `${ids.length} artwork(s) have been assigned to auction "${auctionName}".`,
      'inventory'
    );
    if (IS_DEMO_MODE) return true;

    try {
      const { error: artError } = await supabase
        .from('artworks')
        .update(mapToSnakeCase(updates))
        .in('id', ids)
        .in('status', [ArtworkStatus.AVAILABLE, ArtworkStatus.RESERVED]);

      if (artError) throw artError;

      ids.forEach(id => {
        logActivity(id, 'Auction Registered', `Assigned to ${auctionName}. Remarks: ${remarks}`, findArtwork(id, artworks, allArtworksIncludingDeleted));
      });

      return true;
    } catch (error) {
      console.error('Auction Registration Error:', error);
      return false;
    }
  };

  return {
    handleReserveArtwork,
    handleBulkReserve,
    handleCancelReservation,
    handleBulkCancelReservation,
    handleAddToAuction
  };
};
