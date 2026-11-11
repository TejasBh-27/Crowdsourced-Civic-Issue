import React from 'react';
import COLORS from '../constants/colors';

const STAGES = [
  { key: 'Submitted', label: '1. Submitted', icon: '📤', shortDesc: 'Report filed with photo & live GPS' },
  { key: 'Verified_Assigned', label: '2. Verified', icon: '🤖', shortDesc: 'ML Vision verified & department routed' },
  { key: 'In Progress', label: '3. In Progress', icon: '⚙️', shortDesc: 'Officer accepted & repair crew dispatched' },
  { key: 'Resolved', label: '4. Resolved', icon: '✅', shortDesc: 'Repair verified closed with proof' },
];

export default function ComplaintLifecycleStepper({ status, assignedOfficer, resolutionNote, mttrHours, rejectionReason }) {
  const isRejected = status === 'Rejected_Invalid_Image' || status === 'Rejected' || status === 'rejected';

  // Calculate current stage index: 0, 1, 2, or 3
  let currentStageIndex = 0;
  if (status === 'Verified_Assigned' || status === 'verified') {
    currentStageIndex = 1;
  } else if (status === 'In Progress' || status === 'in_progress') {
    currentStageIndex = 2;
  } else if (status === 'Resolved' || status === 'resolved') {
    currentStageIndex = 3;
  }

  const progressPercent = isRejected ? 15 : ((currentStageIndex) / (STAGES.length - 1)) * 100;

  // Rejection alert view
  if (isRejected) {
    const isOfficerRejected = status === 'Rejected' || status === 'rejected';
    return (
      <div style={{
        marginTop: '10px',
        marginBottom: '10px',
        padding: '14px 16px',
        backgroundColor: '#FEF2F2',
        border: '1.5px solid #FCA5A5',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>❌</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B' }}>
                {isOfficerRejected ? 'Complaint Rejected by Administration' : 'Process Paused: Image Verification Failed'}
              </div>
              <div style={{ fontSize: '11px', color: '#7F1D1D', marginTop: '2px' }}>
                {isOfficerRejected
                  ? 'The municipal officer/admin has reviewed and rejected this report.'
                  : 'Image clarity/CV inspection did not pass. Tap "Resubmit Photo" to resume process.'}
              </div>
            </div>
          </div>
          <span style={{
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '800',
            whiteSpace: 'nowrap'
          }}>
            {isOfficerRejected ? 'Rejected' : 'Action Required'}
          </span>
        </div>

        {rejectionReason && (
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #FECACA',
            fontSize: '12px',
            color: '#1F2937'
          }}>
            <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#DC2626', marginBottom: '3px' }}>
              📝 Rejection Description / Reason:
            </div>
            <div style={{ color: '#374151', fontSize: '12px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {rejectionReason}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active status color
  const stageColors = {
    0: { border: '#F59E0B', text: '#B45309', bg: '#FEF3C7' },
    1: { border: '#0284C7', text: '#0369A1', bg: '#E0F2FE' },
    2: { border: '#7C3AED', text: '#6D28D9', bg: '#EDE9FE' },
    3: { border: '#10B981', text: '#065F46', bg: '#D1FAE5' }
  };
  const activeCfg = stageColors[currentStageIndex] || stageColors[0];

  return (
    <div style={{
      marginTop: '12px',
      marginBottom: '12px',
      padding: '14px 16px',
      backgroundColor: '#F8FAFC',
      border: '1px solid #E2E8F0',
      borderRadius: '16px'
    }}>
      {/* Top Header: Current Process Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>🔄</span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Complaint Working Process:
          </span>
        </div>

        <span style={{
          backgroundColor: activeCfg.bg,
          color: activeCfg.text,
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: '800',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {currentStageIndex < 3 && (
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: activeCfg.text }}></span>
          )}
          {STAGES[currentStageIndex].label}
        </span>
      </div>

      {/* Visual Stepper Track with Nodes */}
      <div style={{ position: 'relative', margin: '10px 10px 24px' }}>
        {/* Background Track Line */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '0',
          right: '0',
          height: '4px',
          backgroundColor: '#E2E8F0',
          borderRadius: '2px',
          zIndex: 1
        }} />

        {/* Active Progress Fill Line */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '0',
          width: `${progressPercent}%`,
          height: '4px',
          backgroundColor: currentStageIndex === 3 ? '#10B981' : COLORS.primary,
          borderRadius: '2px',
          transition: 'width 0.4s ease',
          zIndex: 2
        }} />

        {/* 4 Node Icons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 3
        }}>
          {STAGES.map((s, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            let nodeBg = '#FFFFFF';
            let nodeBorder = '#CBD5E1';
            let nodeContent = <span style={{ fontSize: '12px', color: '#94A3B8' }}>{idx + 1}</span>;

            if (isCompleted || (idx === 3 && currentStageIndex === 3)) {
              nodeBg = '#10B981';
              nodeBorder = '#10B981';
              nodeContent = <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: '900' }}>✓</span>;
            } else if (isCurrent) {
              nodeBg = activeCfg.bg;
              nodeBorder = activeCfg.border;
              nodeContent = <span style={{ fontSize: '13px' }}>{s.icon}</span>;
            }

            return (
              <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: nodeBg,
                  border: `2px solid ${nodeBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? `0 0 0 3px ${activeCfg.border}33` : '0 1px 3px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease'
                }}>
                  {nodeContent}
                </div>

                <div style={{
                  fontSize: '10px',
                  fontWeight: isCurrent ? '800' : isCompleted ? '700' : '500',
                  color: isCurrent ? COLORS.textPrimary : isCompleted ? '#059669' : COLORS.textMuted,
                  marginTop: '6px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  {s.label.split('. ')[1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Process Context Explanation */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '8px 12px',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.textPrimary }}>
          <span>{STAGES[currentStageIndex].icon}</span>
          <span style={{ fontWeight: '600' }}>
            {currentStageIndex === 0 && 'Issue submitted successfully. Queued for clarity verification.'}
            {currentStageIndex === 1 && (assignedOfficer
              ? `Verified & routed to ${assignedOfficer.department} (${assignedOfficer.name}).`
              : 'Verified photo & classified department. Routing to ward official.')}
            {currentStageIndex === 2 && (assignedOfficer
              ? `Officer ${assignedOfficer.name} has dispatched field workers to this location.`
              : 'Field crew assigned and actively carrying out repairs on spot.')}
            {currentStageIndex === 3 && (resolutionNote
              ? `Resolution complete: "${resolutionNote}"`
              : 'Civic defect inspected and repaired by municipal crew.')}
          </span>
        </div>

        {currentStageIndex === 3 && mttrHours && (
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#059669', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '6px' }}>
            ⏱️ Resolved in {mttrHours} hrs
          </span>
        )}
      </div>
    </div>
  );
}
