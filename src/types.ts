
export enum UserRole {
  INVENTORY_PERSONNEL = 'Inventory Personnel',
  BRANCH_USER = 'Branch User',
  ADMIN = 'Admin',
  EXCLUSIVE = 'Exclusive'
}

export const normalizeAccount = <T extends any>(data: T): T => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => normalizeAccount(item)) as T;
  }
  if (typeof data === 'object') {
    const acc = data as any;
    if (acc.role === 'Sales Agent') {
      acc.role = UserRole.BRANCH_USER;
    }
  }
  return data;
};

export enum ArtworkStatus {
  AVAILABLE = 'Available',
  RESERVED = 'Reserved',
  SOLD = 'Sold',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
  EXCLUSIVE_VIEW_ONLY = 'View Only (Exclusive)',
  FOR_RETOUCH = 'For Retouch',
  FOR_FRAMING = 'For Framing',
  FOR_SALE_APPROVAL = 'For Sale Approval',
  RETURNED = 'Returned'
}

export enum SaleStatus {
  FOR_SALE_APPROVAL = 'For Sale Approval',
  FOR_PAYMENT_APPROVAL = 'For Payment Approval',
  APPROVED = 'Approved',
  DECLINED = 'Declined'
}

export const isInTransitStatus = (status: ArtworkStatus) => status === ArtworkStatus.SOLD;

export type Branch = string;

export enum EventStatus {
  LIVE = 'Live',
  UPCOMING = 'Upcoming',
  RECENT = 'Recent',
  CLOSED = 'Closed'
}

type EventType = 'Exhibition' | 'Auction';

export interface ExhibitionEvent {
  id: string;
  title: string;
  location: Branch;
  startDate: string;
  endDate: string;
  status: EventStatus;
  artworkIds: string[];
  type?: EventType;
  isStrictDuration?: boolean;
  isTimeless?: boolean;
  logoUrl?: string;
}

export interface UserPermissions {
  canAddArtwork: boolean;
  canEditArtwork: boolean;
  canManageAccounts: boolean;
  canManageEvents: boolean;
  canAccessCertificate: boolean;
  canAttachITDR: boolean;
  canDeleteArtwork: boolean;
  canSellArtwork: boolean;
  canReserveArtwork: boolean;
  canTransferArtwork: boolean;
  canViewSalesHistory: boolean;
  canViewReserved: boolean;
  canViewAuctioned: boolean;
  canViewExhibit: boolean;
  canViewForFraming: boolean;
  canViewBackToArtist: boolean;
  canApproveFinance: boolean;
  canApproveLogistics: boolean;
  canAccessAuditLogs: boolean;
  canImportArtwork: boolean;
  canExportArtwork: boolean;
  dashboardShowInventoryMetric: boolean;
  dashboardShowSoldMetric: boolean;
  dashboardShowReservedMetric: boolean;
  dashboardShowRevenueMetric: boolean;
  dashboardShowSpotlightPiece: boolean;
  dashboardShowSpotlightBranch: boolean;
  dashboardShowNewestAdditions: boolean;
  dashboardShowGallerySchedule: boolean;
  dashboardShowDistributionChart: boolean;
  dashboardShowTeamPresence: boolean;
  canViewDeliveryRequests: boolean;
  canViewDeliveryActive: boolean;
  canViewDeliveryRescheduled: boolean;
  canViewDeliveryPending: boolean;
  canViewDeliveryDelivered: boolean;
  canViewDeliveryFailed: boolean;
  accessibleTabs?: string[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  firstName?: string;
  fullName?: string;
  position?: string;
  // NOTE: password field removed — was stored as plaintext and never validated.
  // Authentication should use Supabase Auth (Google sign-in or email/password auth).
  permissions?: UserPermissions;
  branch?: Branch;
  password?: string;
}

export interface Artwork {
  id: string;
  code: string;
  title: string;
  artist: string;
  medium: string;
  dimensions: string;
  year: string;
  price: number;
  status: ArtworkStatus;
  currentBranch: Branch;
  imageUrl: string;
  itdrImageUrl?: string | string[];
  rsaImageUrl?: string | string[]; // RSA / AR
  orCrImageUrl?: string | string[]; // OR / CR
  createdAt: string;
  importPeriod?: string; // YYYY-MM representing month/year of import
  sheetName?: string;
  itemCount?: number;
  remarks?: string;
  reservationExpiry?: string; // ISO string for reservation expiration
  reservedForEventId?: string; // ID of the event/auction this is reserved for
  reservedForEventName?: string; // Name of the event/auction
  sizeFrame?: string;
  soldAtBranch?: string; // Captures the branch where the artwork was located at the time of sale
  deletedAt?: string; // ISO string for soft deletion
  type?: string; // e.g. "Sculpture", "Painting"
  [key: string]: any;
}

export interface InstallmentRecord {
  id: string;
  amount: number;
  date: string;
  recordedBy: string;
  reference?: string;
  createdAt?: string; // To track "New" vs "Old"
  isPending?: boolean; // For overpayments needing approval
  isDeclined?: boolean; // For tracking rejected payment requests
  declinedAt?: string;
  declineReason?: string;
  requestedAttachments?: string[]; // e.g. ['receipt', 'reference']
  attachmentUrls?: string[];
  pendingEdit?: {
    amount: number;
    date: string;
    reference?: string;
    requestedAt: string;
    requestedBy: string;
    status: 'Pending' | 'Approved' | 'Declined';
    declineReason?: string;
    requestedAttachments?: string[];
    attachmentUrls?: string[];
  };
}

export enum DeliveryRequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  DISPATCHED = 'Dispatched',
  DECLINED = 'Declined',
  CANCELLED = 'Cancelled',
  HOLD = 'Hold'
}

export interface DeliveryRequest {
  id: string;
  saleId: string;
  clientAddress: string; // Legacy/Combined address
  // Structured Address
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  landmark?: string;
  
  deliveryDate: string;
  extraPersonnelCount: number;
  toolsNeeded: string[];
  status: DeliveryRequestStatus;
  requestedAt: string;
  requestedBy: string;
  declineReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  returnDestination?: string;
  returnItdrNumber?: string;
  returnItdrAttachment?: string;
  rescheduledAt?: string;
  rescheduledBy?: string;
  rescheduleReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  dispatchedAt?: string;
  dispatchedBy?: string;
  carrier?: string;
  referenceNumber?: string;
  remarks?: string;
}

export interface SaleRecord {
  id: string;
  artworkId: string;
  clientName: string;
  clientEmail?: string;
  clientContact?: string;
  agentName: string;
  agentId?: string; // ID of the agent who declared the sale
  saleDate: string;
  deliveryDate?: string;
  isDelivered: boolean;
  isCancelled?: boolean;
  status?: SaleStatus;
  deliveryRequest?: DeliveryRequest; // Detailed logistics request
  declineReason?: string; // Reason for rejection
  requestedAttachments?: string[]; // Requirements for fix (e.g., 'itdr', 'rsa', 'orcr', 'price', 'branch', 'client_details')
  attachmentUrl?: string; // Legacy generic attachment
  itdrUrl?: string[];     // IT/DR attachments
  rsaUrl?: string[];      // RSA/AR attachments
  orCrUrl?: string[];     // OR/CR attachments
  soldAtEventId?: string; // ID of the event/auction where it was sold
  soldAtEventName?: string; // Name of the event/auction where it was sold
  downpayment?: number;
  isDownpayment?: boolean;
  downpaymentRecordedAt?: string; // To track "New" vs "Old"
  pendingDownpaymentEdit?: {
    amount: number;
    requestedAt: string;
    requestedBy: string;
    status: 'Pending' | 'Approved' | 'Declined';
    declineReason?: string;
    requestedAttachments?: string[];
  };
  installments?: InstallmentRecord[];
  discountPercentage?: number;
  discountedPrice?: number;
  artworkSnapshot?: {
    title: string;
    artist: string;
    code: string;
    imageUrl: string;
    price: number;
    currentBranch?: string;
    medium?: string;
    dimensions?: string;
    year?: string;
    discountPercentage?: number;
    discountedPrice?: number;
  };
}

export interface TransferRecord {
  id: string;
  artworkId: string;
  origin: Branch;
  destination: Branch;
  performedBy: string;
  timestamp: string;
  artworkTitle?: string;
  approvedBy?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  artworkId: string;
  action: string;
  user: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  details?: string;
  artworkSnapshot?: Partial<Artwork>;
}

export interface InventoryAudit {
  id: string;
  month: string; // YYYY-MM
  confirmedAt: string;
  confirmedBy: string;
  totalCount: number;
  availableCount: number;
  addedCount: number;
  transferredCount: number;
  soldInGalleryCount: number;
  cancelledCount: number;
  snapshot: Artwork[];
  type?: 'Monthly Audit';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'inventory' | 'sales' | 'system';
  artworkId?: string;
  agent?: string;
  userName?: string;
  items?: { id: string; title: string; code: string; imageUrl?: string; status?: 'success' | 'failed'; error?: string }[];
  isImportant?: boolean;
}

export interface ImportFailedItem {
  rowNumber: number;
  reason: string;
  data: any;
}

export interface ImportRecord {
  id: string;
  filename: string;
  importedBy: string;
  timestamp: string;
  recordCount: number;
  successCount?: number;
  failCount?: number;
  status: 'Success' | 'Partial' | 'Failed';
  details?: string;
  importedIds?: string[]; // IDs of all artworks in this import
  updatedIds?: string[];  // IDs of artworks that were merged/updated (repeats)
  failedItems?: ImportFailedItem[];
}


export type ReturnType = 'Artist Reclaim' | 'For Retouch';

export interface ReturnRecord {
  id: string;
  artworkId: string;
  reason: string;
  returnedBy: string;
  returnDate: string;
  artworkSnapshot: Artwork;
  referenceNumber?: string; // IT/DR Number
  proofImage?: string | string[]; // Base64/URL or serialized list of attached proofs
  remarks?: string;
  returnType: ReturnType;
  status?: 'Open' | 'Resolved';
  resolvedAt?: string;
  resolvedToBranch?: string;
}

// --- Monitoring Summary Types ---

type TransactionType = 'IN' | 'SOLD' | 'TRANSFER' | 'PULLOUT';

export interface InventoryTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  quantity: number;
  referenceNo: string; // IT / DR #
  clientBranch: string; // Client / Branch Name
  artworkTitle: string;
  artworkCode?: string;
  artworkId?: string;
}

export interface MonitoringSummary {
  id: string;
  month: number; // 1-12
  year: number; // YYYY
  createdAt: string; // ISO Timestamp
  createdBy?: string;

  // Statistics
  beginningInventory: number;
  totalItemsIn: number;
  totalItemsOutSold: number;
  totalItemsOutTransfer: number;
  availableInventory: number;
  soldPiecesStillInGallery: number;
  totalInventory: number;

  // Transaction Data Snapshots (for immutability)
  itemsIn: InventoryTransaction[];
  itemsOutSold: InventoryTransaction[];
  itemsOutTransfer: InventoryTransaction[];

  // Physical Check
  isPhysicalCheckConfirmed?: boolean;
  physicalCheckConfirmedAt?: string;
  physicalCheckConfirmedBy?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  readBy: string[]; // List of user IDs who have read this message
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: { [userId: string]: string };
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: string;
  };
  updatedAt: string;
  unreadCount?: { [userId: string]: number };
}

export interface FramerRecord {
  id: string;
  artworkId: string;
  damageDetails: string;
  attachmentUrl?: string | string[];
  sentDate: string;
  artworkSnapshot: Artwork;
  status: 'Open' | 'Resolved' | 'Closed';
  resolvedAt?: string;
  resolvedToBranch?: string;
  remarks?: string;
}

export type TransferStatus = 'Pending' | 'Accepted' | 'Declined' | 'Cancelled' | 'On Hold';

export interface TransferRequest {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkCode: string;
  artworkImage: string;
  fromBranch: Branch;
  toBranch: Branch;
  status: TransferStatus;
  requestedBy: string; // User Name
  requestedAt: string; // ISO Date
  respondedBy?: string; // User Name
  respondedAt?: string; // ISO Date
  notes?: string;
  itdrUrl?: string | string[]; // IT/DR attachment URL
}
