import React, { useMemo } from 'react';
import { AppNotification, Artwork, UserPermissions, ArtworkStatus } from '../types';
import { X, Clock, Info, CheckCircle2, AlertCircle, ShoppingBag, Box, ArrowRight, Image as ImageIcon } from 'lucide-react';

interface NotificationDetailModalProps {
  notification: AppNotification;
  onClose: () => void;
  artworks?: Artwork[];
  onViewArtwork?: (id: string) => void;
  permissions?: UserPermissions;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({ notification, onClose, artworks, onViewArtwork, permissions }) => {
  const permittedArtworks = React.useMemo(() => {
    if (!artworks) return [];
    return artworks.filter(art => {
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

  const relatedArtwork = useMemo(() => {
    if (!notification.artworkId || !permittedArtworks) return null;
    return permittedArtworks.find(a => a.id === notification.artworkId);
  }, [notification, permittedArtworks]);

  const getIcon = () => {
    switch (notification.type) {
      case 'inventory':
        return <Box size={32} className="text-neutral-600" />;
      case 'sales':
        return <ShoppingBag size={32} className="text-neutral-600" />;
      default:
        return <Info size={32} className="text-neutral-500" />;
    }
  };

  const getHeaderColor = () => {
    switch (notification.type) {
      case 'inventory':
        return 'bg-neutral-700';
      case 'sales':
        return 'bg-neutral-700';
      default:
        return 'bg-neutral-500';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        {/* Header Strip */}
        <div className={`h-2 w-full ${getHeaderColor()}`} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="flex items-start space-x-5">
            <div className={`p-3 rounded-2xl ${notification.type === 'inventory' ? 'bg-neutral-100' :
              notification.type === 'sales' ? 'bg-neutral-100' : 'bg-neutral-50'
              }`}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${notification.type === 'inventory' ? 'bg-neutral-200 text-neutral-900' :
                  notification.type === 'sales' ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                  {notification.type}
                </span>
                {!notification.isRead && (
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-neutral-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse" />
                    <span>New</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-neutral-900 leading-tight mb-2">
                {notification.title}
              </h2>
              <div className="grid grid-cols-3 gap-2 mb-6 pt-4 border-t border-neutral-100">
                <div>
                  <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Received At</span>
                  <div className="flex items-center text-xs font-medium text-neutral-700">
                    <Clock size={12} className="mr-1.5 text-neutral-400" />
                    {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">System Ref</span>
                  <div className="font-mono text-[10px] text-neutral-500 bg-neutral-100 inline-block px-1.5 py-0.5 rounded border border-neutral-200">
                    #{notification.id}
                  </div>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Status</span>
                  <div className="flex items-center text-xs font-medium text-neutral-700">
                    {notification.isRead ? (
                      <>
                        <CheckCircle2 size={12} className="mr-1.5 text-green-500" />
                        <span>Archived</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} className="mr-1.5 text-neutral-400" />
                        <span>Unread</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {(notification.userName || notification.agent) && (
                <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-neutral-100">
                  {notification.userName && (
                    <div>
                      <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Action By</span>
                      <div className="text-xs font-semibold text-neutral-800">
                        {notification.userName}
                      </div>
                    </div>
                  )}
                  {notification.agent && (
                    <div>
                      <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Branch / Office</span>
                      <div className="text-xs font-semibold text-neutral-800">
                        {notification.agent}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 bg-neutral-50 rounded-2xl p-5 border border-neutral-100">
            <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
              {notification.message}
            </p>
            {notification.items && notification.items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Affected Items ({notification.items.length})</p>
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden max-h-64 overflow-y-auto divide-y divide-neutral-100">
                  {notification.items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (onViewArtwork && item.id) {
                          onViewArtwork(item.id);
                          onClose();
                        }
                      }}
                      className="px-4 py-3 flex items-center justify-between text-sm hover:bg-neutral-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-200">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                              <ImageIcon size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-neutral-800 truncate group-hover:text-neutral-900 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-tight">
                            {item.code}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === 'failed' ? (
                          <div className="flex flex-col items-end">
                            <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-red-100">
                              <AlertCircle size={10} />
                              Failed
                            </span>
                            {item.error && (
                              <span className="text-[9px] text-red-400 mt-0.5 max-w-[120px] truncate">
                                {item.error}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-wider border border-green-100">
                            Success
                          </span>
                        )}
                        <ArrowRight size={14} className="text-neutral-300 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {relatedArtwork && (
            <div className="mt-6 border-t border-neutral-100 pt-6">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Related Artwork Details</h3>
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                {/* Main clickable info header */}
                <div
                  onClick={() => {
                    if (onViewArtwork) {
                      onViewArtwork(relatedArtwork.id);
                      onClose();
                    }
                  }}
                  className="group flex items-center gap-4 p-4 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-200">
                    <img
                      src={relatedArtwork.imageUrl}
                      alt={relatedArtwork.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-neutral-900 truncate group-hover:text-neutral-700 transition-colors">
                      {relatedArtwork.title}
                    </h4>
                    <p className="text-xs text-neutral-500 truncate mb-1.5">{relatedArtwork.artist}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[10px] font-bold uppercase">
                        {relatedArtwork.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        relatedArtwork.status === 'Available' ? 'bg-green-50 text-green-700 border border-green-100' :
                        relatedArtwork.status === 'Sold' ? 'bg-neutral-900 text-neutral-100' :
                        relatedArtwork.status === 'Reserved' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}>
                        {relatedArtwork.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight size={20} />
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="p-4 bg-neutral-50/50 grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-neutral-100 shadow-sm">
                    <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Price</span>
                    <span className="font-bold text-neutral-900 text-sm">
                      ₱{relatedArtwork.price?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-neutral-100 shadow-sm">
                    <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Dimensions</span>
                    <span className="font-semibold text-neutral-700 truncate block" title={relatedArtwork.dimensions}>
                      {relatedArtwork.dimensions || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-neutral-100 shadow-sm">
                    <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Medium</span>
                    <span className="font-semibold text-neutral-700 truncate block" title={relatedArtwork.medium}>
                      {relatedArtwork.medium || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-neutral-100 shadow-sm">
                    <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Current Branch</span>
                    <span className="font-semibold text-neutral-700 truncate block" title={relatedArtwork.currentBranch}>
                      {relatedArtwork.currentBranch || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-neutral-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-neutral-900/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
