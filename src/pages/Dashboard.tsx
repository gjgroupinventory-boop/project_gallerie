
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Artwork, SaleRecord, ArtworkStatus, ExhibitionEvent, EventStatus, UserAccount, UserRole } from '../types';
import { ICONS } from '../constants';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { TrendingUp, ArrowRight, Activity, Box, Sparkles, Clock } from 'lucide-react';
import { supabase } from '../supabase';
import { OptimizedImage } from '../components/OptimizedImage';

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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, [artworks, sales, events, currentUser]);

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

  const permissions = currentUser?.permissions;

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
      gradient: 'from-white to-neutral-50',
      shadow: 'shadow-neutral-200',
      textColor: 'text-neutral-900',
      target: 'inventory' as const
    },
    {
      id: 'sold' as const,
      label: 'Total Sold',
      value: totalSold.toLocaleString(),
      icon: ICONS.Sales,
      gradient: 'from-white to-neutral-50',
      shadow: 'shadow-neutral-200',
      textColor: 'text-neutral-900',
      target: 'sales' as const
    },
    {
      id: 'reserved' as const,
      label: 'Total Reserved',
      value: totalReserved,
      icon: <Clock size={24} className="text-neutral-900" />,
      gradient: 'from-white to-neutral-50',
      shadow: 'shadow-neutral-200',
      textColor: 'text-neutral-900',
      target: 'inventory' as const
    },
    {
      id: 'revenue' as const,
      label: 'Gross Revenue',
      value: `₱${revenueMetrics.totalGross.toLocaleString()}`,
      isRevenue: true,
      metrics: revenueMetrics,
      icon: <TrendingUp size={24} className="text-white" />,
      gradient: 'from-[#323130] to-[#201f1e]',
      shadow: 'shadow-neutral-900/20',
      textColor: 'text-white',
      target: 'sales' as const
    },
  ];

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
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-md bg-white p-[1px] shadow-sm border border-neutral-200">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white text-neutral-900 rounded-md px-8 py-7">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-24 w-64 h-64 bg-neutral-100 blur-3xl rounded-full" />
            <div className="absolute -left-16 -bottom-24 w-72 h-72 bg-neutral-100 blur-3xl rounded-full" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center space-x-2 rounded-sm bg-neutral-100 px-3 py-1 border border-neutral-200 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              <Sparkles size={12} />
              <span>Gallery Intelligence</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900">
              Hi, {displayName}
            </h1>
            <p className="text-sm md:text-base text-neutral-500 max-w-xl">
              Here&apos;s what&apos;s happening across your collection, branches, and sales today.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <button 
                onClick={() => setActiveStat('inventory')}
                className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold uppercase tracking-wider transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                {totalInventory} in catalog
              </button>
              <button 
                onClick={() => setActiveStat('sold')}
                className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-900 border border-neutral-700 text-white font-bold uppercase tracking-wider transition-all hover:bg-black hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                {totalSold} sold
              </button>
              <button 
                onClick={() => setActiveStat('reserved')}
                className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-100 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                {totalReserved} reserved
              </button>
              <button 
                onClick={() => setActiveStat('revenue')}
                className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-100 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                ₱{revenueMetrics.totalCollected.toLocaleString()} collected
              </button>
            </div>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Today&apos;s Date</p>
              <p className="text-xs md:text-sm font-bold text-neutral-900">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="inline-flex items-center space-x-2 rounded-sm bg-emerald-600 px-3 py-1 border border-emerald-500 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Dashboard Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
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
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className={`relative overflow-hidden rounded-md p-4.5 max-[1512px]:p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md bg-gradient-to-br ${stat.gradient} cursor-pointer active:scale-[0.99] group border border-neutral-200`}
            onClick={() => setActiveStat(stat.id)}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Background Decorative Circles */}
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-50 ${stat.isRevenue ? 'bg-white/5' : 'bg-neutral-100'}`}></div>
            <div className={`absolute -left-4 -bottom-4 w-16 h-16 rounded-full blur-xl opacity-50 ${stat.isRevenue ? 'bg-white/5' : 'bg-neutral-50'}`}></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-sm ${stat.isRevenue ? 'bg-white/10 text-white' : 'bg-white text-neutral-900'} border border-neutral-100 shadow-sm`}>
                  {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 20 })}
                </div>
                {i === 1 && <div className="px-2 py-0.5 rounded-sm bg-neutral-100 text-neutral-600 text-[9px] font-bold border border-neutral-200 flex items-center gap-1">
                  <TrendingUp size={10} /> +12%
                </div>}
              </div>

              <div className="mt-4">
                {stat.isRevenue && stat.metrics ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-black tracking-tight text-white drop-shadow-sm">₱{stat.metrics.totalGross.toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Total Gross Sales</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-1.5 p-2.5 bg-white/5 rounded-sm border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-white/50">Fully Paid</span>
                        <span className="text-[10px] font-black text-emerald-400">₱{stat.metrics.fullyPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-white/50">Installments</span>
                        <span className="text-[10px] font-black text-amber-400">₱{stat.metrics.installmentsCollected.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-white/80">To Collect</span>
                        <span className="text-[10px] font-black text-white">₱{stat.metrics.totalToBeCollected.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={`text-2xl font-black tracking-tight ${stat.textColor} drop-shadow-sm`}>{stat.value}</p>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${stat.textColor}`}>{stat.label}</p>
                      {(stat as any).subValue && (
                        <p className={`text-[9px] font-black uppercase tracking-widest bg-white/20 px-1 py-0.5 rounded ${stat.textColor}`}>
                          {(stat as any).subValue}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exhibition Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-md border border-neutral-200 shadow-sm h-full relative overflow-hidden group">
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
                  className="flex items-center gap-2 px-6 py-2.5 rounded-sm bg-neutral-50 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all shadow-sm hover:shadow-md border border-neutral-200 transform hover:-translate-y-0.5"
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

                    <div className="bg-neutral-50/50 hover:bg-white p-5 rounded-md border border-neutral-100 hover:border-neutral-200 hover:shadow-lg transition-all duration-300 group/card">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <EventBadge status={event.status} />
                            <h4 className="text-lg font-bold text-neutral-900 group-hover/card:text-neutral-600 transition-colors">{event.title}</h4>
                          </div>
                          <p className="text-sm text-neutral-500 font-medium flex items-center space-x-2">
                            <span className="bg-white px-2 py-1 rounded-sm border border-neutral-100 text-xs shadow-sm">{event.location}</span>
                            <span className="text-neutral-300">•</span>
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
                              className="flex items-center space-x-3 bg-white hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 p-1 pr-4 rounded-sm transition-all group/art shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            >
                              <OptimizedImage
                                src={art.imageUrl}
                                className="w-8 h-8 rounded-md object-cover ring-2 ring-white"
                                alt={art.title}
                              />
                              <div className="text-left">
                                <p className="text-[11px] font-bold text-neutral-700 group-hover/art:text-neutral-900 line-clamp-1">{art.title}</p>
                              </div>
                            </button>
                          ) : null;
                        })}
                        {event.artworkIds.length > 4 && (
                          <div className="h-11 px-4 flex items-center justify-center bg-neutral-100 rounded-sm text-[10px] font-bold text-neutral-500 border border-neutral-200">
                            +{event.artworkIds.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>

        {/* Status Distribution & Recent Additions */}
        <div className="space-y-8">
          {/* Online Users Section */}
          <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                Team Status
              </h3>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider flex items-center gap-1 border border-neutral-200">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"></span>
                {teamStatus.filter(u => u.isOnline).length} Active
              </span>
            </div>
            <div className="space-y-3">
              {teamStatus.length === 0 ? (
                <p className="text-sm text-neutral-400">No other team members.</p>
              ) : (
                teamStatus.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 hover:bg-neutral-50 rounded-md transition-colors">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      {user.isOnline ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                      ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-neutral-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">
                        {user.name} {user.isMe && <span className="text-neutral-400 font-normal ml-1">(You)</span>}
                      </p>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                        {user.role}
                        {user.branch && (
                          <>
                            <span className="text-neutral-300 mx-1.5">•</span>
                            <span className="text-neutral-400">{user.branch}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {user.isOnline ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-sm">Online</span>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded-sm">
                        <Clock size={10} />
                        <span>{formatLastSeen(user.lastSeen)}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm h-[380px] flex flex-col relative overflow-hidden">
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

          <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                Newest
              </h3>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider border border-neutral-200">Just In</span>
            </div>

            <div className="space-y-4">
              {(() => {
                const recent = (artworks || []).slice(-10).reverse();
                const uniqueRecent = Array.from(new Map(recent.filter(a => a && a.id).map(art => [art.id, art])).values()).slice(0, 3);
                
                return uniqueRecent.map((art) => (
                  <div
                    key={art.id}
                  onClick={() => onSelectArt(art.id)}
                  className="flex items-center space-x-4 p-3 hover:bg-neutral-50 rounded-md cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md group border border-transparent hover:border-neutral-100"
                >
                  <div className="relative">
                    <OptimizedImage
                      src={art.imageUrl}
                      alt={art.title}
                      className="w-14 h-14 rounded-md object-cover shadow-sm group-hover:shadow-md transition-shadow"
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-neutral-900 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 truncate group-hover:text-neutral-600 transition-colors">{art.title}</p>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">{art.artist}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {art.importPeriod && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-neutral-50 border border-neutral-200 text-[9px] font-black uppercase tracking-widest text-neutral-600">
                          Imported: {formatImportPeriod(art.importPeriod)}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-neutral-100 border border-neutral-200 text-[9px] font-black uppercase tracking-widest text-neutral-900">
                        Added: {new Date(art.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-neutral-900 mt-1.5">₱{(art.price || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-sm bg-neutral-50 text-neutral-300 group-hover:bg-neutral-200 group-hover:text-neutral-900 transition-colors">
                    <ArrowRight size={14} />
                  </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {activeStat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 md:p-8">
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
        </div>
      )}
    </div>
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

export default Dashboard;
