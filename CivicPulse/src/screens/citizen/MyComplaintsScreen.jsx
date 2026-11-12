import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaints, deleteComplaint, setSelectedComplaint, setStatusFilter, setSearchQuery } from '../../store/slices/complaintSlice';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import ComplaintLifecycleStepper from '../../components/ComplaintLifecycleStepper';
import COLORS from '../../constants/colors';
import { isComplaintOwnedByUser } from '../../utils/userFilter';

const FILTERS = [
  { id: 'All', label: 'All', icon: '📋' },
  { id: 'Submitted', label: 'Submitted', icon: '📬' },
  { id: 'Verified_Assigned', label: 'Verified', icon: '✅' },
  { id: 'In Progress', label: 'Active', icon: '⚙️' },
  { id: 'Resolved', label: 'Resolved', icon: '🎉' },
  { id: 'Rejected_Invalid_Image', label: 'Rejected', icon: '❌' },
];

export default function MyComplaintsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, statusFilter, searchQuery, isLoading } = useSelector((state) => state.complaints);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch, user?.id, user?.phone]);

  useEffect(() => {
    const timer = setTimeout(() => dispatch(setSearchQuery(localSearch)), 300);
    return () => clearTimeout(timer);
  }, [localSearch, dispatch]);

  // Strict per-user isolation: only complaints belonging to this logged-in citizen
  const userComplaints = (items || []).filter(c => isComplaintOwnedByUser(c, user));

  // Compute live counts for EVERY filter chip based exclusively on userComplaints
  const counts = {
    All: userComplaints.length,
    Submitted: userComplaints.filter(c => c.status === 'Submitted' || c.status === 'Pending').length,
    Verified_Assigned: userComplaints.filter(c => c.status === 'Verified_Assigned' || c.status === 'verified').length,
    'In Progress': userComplaints.filter(c => c.status === 'In Progress' || c.status === 'in_progress').length,
    Resolved: userComplaints.filter(c => c.status === 'Resolved' || c.status === 'resolved').length,
    Rejected_Invalid_Image: userComplaints.filter(c => c.status === 'Rejected_Invalid_Image' || c.status === 'Rejected' || c.aiInspection?.aiVerified === false).length,
  };

  const filtered = userComplaints.filter(item => {
    let matchStatus = true;
    if (statusFilter === 'Submitted') {
      matchStatus = item.status === 'Submitted' || item.status === 'Pending';
    } else if (statusFilter === 'Verified_Assigned') {
      matchStatus = item.status === 'Verified_Assigned' || item.status === 'verified';
    } else if (statusFilter === 'In Progress') {
      matchStatus = item.status === 'In Progress' || item.status === 'in_progress';
    } else if (statusFilter === 'Resolved') {
      matchStatus = item.status === 'Resolved' || item.status === 'resolved';
    } else if (statusFilter === 'Rejected_Invalid_Image') {
      matchStatus = item.status === 'Rejected_Invalid_Image' || item.status === 'Rejected' || item.aiInspection?.aiVerified === false;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      item.title?.toLowerCase().includes(q) ||
      item.id?.toLowerCase().includes(q) ||
      item.categoryLabel?.toLowerCase().includes(q) ||
      item.location?.address?.toLowerCase().includes(q) ||
      item.assignedOfficer?.name?.toLowerCase().includes(q) ||
      item.assignedOfficer?.department?.toLowerCase().includes(q);

    return matchStatus && matchSearch;
  });

  const handleOpenDetail = (item) => {
    dispatch(setSelectedComplaint(item));
    if (navigation?.navigate) {
      navigation.navigate('ComplaintDetail');
    }
  };

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeleteComplaint = async (e, id) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `⚠️ Withdraw Complaint?\n\nAre you sure you want to take back and delete complaint #${id}?\n\nThis will permanently remove your complaint from the municipal portal.`
    );
    if (!confirmed) return;

    try {
      await dispatch(deleteComplaint(id)).unwrap();
      alert(`✅ Complaint #${id} has been withdrawn and deleted successfully.`);
    } catch (err) {
      alert(`❌ Failed to delete complaint: ${err}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '90px', maxWidth: '960px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px' }}>

      {/* =====================================================================
          TOP HERO & SEARCH BAR
      ===================================================================== */}
      <div style={{
        marginTop: '16px',
        background: 'linear-gradient(135deg, #0F172A 0%, #115E59 60%, #0D9488 100%)',
        padding: '28px 24px 24px',
        borderRadius: '24px',
        color: '#FFFFFF',
        boxShadow: '0 8px 28px rgba(13,148,136,0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative backdrop glow */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#5EEAD4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CivicPulse Issue Tracker
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#FFFFFF', margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                My Filed Complaints
              </h1>
            </div>

            <button
              type="button"
              onClick={() => navigation?.navigate && navigation.navigate('ReportIssue')}
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              }}
            >
              <span>➕</span> Report New Issue
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px' }}>🔍</span>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by issue title, complaint ID (e.g. CMP-2026-484), street, or department..."
              style={{
                width: '100%',
                padding: '12px 38px 12px 40px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.25)',
                fontSize: '13px',
                fontWeight: '500',
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          FILTER CHIPS ROW WITH LIVE DYNAMIC COUNTS ON EVERY CHIP
      ===================================================================== */}
      <div style={{ marginTop: '16px', marginBottom: '8px' }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {FILTERS.map((f) => {
            const count = counts[f.id] ?? 0;
            const isSelected = statusFilter === f.id;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => dispatch(setStatusFilter(f.id))}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9999px',
                  border: isSelected ? `2px solid ${COLORS.primary}` : '1.5px solid var(--border)',
                  backgroundColor: isSelected ? COLORS.primaryLight : '#FFFFFF',
                  color: isSelected ? COLORS.primaryDark : COLORS.textPrimary,
                  fontWeight: isSelected ? '800' : '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSelected ? '0 2px 8px rgba(13,148,136,0.2)' : 'var(--shadow-sm)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
                {/* Live Count Pill on every chip! */}
                <span style={{
                  backgroundColor: isSelected ? COLORS.primary : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : COLORS.textSecondary,
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: '800',
                  marginLeft: '2px'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Count Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingLeft: '4px', paddingRight: '4px' }}>
          <div style={{ fontSize: '12px', color: COLORS.textMuted, fontWeight: '700' }}>
            Showing {filtered.length} of {userComplaints.length} total complaint{userComplaints.length !== 1 ? 's' : ''}
          </div>
          {statusFilter !== 'All' && (
            <button
              type="button"
              onClick={() => dispatch(setStatusFilter('All'))}
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.primary,
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Reset filter ↺
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          COMPLAINTS LIST WITH VISUAL WORKING PROCESS STEPPER
      ===================================================================== */}
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '18px' }} />
          ))
        ) : userComplaints.length === 0 ? (
          /* Dedicated Empty State for New Citizen with Zero Complaints */
          <div style={{
            textAlign: 'center',
            padding: '54px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1.5px dashed var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '6px' }}>
              No Complaints Filed Yet
            </div>
            <div style={{ fontSize: '13px', color: COLORS.textMuted, marginBottom: '20px', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              You haven't submitted any municipal reports yet. Spot a pothole, garbage dump, streetlight failure, or water leakage? File your first complaint now!
            </div>
            <button
              type="button"
              onClick={() => navigation?.navigate && navigation.navigate('ReportIssue')}
              style={{
                backgroundColor: COLORS.primary,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)'
              }}
            >
              <span>➕</span> Report First Issue Now →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state when filter has no matches */
          <div style={{
            textAlign: 'center',
            padding: '54px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1.5px dashed var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '4px' }}>
              No complaints match your filter
            </div>
            <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '16px', maxWidth: '320px', margin: '0 auto 16px' }}>
              {searchQuery
                ? `No complaints match "${searchQuery}". Try a different keyword.`
                : `There are currently no complaints in the "${statusFilter}" stage.`}
            </div>
            <button
              type="button"
              onClick={() => { dispatch(setStatusFilter('All')); setLocalSearch(''); }}
              style={{
                backgroundColor: COLORS.primary,
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              View All Complaints
            </button>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const coords = item.location?.coordinates || [74.8841, 21.3527];
            const mapsUrl = `https://www.google.com/maps?q=${coords[1]},${coords[0]}`;

            return (
              <div
                key={item.id}
                className="animate-fade-in"
                style={{
                  animationDelay: `${idx * 0.04}s`,
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '18px',
                  boxShadow: 'var(--shadow-card)',
                  border: '1.5px solid var(--border)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => handleOpenDetail(item)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,42,0.08)';
                  e.currentTarget.style.borderColor = COLORS.primary;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                {/* 1. Top Row: Thumbnail, Title, ID, Badges */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '14px',
                        objectFit: 'cover',
                        border: '1px solid var(--border)',
                        display: 'block'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '2px',
                      backgroundColor: 'rgba(15,23,42,0.85)',
                      color: '#FFFFFF',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: '800'
                    }}>
                      PHOTO
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Copyable ID Badge */}
                        <span
                          onClick={(e) => handleCopyId(e, item.id)}
                          title="Click to copy complaint ID"
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '800',
                            color: COLORS.primaryDark,
                            backgroundColor: COLORS.primaryLight,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {item.id} {copiedId === item.id ? '✓ Copied' : '📋'}
                        </span>

                        <span style={{ fontSize: '10px', color: COLORS.textMuted }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Delete / Take Request Back Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteComplaint(e, item.id)}
                          title="Take request back (Delete complaint)"
                          style={{
                            backgroundColor: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                            borderRadius: '9999px',
                            padding: '3px 10px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#DC2626';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FEE2E2';
                            e.currentTarget.style.color = '#DC2626';
                          }}
                        >
                          <span style={{ fontSize: '11px' }}>🗑️</span>
                          <span>Delete</span>
                        </button>

                        {item.urgency && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            backgroundColor: item.urgency === 'high' || item.urgency === 'critical' ? '#FEE2E2' : '#FEF3C7',
                            color: item.urgency === 'high' || item.urgency === 'critical' ? '#B91C1C' : '#92400E',
                            textTransform: 'uppercase'
                          }}>
                            {item.urgency}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Complaint Title */}
                    <h3 style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: COLORS.textPrimary,
                      margin: '2px 0 4px',
                      lineHeight: 1.3
                    }}>
                      {item.title}
                    </h3>

                    {/* Location with Google Maps link */}
                    <div style={{ fontSize: '12px', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span>📍 {item.location?.address || 'Shirpur Ward'}</span>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: '#0284C7',
                          fontSize: '11px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        Map ↗
                      </a>
                    </div>
                  </div>
                </div>

                {/* 2. THE WORKING PROCESS (LIFECYCLE PROGRESS STEPPER) */}
                <ComplaintLifecycleStepper
                  status={item.status}
                  assignedOfficer={item.assignedOfficer}
                  resolutionNote={item.resolutionNote}
                  mttrHours={item.mttrHours}
                  rejectionReason={item.rejectionReason || item.aiInspection?.rejectionReason}
                />

                {/* 3. Action Bar / Quick Links */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: COLORS.textMuted }}>
                    <span>🏷️ <strong>{item.categoryLabel || item.category}</strong></span>
                    {item.assignedOfficer && (
                      <span>• 👮‍♂️ {item.assignedOfficer.name}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#0369A1',
                        textDecoration: 'none',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#F0F9FF'
                      }}
                    >
                      🗺️ Open in Google Maps ↗
                    </a>

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item)}
                      style={{
                        backgroundColor: COLORS.primaryLight,
                        color: COLORS.primaryDark,
                        border: `1px solid ${COLORS.primary}`,
                        borderRadius: '8px',
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      View Full Lifecycle Timeline →
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
