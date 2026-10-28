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
      {/* Column 1: Workshop Operators */}
      <OperatorPanel
        personnel={personnel}
        selectedOperator={selectedOperator}
        onSelectOperator={onSelectOperator}
        selectedGroup={selectedGroup}
      />

      {/* Column 2: Production Orders & Active Step Barcode */}
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
