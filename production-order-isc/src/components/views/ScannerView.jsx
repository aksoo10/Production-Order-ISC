import React from 'react';
import OperatorPanel from '../OperatorPanel';
import OrderPanel from '../OrderPanel';

export default function ScannerView({
  personnel,
  selectedOperator,
  onSelectOperator,
  orders,
  selectedOrderNo,
  onSelectOrderNo,
  onMarkStepFinished,
  onResetOrderSteps,
  onRevertStep,
  onUpdateStepStatus,
  isAdmin,
  selectedGroup
}) {
  return (
    <div className="workspace-grid">
      {/* Kolom 1: Operator Bengkel */}
      <OperatorPanel
        personnel={personnel}
        selectedOperator={selectedOperator}
        onSelectOperator={onSelectOperator}
        selectedGroup={selectedGroup}
      />

      {/* Kolom 2: Order Produksi & Langkah Aktif Barcode */}
      <OrderPanel
        orders={orders}
        selectedOrderNo={selectedOrderNo}
        onSelectOrderNo={onSelectOrderNo}
        onMarkStepFinished={onMarkStepFinished}
        onResetOrderSteps={onResetOrderSteps}
        onRevertStep={onRevertStep}
        onUpdateStepStatus={onUpdateStepStatus}
        isAdmin={isAdmin}
        selectedGroup={selectedGroup}
      />
    </div>
  );
}
