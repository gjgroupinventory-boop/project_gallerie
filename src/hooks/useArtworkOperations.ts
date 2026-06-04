import { useArtworkCrud } from './artworkOperations/useArtworkCrud';
import { useArtworkSales } from './artworkOperations/useArtworkSales';
import { useArtworkFraming } from './artworkOperations/useArtworkFraming';
import { useArtworkRetouch } from './artworkOperations/useArtworkRetouch';
import { useArtworkReservations } from './artworkOperations/useArtworkReservations';

export const useArtworkOperations = () => {
  const crud = useArtworkCrud();
  const sales = useArtworkSales();
  const framing = useArtworkFraming();
  const retouch = useArtworkRetouch();
  const reservations = useArtworkReservations();

  return {
    // CRUD
    handleAddArtwork: crud.handleCreateArtwork,
    handleCreateArtwork: crud.handleCreateArtwork,
    handleBulkAddArtworks: crud.handleBulkImport,
    handleUpdateArtwork: crud.handleUpdateArtwork,
    handleBulkUpdateArtworks: crud.handleBulkUpdateArtworks,
    handleDeleteArtwork: crud.handleDeleteArtwork,
    handleBulkDelete: crud.handleBulkDelete,
    handleConfirmAudit: crud.handleConfirmAudit,

    // Reservations
    handleReserveArtwork: reservations.handleReserveArtwork,
    handleBulkReserve: reservations.handleBulkReserve,
    handleCancelReservation: reservations.handleCancelReservation,
    handleBulkCancelReservation: reservations.handleBulkCancelReservation,
    handleAddToAuction: reservations.handleAddToAuction,

    // Sales & Transactions
    handleSale: sales.handleSale,
    handleBulkSale: sales.handleBulkSale,
    handleCancelSale: sales.handleCancelSale,
    handleDeleteSaleRecord: sales.handleDeleteSaleRecord,
    handleApproveSale: sales.handleApproveSale,
    handleDeclineSale: sales.handleDeclineSale,
    handleDeclineSaleWithMessaging: sales.handleDeclineSaleWithMessaging,
    handleEditPayment: sales.handleEditPayment,
    handleApprovePaymentEdit: sales.handleApprovePaymentEdit,
    handleDeclinePaymentEdit: sales.handleDeclinePaymentEdit,
    handleAddInstallment: sales.handleAddInstallment,
    handleUpdateSale: sales.handleUpdateSale,
    handleDispatch: sales.handleDispatch,
    handleApproveDeliveryRequest: sales.handleApproveDeliveryRequest,
    handleDeclineDeliveryRequest: sales.handleDeclineDeliveryRequest,
    handleDeliver: sales.handleDeliver,
    handleBulkDeletePayments: sales.handleBulkDeletePayments,

    // Framing
    handleSendToFramer: framing.handleSendToFramer,
    handleBulkSendToFramer: framing.handleBulkSendToFramer,
    handleReturnFromFramer: framing.handleReturnFromFramer,
    handleDeleteFramerRecord: framing.handleDeleteFramerRecord,

    // Retouch & Returns
    handleReturnArtwork: retouch.handleReturnArtwork,
    handleBulkReturnArtwork: retouch.handleBulkReturnArtwork,
    handleReturnToGallery: retouch.handleReturnToGallery,
    handleUpdateReturnRecord: retouch.handleUpdateReturnRecord,
    handleBulkDeleteReturnRecords: retouch.handleBulkDeleteReturnRecords
  };
};
