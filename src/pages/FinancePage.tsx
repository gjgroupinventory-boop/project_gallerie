
import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  Search, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  DollarSign,
  PieChart,
  Activity,
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calculator,
  Award,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../contexts/DataContext';
import { Artwork, SaleRecord, SaleStatus, ArtworkStatus, InstallmentRecord, Branch } from '../types';
import { useArtworkOperations } from '../hooks/useArtworkOperations';

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'specific';
type DetailType = 'fully-paid' | 'installments' | 'combined' | 'sold' | 'approvals' | 'branch' | 'artist' | 'agent' | null;

const FinancePage: React.FC = () => {
  const { sales, artworks, branches } = useData();
  const { handleUpdateSale } = useArtworkOperations();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [selectedBranch, setSelectedBranch] = useState<string>('All Branches');
  const [specificDate, setSpecificDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [artistMetric, setArtistMetric] = useState<'revenue' | 'volume'>('revenue');
  const [activeDetailType, setActiveDetailType] = useState<DetailType>(null);
  const [selectedDetailBranch, setSelectedDetailBranch] = useState<string>('All Branches');
  const [selectedDetailAgent, setSelectedDetailAgent] = useState<string>('All Agents');

  // Installment Payment Record States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentSale = allEffectiveSales.find(s => s.id === selectedInstallmentId);
    if (!currentSale) return;

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Please enter a valid payment amount greater than 0.');
      return;
    }

    const price = currentSale.discountedPrice !== undefined && currentSale.discountedPrice !== null ? currentSale.discountedPrice : (currentSale.artworkSnapshot?.price || 0);
    const paidInstallments = (currentSale.installments || []).filter(i => !i.isPending && !i.isDeclined);
    const downpayment = currentSale.downpayment || 0;
    const totalPaid = downpayment + paidInstallments.reduce((sum, i) => sum + i.amount, 0);
    const balance = Math.max(0, price - totalPaid);

    if (amountNum > balance) {
      setPaymentError(`Payment amount cannot exceed the outstanding balance of ₱${balance.toLocaleString()}.`);
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError('');

    try {
      const newInstallment: InstallmentRecord = {
        id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: amountNum,
        date: new Date().toISOString().split('T')[0],
        recordedBy: 'Admin Staff',
        reference: paymentReference.trim() || undefined,
        createdAt: new Date().toISOString(),
        isPending: false
      };

      const existingInstallments = currentSale.installments || [];
      const updatedInstallments = [...existingInstallments, newInstallment];

      const success = await handleUpdateSale(currentSale.id, {
        installments: updatedInstallments
      });

      if (success) {
        setPaymentSuccess(true);
        setPaymentAmount('');
        setPaymentReference('');
        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentSuccess(false);
        }, 1500);
      } else {
        setPaymentError('Failed to save the payment. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setPaymentError('An unexpected error occurred while saving the payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // 1. All Effective Sales (Real + Virtual)
  const allEffectiveSales = useMemo(() => {
    const existingSaleArtworkIds = new Set(sales.filter(s => !s.isCancelled).map(s => s.artworkId));
    
    const virtualSales = artworks
      .filter(a => (a.status === 'Sold' || a.status === 'Delivered') && !existingSaleArtworkIds.has(a.id))
      .map(a => {
        const soldToMatch = a.remarks?.match(/\[Sold To: (.*?)\]/);
        const clientName = soldToMatch ? soldToMatch[1] : 'Imported Client';

        return {
          id: `virtual-${a.id}`,
          artworkId: a.id,
          clientName: clientName,
          clientEmail: '',
          clientContact: '',
          agentName: 'System Import',
          saleDate: a.createdAt || new Date().toISOString(),
          isDelivered: a.status === 'Delivered',
          deliveryDate: a.status === 'Delivered' ? a.createdAt : undefined,
          status: SaleStatus.APPROVED,
          downpayment: a.price || 0,
          installments: [],
          isDownpayment: false,
          artworkSnapshot: {
               title: a.title,
               artist: a.artist,
               code: a.code,
               imageUrl: a.imageUrl,
               price: a.price,
               currentBranch: a.currentBranch,
               medium: a.medium,
               dimensions: a.dimensions,
               year: a.year
          }
        } as SaleRecord;
      });

    return [...sales, ...virtualSales];
  }, [sales, artworks]);

  // 2. Filtered Sales Logic
  const filteredSales = useMemo(() => {
    const now = new Date();
    return allEffectiveSales.filter(sale => {
      if (sale.status !== SaleStatus.APPROVED || sale.isCancelled) return false;
      
      // Branch Filter
      if (selectedBranch !== 'All Branches' && sale.artworkSnapshot?.currentBranch !== selectedBranch) return false;
      
      const saleDate = new Date(sale.saleDate);
      
      switch (timeFilter) {
        case 'day':
          return saleDate.toDateString() === now.toDateString();
        case 'week': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          return saleDate >= startOfWeek;
        }
        case 'month':
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        case 'year':
          return saleDate.getFullYear() === now.getFullYear();
        case 'specific':
          return saleDate.toISOString().split('T')[0] === specificDate;
        default:
          return true;
      }
    });
  }, [allEffectiveSales, timeFilter, specificDate, selectedBranch]);

  // 2. Metrics Calculations
  const metrics = useMemo(() => {
    let fullyPaidRevenue = 0;
    let installmentCollected = 0;
    let installmentRemaining = 0;
    let totalPotentialRevenue = 0;
    let pendingApprovalValue = 0;
    const branchRevenue: Record<string, number> = {};
    const artistRevenue: Record<string, number> = {};
    const artistSalesCount: Record<string, number> = {};
    const agentRevenue: Record<string, number> = {};

    allEffectiveSales.forEach(sale => {
      if (sale.status === SaleStatus.FOR_SALE_APPROVAL) {
        if (selectedBranch !== 'All Branches' && sale.artworkSnapshot?.currentBranch !== selectedBranch) return;
        const price = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (sale.artworkSnapshot?.price || 0);
        pendingApprovalValue += price;
      }
    });

    filteredSales.forEach(sale => {
      const price = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (sale.artworkSnapshot?.price || 0);
      const branch = sale.artworkSnapshot?.currentBranch || 'Unknown';
      const artist = sale.artworkSnapshot?.artist || 'Unknown';
      const agent = sale.agentName || 'Unknown Agent';

      totalPotentialRevenue += price;
      branchRevenue[branch] = (branchRevenue[branch] || 0) + price;
      artistRevenue[artist] = (artistRevenue[artist] || 0) + price;
      artistSalesCount[artist] = (artistSalesCount[artist] || 0) + 1;
      agentRevenue[agent] = (agentRevenue[agent] || 0) + price;

      const hasInstallments = (sale.installments && sale.installments.length > 0) || sale.isDownpayment;

      if (!hasInstallments) {
        fullyPaidRevenue += price;
      } else {
        const downpayment = sale.downpayment || 0;
        const paidInstallments = (sale.installments || [])
          .filter(i => !i.isPending && !i.isDeclined)
          .reduce((sum, i) => sum + i.amount, 0);
        
        const totalCollected = downpayment + paidInstallments;
        installmentCollected += totalCollected;
        installmentRemaining += Math.max(0, price - totalCollected);
      }
    });

    const totalCollectedCombined = fullyPaidRevenue + installmentCollected;
    const conversionRate = allEffectiveSales.length > 0 
      ? (allEffectiveSales.filter(s => s.status === SaleStatus.APPROVED).length / allEffectiveSales.length) * 100 
      : 0;
    
    const avgTransactionValue = filteredSales.length > 0 
      ? totalPotentialRevenue / filteredSales.length 
      : 0;

    const topArtistsByRevenue = Object.entries(artistRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const topArtistsByVolume = Object.entries(artistSalesCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const totalSoldItems = filteredSales.length;

    const revenueByBranch = Object.entries(branchRevenue)
      .sort(([, a], [, b]) => b - a);

    const topAgentEntry = Object.entries(agentRevenue)
      .sort(([, a], [, b]) => b - a)[0];
    const topBranchEntry = Object.entries(branchRevenue)
      .sort(([, a], [, b]) => b - a)[0];

    const topPerformingAgent = topAgentEntry ? { name: topAgentEntry[0], revenue: topAgentEntry[1] } : null;
    const topPerformingBranch = topBranchEntry ? { name: topBranchEntry[0], revenue: topBranchEntry[1] } : null;

    return {
      fullyPaidRevenue,
      installmentCollected,
      installmentRemaining,
      totalPotentialRevenue,
      totalCollectedCombined,
      totalSoldItems,
      pendingApprovalValue,
      avgTransactionValue,
      topArtistsByRevenue,
      topArtistsByVolume,
      revenueByBranch,
      topPerformingAgent,
      topPerformingBranch
    };
  }, [filteredSales, allEffectiveSales]);

  // 2.5 Unique Agents List
  const allAgents = useMemo(() => {
    const agents = new Set<string>();
    sales.forEach(s => {
      if (s.agentName) agents.add(s.agentName);
    });
    return Array.from(agents).sort();
  }, [sales]);

  // 3. Installment Tracking List
  const installmentSales = useMemo(() => {
    return allEffectiveSales.filter(sale => {
      if (sale.status !== SaleStatus.APPROVED || sale.isCancelled) return false;
      const hasInstallments = (sale.installments && sale.installments.length > 0) || sale.isDownpayment;
      if (!hasInstallments) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sale.clientName.toLowerCase().includes(q) ||
          sale.artworkSnapshot?.title.toLowerCase().includes(q) ||
          sale.artworkSnapshot?.code.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [allEffectiveSales, searchQuery]);

  const selectedSale = useMemo(() => 
    allEffectiveSales.find(s => s.id === selectedInstallmentId), 
    [allEffectiveSales, selectedInstallmentId]
  );

  // 4. Monthly Trend Data for SVG Area Chart
  const monthlyTrendData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const data = months.map(month => ({
      month,
      realized: 0,
      projected: 0
    }));

    allEffectiveSales.forEach(sale => {
      if (sale.status !== SaleStatus.APPROVED || sale.isCancelled) return;
      if (selectedBranch !== 'All Branches' && sale.artworkSnapshot?.currentBranch !== selectedBranch) return;
      
      const saleDate = new Date(sale.saleDate);
      if (saleDate.getFullYear() !== currentYear) return;
      
      const monthIdx = saleDate.getMonth();
      if (monthIdx < 0 || monthIdx > 11) return;
      
      const price = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (sale.artworkSnapshot?.price || 0);
      const hasInstallments = (sale.installments && sale.installments.length > 0) || sale.isDownpayment;
      
      if (!hasInstallments) {
        data[monthIdx].realized += price;
        data[monthIdx].projected += price;
      } else {
        const downpayment = sale.downpayment || 0;
        const paidInstallments = (sale.installments || [])
          .filter(i => !i.isPending && !i.isDeclined)
          .reduce((sum, i) => sum + i.amount, 0);
        
        const totalCollected = downpayment + paidInstallments;
        data[monthIdx].realized += totalCollected;
        data[monthIdx].projected += price;
      }
    });

    return data;
  }, [allEffectiveSales, selectedBranch]);

  const renderSVGChart = () => {
    const maxVal = Math.max(...monthlyTrendData.map(d => Math.max(d.realized, d.projected)), 100000);
    const width = 600;
    const height = 140;
    const paddingLeft = 65;
    const paddingRight = 20;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = monthlyTrendData.map((d, i) => {
      const x = paddingLeft + (i / 11) * chartWidth;
      const yRealized = paddingTop + chartHeight - (d.realized / maxVal) * chartHeight;
      const yProjected = paddingTop + chartHeight - (d.projected / maxVal) * chartHeight;
      return { x, yRealized, yProjected, month: d.month };
    });

    const realizedLinePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yRealized}`).join(' ');
    const realizedAreaPath = `${realizedLinePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

    const projectedLinePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yProjected}`).join(' ');
    const projectedAreaPath = `${projectedLinePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

    return (
      <div className="w-full h-40 mt-6 relative select-none">
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio;
            const gridVal = maxVal * (1 - ratio);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={7}
                  fontWeight="bold"
                  fill="#9ca3af"
                  className="font-mono"
                >
                  ₱{Math.round(gridVal / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Projected Area & Line */}
          <path d={projectedAreaPath} fill="url(#projectedGrad)" opacity={0.3} />
          <path d={projectedLinePath} fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="3 3" />

          {/* Realized Area & Line */}
          <path d={realizedAreaPath} fill="url(#realizedGrad)" opacity={0.12} />
          <path d={realizedLinePath} fill="none" stroke="#1f2937" strokeWidth={2} />

          {/* Interactive dots & values */}
          {points.map((p, idx) => {
            const showDot = p.yRealized < paddingTop + chartHeight;
            if (!showDot) return null;
            return (
              <circle
                key={idx}
                cx={p.x}
                cy={p.yRealized}
                r={3}
                fill="#1f2937"
                stroke="#ffffff"
                strokeWidth={1}
              />
            );
          })}

          {/* Month Labels */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              fontSize={8}
              fontWeight="950"
              fill="#9ca3af"
              className="uppercase tracking-widest font-sans"
            >
              {p.month}
            </text>
          ))}

          {/* Gradients */}
          <defs>
            <linearGradient id="realizedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f2937" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1f2937" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Main Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Finance Control</h1>
          <p className="text-neutral-500 mt-1 font-medium">Real-time revenue monitoring and fiscal projections.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 relative isolate">
            {(['day', 'week', 'month', 'year', 'specific'] as TimeFilter[]).map(f => {
              const isActive = timeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors relative z-10 ${
                    isActive 
                      ? 'text-neutral-900' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <span className="relative z-10">{f}</span>
                  {isActive && (
                    <motion.div
                      layoutId="finance-filter-active"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-[11px] font-black uppercase tracking-wider focus:outline-none appearance-none cursor-pointer hover:bg-neutral-50 transition-colors"
            >
              <option>All Branches</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 rotate-90" size={14} />
          </div>

          {timeFilter === 'specific' && (
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          )}
          <button className="p-2.5 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-neutral-600">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <motion.div 
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          { 
            label: 'Fully Paid Revenue', 
            value: metrics.fullyPaidRevenue, 
            icon: CheckCircle2, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            trend: '+12.5%'
          },
          { 
            label: 'Installment Collected', 
            value: metrics.installmentCollected, 
            icon: Clock, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50',
            trend: '+8.2%'
          },
          { 
            label: 'Combined Collected', 
            value: metrics.totalCollectedCombined, 
            icon: TrendingUp, 
            color: 'text-neutral-900', 
            bg: 'bg-neutral-100',
            trend: '+10.1%'
          },
          { 
            label: 'Total Items Sold', 
            value: metrics.totalSoldItems, 
            icon: Activity, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50',
            trend: `+${metrics.totalSoldItems > 0 ? '1' : '0'}`
          },
        ].map((m, i) => (
          <motion.div 
            key={i}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (m.label.includes('Fully Paid')) setActiveDetailType('fully-paid');
              if (m.label.includes('Installment')) setActiveDetailType('installments');
              if (m.label.includes('Combined')) setActiveDetailType('combined');
              if (m.label.includes('Sold')) setActiveDetailType('sold');
            }}
            className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${m.bg} ${m.color} transition-transform group-hover:scale-110`}>
                <m.icon size={22} />
              </div>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md uppercase tracking-wider">
                {m.trend}
              </span>
            </div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">{m.label}</p>
            <p className="text-2xl font-black text-neutral-900 mt-1">
              {typeof m.value === 'number' ? `₱${m.value.toLocaleString()}` : m.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Projections & Combined View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-neutral-900">Fiscal Projection</h3>
              <p className="text-sm text-neutral-500 font-medium">Comparing realized vs. potential revenue.</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-900" />
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Realized</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-200" />
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Projected</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-neutral-900 uppercase tracking-tight">Total Portfolio Performance</span>
                <span className="text-neutral-900">
                  ₱{metrics.totalCollectedCombined.toLocaleString()} / ₱{metrics.totalPotentialRevenue.toLocaleString()}
                </span>
              </div>
              <div className="h-4 bg-neutral-100 rounded-full overflow-hidden flex">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrics.totalCollectedCombined / metrics.totalPotentialRevenue) * 100}%` }}
                  className="h-full bg-neutral-900" 
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrics.installmentRemaining / metrics.totalPotentialRevenue) * 100}%` }}
                  className="h-full bg-neutral-200" 
                />
              </div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-3">
                {((metrics.totalCollectedCombined / metrics.totalPotentialRevenue) * 100).toFixed(1)}% Realized
              </p>
              
              <div className="mt-4 pt-4 border-t border-neutral-100/50">
                {renderSVGChart()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-neutral-100">
              <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Realized</p>
                <p className="text-xl font-black text-neutral-900">₱{metrics.totalCollectedCombined.toLocaleString()}</p>
                <p className="text-[10px] text-neutral-500 font-medium mt-1">Fully Paid + Paid Installments</p>
              </div>
              <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Assuming All Paid</p>
                <p className="text-xl font-black text-white">₱{metrics.totalPotentialRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1">Full contractual value of all sales</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Pipeline Value</h4>
              <button 
                onClick={() => setActiveDetailType('approvals')}
                className="text-[9px] font-black text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded transition-colors"
              >
                VIEW ALL
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-neutral-500 uppercase">Pending Approvals</p>
                <p className="text-lg font-black text-neutral-900">₱{metrics.pendingApprovalValue.toLocaleString()}</p>
              </div>
              <div className="pt-4 border-t border-neutral-100">
                <p className="text-[9px] font-bold text-neutral-500 uppercase">Avg. Transaction</p>
                <p className="text-lg font-black text-neutral-900">₱{Math.round(metrics.avgTransactionValue).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">Top Performers</h4>
            <div className="space-y-4">
              <button
                disabled={!metrics.topPerformingBranch}
                onClick={() => {
                  if (metrics.topPerformingBranch) {
                    setSelectedDetailBranch(metrics.topPerformingBranch.name);
                    setActiveDetailType('branch');
                  }
                }}
                className={`w-full text-left flex items-center gap-3 p-2 -m-2 rounded-xl transition-all ${
                  metrics.topPerformingBranch 
                    ? 'hover:bg-neutral-50 cursor-pointer' 
                    : 'opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Top Performing Branch</p>
                  {metrics.topPerformingBranch ? (
                    <div>
                      <p className="text-xs font-black text-neutral-900 truncate mt-0.5">{metrics.topPerformingBranch.name}</p>
                      <p className="text-[11px] font-bold text-emerald-600">₱{metrics.topPerformingBranch.revenue.toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 font-bold uppercase mt-0.5">No data</p>
                  )}
                </div>
              </button>
              
              <button
                disabled={!metrics.topPerformingAgent}
                onClick={() => {
                  if (metrics.topPerformingAgent) {
                    setSelectedDetailAgent(metrics.topPerformingAgent.name);
                    setActiveDetailType('agent');
                  }
                }}
                className={`w-full text-left pt-4 border-t border-neutral-100 flex items-center gap-3 p-2 -mx-2 -mb-2 rounded-xl transition-all ${
                  metrics.topPerformingAgent 
                    ? 'hover:bg-neutral-50 cursor-pointer' 
                    : 'opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Award size={16} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Top Performing Agent</p>
                  {metrics.topPerformingAgent ? (
                    <div>
                      {(() => {
                        const name = metrics.topPerformingAgent.name;
                        if (name.includes(' — ')) {
                          const parts = name.split(' — ');
                          const branch = parts[0];
                          const agent = parts.slice(1).join(' — ');
                          return (
                            <>
                              <p className="text-xs font-black text-neutral-900 truncate mt-0.5" title={agent}>{agent}</p>
                              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider truncate mb-1" title={branch}>{branch}</p>
                            </>
                          );
                        }
                        return (
                          <p className="text-xs font-black text-neutral-900 truncate mt-0.5" title={name}>{name}</p>
                        );
                      })()}
                      <p className="text-[11px] font-bold text-emerald-600">₱{metrics.topPerformingAgent.revenue.toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 font-bold uppercase mt-0.5">No data</p>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Branch Performance</h4>
              <button 
                onClick={() => {
                  setSelectedDetailBranch('All Branches');
                  setActiveDetailType('branch');
                }}
                className="text-[9px] font-black text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded transition-colors"
              >
                DETAILS
              </button>
            </div>
            <div className="space-y-3">
              {metrics.revenueByBranch.map(([branch, revenue]) => {
                const branchShare = metrics.totalPotentialRevenue > 0 ? (revenue / metrics.totalPotentialRevenue) * 100 : 0;
                return (
                  <button
                    key={branch}
                    onClick={() => {
                      setSelectedDetailBranch(branch);
                      setActiveDetailType('branch');
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-transparent hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 transition-all flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold truncate">{branch}</span>
                      <span className="text-xs font-black text-neutral-900">
                        ₱{revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden bg-neutral-100">
                      <div 
                        className="h-full bg-neutral-900" 
                        style={{ width: `${branchShare}%` }} 
                      />
                    </div>
                  </button>
                );
              })}
              {metrics.revenueByBranch.length === 0 && <p className="text-[10px] text-neutral-400 font-bold uppercase py-2">No branch data available</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Artists & Extra Data */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div>
                <h3 className="text-xl font-black text-neutral-900">Top Performing Artists</h3>
                <p className="text-sm text-neutral-500 font-medium">
                  {artistMetric === 'revenue' ? 'Revenue contribution by artist.' : 'Sales volume by artist.'}
                </p>
              </div>
              <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                <button
                  onClick={() => setArtistMetric('revenue')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    artistMetric === 'revenue' 
                      ? 'bg-white text-neutral-900 shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setArtistMetric('volume')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    artistMetric === 'volume' 
                      ? 'bg-white text-neutral-900 shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Volume
                </button>
              </div>
            </div>
            <PieChart size={20} className="text-neutral-300" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              {(artistMetric === 'revenue' ? metrics.topArtistsByRevenue : metrics.topArtistsByVolume).map(([artist, value], idx) => {
                const percentage = artistMetric === 'revenue' 
                  ? (value / (metrics.totalPotentialRevenue || 1)) * 100
                  : (value / (metrics.totalSoldItems || 1)) * 100;
                
                return (
                  <div key={artist} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-neutral-900 uppercase tracking-tight">
                        {idx + 1}. {artist}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400">
                        {artistMetric === 'revenue' ? `${percentage.toFixed(1)}%` : `${value} Sold`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-neutral-900" 
                      />
                    </div>
                  </div>
                );
              })}
              {(artistMetric === 'revenue' ? metrics.topArtistsByRevenue : metrics.topArtistsByVolume).length === 0 && (
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest text-center py-10">No artist data found</p>
              )}
            </div>
            
            <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200/50 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
                    <TrendingUp size={14} className="text-neutral-900" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Market Lead</p>
                    <p className="text-sm font-black text-neutral-900">
                      {artistMetric === 'revenue' ? metrics.topArtistsByRevenue[0]?.[0] : metrics.topArtistsByVolume[0]?.[0] || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
                    <DollarSign size={14} className="text-neutral-900" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Avg. Ticket</p>
                    <p className="text-sm font-black text-neutral-900">₱{Math.round(metrics.avgTransactionValue).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Installment Tracker List */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col h-[600px]">
          <div className="p-6 border-b border-neutral-100">
            <h3 className="text-lg font-black text-neutral-900">Installment Tracker</h3>
            <p className="text-xs text-neutral-500 font-medium mb-4">Active installment plans and collections.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search clients or artworks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {installmentSales.map(sale => {
              const price = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (sale.artworkSnapshot?.price || 0);
              const paid = (sale.downpayment || 0) + (sale.installments || []).filter(i => !i.isPending && !i.isDeclined).reduce((sum, i) => sum + i.amount, 0);
              const progress = (paid / price) * 100;

              return (
                <motion.button
                  key={sale.id}
                  onClick={() => setSelectedInstallmentId(sale.id)}
                  whileHover={{ x: 4 }}
                  className="w-full text-left p-4 rounded-xl border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-black text-neutral-900 uppercase tracking-tight truncate max-w-[150px]">
                        {sale.artworkSnapshot?.title}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase">{sale.clientName}</p>
                    </div>
                    <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-neutral-500">₱{paid.toLocaleString()}</span>
                      <span className="text-neutral-400">
                        {sale.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
                          <span className="flex items-center gap-1">
                            <span className="line-through text-neutral-300 font-normal">₱{(sale.artworkSnapshot?.price || 0).toLocaleString()}</span>
                            <span className="text-emerald-600 font-black">₱{price.toLocaleString()}</span>
                          </span>
                        ) : (
                          `/ ₱${price.toLocaleString()}`
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
            {installmentSales.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                <CreditCard size={40} className="text-neutral-300 mb-4" />
                <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">No active installments found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInstallmentDetail = (sale: SaleRecord) => {
    const price = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (sale.artworkSnapshot?.price || 0);
    const paidInstallments = (sale.installments || []).filter(i => !i.isPending && !i.isDeclined);
    const downpayment = sale.downpayment || 0;
    const totalPaid = downpayment + paidInstallments.reduce((sum, i) => sum + i.amount, 0);
    const balance = Math.max(0, price - totalPaid);
    const progress = (totalPaid / price) * 100;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <motion.button 
          onClick={() => setSelectedInstallmentId(null)}
          whileHover={{ x: -4 }}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors font-black text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                  <img 
                    src={sale.artworkSnapshot?.imageUrl} 
                    alt={sale.artworkSnapshot?.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-md">Installment Plan</span>
                    <h2 className="text-3xl font-black text-neutral-900 mt-2">{sale.artworkSnapshot?.title}</h2>
                    <p className="text-neutral-500 font-bold uppercase text-xs tracking-wider mt-1">{sale.artworkSnapshot?.code} • {sale.artworkSnapshot?.artist}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Contract Value</p>
                      {sale.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
                        <div className="flex flex-col">
                          <span className="line-through text-xs text-neutral-400 font-normal">₱{(sale.artworkSnapshot?.price || 0).toLocaleString()}</span>
                          <span className="text-xl font-black text-neutral-900 mt-0.5">₱{price.toLocaleString()} <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">-{sale.discountPercentage}%</span></span>
                        </div>
                      ) : (
                        <p className="text-xl font-black text-neutral-900">₱{price.toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Paid</p>
                      <p className="text-xl font-black text-emerald-600">₱{totalPaid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Outstanding</p>
                      <p className="text-xl font-black text-rose-600">₱{balance.toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase mb-2">
                      <span className="text-neutral-900">Payment Progress</span>
                      <span className="text-neutral-500">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-neutral-900">Payment History</h3>
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  {paidInstallments.length + (sale.downpayment ? 1 : 0)} Total Payments
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Description</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sale.downpayment && (
                      <tr className="group hover:bg-neutral-50 transition-colors">
                        <td className="px-8 py-4 text-xs font-bold text-neutral-600">
                          {new Date(sale.downpaymentRecordedAt || sale.saleDate).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-2 py-1 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md">Downpayment</span>
                        </td>
                        <td className="px-8 py-4 text-xs font-black text-neutral-900 text-right">₱{sale.downpayment.toLocaleString()}</td>
                        <td className="px-8 py-4 text-xs font-medium text-neutral-400 font-mono tracking-tighter">Initial Payment</td>
                      </tr>
                    )}
                    {paidInstallments.map((inst, idx) => (
                      <tr key={inst.id} className="group hover:bg-neutral-50 transition-colors">
                        <td className="px-8 py-4 text-xs font-bold text-neutral-600">
                          {new Date(inst.date).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-neutral-900">Installment #{idx + 1}</span>
                        </td>
                        <td className="px-8 py-4 text-xs font-black text-neutral-900 text-right">₱{inst.amount.toLocaleString()}</td>
                        <td className="px-8 py-4 text-xs font-medium text-neutral-400 font-mono tracking-tighter">
                          {inst.reference || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Details */}
          <div className="space-y-8">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest mb-6">Client Profile</h3>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 font-black">
                    {sale.clientName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-neutral-900">{sale.clientName}</p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">{sale.clientEmail || 'No Email'}</p>
                  </div>
                </div>
                <div className="pt-5 border-t border-neutral-100 space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Managed By</p>
                    <p className="text-xs font-bold text-neutral-900">{sale.agentName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Sale Date</p>
                    <p className="text-xs font-bold text-neutral-900">{new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Branch</p>
                    <p className="text-xs font-bold text-neutral-900">{sale.artworkSnapshot?.currentBranch || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {balance > 0 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Plan Actions</h4>
                  <p className="text-xs text-neutral-500 font-medium mt-1">Record collections or make adjustments.</p>
                </div>
                <button
                  onClick={() => {
                    setPaymentAmount('');
                    setPaymentReference('');
                    setPaymentError('');
                    setPaymentSuccess(false);
                    setShowPaymentModal(true);
                  }}
                  className="w-full py-3.5 bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-neutral-900/10"
                >
                  <CreditCard size={14} />
                  Record Payment
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-800 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  Fully Settled
                </p>
                <p className="text-xs font-medium text-emerald-700 leading-relaxed">
                  This transaction has been paid in full. No outstanding collections remain.
                </p>
              </div>
            )}

            <div className="bg-neutral-900 rounded-2xl p-6 text-white shadow-xl shadow-neutral-200/50">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 opacity-60">Finance Advisory</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-white/10 rounded-md">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  </div>
                  <p className="text-xs font-medium text-neutral-300">
                    Collection efficiency is at <span className="text-white font-black">{progress.toFixed(0)}%</span> for this contract.
                  </p>
                </div>
                {balance > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-white/10 rounded-md">
                      <Clock size={14} className="text-amber-400" />
                    </div>
                    <p className="text-xs font-medium text-neutral-300">
                      Remaining balance of <span className="text-white font-black">₱{balance.toLocaleString()}</span> is projected for next collection cycle.
                    </p>
                  </div>
                )}
                <button className="w-full mt-4 py-3 bg-white text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors">
                  Generate Statement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Branch Performance Pop-up Dashboard ---
  const renderBranchDashboard = () => {
    const branchSales = selectedDetailBranch === 'All Branches'
      ? filteredSales
      : filteredSales.filter(s => s.artworkSnapshot?.currentBranch === selectedDetailBranch);

    let branchPotential = 0;
    let branchCollected = 0;
    let branchOutstanding = 0;
    let branchSold = branchSales.length;

    branchSales.forEach(s => {
      const price = s.discountedPrice !== undefined && s.discountedPrice !== null ? s.discountedPrice : (s.artworkSnapshot?.price || 0);
      branchPotential += price;

      const hasInstallments = (s.installments && s.installments.length > 0) || s.isDownpayment;
      if (!hasInstallments) {
        branchCollected += price;
      } else {
        const downpayment = s.downpayment || 0;
        const paidInstallments = (s.installments || [])
          .filter(i => !i.isPending && !i.isDeclined)
          .reduce((sum, i) => sum + i.amount, 0);
        const totalCollected = downpayment + paidInstallments;
        branchCollected += totalCollected;
        branchOutstanding += Math.max(0, price - totalCollected);
      }
    });

    const branchArtistRevenue: Record<string, number> = {};
    const branchAgentRevenue: Record<string, number> = {};
    branchSales.forEach(s => {
      const price = s.discountedPrice !== undefined && s.discountedPrice !== null ? s.discountedPrice : (s.artworkSnapshot?.price || 0);
      const artist = s.artworkSnapshot?.artist || 'Unknown';
      const agent = s.agentName || 'Unknown Agent';
      branchArtistRevenue[artist] = (branchArtistRevenue[artist] || 0) + price;
      branchAgentRevenue[agent] = (branchAgentRevenue[agent] || 0) + price;
    });

    const topBranchArtist = Object.entries(branchArtistRevenue).sort(([, a], [, b]) => b - a)[0];
    const topBranchAgent = Object.entries(branchAgentRevenue).sort(([, a], [, b]) => b - a)[0];

    return (
      <div className="space-y-6">
        {/* Branch KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-neutral-50 border border-neutral-200/60 rounded-2xl">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Potential Revenue</p>
            <p className="text-lg font-black text-neutral-900">₱{branchPotential.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Collected Revenue</p>
            <p className="text-lg font-black text-emerald-700">₱{branchCollected.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-amber-50/40 border border-amber-100 rounded-2xl">
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Outstanding Balance</p>
            <p className="text-lg font-black text-amber-700">₱{branchOutstanding.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-2xl">
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Total Sold Count</p>
            <p className="text-lg font-black text-blue-700">{branchSold} Items</p>
          </div>
        </div>

        {/* Branch Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-neutral-50 border border-neutral-200/60 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Top Artist</p>
              {topBranchArtist ? (
                <div>
                  <p className="text-sm font-black text-neutral-900 truncate mt-0.5">{topBranchArtist[0]}</p>
                  <p className="text-xs font-bold text-emerald-600">₱{topBranchArtist[1].toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 font-bold uppercase mt-0.5">No data</p>
              )}
            </div>
          </div>

          <div className="p-5 bg-neutral-50 border border-neutral-200/60 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/50 text-amber-600 flex items-center justify-center shrink-0">
              <Award size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Top Selling Agent</p>
              {topBranchAgent ? (
                <div>
                  <p className="text-sm font-black text-neutral-900 truncate mt-0.5">{topBranchAgent[0]}</p>
                  <p className="text-xs font-bold text-emerald-600">₱{topBranchAgent[1].toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 font-bold uppercase mt-0.5">No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Branch Sales Ledger */}
        <div className="pt-4">
          <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest mb-4">Branch Sales Ledger</h3>
          <div className="space-y-4">
            {branchSales.map(sale => (
              <div 
                key={sale.id}
                className="group flex items-center gap-6 p-4 border border-neutral-100 rounded-2xl hover:bg-neutral-50 hover:border-neutral-200 transition-all"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                  <img 
                    src={sale.artworkSnapshot?.imageUrl} 
                    alt={sale.artworkSnapshot?.title} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 bg-neutral-100 text-[9px] font-black text-neutral-500 rounded uppercase tracking-tighter">
                      {sale.artworkSnapshot?.code || 'NO-CODE'}
                    </span>
                    <p className="text-sm font-black text-neutral-900 truncate uppercase tracking-tight">
                      {sale.artworkSnapshot?.title}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase truncate">{sale.clientName}</p>
                    <span className="w-1 h-1 rounded-full bg-neutral-200" />
                    <p className="text-[10px] text-neutral-400 font-bold uppercase truncate">{sale.artworkSnapshot?.artist}</p>
                    <span className="w-1 h-1 rounded-full bg-neutral-200" />
                    <p className="text-[10px] text-neutral-500 font-black uppercase truncate italic">{sale.artworkSnapshot?.currentBranch}</p>
                  </div>
                </div>
                <div className="text-right">
                  {sale.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
                    <div className="flex flex-col items-end">
                      <span className="line-through text-neutral-400 text-[10px]">₱{(sale.artworkSnapshot?.price || 0).toLocaleString()}</span>
                      <span className="text-sm font-black text-neutral-900">₱{sale.discountedPrice?.toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">-{sale.discountPercentage}% OFF</span>
                    </div>
                  ) : (
                    <p className="text-sm font-black text-neutral-900">₱{(sale.artworkSnapshot?.price || 0).toLocaleString()}</p>
                  )}
                  <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">
                    {new Date(sale.saleDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {branchSales.length === 0 && (
              <p className="text-center text-xs font-bold text-neutral-400 uppercase py-8">No branch records found</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Agent Performance Pop-up Dashboard ---
  const renderAgentDashboard = () => {
    const agentSales = selectedDetailAgent === 'All Agents'
      ? filteredSales
      : filteredSales.filter(s => s.agentName === selectedDetailAgent);

    let agentPotential = 0;
    let agentCollected = 0;
    let agentOutstanding = 0;
    let agentSold = agentSales.length;

    agentSales.forEach(s => {
      const price = s.discountedPrice !== undefined && s.discountedPrice !== null ? s.discountedPrice : (s.artworkSnapshot?.price || 0);
      agentPotential += price;

      const hasInstallments = (s.installments && s.installments.length > 0) || s.isDownpayment;
      if (!hasInstallments) {
        agentCollected += price;
      } else {
        const downpayment = s.downpayment || 0;
        const paidInstallments = (s.installments || [])
          .filter(i => !i.isPending && !i.isDeclined)
          .reduce((sum, i) => sum + i.amount, 0);
        const totalCollected = downpayment + paidInstallments;
        agentCollected += totalCollected;
        agentOutstanding += Math.max(0, price - totalCollected);
      }
    });

    const agentArtistRevenue: Record<string, number> = {};
    const agentBranchRevenue: Record<string, number> = {};
    agentSales.forEach(s => {
      const price = s.discountedPrice !== undefined && s.discountedPrice !== null ? s.discountedPrice : (s.artworkSnapshot?.price || 0);
      const artist = s.artworkSnapshot?.artist || 'Unknown';
      const branch = s.artworkSnapshot?.currentBranch || 'Unknown';
      agentArtistRevenue[artist] = (agentArtistRevenue[artist] || 0) + price;
      agentBranchRevenue[branch] = (agentBranchRevenue[branch] || 0) + price;
    });

    const topAgentArtist = Object.entries(agentArtistRevenue).sort(([, a], [, b]) => b - a)[0];
    const topAgentBranch = Object.entries(agentBranchRevenue).sort(([, a], [, b]) => b - a)[0];

    return (
      <div className="space-y-6">
        {/* Agent KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-neutral-50 border border-neutral-200/60 rounded-2xl">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Potential Sales</p>
            <p className="text-lg font-black text-neutral-900">₱{agentPotential.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Collected Sales</p>
            <p className="text-lg font-black text-emerald-700">₱{agentCollected.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-amber-50/40 border border-amber-100 rounded-2xl">
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Outstanding Balance</p>
            <p className="text-lg font-black text-amber-700">₱{agentOutstanding.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-2xl">
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Total Items Sold</p>
            <p className="text-lg font-black text-blue-700">{agentSold} Items</p>
          </div>
        </div>

        {/* Agent Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-neutral-50 border border-neutral-200/60 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Top Performing Branch</p>
              {topAgentBranch ? (
                <div>
                  <p className="text-sm font-black text-neutral-900 truncate mt-0.5">{topAgentBranch[0]}</p>
                  <p className="text-xs font-bold text-emerald-600">₱{topAgentBranch[1].toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 font-bold uppercase mt-0.5">No data</p>
              )}
            </div>
          </div>

          <div className="p-5 bg-neutral-50 border border-neutral-200/60 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/50 text-amber-600 flex items-center justify-center shrink-0">
              <Award size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Top Selling Artist</p>
              {topAgentArtist ? (
                <div>
                  <p className="text-sm font-black text-neutral-900 truncate mt-0.5">{topAgentArtist[0]}</p>
                  <p className="text-xs font-bold text-emerald-600">₱{topAgentArtist[1].toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 font-bold uppercase mt-0.5">No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Agent Sales Ledger */}
        <div className="pt-4">
          <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest mb-4">Agent Sales Ledger</h3>
          <div className="space-y-4">
            {agentSales.map(sale => (
              <div 
                key={sale.id}
                className="group flex items-center gap-6 p-4 border border-neutral-100 rounded-2xl hover:bg-neutral-50 hover:border-neutral-200 transition-all"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                  <img 
                    src={sale.artworkSnapshot?.imageUrl} 
                    alt={sale.artworkSnapshot?.title} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 bg-neutral-100 text-[9px] font-black text-neutral-500 rounded uppercase tracking-tighter">
                      {sale.artworkSnapshot?.code || 'NO-CODE'}
                    </span>
                    <p className="text-sm font-black text-neutral-900 truncate uppercase tracking-tight">
                      {sale.artworkSnapshot?.title}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase truncate">{sale.clientName}</p>
                    <span className="w-1 h-1 rounded-full bg-neutral-200" />
                    <p className="text-[10px] text-neutral-400 font-bold uppercase truncate">{sale.artworkSnapshot?.artist}</p>
                    <span className="w-1 h-1 rounded-full bg-neutral-200" />
                    <p className="text-[10px] text-neutral-500 font-black uppercase truncate italic">{sale.artworkSnapshot?.currentBranch}</p>
                  </div>
                </div>
                <div className="text-right">
                  {sale.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
                    <div className="flex flex-col items-end">
                      <span className="line-through text-neutral-400 text-[10px]">₱{(sale.artworkSnapshot?.price || 0).toLocaleString()}</span>
                      <span className="text-sm font-black text-neutral-900">₱{sale.discountedPrice?.toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">-{sale.discountPercentage}% OFF</span>
                    </div>
                  ) : (
                    <p className="text-sm font-black text-neutral-900">₱{(sale.artworkSnapshot?.price || 0).toLocaleString()}</p>
                  )}
                  <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">
                    {new Date(sale.saleDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {agentSales.length === 0 && (
              <p className="text-center text-xs font-bold text-neutral-400 uppercase py-8">No agent records found</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Detail Modal Helper ---
  const renderDetailModal = () => {
    if (!activeDetailType) return null;

    const getTitle = () => {
      switch (activeDetailType) {
        case 'fully-paid': return 'Fully Paid Revenue';
        case 'installments': return 'Installment Collections';
        case 'combined': return 'Combined Collection Details';
        case 'sold': return 'Total Items Sold';
        case 'approvals': return 'Pending Approvals';
        case 'branch': return 'Branch Performance Breakdown';
        case 'artist': return 'Artist Contribution';
        case 'agent': return 'Agent Performance Breakdown';
        default: return 'Details';
      }
    };

    const detailSales = (() => {
      switch (activeDetailType) {
        case 'fully-paid':
          return filteredSales.filter(s => !((s.installments?.length ?? 0) > 0 || s.isDownpayment));
        case 'installments':
          return filteredSales.filter(s => (s.installments?.length ?? 0) > 0 || s.isDownpayment);
        case 'combined':
          return filteredSales;
        case 'sold':
          return filteredSales;
        case 'approvals':
          return allEffectiveSales.filter(s => s.status === SaleStatus.FOR_SALE_APPROVAL);
        case 'branch':
          return selectedDetailBranch === 'All Branches'
            ? filteredSales
            : filteredSales.filter(s => s.artworkSnapshot?.currentBranch === selectedDetailBranch);
        case 'agent':
          return selectedDetailAgent === 'All Agents'
            ? filteredSales
            : filteredSales.filter(s => s.agentName === selectedDetailAgent);
        default:
          return [];
      }
    })();

    const totalDetailAmount = detailSales.reduce((acc, s) => {
      const price = s.discountedPrice !== undefined && s.discountedPrice !== null ? s.discountedPrice : (s.artworkSnapshot?.price || 0);
      return acc + price;
    }, 0);

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop - Microsoft Mica/Acrylic Style */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveDetailType(null)}
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md"
          />

          {/* Modal Surface */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl max-h-[85vh] min-h-0 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20"
          >
            {/* Header */}
            <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-neutral-900">{getTitle()}</h2>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
                  {detailSales.length} Total Records Found
                </p>
              </div>
              <button 
                onClick={() => setActiveDetailType(null)}
                className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <ArrowUpRight className="rotate-45" size={24} />
              </button>
            </div>

            {/* Calculation Proof - Evidence Section */}
            {activeDetailType !== 'branch' && activeDetailType !== 'agent' && (
              <div className="mx-8 mt-6 p-6 bg-neutral-900 rounded-2xl text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Calculator size={14} className="text-emerald-400" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Calculation Proof</h3>
                </div>
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded uppercase">Verified Amount</span>
              </div>
              
              <div className="flex items-end justify-between gap-8">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-neutral-400">
                    {detailSales.slice(0, 8).map((s, i) => (
                      <span key={s.id} className="flex items-center gap-1.5">
                        <span className="text-neutral-200">
                          {s.discountedPrice !== undefined && s.discountedPrice !== null ? (
                            <span className="flex items-center">
                              <span className="line-through text-neutral-500 text-[10px] mr-1">₱{(s.artworkSnapshot?.price || 0).toLocaleString()}</span>
                              <span className="text-emerald-400">₱{s.discountedPrice.toLocaleString()}</span>
                            </span>
                          ) : (
                            `₱${(s.artworkSnapshot?.price || 0).toLocaleString()}`
                          )}
                        </span>
                        {(i < detailSales.length - 1 && i < 7) && <span className="text-neutral-600">+</span>}
                      </span>
                    ))}
                    {detailSales.length > 8 && (
                      <span className="text-neutral-500 italic">
                        + {detailSales.length - 8} other records...
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Total Aggregate</p>
                  <p className="text-3xl font-black text-white">₱{totalDetailAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
            )}

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeDetailType === 'branch' && (
                <div className="mb-6 flex flex-row flex-nowrap overflow-x-auto gap-2 border-b border-neutral-100 pb-4 hide-scrollbar snap-x">
                  {['All Branches', ...branches].map(b => {
                    const isSelected = selectedDetailBranch === b;
                    return (
                      <button
                        key={b}
                        onClick={() => setSelectedDetailBranch(b)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 snap-start ${
                          isSelected
                            ? 'bg-neutral-900 text-white shadow-md'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 border border-neutral-200/50'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeDetailType === 'agent' && (
                <div className="mb-6 flex flex-row flex-nowrap overflow-x-auto gap-2 border-b border-neutral-100 pb-4 hide-scrollbar snap-x">
                  {['All Agents', ...allAgents].map(a => {
                    const isSelected = selectedDetailAgent === a;
                    return (
                      <button
                        key={a}
                        onClick={() => setSelectedDetailAgent(a)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 snap-start ${
                          isSelected
                            ? 'bg-neutral-900 text-white shadow-md'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 border border-neutral-200/50'
                        }`}
                      >
                      {(() => {
                        if (a.includes(' — ')) {
                          const [branch, agent] = a.split(' — ');
                          return `${agent} (${branch})`;
                        }
                        return a;
                      })()}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeDetailType === 'branch' ? renderBranchDashboard() : 
               activeDetailType === 'agent' ? renderAgentDashboard() : (
                <div className="space-y-4">
                  {detailSales.map(sale => (
                    <div 
                      key={sale.id}
                      className="group flex items-center gap-6 p-4 border border-neutral-100 rounded-2xl hover:bg-neutral-50 hover:border-neutral-200 transition-all"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                        <img 
                          src={sale.artworkSnapshot?.imageUrl} 
                          alt={sale.artworkSnapshot?.title} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-neutral-100 text-[9px] font-black text-neutral-500 rounded uppercase tracking-tighter">
                          {sale.artworkSnapshot?.code || 'NO-CODE'}
                        </span>
                        <p className="text-sm font-black text-neutral-900 truncate uppercase tracking-tight">
                          {sale.artworkSnapshot?.title}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-[10px] text-neutral-400 font-bold uppercase truncate">{sale.clientName}</p>
                        <span className="w-1 h-1 rounded-full bg-neutral-200" />
                        <p className="text-[10px] text-neutral-400 font-bold uppercase truncate">{sale.artworkSnapshot?.artist}</p>
                        <span className="w-1 h-1 rounded-full bg-neutral-200" />
                        <p className="text-[10px] text-neutral-400 font-bold uppercase truncate">{sale.artworkSnapshot?.medium}</p>
                        <span className="w-1 h-1 rounded-full bg-neutral-200" />
                        <p className="text-[10px] text-neutral-500 font-black uppercase truncate italic">{sale.artworkSnapshot?.currentBranch}</p>
                      </div>
                    </div>
                      <div className="text-right">
                        {sale.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="line-through text-[10px] text-neutral-400 font-normal">₱{(sale.artworkSnapshot?.price || 0).toLocaleString()}</span>
                            <span className="text-sm font-black text-neutral-900 mt-0.5">₱{(sale.discountedPrice || 0).toLocaleString()} <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">-{sale.discountPercentage}%</span></span>
                          </div>
                        ) : (
                          <p className="text-sm font-black text-neutral-900">₱{(sale.artworkSnapshot?.price || 0).toLocaleString()}</p>
                        )}
                        <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">
                          {new Date(sale.saleDate).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-neutral-200 group-hover:text-neutral-900 transition-colors" />
                    </div>
                  ))}
                  {detailSales.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                      <Search size={48} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">No detailed records match this filter</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setActiveDetailType(null)}
                className="px-6 py-3 bg-white border border-neutral-200 text-[10px] font-black text-neutral-600 rounded-xl uppercase tracking-widest hover:bg-neutral-100 transition-colors"
              >
                Close
              </button>
              <button className="px-6 py-3 bg-neutral-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center gap-2">
                <Download size={14} />
                Export Detailed Report
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto py-10 px-6 md:px-10 pb-24">
      {selectedInstallmentId && selectedSale ? (
        renderInstallmentDetail(selectedSale)
      ) : (
        <>
          {renderDashboard()}
          {renderDetailModal()}
        </>
      )}

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedSale && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl overflow-hidden border border-neutral-100 z-10"
            >
              <div className="mb-6">
                <h3 className="text-xl font-black text-neutral-900">Record Payment</h3>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  Log a payment received for <span className="font-bold text-neutral-900">{selectedSale.artworkSnapshot?.title}</span>.
                </p>
              </div>

              {paymentSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
                    <CheckCircle2 size={24} className="animate-bounce" />
                  </div>
                  <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Payment Recorded</h4>
                  <p className="text-xs text-neutral-500 font-medium">Installment ledger successfully updated.</p>
                </div>
              ) : (
                <form onSubmit={handleRecordPaymentSubmit} className="space-y-5">
                  {paymentError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold flex items-start gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Amount (PHP)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 15000"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Reference Number / Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Bank Transfer ID, Receipt #1042"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 py-3 bg-white border border-neutral-200 text-[10px] font-black text-neutral-600 rounded-xl uppercase tracking-widest hover:bg-neutral-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPayment}
                      className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSubmittingPayment ? 'Saving...' : 'Confirm'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default FinancePage;
