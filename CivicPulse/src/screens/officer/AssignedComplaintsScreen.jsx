import React, { useEffect } from 'react';
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

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const active = items.filter(c => c.status !== 'Rejected_Invalid_Image');
  const resolved = items.filter(c => c.status === 'Resolved');
  const pending = items.filter(c => c.status === 'Verified_Assigned' || c.status === 'In Progress');

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
        {/* Active Tasks */}
        {pending.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div className="section-title">⚙️ Active Tasks ({pending.length})</div>
            {pending.map((item, idx) => (
              <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <Card onClick={() => handleOpen(item)} elevated>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                    <img src={item.image} alt={item.title} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: COLORS.textMuted }}>{item.id}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="truncate" style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '3px' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: COLORS.textMuted }}>📍 {item.location?.address}</div>
                    </div>
                  </div>

                  <AiInspectionBadge aiResult={item.aiInspection} compact />

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
            ))}
          </div>
        )}

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
