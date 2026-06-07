import { UserAccount, AppNotification, UserRole } from '../types';

/**
 * Determines whether a user should see/receive a specific notification based on their role and permissions.
 */
export const userHasAccessToNotification = (
  currentUser: UserAccount | null,
  notif: AppNotification
): boolean => {
  if (!currentUser) return false;
  
  // Admins always see everything
  if (currentUser.role === UserRole.ADMIN) return true;

  const title = (notif.title || '').toLowerCase();
  const message = (notif.message || '').toLowerCase();

  // 1. Account / Profile changes (e.g. Account Provisioned, Account Updated, Bulk Permissions Update)
  // Only Admins have access to accounts and permissions
  const isAccountRelated = 
    title.includes('account') || 
    message.includes('account') || 
    title.includes('provision') || 
    message.includes('provision') ||
    title.includes('profile') || 
    message.includes('profile') ||
    title.includes('permission') || 
    message.includes('permission');
    
  if (isAccountRelated) {
    return false;
  }

  // 2. Auction / Event related notifications
  // Branch users do not have access to Auction, but Inventory Personnel and Admins do
  const isAuctionRelated = 
    title.includes('auction') || 
    message.includes('auction');

  if (isAuctionRelated) {
    return currentUser.role === UserRole.INVENTORY_PERSONNEL;
  }

  // 3. Transfer related notifications
  const isTransferRelated = 
    title.includes('transfer') || 
    message.includes('transfer');

  if (isTransferRelated) {
    const hasTransferTab = currentUser.permissions?.accessibleTabs?.includes('artwork-transfer');
    return !!hasTransferTab || currentUser.role === 'Inventory Personnel';
  }

  // 4. Sales / payment / approval related notifications
  const isSalesRelated = 
    title.includes('sale') || 
    message.includes('sale') || 
    title.includes('payment') || 
    message.includes('payment') || 
    title.includes('approval') || 
    message.includes('approval') ||
    title.includes('finance') || 
    message.includes('finance');

  if (isSalesRelated) {
    const hasApprovalsTab = currentUser.permissions?.accessibleTabs?.includes('approvals') || 
                           currentUser.permissions?.accessibleTabs?.includes('finance');
    return !!hasApprovalsTab || currentUser.role === 'Inventory Personnel';
  }

  // 5. Logistics / delivery related notifications
  const isLogisticsRelated = 
    title.includes('delivery') || 
    message.includes('delivery') || 
    title.includes('logistics') || 
    message.includes('logistics') || 
    title.includes('dispatch') || 
    message.includes('dispatch');

  if (isLogisticsRelated) {
    const hasDeliveriesTab = currentUser.permissions?.accessibleTabs?.includes('deliveries') || 
                             currentUser.permissions?.accessibleTabs?.includes('delivery-requests');
    return !!hasDeliveriesTab || currentUser.role === 'Inventory Personnel';
  }

  // 6. Event creation / modification (other than auction)
  const isEventRelated = 
    title.includes('event') || 
    message.includes('event') || 
    title.includes('exhibition') || 
    message.includes('exhibition');

  if (isEventRelated) {
    return currentUser.role === 'Inventory Personnel' || !!currentUser.permissions?.canManageEvents;
  }

  return true; // Default fallback for other system/generic notifications
};
