import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaints, acceptComplaintTask, rejectComplaintTask, setSelectedComplaint, fetchMttrAnalytics } from '../../store/slices/complaintSlice';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import AiInspectionBadge from '../../components/AiInspectionBadge';
import COLORS from '../../constants/colors';

const REJECTION_TEMPLATES = [
  'Duplicate report: This issue is already registered and tracked under another ticket.',
  'Outside jurisdiction: Issue is on private property or under state/national highway authority.',
  'Non-civic defect: Does not constitute a municipal civic maintenance violation.',
  'Already addressed: Field inspection confirms this defect has already been resolved.',
  'Inadequate information: Provided photo or GPS location does not depict an actionable civic defect.'
];

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Categories', icon: '📋' },
  { id: 'pothole', label: 'Roads & Damage', icon: '🚧' },
  { id: 'garbage', label: 'Garbage & Waste', icon: '🗑️' },
  { id: 'water', label: 'Water Leakage', icon: '💧' },
  { id: 'street_light', label: 'Streetlight', icon: '💡' },
  { id: 'drainage', label: 'Drainage Overflow', icon: '🌊' },
  { id: 'illegal_parking', label: 'Traffic & Parking', icon: '🚗' },
];

export default function OfficerHomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, mttrStats, isLoading } = useSelector((state) => state.complaints);
  const [acceptingId, setAcceptingId] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  useEffect(() => {
    dispatch(fetchComplaints());
    dispatch(fetchMttrAnalytics());
  }, [dispatch]);

  const getPriorityWeight = (item) => {
    const level = (item.aiInspection?.mlPriority?.level || item.aiInspection?.cvResult?.predictedPriority || item.urgency || '').toLowerCase();
    const score = Number(item.aiInspection?.mlPriority?.score || item.aiInspection?.cvResult?.priorityScore) || 0;
    let base = 0;
    if (level === 'critical') base = 3000;
    else if (level === 'high') base = 2000;
    else if (level === 'medium') base = 1000;
    return base + score;
  };

  const unacceptedItems = [...items]
    .filter(c => c.status === 'Verified_Assigned' || c.status === 'Submitted')
    .sort((a, b) => getPriorityWeight(b) - getPriorityWeight(a));

  const filteredUnaccepted = unacceptedItems.filter(item => {
    if (priorityFilter !== 'ALL') {
      const pri = (item.aiInspection?.mlPriority?.level || item.aiInspection?.cvResult?.predictedPriority || item.urgency || '').toUpperCase();
      if (pri !== priorityFilter) return false;
    }
    if (categoryFilter !== 'ALL') {
      const cat = (item.aiInspection?.cvResult?.predictedCategory || item.category || '').toLowerCase();
      if (cat !== categoryFilter && !cat.includes(categoryFilter)) return false;
    }
    return true;
  });

  const highPriorityCount = unacceptedItems.filter(i => {
    const p = (i.aiInspection?.mlPriority?.level || i.aiInspection?.cvResult?.predictedPriority || item.urgency || '').toLowerCase();
    return p === 'high' || p === 'critical';
  }).length;
  const mediumPriorityCount = unacceptedItems.filter(i => {
    const p = (i.aiInspection?.mlPriority?.level || i.aiInspection?.cvResult?.predictedPriority || item.urgency || '').toLowerCase();
    return p === 'medium';
  }).length;
  const lowPriorityCount = unacceptedItems.filter(i => {
    const p = (i.aiInspection?.mlPriority?.level || i.aiInspection?.cvResult?.predictedPriority || item.urgency || '').toLowerCase();
    return p === 'low';
  }).length;

  const inProgressItems = items.filter(c => c.status === 'In Progress');
  const resolvedCount = items.filter(c => c.status === 'Resolved').length;
  const criticalItems = items.filter(c => c.urgency === 'high' || c.urgency === 'critical');

  const handleAcceptTask = async (item) => {
    setAcceptingId(item.id);
    await dispatch(acceptComplaintTask({
      id: item.id,
      officerInfo: {
        id: user?.id || 'OFF-9902',
        name: user?.name || 'Inspector Rajesh Kumar',
        department: user?.department || 'Roads & Infrastructure'
      }
    }));
    setAcceptingId(null);
  };

  const handleOpenRejectModal = (item) => {
    setRejectModalItem(item);
    setRejectReason('');
    setRejectError('');
  };

  const handleCloseRejectModal = () => {
    if (isRejecting) return;
    setRejectModalItem(null);
    setRejectReason('');
    setRejectError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError('Please provide a rejection description (minimum 5 characters).');
      return;
    }

    setIsRejecting(true);
    setRejectError('');
    try {
      await dispatch(rejectComplaintTask({
        id: rejectModalItem.id,
        reason: rejectReason.trim(),
        officerInfo: {
          id: user?.id || 'OFF-9902',
          name: user?.name || 'Inspector Rajesh Kumar',
          department: user?.department || 'Roads & Infrastructure'
        }
      })).unwrap();

      setRejectModalItem(null);
      setRejectReason('');
    } catch (err) {
      setRejectError(err?.message || 'Failed to reject complaint. Please try again.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleOpenResolve = (item) => {
    dispatch(setSelectedComplaint(item));
    navigation.navigate('ResolveComplaint');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
        padding: '28px 20px 24px',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(99,102,241,0.12)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(99,102,241,0.2)',
              color: '#A5B4FC',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '9px',
              fontWeight: '800',
              letterSpacing: '0.08em',
              marginBottom: '8px'
            }}>
              👮‍♂️ OFFICER DASHBOARD
            </div>
            <h2 style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '3px' }}>
              {user?.name || 'Inspector Rajesh Kumar'}
            </h2>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
              {user?.department || 'Roads & Infrastructure'} · Ward 14 · Badge #{user?.badgeNumber || 'MCD-8841'}
            </div>
          </div>
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
            alt="Officer"
            style={{ width: '52px', height: '52px', borderRadius: '50%', border: `2.5px solid ${COLORS.accent}`, objectFit: 'cover' }}
          />
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { count: unacceptedItems.length, label: 'New AI-Assigned', color: '#D97706', bg: '#FEF3C7', icon: '📥' },
            { count: inProgressItems.length, label: 'In Progress', color: '#8B5CF6', bg: '#EDE9FE', icon: '⚙️' },
            { count: resolvedCount, label: 'Resolved', color: '#059669', bg: '#D1FAE5', icon: '✅' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: s.bg, borderRadius: '14px', padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', marginBottom: '3px' }}>{s.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: `${s.color}AA`, marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* MTTR Analytics */}
        <div style={{ marginBottom: '20px' }}>
          <div className="section-title">📊 MTTR Analytics Dashboard</div>
          <Card elevated>
            <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.textMuted, marginBottom: '8px' }}>
              MongoDB Aggregation Pipeline · Mean Time to Resolution
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: '800', color: COLORS.primaryDark, lineHeight: 1 }}>
                  {mttrStats.avgMttrHours}
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.textMuted }}>Avg. Hours</div>
              </div>
              <div style={{ flex: 1 }}>
                {mttrStats.deptBreakdown.map((dept, i) => {
                  const maxMttr = Math.max(...mttrStats.deptBreakdown.map(d => d.mttr));
                  const pct = (dept.mttr / maxMttr) * 100;
                  const colors = ['#0D9488', '#6366F1', '#2563EB', '#EF4444'];
                  return (
                    <div key={i} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600', marginBottom: '3px' }}>
                        <span style={{ color: COLORS.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{dept.dept}</span>
                        <span style={{ color: colors[i], fontWeight: '800' }}>{dept.mttr}h</span>
                      </div>
                      <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors[i], borderRadius: '3px', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: COLORS.textMuted, background: '#F8FAFC', padding: '6px 10px', borderRadius: '8px', fontFamily: 'monospace' }}>
              db.complaints.aggregate([{'{'}$group: {'{'}avgMttr: {'{'}$avg: "$mttrHours"{'}'}{'}'}{'}'},{'{'}$sort{'}'}...])
            </div>
          </Card>
        </div>

        {/* Action Priority Queue with Category & Priority Filters */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="section-title" style={{ marginBottom: 0 }}>🚨 Action Priority Queue</div>
              <span style={{
                background: '#FEE2E2',
                color: COLORS.rejected,
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 10px',
                borderRadius: '9999px',
                border: '1px solid #FCA5A5'
              }}>
                {filteredUnaccepted.length} of {unacceptedItems.length} ACTIVE
              </span>
            </div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted, fontWeight: '600' }}>
              Prioritize by Problem Category & Urgency
            </div>
          </div>

          {/* Filter 1: Urgency Priority Bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'ALL', label: `All Priorities (${unacceptedItems.length})` },
              { id: 'HIGH', label: `🚨 High Priority (${highPriorityCount})` },
              { id: 'MEDIUM', label: `⚠️ Medium (${mediumPriorityCount})` },
              { id: 'LOW', label: `🟢 Low (${lowPriorityCount})` },
            ].map((p) => {
              const active = priorityFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriorityFilter(p.id)}
                  style={{
                    backgroundColor: active ? '#0F172A' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#334155',
                    border: `1.5px solid ${active ? '#0F172A' : '#E2E8F0'}`,
                    borderRadius: '20px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: active ? '800' : '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Filter 2: Problem Category Bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
            {CATEGORY_TABS.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  style={{
                    backgroundColor: active ? '#0D9488' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#475569',
                    border: `1.5px solid ${active ? '#0D9488' : '#E2E8F0'}`,
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: active ? '800' : '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filtered Complaint Cards */}
          {filteredUnaccepted.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '24px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔍</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textPrimary }}>
                No complaints found for this filter
              </div>
              <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
                Try selecting "All Priorities" or "All Categories" to view incoming intake.
              </div>
              <button
                type="button"
                onClick={() => {
                  setPriorityFilter('ALL');
                  setCategoryFilter('ALL');
                }}
                style={{
                  marginTop: '10px',
                  backgroundColor: COLORS.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Reset Filters
              </button>
            </Card>
          ) : (
            filteredUnaccepted.map((item) => (
              <Card key={item.id} style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: COLORS.textMuted }}>{item.id}</span>
                    <span style={{
                      backgroundColor: '#E0F2FE',
                      color: '#0369A1',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '800'
                    }}>
                      🏷️ {item.aiInspection?.cvResult?.categoryLabel || item.categoryLabel || item.category}
                    </span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '6px' }}>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '1px solid #BFDBFE'
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '3px' }}>
                      {item.title}
                    </h4>
                    <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '4px' }}>
                      📍 {item.location?.address}
                    </div>
                    {item.aiInspection?.cvResult?.officerRecommendation && (
                      <div style={{ fontSize: '10px', color: '#0369A1', fontWeight: '700' }}>
                        🛠️ {item.aiInspection.cvResult.officerRecommendation}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Category & Priority Telemetry */}
                <AiInspectionBadge aiResult={item.aiInspection} compact forceShowOfficer />

                {/* Officer Action Bar */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleAcceptTask(item)}
                    disabled={acceptingId === item.id}
                    style={{
                      flex: 1,
                      backgroundColor: acceptingId === item.id ? COLORS.textMuted : COLORS.primary,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: acceptingId === item.id ? 'wait' : 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    {acceptingId === item.id ? '⏳ Accepting...' : '✓ Accept Task & Dispatch Crew'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenRejectModal(item)}
                    style={{
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      border: '1.5px solid #FCA5A5',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    ✕ Reject Task
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenResolve(item)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: COLORS.textSecondary,
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    View →
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* In Progress Tasks */}
        {inProgressItems.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div className="section-title">⚙️ Active Field Tasks</div>
            {inProgressItems.map((item) => (
              <Card key={item.id} style={{ backgroundColor: '#FAF5FF', borderColor: '#DDD6FE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: COLORS.textMuted }}>{item.id}</span>
                  <StatusBadge status={item.status} />
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '4px' }}>{item.title}</h4>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '10px' }}>📍 {item.location?.address}</div>
                <button
                  type="button"
                  onClick={() => handleOpenResolve(item)}
                  style={{
                    width: '100%',
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  📋 Update Status & Mark Resolved
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* High Priority */}
        {criticalItems.length > 0 && (
          <div>
            <div className="section-title">🔥 High Priority Queue</div>
            {criticalItems.filter(i => i.status !== 'Resolved').map((item) => (
              <Card key={item.id} style={{ backgroundColor: '#FFF5F5', borderColor: '#FECACA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ backgroundColor: '#FEE2E2', color: COLORS.rejected, padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: '800' }}>
                    ⚠️ {item.urgency?.toUpperCase()} PRIORITY
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '4px' }}>{item.title}</h4>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginBottom: '10px' }}>📍 {item.location?.address}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #FECACA', paddingTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: COLORS.textSecondary }}>By: {item.reportedBy?.name}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenResolve(item)}
                    style={{ backgroundColor: COLORS.secondary, color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Update →
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {unacceptedItems.length === 0 && inProgressItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.resolved }}>All tasks completed!</div>
            <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>Ward 14 queue is clear.</div>
          </div>
        )}
      </div>

      {/* Rejection Description Modal */}
      {rejectModalItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            animation: 'scaleIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)',
              padding: '18px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#FFFFFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🛑</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                    Reject Civic Task
                  </h3>
                  <div style={{ fontSize: '11px', color: '#FEE2E2', opacity: 0.9 }}>
                    Municipal Administration Authority
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseRejectModal}
                disabled={isRejecting}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '16px',
                  cursor: isRejecting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              {/* Target Complaint Summary */}
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.primary }}>
                    {rejectModalItem.id}
                  </span>
                  <span style={{ fontSize: '11px', color: COLORS.textMuted }}>
                    Ward 14 · {rejectModalItem.reportedBy?.name || 'Citizen'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textPrimary }}>
                  {rejectModalItem.title}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginTop: '2px' }}>
                  📍 {rejectModalItem.location?.address}
                </div>
              </div>

              {/* Requirement Note */}
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '14px',
                fontSize: '12px',
                color: '#991B1B',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: '15px' }}>ℹ️</span>
                <span>
                  Admin rights permit rejecting this task. You <strong>must provide a detailed explanation</strong> why the request is rejected. This description is forwarded directly to the citizen and logged on the audit timeline.
                </span>
              </div>

              {/* Quick Template Chips */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.textSecondary, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Fill Reason (Tap to Insert):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {REJECTION_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectReason(tmpl)}
                      style={{
                        backgroundColor: rejectReason === tmpl ? '#FEE2E2' : '#F1F5F9',
                        color: rejectReason === tmpl ? '#B91C1C' : '#475569',
                        border: rejectReason === tmpl ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                        borderRadius: '9999px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {tmpl.split(':')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rejection Description Input */}
              <div style={{ marginBottom: '6px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '6px' }}>
                  Rejection Description *
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError('');
                  }}
                  placeholder="Explain clearly why this civic task was rejected by the administration (e.g. invalid photo, duplicate defect, not under municipal jurisdiction)..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${rejectError ? '#EF4444' : '#CBD5E1'}`,
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Character counter & error display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', color: rejectError ? '#DC2626' : COLORS.textMuted }}>
                  {rejectError || (rejectReason.trim().length < 5 ? `Min 5 characters required (${rejectReason.trim().length}/5)` : '✓ Description valid')}
                </span>
                <span style={{ fontSize: '11px', color: COLORS.textMuted }}>
                  {rejectReason.length} characters
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseRejectModal}
                  disabled={isRejecting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: COLORS.textSecondary,
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: isRejecting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isRejecting || rejectReason.trim().length < 5}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: (isRejecting || rejectReason.trim().length < 5) ? '#FCA5A5' : '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: (isRejecting || rejectReason.trim().length < 5) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isRejecting ? '⏳ Rejecting Task...' : '🛑 Confirm & Reject Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
