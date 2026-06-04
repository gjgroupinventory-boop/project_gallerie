
import {
  Box,
  ShoppingCart,
  Truck,
  History,
  LayoutDashboard,
  Plus,
  Search,
  ArrowRightLeft,
  User,
  Shield,
  PackageCheck,
  Users,
  Calendar,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  CreditCard
} from 'lucide-react';

import { UserRole, UserPermissions } from './types';

// Set this to true to run the app with local data only (bypassing Firestore)
export const IS_DEMO_MODE = false;


export const BRANCH_CATEGORIES = [
  'Gallery',
  'Warehouse',
  'Private Collection',
  'Partner Space',
  'Pop-up',
  'Other'
];

export const APP_TABS = [
  { id: 'finance', label: 'Finance' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Inventory Insights' },
  { id: 'import-history', label: 'Import History' },
  { id: 'snapshots', label: 'Artwork Timeline' },
  { id: 'operations', label: 'Gallery Operations' },
  { id: 'sales-history', label: 'Sales History' },
  { id: 'deliveries', label: 'Delivery Approval' },
  { id: 'artwork-transfer', label: 'Artwork T/R' },
  { id: 'audit-logs', label: 'System Audit Logs' },
  { id: 'accounts', label: 'Branch Accounts' },
  { id: 'chat', label: 'Inbox & Messaging' },
  { id: 'approvals', label: 'Finance Approval' },
  { id: 'requests', label: 'My Requests' },
  { id: 'delivery-requests', label: 'Delivery Requests (Tab)' }
];



export const getDefaultAccessibleTabs = (role: UserRole): string[] => {
  switch (role) {
    case UserRole.ADMIN:
      return ['finance', 'dashboard', 'analytics', 'import-history', 'snapshots', 'operations', 'sales-history', 'deliveries', 'delivery-requests', 'approvals', 'artwork-transfer', 'audit-logs', 'accounts', 'chat'];
    case UserRole.INVENTORY_PERSONNEL:
      return ['finance', 'dashboard', 'analytics', 'import-history', 'snapshots', 'operations', 'sales-history', 'deliveries', 'delivery-requests', 'artwork-transfer', 'accounts', 'chat'];
    case UserRole.BRANCH_USER:
      return ['dashboard', 'sales-history', 'deliveries', 'artwork-transfer', 'requests', 'accounts', 'chat'];
    case UserRole.EXCLUSIVE:
      return ['dashboard'];
    default:
      return ['dashboard'];
  }
};

export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case UserRole.ADMIN:
      return {
        canAddArtwork: true,
        canEditArtwork: true,
        canManageAccounts: true,
        canManageEvents: true,
        canAccessCertificate: true,
        canAttachITDR: true,
        canDeleteArtwork: true,
        canSellArtwork: true,
        canReserveArtwork: true,
        canTransferArtwork: true,
        canViewSalesHistory: true,
        canViewReserved: true,
        canViewAuctioned: true,
        canViewExhibit: true,
        canViewForFraming: true,
        canViewBackToArtist: true,
        canApproveFinance: true,
        canApproveLogistics: true,
        canAccessAuditLogs: true,
        canImportArtwork: true,
        canExportArtwork: true,
        dashboardShowInventoryMetric: true,
        dashboardShowSoldMetric: true,
        dashboardShowReservedMetric: true,
        dashboardShowRevenueMetric: true,
        dashboardShowSpotlightPiece: true,
        dashboardShowSpotlightBranch: true,
        dashboardShowNewestAdditions: true,
        dashboardShowGallerySchedule: true,
        dashboardShowDistributionChart: true,
        dashboardShowTeamPresence: true,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.ADMIN),
      };
    case UserRole.INVENTORY_PERSONNEL:
      return {
        canAddArtwork: true,
        canEditArtwork: true,
        canManageAccounts: true,
        canManageEvents: true,
        canAccessCertificate: false,
        canAttachITDR: true,
        canDeleteArtwork: true,
        canSellArtwork: true,
        canReserveArtwork: true,
        canTransferArtwork: true,
        canViewSalesHistory: true,
        canViewReserved: true,
        canViewAuctioned: true,
        canViewExhibit: true,
        canViewForFraming: true,
        canViewBackToArtist: true,
        canApproveFinance: false,
        canApproveLogistics: true,
        canAccessAuditLogs: false,
        canImportArtwork: true,
        canExportArtwork: true,
        dashboardShowInventoryMetric: true,
        dashboardShowSoldMetric: true,
        dashboardShowReservedMetric: true,
        dashboardShowRevenueMetric: true,
        dashboardShowSpotlightPiece: true,
        dashboardShowSpotlightBranch: true,
        dashboardShowNewestAdditions: true,
        dashboardShowGallerySchedule: true,
        dashboardShowDistributionChart: true,
        dashboardShowTeamPresence: true,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.INVENTORY_PERSONNEL),
      };
    case UserRole.BRANCH_USER:
      return {
        canAddArtwork: false,
        canEditArtwork: false,
        canManageAccounts: false,
        canManageEvents: false,
        canAccessCertificate: true,
        canAttachITDR: false,
        canDeleteArtwork: false,
        canSellArtwork: true,
        canReserveArtwork: true,
        canTransferArtwork: false,
        canViewSalesHistory: true,
        canViewReserved: true,
        canViewAuctioned: true,
        canViewExhibit: true,
        canViewForFraming: true,
        canViewBackToArtist: true,
        canApproveFinance: false,
        canApproveLogistics: false,
        canAccessAuditLogs: false,
        canImportArtwork: false,
        canExportArtwork: false,
        dashboardShowInventoryMetric: true,
        dashboardShowSoldMetric: true,
        dashboardShowReservedMetric: true,
        dashboardShowRevenueMetric: false,
        dashboardShowSpotlightPiece: true,
        dashboardShowSpotlightBranch: true,
        dashboardShowNewestAdditions: true,
        dashboardShowGallerySchedule: true,
        dashboardShowDistributionChart: true,
        dashboardShowTeamPresence: true,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.BRANCH_USER),
      };
    case UserRole.EXCLUSIVE:
      return {
        canAddArtwork: false,
        canEditArtwork: false,
        canManageAccounts: false,
        canManageEvents: false,
        canAccessCertificate: false,
        canAttachITDR: false,
        canDeleteArtwork: false,
        canSellArtwork: false,
        canReserveArtwork: false,
        canTransferArtwork: false,
        canViewSalesHistory: false,
        canViewReserved: false,
        canViewAuctioned: false,
        canViewExhibit: false,
        canViewForFraming: false,
        canViewBackToArtist: false,
        canApproveFinance: false,
        canApproveLogistics: false,
        canAccessAuditLogs: false,
        canImportArtwork: false,
        canExportArtwork: false,
        dashboardShowInventoryMetric: false,
        dashboardShowSoldMetric: false,
        dashboardShowReservedMetric: false,
        dashboardShowRevenueMetric: false,
        dashboardShowSpotlightPiece: false,
        dashboardShowSpotlightBranch: false,
        dashboardShowNewestAdditions: false,
        dashboardShowGallerySchedule: false,
        dashboardShowDistributionChart: false,
        dashboardShowTeamPresence: false,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.EXCLUSIVE),
      };
    default:
      return {
        canAddArtwork: false,
        canEditArtwork: false,
        canManageAccounts: false,
        canManageEvents: false,
        canAccessCertificate: false,
        canAttachITDR: false,
        canDeleteArtwork: false,
        canSellArtwork: false,
        canReserveArtwork: false,
        canTransferArtwork: false,
        canViewSalesHistory: false,
        canViewReserved: false,
        canViewAuctioned: false,
        canViewExhibit: false,
        canViewForFraming: false,
        canViewBackToArtist: false,
        canApproveFinance: false,
        canApproveLogistics: false,
        canAccessAuditLogs: false,
        canImportArtwork: false,
        canExportArtwork: false,
        dashboardShowInventoryMetric: false,
        dashboardShowSoldMetric: false,
        dashboardShowReservedMetric: false,
        dashboardShowRevenueMetric: false,
        dashboardShowSpotlightPiece: false,
        dashboardShowSpotlightBranch: false,
        dashboardShowNewestAdditions: false,
        dashboardShowGallerySchedule: false,
        dashboardShowDistributionChart: false,
        dashboardShowTeamPresence: false,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.BRANCH_USER),
      };
  }
};


export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Finance: <CreditCard size={20} />,
  Inventory: <Box size={20} />,
  Sales: <ShoppingCart size={20} />,
  Transfers: <ArrowRightLeft size={20} />,
  History: <History size={20} />,
  Add: <Plus size={20} />,
  Search: <Search size={20} />,
  Truck: <Truck size={20} />,
  User: <User size={20} />,
  Users: <Users size={20} />,
  Shield: <Shield size={20} />,
  Deliver: <PackageCheck size={20} />,
  Calendar: <Calendar size={20} />,
  Chat: <MessageSquare size={20} />,
  Warning: <AlertCircle size={20} />,
  Refresh: <RotateCcw size={20} />
};
