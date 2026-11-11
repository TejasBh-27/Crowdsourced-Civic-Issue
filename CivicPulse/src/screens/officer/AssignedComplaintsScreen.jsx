import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaints, setSelectedComplaint } from '../../store/slices/complaintSlice';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import AiInspectionBadge from '../../components/AiInspectionBadge';
import COLORS from '../../constants/colors';

export default function AssignedComplaintsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items, isLoading } = useSelector((state) => state.complaints);
  const { user } = useSelector((state) => state.auth);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const active = items.filter(c => c.status !== 'Rejected_Invalid_Image');
  const resolved = items.filter(c => c.status === 'Resolved');
  const pending = items.filter(c => c.status === 'Verified_Assigned' || c.status === 'In Progress');

  const isCompletedTab = categoryFilter === 'COMPLETED';

  // Active tasks filtered by priority and category
  const filteredPending = pending.filter(item => {
    if (priorityFilter !== 'ALL') {
      const pri = (item.aiInspection?.mlPriority?.level || item.aiInspection?.cvResult?.predictedPriority || item.urgency || '').toUpperCase();
      if (pri !== priorityFilter) return false;
    }
    if (categoryFilter !== 'ALL' && categoryFilter !== 'COMPLETED') {
      const cat = (item.aiInspection?.cvResult?.predictedCategory || item.category || '').toLowerCase();
      if (cat !== categoryFilter && !cat.includes(categoryFilter)) return false;
    }
    return true;
  });

  // Completed tasks (shown in dedicated Completed Tasks category)
  const filteredResolved = resolved.filter(item => {
    if (priorityFilter !== 'ALL') {
      const pri = (item.aiInspection?.mlPriority?.level || item.aiInspection?.cvResult?.predictedPriority || item.urgency || '').toUpperCase();
      if (pri !== priorityFilter) return false;
    }
    return true;
  });

  const currentPool = isCompletedTab ? resolved : pending;
  const currentPoolHigh = currentPool.filter(i => {
    const p = (i.aiInspection?.mlPriority?.level || i.aiInspection?.cvResult?.predictedPriority || i.urgency || '').toLowerCase();
    return p === 'high' || p === 'critical';
  }).length;

  const categoryTabs = [
    { id: 'ALL', label: 'All Categories', icon: '📋' },
    { id: 'pothole', label: 'Roads', icon: '🚧' },
    { id: 'garbage', label: 'Garbage', icon: '🗑️' },
    { id: 'water', label: 'Water', icon: '💧' },
    { id: 'street_light', label: 'Streetlight', icon: '💡' },
    { id: 'drainage', label: 'Drainage', icon: '🌊' },
    { id: 'illegal_parking', label: 'Traffic', icon: '🚗' },
    { id: 'COMPLETED', label: `Completed (${resolved.length})`, icon: '✅', isCompletedTab: true },
  ];

  const handleOpen = (item) => {
    dispatch(setSelectedComplaint(item));
    navigation.navigate('ResolveComplaint');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
        padding: '28px 20px 24px',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        marginBottom: '0'
      }}>
        <h2 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          My Assigned Tasks
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
          {pending.length} active · {resolved.length} completed
        </p>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Filter Controls */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              {isCompletedTab
                ? `✅ Completed Tasks (${filteredResolved.length})`
                : `⚙️ Active Tasks (${filteredPending.length})`}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
              {isCompletedTab ? 'Resolved & Verified Work' : 'Filter by Priority & Problem Type'}
            </div>
          </div>

          {/* Priority filter pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'ALL', label: `All (${currentPool.length})` },
              { id: 'HIGH', label: `🚨 High (${currentPoolHigh})` },
              { id: 'MEDIUM', label: `⚠️ Medium` },
              { id: 'LOW', label: `🟢 Low` },
            ].map(p => {
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
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: active ? '800' : '600',
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Category filter pills including dedicated Completed Tasks category */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categoryTabs.map(cat => {
              const active = categoryFilter === cat.id;
              const isCompleted = cat.isCompletedTab;

              let bg = '#FFFFFF';
              let color = '#475569';
              let borderColor = '#E2E8F0';

              if (active) {
                if (isCompleted) {
                  bg = '#059669';
                  color = '#FFFFFF';
                  borderColor = '#059669';
                } else {
                  bg = '#0D9488';
                  color = '#FFFFFF';
                  borderColor = '#0D9488';
                }
              } else if (isCompleted) {
                bg = '#F0FDF4';
                color = '#15803D';
                borderColor = '#BBF7D0';
              }

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  style={{
                    backgroundColor: bg,
                    color,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: '20px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: active ? '800' : '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content: Completed Tasks OR Active Tasks */}
          {isCompletedTab ? (
            // ── DEDICATED COMPLETED TASKS CATEGORY ──────────────────────────
            filteredResolved.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '36px 20px', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textPrimary }}>
                  No completed tasks match this filter
                </div>
                <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>
                  Completed and resolved complaints will appear here.
                </div>
              </Card>
            ) : (
              filteredResolved.map((item, idx) => (
                <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s`, marginBottom: '10px' }}>
                  <Card onClick={() => handleOpen(item)} elevated style={{ borderLeft: '4px solid #10B981', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                      <img
                        src={item.image}
                        alt={item.title}
                        style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '800', color: COLORS.textMuted, fontFamily: 'monospace' }}>
                            {item.id}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {item.mttrHours && (
                              <span style={{
                                fontSize: '10px',
                                color: '#047857',
                                backgroundColor: '#D1FAE5',
                                fontWeight: '800',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #A7F3D0'
                              }}>
                                ⏱️ MTTR: {item.mttrHours}h
                              </span>
                            )}
                            <StatusBadge status={item.status} />
                          </div>
                        </div>

                        <div className="truncate" style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '3px' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
                          📍 {item.location?.address || 'Reported Location'}
                        </div>
                      </div>
                    </div>

                    {/* Resolution Note if available */}
                    {item.resolutionNote && (
                      <div style={{
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: '#166534',
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px'
                      }}>
                        <span style={{ fontSize: '13px' }}>📝</span>
                        <div>
                          <strong>Inspection & Repair Note:</strong> {item.resolutionNote}
                        </div>
                      </div>
                    )}

                    {/* Resolution Footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid #F1F5F9',
                      fontSize: '11px'
                    }}>
                      <span style={{ color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📅</span>
                        <span>Resolved: {item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString() : 'Closed'}</span>
                      </span>
                      <span style={{ color: '#059669', fontWeight: '700' }}>
                        View Resolution →
                      </span>
                    </div>
                  </Card>
                </div>
              ))
            )
          ) : (
            // ── ACTIVE TASKS ONLY (NO COMPLETED TASKS IN ACTIVE CATEGORIES) ──
            filteredPending.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '24px 20px', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textPrimary }}>
                  No active tasks match this category / priority filter.
                </div>
                <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
                  Tap the "✅ Completed Tasks" category to view resolved work.
                </div>
              </Card>
            ) : (
              filteredPending.map((item, idx) => (
                <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s`, marginBottom: '10px' }}>
                  <Card onClick={() => handleOpen(item)} elevated>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                      <img src={item.image} alt={item.title} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                          <span style={{ fontSize: '9px', fontWeight: '800', color: COLORS.textMuted }}>{item.id}</span>
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="truncate" style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '2px' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted }}>📍 {item.location?.address}</div>
                      </div>
                    </div>

                    <AiInspectionBadge aiResult={item.aiInspection} compact forceShowOfficer />

                    {item.assignedOfficer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '14px' }}>👮‍♂️</span>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.textPrimary }}>{item.assignedOfficer.name}</div>
                          <div style={{ fontSize: '10px', color: COLORS.textMuted }}>{item.assignedOfficer.department}</div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: COLORS.primary, fontWeight: '700' }}>Resolve →</span>
                      </div>
                    )}
                  </Card>
                </div>
              ))
            )
          )}
        </div>

        {active.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: COLORS.textSecondary }}>No tasks assigned yet</div>
            <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>Accept complaints from the Dashboard</div>
          </div>
        )}
      </div>
    </div>
  );
}
