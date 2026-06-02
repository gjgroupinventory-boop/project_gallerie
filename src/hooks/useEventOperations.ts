import { supabase } from '../supabase';
import { mapToSnakeCase } from '../utils/supabaseUtils';
import {
  ExhibitionEvent, EventStatus, ArtworkStatus, Branch
} from '../types';
import { IS_DEMO_MODE } from '../constants';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { useNotifications } from './useNotifications';

export const useEventOperations = () => {
  const {
    artworks, setArtworks,
    events, setEvents
  } = useData();

  const { pushNotification } = useNotifications();
  const { setImportStatus } = useUI();

  const generateId = () => window.crypto.randomUUID();

  // 1. handleAddEvent
  const handleAddEvent = async (eventData: Partial<ExhibitionEvent>) => {
    setImportStatus({
      isVisible: true,
      title: 'Publishing Event',
      message: `Creating "${eventData.title || 'New Exhibition'}"...`
    });

    try {
      const newEvent: ExhibitionEvent = {
        id: generateId(),
        title: eventData.title || 'New Exhibition',
        location: eventData.location || ('' as Branch),
        startDate: eventData.startDate || new Date().toISOString().split('T')[0],
        endDate: eventData.endDate || new Date().toISOString().split('T')[0],
        status: EventStatus.UPCOMING,
        artworkIds: eventData.artworkIds || [],
        type: eventData.type || 'Exhibition',
        isStrictDuration: eventData.isStrictDuration,
        logoUrl: eventData.logoUrl || ''
      };

      const updatedArtworks = artworks.map(a => {
        if (newEvent.artworkIds.includes(a.id) && a.status !== ArtworkStatus.SOLD) {
          return {
            ...a,
            status: ArtworkStatus.RESERVED,
            reservedForEventId: newEvent.id,
            reservedForEventName: newEvent.title,
            remarks: `Reserved for ${newEvent.type}: ${newEvent.title}`
          };
        }
        return a;
      });

      setEvents(prev => [...prev, newEvent]);
      setArtworks(updatedArtworks);

      if (!IS_DEMO_MODE) {
        const { error: eventError } = await supabase.from('events').insert(mapToSnakeCase(newEvent));
        if (eventError) throw eventError;

        const artworkUpdates = updatedArtworks
          .filter(a => newEvent.artworkIds.includes(a.id))
          .map(a => ({
            id: a.id,
            status: a.status,
            reservedForEventId: a.reservedForEventId,
            reservedForEventName: a.reservedForEventName,
            remarks: a.remarks
          }));

        if (artworkUpdates.length > 0) {
          const { error: artError } = await supabase.from('artworks').upsert(mapToSnakeCase(artworkUpdates));
          if (artError) throw artError;
        }
      }
      pushNotification('Event Published', newEvent.title, 'system');
    } catch (error) {
      console.error('Add Event Error:', error);
      pushNotification('Error Publishing Event', 'Could not save to database.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  // 2. handleUpdateEvent
  const handleUpdateEvent = async (id: string, updates: Partial<ExhibitionEvent>) => {
    const existing = events.find(e => e.id === id);
    if (!existing) return;

    setImportStatus({
      isVisible: true,
      title: 'Updating Event',
      message: `Saving changes for "${existing.title}"...`
    });

    try {
      const updatedEvent = { ...existing, ...updates };

      const addedIds = (updates.artworkIds || []).filter(x => !(existing.artworkIds || []).includes(x));
      const removedIds = (existing.artworkIds || []).filter(x => !(updates.artworkIds || []).includes(x));

      const updatedArtworks = artworks.map(a => {
        if (addedIds.includes(a.id) && a.status !== ArtworkStatus.SOLD) {
          return {
              ...a,
              status: ArtworkStatus.RESERVED,
              reservedForEventId: id,
              reservedForEventName: updatedEvent.title,
              remarks: `Reserved for ${updatedEvent.type}: ${updatedEvent.title}`
          };
        }
        if (removedIds.includes(a.id) && a.reservedForEventId === id) {
          return {
              ...a,
              status: ArtworkStatus.AVAILABLE,
              reservedForEventId: undefined,
              reservedForEventName: undefined,
              remarks: ''
          };
        }
        return a;
      });

      setEvents(prev => prev.map(e => e.id === id ? updatedEvent : e));
      setArtworks(updatedArtworks);

      if (!IS_DEMO_MODE) {
        const { error: eventError } = await supabase.from('events').update(mapToSnakeCase(updates)).eq('id', id);
        if (eventError) throw eventError;

        const artworkUpdates = updatedArtworks
          .filter(a => addedIds.includes(a.id) || removedIds.includes(a.id))
          .map(a => ({
            id: a.id,
            status: a.status,
            reservedForEventId: a.reservedForEventId || null,
            reservedForEventName: a.reservedForEventName || null,
            remarks: a.remarks
          }));

        if (artworkUpdates.length > 0) {
          await supabase.from('artworks').upsert(mapToSnakeCase(artworkUpdates));
        }
      }
    } catch (error) {
      console.error('Update Event Error:', error);
      pushNotification('Update Failed', 'Changes could not be synced.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  // 3. handleDeleteEvent
  const handleDeleteEvent = async (id: string) => {
    const event = events.find(e => e.id === id);
    if (!event || !window.confirm(`Are you sure you want to delete event "${event.title}"?`)) return;

    setImportStatus({
      isVisible: true,
      title: 'Deleting Event',
      message: `Removing "${event.title}" from database...`
    });

    try {
      if (!IS_DEMO_MODE) {
        const { data, error } = await supabase.from('events').delete().eq('id', id).select();
        if (error) throw error;

        if (!data || data.length === 0) {
            const msg = `Deletion was silently blocked by the database. This usually means Row Level Security (RLS) policies on the 'events' table are missing a DELETE policy. Please check Supabase dashboard.`;
            console.error('RLS BLOCK:', msg);
            alert(msg);
            throw new Error(msg);
        }
      }
      setEvents(prev => prev.filter(e => e.id !== id));
      pushNotification('Event Removed', event.title, 'system');
    } catch (error) {
      console.error('Delete Event Error:', error);
      pushNotification('Error Removing Event', 'Record could not be deleted.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  return {
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent
  };
};
