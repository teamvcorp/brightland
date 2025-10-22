import * as React from 'react';

export function PaymentRequestEmail({
  propertyOwnerName,
  propertyName,
  projectDescription,
  proposedBudget,
  actualCost,
  amountToBill,
  dueDate,
}) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '30px', borderRadius: '8px 8px 0 0', textAlign: 'center' }}>
        <h1 style={{ margin: '0', fontSize: '28px' }}>Payment Request</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: '16px', opacity: '0.9' }}>
          For Maintenance Work Completed
        </p>
      </div>

      <div style={{ backgroundColor: '#f9fafb', padding: '30px', borderRadius: '0 0 8px 8px' }}>
        <p style={{ fontSize: '16px', color: '#374151', marginTop: '0' }}>
          Dear {propertyOwnerName || 'Property Owner'},
        </p>

        <p style={{ fontSize: '16px', color: '#374151', lineHeight: '1.6' }}>
          This is to inform you that maintenance work has been completed at your property. 
          Below are the details of the work performed and the payment requested.
        </p>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f2937', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
            Property Information
          </h2>
          <p style={{ margin: '8px 0', fontSize: '15px', color: '#4b5563' }}>
            <strong>Property:</strong> {propertyName}
          </p>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginTop: '15px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f2937', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
            Work Completed
          </h2>
          <p style={{ margin: '8px 0', fontSize: '15px', color: '#4b5563' }}>
            <strong>Description:</strong> {projectDescription}
          </p>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginTop: '15px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f2937', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>
            Cost Breakdown
          </h2>
          {proposedBudget !== null && proposedBudget !== undefined && (
            <p style={{ margin: '8px 0', fontSize: '15px', color: '#4b5563' }}>
              <strong>Initial Estimate:</strong> ${Number(proposedBudget).toFixed(2)}
            </p>
          )}
          {actualCost !== null && actualCost !== undefined && (
            <p style={{ margin: '8px 0', fontSize: '15px', color: '#4b5563' }}>
              <strong>Actual Cost:</strong> ${Number(actualCost).toFixed(2)}
            </p>
          )}
          <p style={{ margin: '15px 0 0 0', fontSize: '18px', color: '#1f2937', padding: '15px', backgroundColor: '#dbeafe', borderRadius: '6px', borderLeft: '4px solid #2563eb' }}>
            <strong>Amount Due:</strong> <span style={{ fontSize: '22px', color: '#2563eb' }}>${Number(amountToBill).toFixed(2)}</span>
          </p>
        </div>

        {dueDate && (
          <div style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '8px', marginTop: '15px', border: '1px solid #fbbf24' }}>
            <p style={{ margin: '0', fontSize: '15px', color: '#92400e' }}>
              <strong>⏰ Payment Due Date:</strong> {new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#065f46' }}>
            Next Steps
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#047857', lineHeight: '1.6' }}>
            Please review this payment request. If you have any questions or concerns about the work performed or the amount due, 
            please contact us as soon as possible. Payment can be made via check, bank transfer, or other agreed-upon methods.
          </p>
        </div>

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
            Questions? Contact us at <a href="mailto:billing@brightland.com" style={{ color: '#2563eb', textDecoration: 'none' }}>billing@brightland.com</a>
          </p>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
          <p style={{ margin: '5px 0' }}>Thank you for your prompt attention to this matter.</p>
          <p style={{ margin: '5px 0' }}>Brightland Property Management</p>
        </div>
      </div>
    </div>
  );
}
