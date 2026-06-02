import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ExhibitionEvent, EventStatus, Artwork, Branch, ArtworkStatus, UserPermissions } from '../types';
import { ICONS } from '../constants';
import { MapPin, Calendar, Layers, X, Palette, Upload } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { compressBase64Image } from '../services/imageService';
import { uploadBase64ToStorage } from '../services/supabaseStorageService';

interface EventManagementProps {
  events: ExhibitionEvent[];
  artworks: Artwork[];
  branches: string[];
  onAddEvent: (event: Partial<ExhibitionEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (id: string, updates: Partial<ExhibitionEvent>) => void;
  onViewArt?: (id: string) => void;
  canEdit?: boolean;
  permissions?: UserPermissions;
}

const EventManagement: React.FC<EventManagementProps> = ({ 
  events = [], 
  artworks = [], 
  onAddEvent, 
  onDeleteEvent, 
  onUpdateEvent, 
  onViewArt, 
  canEdit = true, 
  permissions 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<ExhibitionEvent | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'RESERVED' | 'SOLD' | 'AVAILABLE'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<Partial<ExhibitionEvent>>({
    title: '',
    location: '' as Branch,
    startDate: '',
    endDate: '',
    status: EventStatus.UPCOMING,
    artworkIds: [],
    isTimeless: false
  });

  // Artwork Selection Filters
  const [artworkSearch, setArtworkSearch] = useState('');
  const [artworkMediumFilter, setArtworkMediumFilter] = useState('ALL');
  const [artworkArtistFilter, setArtworkArtistFilter] = useState('ALL');

  const permittedArtworks = useMemo(() => {
    return artworks.filter(art => {
      // Filter out invalid/ghost artworks
      if (!art.id || !art.title) return false;

      // View Control Permissions
      const canViewReserved = permissions?.canViewReserved ?? true;
      const canViewAuctioned = permissions?.canViewAuctioned ?? true;
      const canViewExhibit = permissions?.canViewExhibit ?? true;
      const canViewForFraming = permissions?.canViewForFraming ?? true;
      const canViewBackToArtist = permissions?.canViewBackToArtist ?? true;

      if (art.status === ArtworkStatus.RESERVED) {
        const isAuction = (art.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (art.remarks || '').includes('[Reserved For Event:');

        if (isAuction) {
          if (!canViewAuctioned) return false;
        } else if (isEvent) {
          if (!canViewExhibit) return false;
        } else {
          if (!canViewReserved) return false;
        }
      } else if (art.status === ArtworkStatus.FOR_FRAMING) {
        if (!canViewForFraming) return false;
      } else if (art.status === ArtworkStatus.FOR_RETOUCH) {
        if (!canViewBackToArtist) return false;
      }
      return true;
    });
  }, [artworks, permissions]);

  const availableArtworks = useMemo(() =>
    permittedArtworks.filter(art => art.status === ArtworkStatus.AVAILABLE || formData.artworkIds?.includes(art.id)),
    [permittedArtworks, formData.artworkIds]);

  const uniqueArtists = useMemo(() =>
    Array.from(new Set(availableArtworks.map(a => a.artist))).sort(),
    [availableArtworks]);

  const uniqueMedia = useMemo(() =>
    Array.from(new Set(availableArtworks.map(a => a.medium))).sort(),
    [availableArtworks]);

  const filteredSelectionArtworks = availableArtworks.filter(art => {
    const matchesSearch = (
      (art.title || '').toLowerCase().includes(artworkSearch.toLowerCase()) ||
      (art.artist || '').toLowerCase().includes(artworkSearch.toLowerCase()) ||
      (art.code || '').toLowerCase().includes(artworkSearch.toLowerCase())
    );
    const matchesMedium = artworkMediumFilter === 'ALL' || art.medium === artworkMediumFilter;
    const matchesArtist = artworkArtistFilter === 'ALL' || art.artist === artworkArtistFilter;

    return matchesSearch && matchesMedium && matchesArtist;
  });

  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p;
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[m - 1]} ${y}`;
  };

  const handleOpenEdit = (event: ExhibitionEvent) => {
    setEditingId(event.id);
    const derivedArtworkIds = event.artworkIds || artworks.filter(a => a.reservedForEventId === event.id).map(a => a.id);
    setFormData({...event, artworkIds: derivedArtworkIds});
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingId) {
      onUpdateEvent(editingId, formData);
    } else {
      onAddEvent(formData);
    }
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      location: '' as Branch,
      startDate: '',
      endDate: '',
      status: EventStatus.UPCOMING,
      artworkIds: [],
      type: 'Exhibition',
      isTimeless: false,
      logoUrl: ''
    });
  };

  const toggleArtwork = (id: string) => {
    const current = formData.artworkIds || [];
    if (current.includes(id)) {
      setFormData({ ...formData, artworkIds: current.filter(i => i !== id) });
    } else {
      setFormData({ ...formData, artworkIds: [...current, id] });
    }
  };

  const getRemainingTime = (event: ExhibitionEvent) => {
    if (event.isTimeless) return 'Timeless';
    if (!event.endDate) return 'Ongoing';

    const end = new Date(event.endDate);
    end.setHours(23, 59, 59, 999);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m left`;
  };

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const isEventActive = (event: ExhibitionEvent) => {
    if (event.status === EventStatus.RECENT) return false;
    if (event.isTimeless) return true;
    if (event.isStrictDuration && event.endDate) {
      const end = new Date(event.endDate);
      end.setHours(23, 59, 59, 999);
      if (end.getTime() < Date.now()) return false;
    }
    return true;
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const isActive = isEventActive(event);
      return activeTab === 'active' ? isActive : !isActive;
    });
  }, [events, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Event Curator</h1>
          <p className="text-sm text-neutral-500">Plan and curate exhibitions across gallery branches.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center space-x-2 px-6 py-3.5 bg-neutral-900 text-white rounded-md hover:bg-black transition-all shadow-md hover:shadow-lg font-bold transform hover:-translate-y-0.5"
          >
            {ICONS.Add}
            <span>Create Exhibition</span>
          </button>
        )}
      </div>

      <div className="flex space-x-1 bg-neutral-100 p-1 rounded-sm w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-2 rounded-sm text-sm font-bold transition-all ${activeTab === 'active'
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-900'
            }`}
        >
          Active Events
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2 rounded-sm text-sm font-bold transition-all ${activeTab === 'history'
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-900'
            }`}
        >
          Event History
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col group">
            {/* Cover Banner Area */}
            <div className="relative h-28 w-full bg-neutral-100 border-b border-neutral-150 overflow-hidden shrink-0">
              {event.logoUrl ? (
                <img src={event.logoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-neutral-100 to-neutral-200 flex items-center justify-center">
                  <Palette size={24} className="text-neutral-300 animate-pulse" />
                </div>
              )}
              
              {/* Badges Overlay */}
              <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5 z-10">
                <div className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded shadow-sm ${
                  event.status === EventStatus.LIVE ? 'bg-emerald-500 text-white' :
                  event.status === EventStatus.UPCOMING ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                }`}>
                  {event.status}
                </div>
              </div>

              {(event.isTimeless || (event.isStrictDuration && event.status !== EventStatus.RECENT)) && (
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/75 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest rounded z-10">
                  {getRemainingTime(event)}
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-neutral-900 pr-2 leading-snug line-clamp-1">{event.title}</h3>
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide flex flex-wrap items-center gap-2.5 mt-1.5">
                  <div className="flex items-center gap-1">
                    <MapPin size={10} className="text-neutral-400" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={10} className="text-neutral-400" />
                    <span>{event.startDate}</span>
                  </div>
                </div>
              </div>

              <div
                className="space-y-2 cursor-pointer hover:bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-all mb-3"
                onClick={() => {
                  setViewingEvent(event);
                  setFilterStatus('ALL');
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                    <Layers size={10} />
                    Assigned Inventory
                  </p>
                  <span className="text-[11px] font-bold text-neutral-900">
                    {(Array.from(new Set([...(event.artworkIds || []), ...artworks.filter(a => a.reservedForEventId === event.id).map(a => a.id)]))).filter(id => permittedArtworks.some(a => a.id === id)).length} Works
                  </span>
                </div>
                <div className="flex -space-x-1.5 overflow-hidden pl-1">
                  {(Array.from(new Set([...(event.artworkIds || []), ...artworks.filter(a => a.reservedForEventId === event.id).map(a => a.id)])))
                    .filter(id => permittedArtworks.some(a => a.id === id))
                    .slice(0, 5)
                    .map((id) => {
                      const art = permittedArtworks.find(a => a.id === id);
                      return art ? (
                        <OptimizedImage
                          key={id}
                          src={art.imageUrl || undefined}
                          className="inline-block h-7 w-7 rounded-md ring-2 ring-white object-cover cursor-pointer hover:ring-neutral-300 transition-shadow"
                          alt=""
                          onClick={(e) => { e.stopPropagation(); onViewArt?.(art.id); }}
                        />
                      ) : null;
                    })}
                  {(Array.from(new Set([...(event.artworkIds || []), ...artworks.filter(a => a.reservedForEventId === event.id).map(a => a.id)]))).filter(id => permittedArtworks.some(a => a.id === id)).length > 5 && (
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-neutral-100 text-[8px] font-bold text-neutral-500 ring-2 ring-white">
                      +{(Array.from(new Set([...(event.artworkIds || []), ...artworks.filter(a => a.reservedForEventId === event.id).map(a => a.id)]))).filter(id => permittedArtworks.some(a => a.id === id)).length - 5}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex justify-end space-x-1.5">
                {canEdit && (
                  <>
                    <button
                      onClick={() => handleOpenEdit(event)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors border border-transparent hover:border-neutral-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewingEvent && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 md:p-8">
          <div className="bg-white rounded-md w-full max-w-4xl max-h-[82vh] shadow-2xl overflow-hidden flex flex-col relative my-auto animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                {viewingEvent.logoUrl && (
                  <img src={viewingEvent.logoUrl} alt="" className="w-12 h-12 rounded-md object-cover shadow-sm bg-neutral-50" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">{viewingEvent.title}</h3>
                  <p className="text-sm text-neutral-500">Exhibition Inventory ({(Array.from(new Set([...(viewingEvent.artworkIds || []), ...artworks.filter(a => a.reservedForEventId === viewingEvent.id).map(a => a.id)]))).filter(id => permittedArtworks.some(a => a.id === id)).length} items)</p>
                </div>
              </div>
              <button onClick={() => setViewingEvent(null)} className="text-neutral-400 hover:text-neutral-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-8 pt-4 pb-0 flex space-x-2">
              {(['ALL', 'RESERVED', 'SOLD', 'AVAILABLE'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow-md border transform hover:-translate-y-0.5 ${filterStatus === status
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                >
                  {status === 'ALL' ? 'All Items' : status}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {(Array.from(new Set([...(viewingEvent.artworkIds || []), ...artworks.filter(a => a.reservedForEventId === viewingEvent.id).map(a => a.id)]))).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-neutral-400">
                  <p>No artworks assigned yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Array.from(new Set([...(viewingEvent.artworkIds || []), ...artworks.filter(a => a.reservedForEventId === viewingEvent.id).map(a => a.id)])))
                    .filter(id => {
                      const art = permittedArtworks.find(a => a.id === id);
                      if (!art) return false;
                      
                      if (filterStatus === 'ALL') return true;
                      if (filterStatus === 'AVAILABLE') return art.status === ArtworkStatus.AVAILABLE;
                      if (filterStatus === 'RESERVED') return art.status === ArtworkStatus.RESERVED;
                      if (filterStatus === 'SOLD') return art.status === ArtworkStatus.SOLD || art.status === ArtworkStatus.DELIVERED;
                      return true;
                    })
                    .map(id => {
                      const art = permittedArtworks.find(a => a.id === id);
                      if (!art) return null;
                      return (
                        <div
                          key={art.id}
                          className="flex items-start space-x-4 p-4 rounded-md border border-neutral-100 bg-neutral-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                          onClick={() => onViewArt?.(art.id)}
                        >
                          <OptimizedImage src={art.imageUrl || undefined} className="w-16 h-16 rounded-sm object-cover shadow-sm bg-white" alt="" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-neutral-900 text-sm line-clamp-1">{art.title}</h4>
                            <p className="text-xs text-neutral-500 truncate">{art.artist}</p>
                            <p className="text-[10px] font-bold text-neutral-500 mt-0.5">Imported: {formatImportPeriod(art.importPeriod) || 'Unknown'}</p>
                            <span className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${art.status === ArtworkStatus.AVAILABLE ? 'bg-emerald-600 text-white' :
                              art.status === ArtworkStatus.SOLD ? 'bg-neutral-100 text-neutral-400 line-through decoration-neutral-900' :
                                art.status === ArtworkStatus.RESERVED ? 'bg-neutral-200 text-neutral-700' :
                                  art.status === ArtworkStatus.DELIVERED ? 'bg-neutral-100 text-neutral-400' :
                                    'bg-neutral-50 text-neutral-400'
                              }`}>
                              {art.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t border-neutral-100 bg-white flex justify-end">
              <button onClick={() => setViewingEvent(null)} className="px-6 py-2.5 bg-neutral-900 text-white rounded-md font-bold hover:bg-black transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 md:p-8">
          <div className="bg-white rounded-md w-full max-w-4xl max-h-[82vh] shadow-2xl overflow-hidden flex flex-col relative my-auto animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-white">
              <h3 className="text-xl font-bold text-neutral-900">{editingId ? 'Edit Exhibition' : 'Create New Exhibition'}</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Exhibition Title</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-md text-base font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase block">Cover Photo</label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploadingImage(true);
                          try {
                            const reader = new FileReader();
                            reader.onload = async (ev) => {
                              try {
                                const rawBase64 = ev.target?.result as string;
                                const compressed = await compressBase64Image(rawBase64, 800, 300 * 1024);
                                const publicUrl = await uploadBase64ToStorage(compressed, 'images', 'events');
                                if (publicUrl) {
                                  setFormData(prev => ({ ...prev, logoUrl: publicUrl }));
                                }
                              } catch (err) {
                                console.error('Upload error:', err);
                              } finally {
                                setUploadingImage(false);
                              }
                            };
                            reader.readAsDataURL(file);
                          } catch (err) {
                            console.error('File read error:', err);
                            setUploadingImage(false);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        disabled={uploadingImage}
                      />
                      
                      <div className="w-full py-6 bg-neutral-50 border-2 border-neutral-200 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 group-hover:bg-neutral-100 transition-all cursor-pointer min-h-[110px]">
                        {uploadingImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Uploading image...</span>
                          </div>
                        ) : formData.logoUrl ? (
                          <div className="relative flex flex-col items-center gap-2 py-2">
                            <img src={formData.logoUrl} alt="Cover Preview" className="h-16 max-w-[200px] object-cover rounded-md shadow-sm border border-neutral-200" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFormData(prev => ({ ...prev, logoUrl: '' }));
                              }}
                              className="absolute -top-1 -right-2 p-1 bg-rose-500 text-white rounded-full shadow-sm hover:bg-rose-600 transition-colors z-20"
                            >
                              <X size={8} className="rotate-0 text-white" />
                            </button>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-widest">Uploaded Successfully</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={20} className="text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center px-4">
                              Click or Drag to Upload Cover Photo (PNG/JPG)
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase">Or Direct Image URL</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 hover:bg-neutral-100 transition-all"
                        value={formData.logoUrl || ''}
                        onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder="https://example.com/cover.png"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.status === EventStatus.UPCOMING && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Start Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 focus:outline-none focus:border-neutral-500"
                          value={formData.startDate}
                          onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                    )}
                    <div className={`space-y-1 ${formData.isTimeless ? 'opacity-50 pointer-events-none' : (formData.status !== EventStatus.UPCOMING ? 'col-span-2' : '')}`}>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">End Date (Duration)</label>
                      <input
                        type="date"
                        disabled={formData.isTimeless}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 focus:outline-none focus:border-neutral-500"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Location</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value as Branch })}
                        placeholder="Type exhibition location"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Current Status</label>
                      <select
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                        value={formData.status}
                        onChange={e => {
                          const newStatus = e.target.value as EventStatus;
                          const updates: Partial<ExhibitionEvent> = { status: newStatus };

                          // If switching to Live Now, set start date to today
                          if (newStatus === EventStatus.LIVE) {
                            updates.startDate = new Date().toISOString().split('T')[0];
                          }

                          setFormData({ ...formData, ...updates });
                        }}
                      >
                        <option value={EventStatus.UPCOMING}>Upcoming</option>
                        <option value={EventStatus.LIVE}>Live Now</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 bg-neutral-50 rounded-md border border-neutral-100">
                      <input
                        type="checkbox"
                        id="isTimeless"
                        checked={formData.isTimeless || false}
                        onChange={e => setFormData({ ...formData, isTimeless: e.target.checked })}
                        className="w-5 h-5 text-neutral-900 rounded focus:ring-neutral-500 border-neutral-300"
                      />
                      <label htmlFor="isTimeless" className="flex-1 cursor-pointer">
                        <span className="block text-sm font-bold text-neutral-900">Timeless</span>
                        <span className="block text-[10px] text-neutral-500 mt-0.5">No expiration date</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-neutral-50 rounded-md border border-neutral-100">
                      <input
                        type="checkbox"
                        id="strictDuration"
                        checked={formData.isStrictDuration || false}
                        onChange={e => setFormData({ ...formData, isStrictDuration: e.target.checked })}
                        className="w-5 h-5 text-neutral-900 rounded focus:ring-neutral-500 border-neutral-300"
                      />
                      <label htmlFor="strictDuration" className="flex-1 cursor-pointer">
                        <span className="block text-sm font-bold text-neutral-900">Strict Mode</span>
                        <span className="block text-[10px] text-neutral-500 mt-0.5">Auto-release art</span>
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">Curation (Link Artworks)</h4>

                {/* Search and Filters */}
                <div className="space-y-3 mb-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by title, artist, or code..."
                      className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 transition-all"
                      value={artworkSearch}
                      onChange={e => setArtworkSearch(e.target.value)}
                    />
                    <svg className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 focus:outline-none focus:border-neutral-500"
                      value={artworkArtistFilter}
                      onChange={e => setArtworkArtistFilter(e.target.value)}
                    >
                      <option value="ALL">All Artists</option>
                      {uniqueArtists.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 focus:outline-none focus:border-neutral-500"
                      value={artworkMediumFilter}
                      onChange={e => setArtworkMediumFilter(e.target.value)}
                    >
                      <option value="ALL">All Media</option>
                      {uniqueMedia.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl h-[400px] overflow-y-auto p-4 space-y-2">
                  {filteredSelectionArtworks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                      <p className="text-sm font-medium">No artworks found</p>
                      <p className="text-xs opacity-70 mt-1">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filteredSelectionArtworks.map((art) => (
                      <button
                        key={art.id}
                        onClick={() => toggleArtwork(art.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-sm border transition-all ${formData.artworkIds?.includes(art.id)
                          ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                          : 'bg-white border-neutral-200 text-neutral-900 hover:border-neutral-400'
                          }`}
                      >
                        <img src={art.imageUrl} className="w-10 h-10 rounded-sm object-cover border border-black/10" alt="" />
                        <div className="text-left flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${formData.artworkIds?.includes(art.id) ? 'text-white' : 'text-neutral-900'}`}>{art.title}</p>
                          <p className={`text-[10px] ${formData.artworkIds?.includes(art.id) ? 'text-neutral-300' : 'text-neutral-400'}`}>{art.artist}</p>
                          <p className={`text-[10px] font-bold mt-0.5 ${formData.artworkIds?.includes(art.id) ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {art.code}
                          </p>
                        </div>
                        {formData.artworkIds?.includes(art.id) && (
                          <div className="bg-white/20 p-1 rounded-full">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-neutral-100 bg-white flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-md font-bold text-neutral-600 hover:bg-neutral-100 transition-all shadow-sm hover:shadow-md border border-neutral-200 transform hover:-translate-y-0.5">Cancel</button>
              <button
                onClick={handleSave}
                disabled={!canEdit || !formData.title}
                className="px-10 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg hover:shadow-xl hover:bg-black disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
              >
                {editingId ? 'Update Exhibition' : 'Publish Exhibition'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EventManagement;
