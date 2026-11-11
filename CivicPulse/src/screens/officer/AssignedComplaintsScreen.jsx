import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaints, setSelectedComplaint } from '../../store/slices/complaintSlice';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import AiInspectionBadge from '../../components/AiInspectionBadge';
import COLORS from '../../constants/colors';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Categories', icon: '📋' },
  { id: 'pothole', label: 'Roads', icon: '🚧' },
  { id: 'garbage', label: 'Garbage', icon: '🗑️' },
  { id: 'water', label: 'Water', icon: '💧' },
  { id: 'street_light', label: 'Streetlight', icon: '💡' },
  { id: 'drainage', label: 'Drainage', icon: '🌊' },
  { id: 'illegal_parking', label: 'Traffic', icon: '🚗' },
];

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

  const filteredPending = pending.filter(item => {
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

  const highCount = pending.filter(i => {
    const p = (i.aiInspection?.mlPriority?.level || i.aiInspection?.cvResult?.predictedPriority || i.urgency || '').toLowerCase();
    return p === 'high' || p === 'critical';
  }).length;

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
        {/* Active Tasks with Filter Controls */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>⚙️ Active Tasks ({filteredPending.length})</div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Filter by Priority & Problem Type</div>
          </div>

          {/* Priority filter pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'ALL', label: `All (${pending.length})` },
              { id: 'HIGH', label: `🚨 High (${highCount})` },
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

          {/* Category filter pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '2px' }}>
            {CATEGORY_TABS.map(cat => {
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
                    gap: '4px'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {filteredPending.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '20px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textMuted }}>
                No active tasks match this category / priority filter.
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
          )}
        </div>

        {/* Resolved Tasks */}
        {resolved.length > 0 && (
          <div>
            <div className="section-title">✅ Completed Tasks ({resolved.length})</div>
            {resolved.map((item, idx) => (
              <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <Card style={{ opacity: 0.85 }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <img src={item.image} alt={item.title} style={{ width: '54px', height: '54px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: COLORS.textMuted }}>{item.id}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="truncate" style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textSecondary }}>{item.title}</div>
                      {item.mttrHours && (
                        <div style={{ fontSize: '10px', color: COLORS.resolved, fontWeight: '700', marginTop: '3px' }}>
                          ⏱️ MTTR: {item.mttrHours}h
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

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
