import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaints, setSelectedComplaint, setStatusFilter, setSearchQuery } from '../../store/slices/complaintSlice';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import AiInspectionBadge from '../../components/AiInspectionBadge';
import COLORS from '../../constants/colors';

const FILTERS = ['All', 'Submitted', 'Verified_Assigned', 'In Progress', 'Resolved', 'Rejected_Invalid_Image'];

const FILTER_LABELS = {
  All: 'All',
  Submitted: 'Submitted',
  Verified_Assigned: '✅ Verified',
  'In Progress': '⚙️ Active',
  Resolved: '🎉 Resolved',
  Rejected_Invalid_Image: '❌ Rejected',
};

export default function MyComplaintsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items, statusFilter, searchQuery, isLoading } = useSelector((state) => state.complaints);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => dispatch(setSearchQuery(localSearch)), 300);
    return () => clearTimeout(timer);
  }, [localSearch, dispatch]);

  const filtered = items.filter(item => {
    const matchStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const handleOpenDetail = (item) => {
    dispatch(setSelectedComplaint(item));
    navigation.navigate('ComplaintDetail');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '28px 20px 24px',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px'
      }}>
        <h2 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '12px' }}>
          My Complaints
        </h2>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by title or complaint ID..."
            style={{
              width: '100%',
              padding: '11px 14px 11px 36px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => dispatch(setStatusFilter(filter))}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                border: statusFilter === filter ? `1.5px solid ${COLORS.primary}` : '1px solid var(--border)',
                backgroundColor: statusFilter === filter ? COLORS.primaryLight : '#FFFFFF',
                color: statusFilter === filter ? COLORS.primaryDark : COLORS.textSecondary,
                fontWeight: statusFilter === filter ? '800' : '600',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {FILTER_LABELS[filter] || filter} {statusFilter === filter && filtered.length > 0 ? `(${filtered.length})` : ''}
            </button>
          ))}
        </div>

        {/* Count */}
        <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px', fontWeight: '600' }}>
          Showing {filtered.length} complaint{filtered.length !== 1 ? 's' : ''}
        </div>

        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px', marginBottom: '10px' }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: COLORS.textSecondary, marginBottom: '4px' }}>No complaints found</div>
            <div style={{ fontSize: '12px', color: COLORS.textMuted }}>Try adjusting your filters or search</div>
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
              <Card onClick={() => handleOpenDetail(item)} elevated>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '9px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '2px' }}>{item.id}</div>
                        <div className="truncate" style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textPrimary }}>{item.title}</div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
                      📍 {item.location?.address}
                    </div>
                  </div>
                </div>

                <AiInspectionBadge aiResult={item.aiInspection} compact />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '10px', color: COLORS.textMuted }}>🏷️ {item.categoryLabel}</span>
                  <span style={{ fontSize: '10px', color: COLORS.textMuted }}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                </div>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
