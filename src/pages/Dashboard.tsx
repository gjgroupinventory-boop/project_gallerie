
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Artwork, SaleRecord, ArtworkStatus, ExhibitionEvent, EventStatus, UserAccount, UserRole } from '../types';
import { ICONS, getDefaultPermissions } from '../constants';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { TrendingUp, ArrowRight, Activity, Box, Sparkles, Clock, Building } from 'lucide-react';
import { supabase } from '../supabase';
import { OptimizedImage } from '../components/OptimizedImage';

const CircularProgress: React.FC<{ percentage: number; color: string; size?: number; strokeWidth?: number }> = ({ percentage, color, size = 48, strokeWidth = 4.5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className="stroke-white/10"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
};


const EventBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
  const styles = {
    [EventStatus.LIVE]: 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/30 border-transparent',
    [EventStatus.UPCOMING]: 'bg-neutral-700 text-white shadow-lg shadow-neutral-700/30 border-transparent',
    [EventStatus.RECENT]: 'bg-neutral-100 text-neutral-500 border-neutral-200',
    [EventStatus.CLOSED]: 'bg-neutral-200 text-neutral-600 border-neutral-300',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]} flex items-center gap-1.5 whitespace-nowrap`}>
      {status === EventStatus.LIVE && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
      {status}
    </span>
  );
};

interface DashboardProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  events: ExhibitionEvent[];
  isLoadingEvents?: boolean;
  isLoadingArtworks?: boolean;
  accounts: UserAccount[];
  onSelectArt: (id: string) => void;
  onManageEvents: () => void;
  onNavigateFromStat?: (target: 'sales' | 'operations' | 'reservations') => void;
  currentUser?: UserAccount | null;
}

const Dashboard: React.FC<DashboardProps> = ({ artworks, sales, events, isLoadingEvents, isLoadingArtworks, accounts, onSelectArt, onManageEvents, onNavigateFromStat, currentUser }) => {
  const [activeStat, setActiveStat] = useState<'inventory' | 'sold' | 'reserved' | 'revenue' | null>(null);
  const [isTeamPanelOpen, setIsTeamPanelOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, [artworks, sales, events, currentUser]);

  const [featuredArtwork, setFeaturedArtwork] = useState<Artwork | null>(null);

  const eligibleArtworks = useMemo(() => {
    return (artworks || []).filter(a => a.imageUrl && !a.imageUrl.includes('picsum.photos'));
  }, [artworks]);

  useEffect(() => {
    if (eligibleArtworks.length === 0) return;
    
    // Pick initial random artwork
    const randomIndex = Math.floor(Math.random() * eligibleArtworks.length);
    setFeaturedArtwork(eligibleArtworks[randomIndex]);

    const interval = setInterval(() => {
      setFeaturedArtwork((prev) => {
        const remaining = eligibleArtworks.filter(a => !prev || a.id !== prev.id);
        if (remaining.length === 0) return prev;
        const nextIndex = Math.floor(Math.random() * remaining.length);
        return remaining[nextIndex];
      });
    }, 15000); // cycle every 15 seconds

    return () => clearInterval(interval);
  }, [eligibleArtworks]);

  const [featuredBranch, setFeaturedBranch] = useState<string | null>(null);

  const branchesList = useMemo(() => {
    return Array.from(new Set((artworks || []).map(a => a.currentBranch).filter(Boolean)));
  }, [artworks]);

  const uniqueArtistsCount = useMemo(() => {
    return new Set((artworks || []).map(a => a.artist).filter(Boolean)).size;
  }, [artworks]);

  const uniqueClientsCount = useMemo(() => {
    return new Set((sales || []).map(s => s.clientName).filter(Boolean)).size;
  }, [sales]);

  useEffect(() => {
    if (branchesList.length === 0) return;
    
    // Pick initial random branch
    const randomIndex = Math.floor(Math.random() * branchesList.length);
    setFeaturedBranch(branchesList[randomIndex]);

    const interval = setInterval(() => {
      setFeaturedBranch((prev) => {
        const remaining = branchesList.filter(b => !prev || b !== prev);
        if (remaining.length === 0) return prev;
        const nextIndex = Math.floor(Math.random() * remaining.length);
        return remaining[nextIndex];
      });
    }, 15000); // cycle every 15 seconds

    return () => clearInterval(interval);
  }, [branchesList]);

  const featuredBranchMetrics = useMemo(() => {
    if (!featuredBranch) return null;
    const branchArts = (artworks || []).filter(a => a.currentBranch === featuredBranch);
    const totalCount = branchArts.length;
    const totalValue = branchArts.reduce((sum, a) => sum + (a.price || 0), 0);
    const availableCount = branchArts.filter(a => a.status === ArtworkStatus.AVAILABLE).length;
    const reservedCount = branchArts.filter(a => a.status === ArtworkStatus.RESERVED).length;
    const soldCount = branchArts.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED).length;
    return { totalCount, totalValue, availableCount, reservedCount, soldCount };
  }, [featuredBranch, artworks]);

  const completedSales = useMemo(
    () => (sales || []).filter(sale => !sale.isCancelled),
    [sales]
  );

  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p;
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[m - 1]} ${y}`;
  };

  const permissions = useMemo(() => {
    if (!currentUser) return getDefaultPermissions(UserRole.BRANCH_USER);
    return {
      ...getDefaultPermissions(currentUser.role),
      ...(currentUser.permissions || {})
    };
  }, [currentUser]);

  const filteredArtworks = useMemo(() => {
    return (artworks || []).filter(art => {
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

  const soldArtworks = useMemo(
    () => filteredArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED),
    [filteredArtworks]
  );

  const totalInventory = filteredArtworks.length;
  const totalSold = soldArtworks.length;
  const totalReserved = filteredArtworks.filter(a => a.status === ArtworkStatus.RESERVED).length;
  const inventoryMetrics = useMemo(() => {
    const totalCount = filteredArtworks.length;
    const totalValue = filteredArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
    
    // Status Distribution
    const statusMap = filteredArtworks.reduce((acc, art) => {
      acc[art.status] = (acc[art.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Branch Distribution
    const branchMap = filteredArtworks.reduce((acc, art) => {
      const b = art.currentBranch || 'Unassigned';
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const branchData = Object.entries(branchMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalCount, totalValue, statusData, branchData };
  }, [filteredArtworks]);

  const soldMetrics = useMemo(() => {
    const totalCount = soldArtworks.length;
    const totalValue = soldArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
    
    // Top Artists by Volume
    const artistMap = soldArtworks.reduce((acc, art) => {
      acc[art.artist] = (acc[art.artist] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const artistData = Object.entries(artistMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Branch Performance
    const branchMap = soldArtworks.reduce((acc, art) => {
      const b = art.currentBranch || 'Unassigned';
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const branchData = Object.entries(branchMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalCount, totalValue, artistData, branchData };
  }, [soldArtworks]);

  const reservedArtworks = useMemo(
    () => filteredArtworks.filter(a => a.status === ArtworkStatus.RESERVED),
    [filteredArtworks]
  );

  const reservedMetrics = useMemo(() => {
    const totalCount = reservedArtworks.length;
    const totalValue = reservedArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
    
    // Reservation Intents
    const reasonMap = reservedArtworks.reduce((acc, art) => {
      let reason = 'Private Client';
      if ((art.remarks || '').includes('[Reserved For Auction:')) reason = 'Auction Block';
      else if ((art.remarks || '').includes('[Reserved For Event:')) reason = 'Exhibition';
      
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const intentData = Object.entries(reasonMap).map(([name, value]) => ({ name, value }));

    // Hold Allocation by Branch
    const branchMap = reservedArtworks.reduce((acc, art) => {
      const b = art.currentBranch || 'Unassigned';
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const branchData = Object.entries(branchMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalCount, totalValue, intentData, branchData };
  }, [reservedArtworks]);

  const revenueMetrics = useMemo(() => {
    const salesMap = new Map(completedSales.map(s => [s.artworkId, s]));
    
    let fullyPaid = 0;
    let installmentsCollected = 0;
    let totalGross = 0;
    let totalCollected = 0;
    let totalDownpayments = 0;
    let totalPendingInstallments = 0;
    let installmentSalesCount = 0;
    let totalInstallmentBaseValue = 0;
    let downpaymentPcts: number[] = [];

    soldArtworks.forEach(art => {
      const price = art.price || 0;
      totalGross += price;
      
      const sale = salesMap.get(art.id);
      if (!sale) {
        // Assume legacy/direct sales are fully paid
        fullyPaid += price;
        totalCollected += price;
        return;
      }

      if (sale.status === 'Approved' && !sale.isDownpayment) {
        fullyPaid += price;
        totalCollected += price;
      } else if (sale.isDownpayment) {
        installmentSalesCount++;
        totalInstallmentBaseValue += price;

        const basePaid = sale.status === 'Approved' ? (sale.downpayment || 0) : 0;
        totalDownpayments += basePaid;
        
        if (price > 0) {
          downpaymentPcts.push((basePaid / price) * 100);
        }

        const installments = sale.installments || [];
        const verifiedInstallments = installments.filter(i => !i.isPending).reduce((s, i) => s + i.amount, 0);
        const pendingInstallments = installments.filter(i => i.isPending).reduce((s, i) => s + i.amount, 0);
        
        totalPendingInstallments += pendingInstallments;
        installmentsCollected += (basePaid + verifiedInstallments);
        totalCollected += (basePaid + verifiedInstallments);
      }
    });

    // Branch Revenue Distribution
    const branchRevenueMap = soldArtworks.reduce((acc, art) => {
      const b = art.currentBranch || 'Unassigned';
      const price = art.price || 0;
      acc[b] = (acc[b] || 0) + price;
      return acc;
    }, {} as Record<string, number>);

    const branchRevenueData = Object.entries(branchRevenueMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const avgDownpaymentPct = downpaymentPcts.length > 0 
      ? downpaymentPcts.reduce((a, b) => a + b, 0) / downpaymentPcts.length 
      : 0;

    return {
      fullyPaid,
      installmentsCollected,
      totalToBeCollected: totalGross - totalCollected,
      totalGross,
      totalCollected,
      totalDownpayments,
      totalPendingInstallments,
      installmentSalesCount,
      totalInstallmentBaseValue,
      avgDownpaymentPct,
      branchRevenueData
    };
  }, [soldArtworks, completedSales]);

  const stats = [
    {
      id: 'inventory' as const,
      label: 'Total Inventory',
      value: totalInventory,
      icon: ICONS.Inventory,
      percentage: totalInventory > 0 ? Math.round((filteredArtworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length / totalInventory) * 100) : 0,
      progressColor: '#10b981', // emerald
      target: 'inventory' as const
    },
    {
      id: 'sold' as const,
      label: 'Total Sold',
      value: totalSold.toLocaleString(),
      icon: ICONS.Sales,
      percentage: (totalInventory + totalSold) > 0 ? Math.round((totalSold / (totalInventory + totalSold)) * 100) : 0,
      progressColor: '#3b82f6', // blue
      target: 'sales' as const
    },
    {
      id: 'reserved' as const,
      label: 'Total Reserved',
      value: totalReserved,
      icon: <Clock size={20} className="text-neutral-900" />,
      percentage: totalInventory > 0 ? Math.round((totalReserved / totalInventory) * 100) : 0,
      progressColor: '#f59e0b', // amber
      target: 'inventory' as const
    },
    {
      id: 'revenue' as const,
      label: 'Collected Ratio',
      value: `₱${revenueMetrics.totalCollected.toLocaleString()}`,
      isRevenue: true,
      metrics: revenueMetrics,
      icon: <TrendingUp size={20} className="text-neutral-900" />,
      percentage: revenueMetrics.totalGross > 0 ? Math.round((revenueMetrics.totalCollected / revenueMetrics.totalGross) * 100) : 0,
      progressColor: '#8b5cf6', // purple
      target: 'sales' as const
    },
  ].filter(stat => {
    if (stat.id === 'inventory') return permissions.dashboardShowInventoryMetric;
    if (stat.id === 'sold') return permissions.dashboardShowSoldMetric;
    if (stat.id === 'reserved') return permissions.dashboardShowReservedMetric;
    if (stat.id === 'revenue') return permissions.dashboardShowRevenueMetric;
    return true;
  });

  const displayName = useMemo(
    () => currentUser?.firstName || currentUser?.fullName || currentUser?.name || 'there',
    [currentUser]
  );


  const revenueDetails = useMemo(
    () => {
      // Create a map for faster lookup (O(N) instead of O(N^2))
      const salesMap = new Map(completedSales.map(s => [s.artworkId, s]));

      // Map sold artworks to include sale details if available
      const details = soldArtworks.map(art => {
        const sale = salesMap.get(art.id);
        return { art, sale };
      });

      // Sort by sale date descending (most recent first)
      return details.sort((a, b) => {
        const dateA = a.sale ? new Date(a.sale.saleDate).getTime() : 0;
        const dateB = b.sale ? new Date(b.sale.saleDate).getTime() : 0;
        return dateB - dateA;
      });
    },
    [soldArtworks, completedSales]
  );

  const [userPresence, setUserPresence] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!currentUser) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const timer = window.setTimeout(() => {
      channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: currentUser.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel!.presenceState();
          const presenceMap: Record<string, any> = {};
          Object.keys(state).forEach((key) => {
            const presenceEntry = state[key][0];
            presenceMap[key] = presenceEntry;
          });
          setUserPresence(presenceMap);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel!.track({
              id: currentUser.id,
              name: currentUser.name || currentUser.fullName || 'User',
              state: 'online',
              last_changed: Date.now(),
            });
          }
        });
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [currentUser]);

  const teamStatus = useMemo(() => {
    const uniqueAccounts = Array.from(new Map((accounts || []).filter(a => a && a.id).map(acc => [acc.id, acc])).values());
    return uniqueAccounts
      .map(acc => {
        const presence = userPresence[acc.id];
        const isMe = currentUser?.id === acc.id;
        const lastSeen = presence?.last_changed || (acc.lastLogin ? new Date(acc.lastLogin).getTime() : null);

        // Consider online if explicitly online OR seen within the last minute
        const isOnline = isMe || presence?.state === 'online' || (lastSeen && (now - lastSeen < 60000));

        return { ...acc, isOnline, lastSeen, isMe };
      })
      .sort((a, b) => {
        if (a.isMe) return -1;
        if (b.isMe) return 1;

        const branchA = a.branch || '';
        const branchB = b.branch || '';
        if (branchA !== branchB) {
          if (!branchA) return 1;
          if (!branchB) return -1;
          return branchA.localeCompare(branchB);
        }

        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return (b.lastSeen || 0) - (a.lastSeen || 0);
      });
  }, [accounts, currentUser, userPresence, now]);

  const formatLastSeen = (timestamp: number) => {
    if (!timestamp) return 'Offline';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const parseReservationDetails = (remarks?: string) => {
    if (!remarks) return null;
    const parts = remarks.split('|').map(p => p.trim());
    const targetPart = parts.find(p => p.toLowerCase().startsWith('target:'));
    return targetPart ? targetPart.substring(7).trim() : null;
  };

  const statusData = [
    { name: 'Available', value: filteredArtworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length },
    { name: 'Reserved', value: reservedArtworks.length },
    { name: 'Sold', value: soldArtworks.length },
  ];

  const COLORS = ['#0a0a0a', '#525252', '#a3a3a3'];
  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-500 relative">
      {/* Art Gallery Editorial Header */}
      <div className="bg-[#FAF9F5] border border-neutral-200 p-8 rounded-md shadow-sm relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute right-4 bottom-0 text-[10rem] font-serif italic font-normal text-neutral-900/5 select-none pointer-events-none leading-none -mb-8">
          ART
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center space-x-2 text-[9px] font-black uppercase tracking-[0.25em] text-neutral-450">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
              <span>Exhibition Workspace</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-900 leading-tight">
              Hi, <span className="font-serif italic text-neutral-900 font-medium">{displayName}</span>
            </h1>
            <p className="text-xs md:text-sm text-neutral-500 font-serif italic leading-relaxed">
              Welcome back to your curatorial dashboard. Below is the active catalog index, branch performance, and collection ledger.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col lg:items-end gap-4 lg:gap-2 justify-between pt-4 lg:pt-0 border-t lg:border-t-0 border-neutral-200/60 shrink-0">
            <div className="text-left lg:text-right">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Curatorial Date</p>
              <p className="text-sm font-serif italic text-neutral-900 mt-0.5">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="inline-flex items-center space-x-2 rounded bg-neutral-900 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white">
      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              <span>Catalog Synced</span>
            </div>
          </div>
        </div>
        {/* Editorial Catalog Index Bar (Curatorial Statistics) */}
        <div className="mt-8 pt-8 border-t border-neutral-250/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-neutral-900">
          <div className="text-left pr-4 border-r border-neutral-200/85 last:border-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">Branch Network</p>
            <p className="text-2xl font-serif italic font-light mt-0.5">{branchesList.length} branches</p>
          </div>

          <div className="text-left pr-4 md:border-r border-neutral-200/85 last:border-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">Represented Artists</p>
            <p className="text-2xl font-serif italic font-light mt-0.5">{uniqueArtistsCount} artists</p>
          </div>

          <div className="text-left pr-4 border-r border-neutral-200/85 last:border-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">Total Artworks</p>
            <p className="text-2xl font-serif italic font-light mt-0.5">{artworks.length} works</p>
          </div>

          <div className="text-left pr-4 last:border-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">Client Base</p>
            <p className="text-2xl font-serif italic font-light mt-0.5">{uniqueClientsCount} clients</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid - square iOS squircle widgets */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-[1512px]:gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {stats.map((stat, i) => {
          const isInventory = stat.id === 'inventory';
          const isSold = stat.id === 'sold';
          const isReserved = stat.id === 'reserved';
          const isRevenue = stat.id === 'revenue';

          const iconTheme = isInventory
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-400'
            : isSold
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-400'
            : isReserved
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-400'
            : 'bg-purple-500/10 border-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white group-hover:border-purple-400';

          const iconAnim = isInventory
            ? 'group-hover:rotate-12 group-hover:scale-110'
            : isSold
            ? 'group-hover:-translate-y-1 group-hover:scale-110'
            : isReserved
            ? 'group-hover:rotate-[360deg] duration-700 group-hover:scale-110'
            : 'group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:scale-110';

          const glowShadow = isInventory
            ? 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30'
            : isSold
            ? 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/30'
            : isReserved
            ? 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-500/30'
            : 'hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:border-purple-500/30';

          return (
            <motion.div
              key={i}
              className={`relative overflow-hidden rounded-md p-6 shadow-sm bg-neutral-900 border border-neutral-800 text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-neutral-950 active:scale-[0.98] group flex flex-col justify-between min-h-[170px] ${glowShadow}`}
              onClick={() => setActiveStat(stat.id)}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between w-full">
                <div className={`p-3 rounded-md border shadow-inner transition-all duration-300 ${iconTheme}`}>
                  <div className={`transition-all duration-500 ${iconAnim}`}>
                    {React.cloneElement(stat.icon as React.ReactElement<any>, { 
                      size: 20,
                      className: '' 
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {i === 1 && (
                    <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-black border border-blue-500/20 flex items-center gap-0.5">
                      <TrendingUp size={8} /> +12%
                    </div>
                  )}
                  <CircularProgress percentage={stat.percentage} color={stat.progressColor} size={36} strokeWidth={3.5} />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-2xl font-black tracking-tight text-white drop-shadow-sm">{stat.value}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{stat.label}</p>
                  <span className="text-[10px] font-black text-neutral-400">
                    {stat.percentage}%
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tier 2: Spotlights & Highlights */}
      {(permissions.dashboardShowSpotlightPiece ||
        permissions.dashboardShowSpotlightBranch ||
        permissions.dashboardShowNewestAdditions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Spotlight Piece Card */}
          {permissions.dashboardShowSpotlightPiece && featuredArtwork && (
            <div className="bg-neutral-100 border border-neutral-300/70 p-6 rounded-md shadow-sm flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-neutral-950 animate-pulse" />
                    Spotlight Piece
                  </h3>
                  <span className="bg-neutral-900 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {featuredArtwork.status}
                  </span>
                </div>
                
                <div 
                  onClick={() => onSelectArt(featuredArtwork.id)}
                  className="cursor-pointer space-y-4"
                >
                  <div className="aspect-[4/3] w-full rounded-md overflow-hidden bg-neutral-100 border border-neutral-200/50 relative">
                    <OptimizedImage
                      src={featuredArtwork.imageUrl}
                      alt={featuredArtwork.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-neutral-900 truncate uppercase tracking-tight group-hover:text-neutral-600 transition-colors" title={featuredArtwork.title}>
                      {featuredArtwork.title}
                    </h4>
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                      by {featuredArtwork.artist}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-200/60 mt-4">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                  {featuredArtwork.medium}
                </span>
                <span className="text-sm font-black text-neutral-900">
                  ₱{(featuredArtwork.price || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Spotlight Branch Card */}
          {permissions.dashboardShowSpotlightBranch && featuredBranch && featuredBranchMetrics && (
            <div className="bg-neutral-100 border border-neutral-300/70 p-6 rounded-md shadow-sm flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                    <Building size={14} className="text-neutral-950 animate-pulse" />
                    Spotlight Branch
                  </h3>
                  <span className="bg-neutral-100 text-neutral-800 border border-neutral-200/60 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Location Highlight
                  </span>
                </div>
                
                <div>
                  <h4 className="text-base font-black text-neutral-900 truncate uppercase tracking-tight">
                    {featuredBranch}
                  </h4>
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-0.5">
                    Art Collection & Activity
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-50/50 rounded-md border border-neutral-150/40">
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-405">Total Count</span>
                    <p className="text-lg font-black text-neutral-900">{featuredBranchMetrics.totalCount} units</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-405">Collection Value</span>
                    <p className="text-lg font-black text-neutral-900">₱{featuredBranchMetrics.totalValue.toLocaleString()}</p>
                  </div>
                </div>

                {/* Branch Artworks Preview */}
                <div className="space-y-2 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Works in this Branch</span>
                  <div className="space-y-2">
                    {artworks.filter(a => a.currentBranch === featuredBranch && a.imageUrl).slice(0, 2).map(art => (
                      <div 
                        key={art.id} 
                        onClick={(e) => { e.stopPropagation(); onSelectArt(art.id); }}
                        className="flex items-center gap-2 p-2 hover:bg-neutral-200/50 rounded-md bg-white border border-neutral-150/40 cursor-pointer transition-all hover:scale-[1.01]"
                      >
                        <OptimizedImage src={art.imageUrl} alt={art.title} className="w-8 h-8 rounded-sm object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-neutral-900 truncate uppercase tracking-tight">{art.title}</p>
                          <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wide">{art.artist}</p>
                        </div>
                        <span className="text-[10px] font-black text-neutral-900">₱{(art.price || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-4 border-t border-neutral-200/60 mt-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-neutral-500">Available ({featuredBranchMetrics.availableCount})</span>
                  <span className="text-neutral-500">Reserved ({featuredBranchMetrics.reservedCount})</span>
                  <span className="text-neutral-500">Sold ({featuredBranchMetrics.soldCount})</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100">
                  <div 
                    className="bg-emerald-500 h-full" 
                    style={{ width: `${featuredBranchMetrics.totalCount > 0 ? (featuredBranchMetrics.availableCount / featuredBranchMetrics.totalCount) * 100 : 0}%` }}
                  />
                  <div 
                    className="bg-amber-500 h-full" 
                    style={{ width: `${featuredBranchMetrics.totalCount > 0 ? (featuredBranchMetrics.reservedCount / featuredBranchMetrics.totalCount) * 100 : 0}%` }}
                  />
                  <div 
                    className="bg-blue-500 h-full" 
                    style={{ width: `${featuredBranchMetrics.totalCount > 0 ? (featuredBranchMetrics.soldCount / featuredBranchMetrics.totalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Newest Additions Card */}
          {permissions.dashboardShowNewestAdditions && (
            <div className="bg-neutral-100 border border-neutral-300/70 p-6 rounded-md shadow-sm flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                    Newest Additions
                  </h3>
                  <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider border border-neutral-200">Just In</span>
                </div>

                <div className="space-y-3">
                  {(() => {
                    const recent = (artworks || []).slice(-10).reverse();
                    const uniqueRecent = Array.from(new Map(recent.filter(a => a && a.id).map(art => [art.id, art])).values()).slice(0, 5);
                    
                    return uniqueRecent.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => onSelectArt(art.id)}
                        className="flex items-center space-x-3 p-2 hover:bg-neutral-50/70 rounded-md cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm group border border-transparent hover:border-neutral-150/40"
                      >
                        <div className="relative shrink-0">
                          <OptimizedImage
                            src={art.imageUrl}
                            alt={art.title}
                            className="w-11 h-11 rounded-md object-cover shadow-sm group-hover:shadow-md transition-shadow"
                          />
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neutral-900 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-neutral-900 truncate group-hover:text-neutral-600 transition-colors uppercase tracking-tight">{art.title}</p>
                          <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wide mt-0.5">{art.artist}</p>
                          <p className="text-[10px] font-bold text-neutral-900 mt-0.5">₱{(art.price || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-1 rounded-full bg-neutral-50 text-neutral-300 group-hover:bg-neutral-100 group-hover:text-neutral-900 transition-colors">
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tier 3: Gallery Operations & Team Status */}
      {(permissions.dashboardShowGallerySchedule ||
        permissions.dashboardShowDistributionChart) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Exhibition Schedule (Gallery Schedule) */}
          {permissions.dashboardShowGallerySchedule && (
            <div className={`${permissions.dashboardShowDistributionChart ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
              <div className="bg-neutral-100 border border-neutral-300/70 p-8 rounded-md shadow-sm h-full relative overflow-hidden group">
                {/* Decorative top bar */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-neutral-700 via-neutral-900 to-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Activity size={18} className="text-neutral-900" />
                      <h3 className="text-xl font-black text-neutral-900 tracking-tight">Gallery Schedule</h3>
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">Live events, exhibitions, and showcases.</p>
                  </div>
                  {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.INVENTORY_PERSONNEL) && (
                    <button
                      onClick={onManageEvents}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-50 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all shadow-sm hover:shadow-md border border-neutral-200 transform hover:-translate-y-0.5"
                    >
                      View Calendar <ArrowRight size={14} />
                    </button>
                  )}
                </div>

                <div className="space-y-8 relative z-10">
                  {(isLoadingEvents || isLoadingArtworks) && events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                      <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
                      <p className="text-neutral-500 text-sm font-medium">Synchronizing gallery schedule...</p>
                    </div>
                  ) : (() => {
                    const activeEvents = (events || []).filter(e => {
                      if (e.status === EventStatus.RECENT) return false;
                      // Dynamic filter if dates are provided and not timeless
                      if (e.endDate && !e.isTimeless) {
                        const end = new Date(e.endDate);
                        end.setHours(23, 59, 59, 999);
                        if (now > end.getTime()) {
                          // Only hide if it's strictly enforced or if it's very old
                          if (e.isStrictDuration || (now - end.getTime() > 7 * 24 * 60 * 60 * 1000)) {
                            return false;
                          }
                        }
                      }
                      return true;
                    });

                    if (activeEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-neutral-50/50 rounded-md border border-dashed border-neutral-200">
                          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-neutral-400">
                            <Box size={24} />
                          </div>
                          <p className="text-neutral-900 font-bold">No Active Exhibitions</p>
                          <p className="text-neutral-500 text-sm mt-1">Schedule a new event to get started.</p>
                        </div>
                      );
                    }

                    return activeEvents.map((event) => (
                      <div key={event.id} className="relative pl-8 before:absolute before:left-3 before:top-3 before:bottom-0 before:w-0.5 before:bg-neutral-100 last:before:hidden">
                        {/* Timeline Dot */}
                        <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 ${event.status === EventStatus.LIVE ? 'bg-neutral-900 ring-4 ring-neutral-900/20' : 'bg-emerald-500'
                          }`}></div>

                        <div className="bg-neutral-100/50 hover:bg-neutral-100 p-5 rounded-md border border-neutral-150/40 hover:border-neutral-200 hover:shadow-md transition-all duration-300 group/card">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <EventBadge status={event.status} />
                                <h4 className="text-lg font-bold text-neutral-900 group-hover/card:text-neutral-600 transition-colors">{event.title}</h4>
                              </div>
                              <p className="text-sm text-neutral-500 font-medium flex items-center space-x-2">
                                <span className="bg-white px-2.5 py-1 rounded-full border border-neutral-150/40 text-xs shadow-sm">{event.location}</span>
                                <span className="text-neutral-350">•</span>
                                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
                                  {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  {event.isTimeless ? ' — Indefinite' : ` — ${new Date(event.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            {event.artworkIds.slice(0, 4).map(artId => {
                              const art = (filteredArtworks || []).find(a => a.id === artId);
                              return art ? (
                                <button
                                  key={artId}
                                  onClick={() => onSelectArt(art.id)}
                                  className="flex items-center space-x-3 bg-white hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-350/50 p-1 pr-4 rounded-full transition-all group/art shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                                >
                                  <OptimizedImage
                                    src={art.imageUrl}
                                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                                    alt={art.title}
                                  />
                                  <div className="text-left">
                                    <p className="text-[11px] font-bold text-neutral-700 group-hover/art:text-neutral-900 line-clamp-1">{art.title}</p>
                                  </div>
                                </button>
                              ) : null;
                            })}
                            {event.artworkIds.length > 4 && (
                              <div className="h-11 px-4 flex items-center justify-center bg-neutral-100 rounded-full text-[10px] font-bold text-neutral-500 border border-neutral-200">
                                +{event.artworkIds.length - 4} more
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Distribution Pie Chart Section */}
          {permissions.dashboardShowDistributionChart && (
            <div className={`${permissions.dashboardShowGallerySchedule ? '' : 'lg:col-span-3'} space-y-8`}>
              <div className="bg-neutral-100 border border-neutral-300/70 p-6 rounded-md shadow-sm h-[380px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Box size={100} />
                </div>
                <h3 className="text-sm font-black text-neutral-900 mb-2 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-neutral-500 rounded-full"></span>
                  Distribution
                </h3>
                <div className="flex-1 w-full min-h-[250px] relative">
                  <div className="absolute inset-0">
                    {statusData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {statusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#525252' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-neutral-400 text-xs font-bold">
                        No data to visualize
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeStat && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 md:p-8">
          <div className="bg-white rounded-md w-full max-w-3xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col relative my-auto">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] leading-none mb-1">
                  Stat Details
                </p>
                <h3 className="text-lg font-bold text-neutral-900 leading-none">
                  {activeStat === 'inventory' && 'Total Inventory'}
                  {activeStat === 'sold' && 'Total Sold'}
                  {activeStat === 'reserved' && 'Total Reserved'}
                  {activeStat === 'revenue' && 'Total Revenue'}
                </h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {activeStat === 'revenue' && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('sales');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-md text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-all cursor-pointer"
                  >
                    Open Sales View
                  </button>
                )}
                {activeStat === 'sold' && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('sales');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-md text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-all cursor-pointer"
                  >
                    Open Sales View
                  </button>
                )}
                {activeStat === 'reserved' && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('reservations');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-md text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-all cursor-pointer"
                  >
                    Open Reservation View
                  </button>
                )}
                {activeStat === 'inventory' && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('operations');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-md text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-all cursor-pointer"
                  >
                    Open Gallery Operations
                  </button>
                )}
                <button
                  onClick={() => setActiveStat(null)}
                  className="p-2 rounded-full bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer border border-neutral-200 flex items-center justify-center w-8 h-8"
                  aria-label="Close modal"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeStat === 'inventory' && (
                <div className="space-y-8">
                  {/* Summary Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-neutral-900 text-white p-5 rounded-xl border border-neutral-800 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Asset Value</p>
                        <p className="text-3xl font-black text-white">₱{inventoryMetrics.totalValue.toLocaleString()}</p>
                      </div>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-white/10 transition-colors"></div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Physical Count</p>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-neutral-900">{inventoryMetrics.totalCount}</p>
                        <div className="px-2 py-1 bg-neutral-100 rounded-md text-[10px] font-bold text-neutral-600">UNITS</div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Active Branches</p>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-neutral-900">{inventoryMetrics.branchData.length}</p>
                        <div className="px-2 py-1 bg-neutral-100 rounded-md text-[10px] font-bold text-neutral-600">LOCATIONS</div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Analysis Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Status Distribution */}
                    <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                      <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                        Status Distribution
                      </h4>
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={inventoryMetrics.statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {inventoryMetrics.statusData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={
                                    entry.name === 'Available' ? '#10b981' :
                                    entry.name === 'Sold' ? '#3b82f6' :
                                    entry.name === 'Reserved' ? '#f59e0b' :
                                    entry.name === 'Returned' ? '#ef4444' :
                                    '#737373'
                                  } 
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                fontWeight: '900',
                                textTransform: 'uppercase'
                              }} 
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Branch Allocation */}
                    <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                      <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                        Branch Allocation
                      </h4>
                      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                        {inventoryMetrics.branchData.map((item) => (
                          <div key={item.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                              <span className="text-neutral-500">{item.name}</span>
                              <span className="text-neutral-900">{item.value} Items</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.value / inventoryMetrics.totalCount) * 100}%` }}
                                className="h-full bg-neutral-900 rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Registry */}
                  <div>
                    <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                      Latest Inventory Registry
                    </h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredArtworks.slice().reverse().slice(0, 15).map(art => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:border-neutral-900 bg-white transition-all group cursor-pointer"
                          onClick={() => {
                            onSelectArt(art.id);
                            setActiveStat(null);
                          }}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative">
                              <OptimizedImage
                                src={art.imageUrl}
                                alt={art.title}
                                className="w-12 h-12 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                              />
                              <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-white ${
                                art.status === 'Available' ? 'bg-emerald-500' :
                                art.status === 'Reserved' ? 'bg-amber-500' :
                                art.status === 'Sold' ? 'bg-blue-500' :
                                'bg-neutral-400'
                              }`}></div>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-neutral-900 group-hover:text-black truncate uppercase tracking-tight">
                                {art.title}
                              </p>
                              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                                {art.artist} • <span className="text-neutral-400">{art.currentBranch}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">{art.status}</p>
                            <p className="text-sm font-black text-neutral-900">
                              ₱{(art.price || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeStat === 'sold' && (
                <div className="space-y-8">
                  {/* Summary Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-neutral-900 text-white p-6 rounded-xl border border-neutral-800 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Realized Revenue</p>
                        <p className="text-4xl font-black text-white">₱{soldMetrics.totalValue.toLocaleString()}</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Growth Positive</span>
                          <TrendingUp size={12} className="text-emerald-400" />
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-emerald-500/20 transition-colors"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Sales Volume</p>
                        <p className="text-3xl font-black text-neutral-900">{soldMetrics.totalCount}</p>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Top Branch</p>
                        <p className="text-lg font-black text-neutral-900 uppercase">{soldMetrics.branchData[0]?.name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Visual Analysis Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Artists (Leaderboard) */}
                    <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                      <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                        Top Performing Artists
                      </h4>
                      <div className="space-y-4">
                        {soldMetrics.artistData.map((item, idx) => (
                          <div key={item.name} className="flex items-center gap-4">
                            <div className="w-6 h-6 rounded-md bg-neutral-200 flex items-center justify-center text-[10px] font-black text-neutral-600">
                              #{idx + 1}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                                <span className="text-neutral-900">{item.name}</span>
                                <span className="text-emerald-600">{item.value} Sold</span>
                              </div>
                              <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(item.value / soldMetrics.totalCount) * 100}%` }}
                                  className="h-full bg-emerald-500 rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sales by Branch */}
                    <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                      <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                        Branch Contribution
                      </h4>
                      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                        {soldMetrics.branchData.map((item) => (
                          <div key={item.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                              <span className="text-neutral-500">{item.name}</span>
                              <span className="text-neutral-900">{item.value} Sales</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.value / soldMetrics.totalCount) * 100}%` }}
                                className="h-full bg-blue-500 rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Ledger */}
                  <div>
                    <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                      Recent Sales Ledger
                    </h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {soldArtworks.slice(0, 20).map(art => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:border-neutral-900 bg-white transition-all group cursor-pointer"
                          onClick={() => {
                            onSelectArt(art.id);
                            setActiveStat(null);
                          }}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <OptimizedImage
                              src={art.imageUrl}
                              alt={art.title}
                              className="w-12 h-12 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-neutral-900 group-hover:text-black truncate uppercase tracking-tight">
                                {art.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                                  {art.artist} • <span className="text-neutral-400">{art.currentBranch}</span>
                                </p>
                                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-sm uppercase tracking-tighter">Verified</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-neutral-900">
                              ₱{(art.price || 0).toLocaleString()}
                            </p>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase mt-0.5">Sale Finalized</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeStat === 'revenue' && (
                <div className="space-y-8">
                  {/* Summary Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-neutral-900 text-white p-6 rounded-xl border border-neutral-800 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Potential Gross Revenue</p>
                        <p className="text-4xl font-black text-white">₱{revenueMetrics.totalGross.toLocaleString()}</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Analysis Confidence</span>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                            {Math.round((revenueMetrics.totalCollected / (revenueMetrics.totalGross || 1)) * 100)}% Realized
                          </span>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-white/10 transition-colors"></div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between group hover:border-neutral-900 transition-colors">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Collected Revenue</p>
                          <p className="text-2xl font-black text-neutral-900">₱{revenueMetrics.totalCollected.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-neutral-900 text-white rounded-lg flex items-center justify-center">
                          <Activity size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between group hover:border-neutral-900 transition-colors">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Outstanding Balance</p>
                          <p className="text-2xl font-black text-neutral-900">₱{revenueMetrics.totalToBeCollected.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-neutral-100 text-neutral-400 rounded-lg flex items-center justify-center">
                          <Clock size={24} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Analysis Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Revenue Sources */}
                    <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                      <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                        Revenue Sources
                      </h4>
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Full Payments', value: revenueMetrics.fullyPaid },
                                { name: 'Installment Base', value: revenueMetrics.installmentsCollected }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                fontWeight: '900',
                                textTransform: 'uppercase'
                              }} 
                              formatter={(value: number | undefined) => value ? `₱${value.toLocaleString()}` : '₱0'}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Branch Revenue Performance */}
                    <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                      <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                        Branch Financial Performance
                      </h4>
                      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                        {revenueMetrics.branchRevenueData.map((item) => (
                          <div key={item.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                              <span className="text-neutral-500">{item.name}</span>
                              <span className="text-neutral-900">₱{item.value.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.value / revenueMetrics.totalGross) * 100}%` }}
                                className="h-full bg-neutral-900 rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Installment Analysis Deep-Dive */}
                  <div className="bg-white p-8 rounded-2xl shadow-xl relative overflow-hidden border border-neutral-200">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-[120px] pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                          <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2">Payment Plan Tracker</h4>
                          <p className="text-2xl font-black text-neutral-900">Money Collected & Still Owed</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Active Plans</p>
                            <p className="text-xl font-black text-neutral-900">{revenueMetrics.installmentSalesCount}</p>
                          </div>
                          <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                            <Activity size={20} className="text-emerald-400" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-6">
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Cash Collected</p>
                            <div className="flex items-end gap-2 mb-2">
                              <p className="text-3xl font-black text-neutral-900">₱{revenueMetrics.installmentsCollected.toLocaleString()}</p>
                              <p className="text-xs font-bold text-emerald-600 mb-1.5 uppercase">Received</p>
                            </div>
                            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(revenueMetrics.installmentsCollected / (revenueMetrics.totalInstallmentBaseValue || 1)) * 100}%` }}
                                className="h-full bg-emerald-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                             <div>
                               <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-tighter mb-1">Still Owed</p>
                               <p className="text-sm font-black text-neutral-900">₱{revenueMetrics.totalPendingInstallments.toLocaleString()}</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-tighter mb-1">Downpayments</p>
                               <p className="text-sm font-black text-emerald-600">₱{revenueMetrics.totalDownpayments.toLocaleString()}</p>
                             </div>
                          </div>
                        </div>

                        <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-100 flex flex-col justify-between">
                           <div>
                             <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-4">Average Downpayment</p>
                             <div className="flex items-center gap-3">
                               <div className="text-4xl font-black text-neutral-900">{revenueMetrics.avgDownpaymentPct.toFixed(1)}%</div>
                               <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                    style={{ width: `${revenueMetrics.avgDownpaymentPct}%` }}
                                  />
                               </div>
                             </div>
                             <p className="text-[9px] font-medium text-neutral-400 mt-2 italic">Typical upfront payment amount across all active plans.</p>
                           </div>
                        </div>

                        <div className="flex flex-col justify-center">
                           <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-100 space-y-4">
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-bold text-neutral-500 uppercase">Total Plan Value</span>
                                 <span className="text-xs font-black text-neutral-900">₱{revenueMetrics.totalInstallmentBaseValue.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-bold text-neutral-500 uppercase">Collection Progress</span>
                                 <span className="text-xs font-black text-emerald-600">
                                    {Math.round((revenueMetrics.installmentsCollected / (revenueMetrics.totalInstallmentBaseValue || 1)) * 100)}%
                                 </span>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                                 <span className="text-[10px] font-black text-neutral-900 uppercase">Share of Total Sales</span>
                                 <span className="text-xs font-black text-neutral-900">
                                    {Math.round((revenueMetrics.totalInstallmentBaseValue / (revenueMetrics.totalGross || 1)) * 100)}%
                                 </span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Ledger */}
                  <div>
                    <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                      Recent Revenue Stream
                    </h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {revenueDetails.length === 0 ? (
                        <p className="text-sm text-neutral-400 bg-neutral-50 p-8 rounded-md text-center border border-dashed border-neutral-200">No recorded stream yet.</p>
                      ) : (
                        revenueDetails.map(({ sale, art }) => (
                          <div
                            key={art?.id || Math.random()}
                            className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:border-neutral-900 bg-white transition-all group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {art && (
                                <div className="relative">
                                  <OptimizedImage
                                    src={art.imageUrl}
                                    alt={art.title}
                                    className="w-12 h-12 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                                  />
                                  {sale?.isDownpayment && (
                                    <div className="absolute -top-1 -left-1 bg-amber-500 text-white text-[7px] font-black px-1 py-0.5 rounded shadow-sm">
                                      INSTALL
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-black text-neutral-900 truncate uppercase tracking-tight">
                                  {art?.title || 'Artwork'}
                                </p>
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                                  {sale?.clientName || 'Client'} • {sale ? new Date(sale.saleDate).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-neutral-900">
                                ₱{(art?.price || 0).toLocaleString()}
                              </p>
                              {sale?.isDownpayment && (
                                <p className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                  <span>₱{( (sale.status === 'Approved' ? (sale.downpayment || 0) : 0) + (sale.installments || []).filter(i => !i.isPending).reduce((s, i) => s + i.amount, 0) ).toLocaleString()} Recv</span>
                                  <span className="text-neutral-400 font-bold">
                                    ({Math.round((( (sale.status === 'Approved' ? (sale.downpayment || 0) : 0) + (sale.installments || []).filter(i => !i.isPending).reduce((s, i) => s + i.amount, 0) ) / (art?.price || 1)) * 100)}%)
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeStat === 'reserved' && (
                <div className="space-y-8">
                  {/* Summary Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-amber-900 text-white p-6 rounded-xl border border-amber-800 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1">Potential Revenue On Hold</p>
                        <p className="text-4xl font-black text-white">₱{reservedMetrics.totalValue.toLocaleString()}</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Active Holds</span>
                          <Clock size={12} className="text-amber-400" />
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-amber-500/20 transition-colors"></div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Reservation Count</p>
                          <p className="text-3xl font-black text-neutral-900">{reservedMetrics.totalCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                          <Sparkles size={24} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Analysis Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Hold Intents */}
                    <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                      <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                        Reservation Intent
                      </h4>
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reservedMetrics.intentData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {reservedMetrics.intentData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={
                                    entry.name === 'Auction Block' ? '#ef4444' :
                                    entry.name === 'Exhibition' ? '#8b5cf6' :
                                    '#f59e0b'
                                  } 
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                fontWeight: '900',
                                textTransform: 'uppercase'
                              }} 
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Hold Allocation by Branch */}
                    <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                      <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                        Hold Allocation by Branch
                      </h4>
                      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                        {reservedMetrics.branchData.map((item) => (
                          <div key={item.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                              <span className="text-neutral-500">{item.name}</span>
                              <span className="text-neutral-900">{item.value} Holds</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.value / reservedMetrics.totalCount) * 100}%` }}
                                className="h-full bg-amber-500 rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active Registry */}
                  <div>
                    <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                      Active Reservation Registry
                    </h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {reservedArtworks.length === 0 ? (
                        <p className="text-sm text-neutral-400 bg-neutral-50 p-8 rounded-md text-center border border-dashed border-neutral-200">No reserved artworks found.</p>
                      ) : (
                        reservedArtworks.map(art => (
                          <div
                            key={art.id}
                            className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:border-amber-900 bg-white transition-all group cursor-pointer"
                            onClick={() => {
                              onSelectArt(art.id);
                              setActiveStat(null);
                            }}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <OptimizedImage
                                src={art.imageUrl}
                                alt={art.title}
                                className="w-12 h-12 rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="min-w-0">
                              <p className="text-sm font-black text-neutral-900 group-hover:text-amber-900 truncate uppercase tracking-tight">
                                {art.title}
                              </p>
                              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                                {art.artist} • <span className="text-neutral-400">{art.currentBranch}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Reserved</p>
                            <p className="text-sm font-black text-neutral-900">
                              ₱{(art.price || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Team Status (Facebook style) */}
      {permissions.dashboardShowTeamPresence && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
          <AnimatePresence>
            {isTeamPanelOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.75, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.75, y: 30 }}
                transition={{ type: 'spring', damping: 14, stiffness: 350 }}
                className="mb-3 w-80 bg-white border border-neutral-300 shadow-2xl rounded-md overflow-hidden flex flex-col max-h-[450px] origin-bottom-right"
              >
                {/* Header */}
                <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider">Team Presence ({teamStatus.filter(u => u.isOnline).length} Active)</span>
                  </div>
                  <button 
                    onClick={() => setIsTeamPanelOpen(false)}
                    className="text-neutral-400 hover:text-white transition-colors text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
                {/* List */}
                <div className="overflow-y-auto p-2 space-y-1 divide-y divide-neutral-100 max-h-[380px] bg-neutral-50/50">
                  {teamStatus.length === 0 ? (
                    <p className="text-xs text-neutral-400 p-4 text-center">No other team members.</p>
                  ) : (
                    teamStatus.map(user => (
                      <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-neutral-100/80 rounded-md transition-colors pt-2 first:pt-0">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${user.isOnline ? 'bg-emerald-500' : 'bg-neutral-400'}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {user.name} {user.isMe && <span className="text-neutral-400 font-normal ml-1">(You)</span>}
                          </p>
                          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide">
                            {user.role} {user.branch && `• ${user.branch}`}
                          </p>
                        </div>
                        {user.isOnline ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-sm">Active</span>
                        ) : (
                          <span className="text-[9px] font-medium text-neutral-400">{formatLastSeen(user.lastSeen)}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => setIsTeamPanelOpen(!isTeamPanelOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-black transition-all cursor-pointer z-50 group"
          >
            <div className="relative">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <span className="text-xs font-black uppercase tracking-widest">
              Team ({teamStatus.filter(u => u.isOnline).length})
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
