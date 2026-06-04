import React, { useState, useRef, useEffect } from 'react';
import { UserRole, AppNotification, Artwork, UserPermissions } from '../types';
import { ArrowLeft, Bell, Check, Clock, Info, LogOut, User as UserIcon, Monitor, MessageSquare, Menu, AlertTriangle } from 'lucide-react';
import NotificationsModal from './NotificationsModal';
import NotificationDetailModal from './NotificationDetailModal';

interface HeaderProps {
  userRole: UserRole;
  activeTab: string;
  notifications: AppNotification[];
  unreadChatCount?: number;
  onMarkRead: () => void;
  onLogout?: () => void;
  onViewProfile?: () => void;
  userName?: string;
  onBackToDashboard?: () => void;
  historyStack?: { tab: string }[];
  onViewChat?: () => void;
  artworks: Artwork[];
  onViewArtwork: (id: string) => void;
  onDeleteNotifications?: (ids: string[]) => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  permissions?: UserPermissions;
  onToggleMobileMenu?: () => void;
}

const playNotificationSound = (isImportant: boolean) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (isImportant) {
      // Premium urgent/important chime: high double-chime (ding-ding!)
      // First high ding
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      // Second ding (slightly higher, delayed)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.12); // C#6
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.65);
    } else {
      // Gentle notification sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn('Audio Context block / play failed:', e);
  }
};

const Header: React.FC<HeaderProps> = ({ userRole, activeTab, notifications, unreadChatCount = 0, onMarkRead, onLogout, onViewProfile, userName, onBackToDashboard, historyStack = [], onViewChat, artworks, onViewArtwork, onDeleteNotifications, zoomLevel, setZoomLevel, permissions, onToggleMobileMenu }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [isChatHidden, setIsChatHidden] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const displayMenuRef = useRef<HTMLDivElement>(null);

  // Premium Toast States
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const prevNotificationsRef = useRef<AppNotification[]>(notifications);

  useEffect(() => {
    // Only fire toast for newly added notifications
    if (notifications.length > prevNotificationsRef.current.length) {
      const newNotif = notifications[0];
      const isActuallyNew = new Date().getTime() - new Date(newNotif.timestamp).getTime() < 15000;
      if (newNotif && !newNotif.isRead && isActuallyNew) {
        setActiveToast(newNotif);
        setIsExiting(false);

        // Detect if it is an important administrative request
        const lowerTitle = newNotif.title.toLowerCase();
        const lowerMsg = newNotif.message.toLowerCase();
        const isRequest = newNotif.isImportant || 
                          lowerTitle.includes('request') || lowerMsg.includes('request') ||
                          lowerTitle.includes('awaiting') || lowerTitle.includes('pending') ||
                          lowerTitle.includes('declared') || lowerTitle.includes('action required');

        // Play the premium synthesized sound cue!
        playNotificationSound(isRequest);

        const exitTimer = setTimeout(() => {
          setIsExiting(true);
        }, 4700);

        const unmountTimer = setTimeout(() => {
          setActiveToast(null);
          setIsExiting(false);
        }, 5000);

        return () => {
          clearTimeout(exitTimer);
          clearTimeout(unmountTimer);
        };
      }
    }
    prevNotificationsRef.current = notifications;
  }, [notifications]);

  const dismissToast = () => {
    setIsExiting(true);
    setTimeout(() => {
      setActiveToast(null);
      setIsExiting(false);
    }, 300);
  };

  useEffect(() => {
    const checkChatVisibility = () => {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem('sidebar-hidden-tabs');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setIsChatHidden(Array.isArray(parsed) && parsed.includes('chat'));
        } catch {
          setIsChatHidden(false);
        }
      } else {
        setIsChatHidden(false);
      }
    };

    checkChatVisibility();
    window.addEventListener('artisflow-hidden-tabs-changed', checkChatVisibility);
    return () => window.removeEventListener('artisflow-hidden-tabs-changed', checkChatVisibility);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (displayMenuRef.current && !displayMenuRef.current.contains(event.target as Node)) {
        setShowDisplayMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showNotifications && unreadCount > 0) {
      try {
        onMarkRead();
      } catch (err) {
        console.error("Error marking notifications as read:", err);
      }
    }
    setShowNotifications(!showNotifications);
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = new Date().getTime() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200/80 px-8 flex items-center justify-between relative z-50">
      <div className="flex items-center space-x-3">
        <button
          className="p-2 md:hidden rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors mr-2"
          onClick={onToggleMobileMenu}
        >
          <Menu size={24} />
        </button>
        {(activeTab !== 'dashboard' || historyStack.length > 0) && (
          <button
            onClick={onBackToDashboard}
            className="group flex items-center justify-center p-1.5 rounded-md text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 transition-colors mr-1.5"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          </button>
        )}
        <h2 className="text-xl font-light text-neutral-900 tracking-tight flex items-center gap-1.5 select-none capitalize">
          {activeTab === 'dashboard' ? (
            <>
              System <span className="font-serif italic font-medium">Dashboard</span>
            </>
          ) : (
            <>
              {activeTab.split('-')[0]}{' '}
              {activeTab.split('-').slice(1).map((word, i) => (
                <span key={i} className="font-serif italic font-medium">
                  {word}
                </span>
              ))}
            </>
          )}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-neutral-100 px-3 py-1 rounded-md border border-neutral-200">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">{userRole}</span>
        </div>

        <div className="relative" ref={displayMenuRef}>
          <button
            onClick={() => setShowDisplayMenu(!showDisplayMenu)}
            className={`p-2 rounded-md transition-all duration-150 ${showDisplayMenu ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
            title="Display Settings"
          >
            <Monitor size={20} />
          </button>

          {showDisplayMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 shadow-xl rounded-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-widest">Resolution</h3>
              </div>
              <div className="p-2 space-y-1">
                {[0.75, 0.8, 0.9, 1, 1.1, 1.25].map((level) => (
                  <button
                    key={level}
                    onClick={() => { setZoomLevel(level); setShowDisplayMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-sm text-[13px] font-medium transition-colors flex justify-between items-center ${zoomLevel === level ? 'bg-blue-50 text-blue-600' : 'text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    <span>{Math.round(level * 100)}%</span>
                    {zoomLevel === level && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isChatHidden && (permissions?.accessibleTabs ? permissions.accessibleTabs.includes('chat') : true) && (
          <div className="relative">
            <button
              onClick={onViewChat}
              className={`relative p-2 rounded-full transition-all duration-200 hover:scale-105 transform ${activeTab === 'chat' ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
              title="Inbox"
            >
              {unreadChatCount > 0 && (
                <div className="min-w-[18px] h-[18px] bg-neutral-900 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white flex items-center justify-center">
                  <span className="text-[9px] font-black text-white">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>
                </div>
              )}
              <MessageSquare size={20} />
            </button>
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleNotifications}
            className={`relative p-2 rounded-full transition-all duration-200 hover:scale-105 transform ${showNotifications ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
          >
            {unreadCount > 0 && (
              <div className="min-w-[18px] h-[18px] bg-red-600 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white flex items-center justify-center">
                <span className="text-[9px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
            <Bell size={20} />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 shadow-xl rounded-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-widest">Recent Activity</h3>
                <span className="text-[10px] font-bold text-neutral-400">{notifications.length} Logs</span>
              </div>

              <div className="max-h-[340px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-200 mx-auto mb-3">
                      <Check size={24} />
                    </div>
                    <p className="text-xs font-bold text-neutral-400">All caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-50">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSelectedNotification(n);
                          setShowNotifications(false);
                        }}
                        className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors flex items-start space-x-3 ${!n.isRead ? 'bg-neutral-50/50' : ''}`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg ${n.type === 'inventory' ? 'bg-neutral-200 text-neutral-700' :
                          n.type === 'sales' ? 'bg-neutral-200 text-neutral-700' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                          <Info size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-900 leading-tight">{n.title}</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center space-x-1.5 mt-2 text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">
                            <Clock size={10} />
                            <span>{getTimeAgo(n.timestamp)}</span>
                          </div>
                        </div>
                        {!n.isRead && <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full mt-1.5"></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowNotifications(false); setShowAllNotifications(true); }}
                className="w-full px-5 py-3 text-[11px] font-bold text-neutral-900 border-t border-neutral-100 bg-white hover:bg-neutral-50 hover:text-neutral-700 uppercase tracking-widest"
              >
                View All
              </button>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-neutral-200"></div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-1 pr-3 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-white text-[10px] font-black">
              {(userName?.[0] || 'U').toUpperCase()}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 shadow-xl rounded-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50">
                <p className="text-xs font-bold text-neutral-900">{userName || 'User'}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5 capitalize">{userRole.replace('_', ' ').toLowerCase()}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { setShowUserMenu(false); onViewProfile && onViewProfile(); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 flex items-center space-x-2 transition-colors"
                >
                  <UserIcon size={16} />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 flex items-center space-x-2 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAllNotifications && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setShowAllNotifications(false)}
          onSelect={(n) => {
            setSelectedNotification(n);
            setShowAllNotifications(false);
          }}
          onDeleteNotifications={onDeleteNotifications}
        />
      )}

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          artworks={artworks}
          onViewArtwork={onViewArtwork}
          permissions={permissions}
        />
      )}

      {activeToast && (() => {
        const lowerTitle = activeToast.title.toLowerCase();
        const lowerMsg = activeToast.message.toLowerCase();
        const isRequest = activeToast.isImportant || 
                          lowerTitle.includes('request') || lowerMsg.includes('request') ||
                          lowerTitle.includes('awaiting') || lowerTitle.includes('pending') ||
                          lowerTitle.includes('declared') || lowerTitle.includes('action required');
        return (
          <div
            onClick={() => {
              setSelectedNotification(activeToast);
              dismissToast();
            }}
            className={`fixed top-20 right-8 z-[9999] max-w-sm w-full border shadow-2xl rounded-2xl p-4 flex items-start space-x-3 cursor-pointer select-none hover:shadow-neutral-200/50 hover:border-neutral-300 transform hover:-translate-y-0.5 transition-all duration-300 ${
              isExiting ? 'toast-exit' : 'toast-enter'
            } ${
              isRequest 
                ? 'bg-amber-50/95 border-amber-400 shadow-amber-500/20' 
                : 'bg-white border-neutral-200'
            }`}
          >
            <div className={`mt-0.5 p-2 rounded-xl ${
              isRequest
                ? 'bg-amber-500 text-white animate-pulse'
                : activeToast.type === 'inventory' ? 'bg-neutral-100 text-neutral-800' :
                activeToast.type === 'sales' ? 'bg-neutral-100 text-neutral-800' : 
                'bg-neutral-50 text-neutral-600'
            }`}>
              {isRequest ? (
                <AlertTriangle size={16} />
              ) : (
                <Bell size={16} className="animate-bounce" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isRequest ? 'text-amber-700 animate-pulse' : 'text-neutral-400'}`}>
                  {isRequest ? '⚠️ Action Required (Request)' : 'New Notification'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast();
                  }}
                  className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-colors"
                  aria-label="Dismiss toast"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs font-bold text-neutral-900 mt-1 leading-tight">{activeToast.title}</p>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{activeToast.message}</p>
              <div className="flex items-center space-x-1 mt-2 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                <Clock size={10} />
                <span>Just Now</span>
              </div>
            </div>
          </div>
        );
      })()}
    </header>
  );
};

export default Header;
