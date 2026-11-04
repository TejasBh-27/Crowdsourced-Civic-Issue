import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resubmitPhoto } from '../../store/slices/complaintSlice';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import AiInspectionBadge from '../../components/AiInspectionBadge';
import Button from '../../components/Button';
import COLORS from '../../constants/colors';

export default function ComplaintDetailScreen({ navigation }) {
  const dispatch = useDispatch();
  const { selectedComplaint: item, isSubmitting } = useSelector((state) => state.complaints);
  const [resubmitting, setResubmitting] = useState(false);

  // Resubmit photo state
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    return () => { if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl); };
  }, [newPreviewUrl]);

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
        <p style={{ color: COLORS.textSecondary, marginBottom: '16px', fontWeight: '600' }}>No complaint selected.</p>
        <Button title="← Back to List" onPress={() => navigation.goBack()} variant="outline" size="small" style={{ width: 'auto', margin: '0 auto' }} />
      </div>
    );
  }

  const isRejected = item.status === 'Rejected_Invalid_Image' || item.aiInspection?.aiVerified === false;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoError('Only JPEG, PNG or WebP allowed.'); return; }
    if (file.size > 8 * 1024 * 1024) { setPhotoError('Photo must be smaller than 8 MB.'); return; }
    setPhotoError('');
    setNewPhotoFile(file);
    if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    setNewPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleResubmitPhoto = async () => {
    if (!newPhotoFile) { setPhotoError('Please select a new, clear photo first.'); return; }
    setResubmitting(true);
    const result = await dispatch(resubmitPhoto({ id: item.id, photoFile: newPhotoFile, previewUrl: newPreviewUrl }));
    setResubmitting(false);
    if (resubmitPhoto.fulfilled.match(result)) {
      alert('🎉 Photo Resubmitted!\nTensorFlow CV has re-analyzed your photo. Status updated.');
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
      setNewPhotoFile(null);
      setNewPreviewUrl(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileSelect} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />

      {/* Top Bar */}
      <div style={{ backgroundColor: COLORS.secondary, color: '#FFFFFF', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button type="button" onClick={() => navigation.goBack()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
          ← Back
        </button>
        <span style={{ fontSize: '14px', fontWeight: '800' }}>{item.id}</span>
        <StatusBadge status={item.status} />
      </div>

      <div style={{ padding: '16px' }}>
        {/* Cover Photo */}
        <div style={{ borderRadius: '16px', overflow: 'hidden', height: '200px', position: 'relative', marginBottom: '12px' }}>
          <img src={item.image} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(15,23,42,0.85)', color: '#FFFFFF', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
            🏷️ {item.categoryLabel}
          </div>
        </div>

        {/* AI Inspection Full Report */}
        <AiInspectionBadge aiResult={item.aiInspection} />

        {/* Resubmit Photo Section — only when CV rejected */}
        {isRejected && (
          <Card style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.rejected, marginBottom: '6px' }}>
              ⚠️ Action Required: Upload a Clearer Photo
            </div>
            <p style={{ fontSize: '12px', color: COLORS.textPrimary, lineHeight: 1.5, marginBottom: '14px' }}>
              TensorFlow CV detected blurriness or invalid content (clarity score low). Upload a well-lit, in-focus photo from 3–5 feet away.
            </p>

            {/* Photo picker */}
            {!newPreviewUrl ? (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  🖼️ Choose from Gallery
                </button>
                <button type="button" onClick={() => cameraInputRef.current?.click()} style={{ flex: 1, backgroundColor: COLORS.secondaryLight, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  📸 Use Camera
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', border: `2px solid ${COLORS.primary}` }}>
                <img src={newPreviewUrl} alt="New photo" style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.7)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#fff', fontWeight: '600' }}>{newPhotoFile?.name?.slice(0, 25)}…</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', padding: '4px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    🔄 Change
                  </button>
                </div>
                <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(5,150,105,0.9)', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>
                  ✅ Ready to Submit
                </div>
              </div>
            )}

            {photoError && <div style={{ color: COLORS.rejected, fontSize: '11px', fontWeight: '600', marginBottom: '10px' }}>⚠️ {photoError}</div>}

            <Button
              title={resubmitting ? '🤖 Re-running TensorFlow CV…' : '📤 Resubmit Photo to AI Pipeline'}
              onPress={handleResubmitPhoto}
              loading={resubmitting || isSubmitting}
              variant="danger"
              disabled={!newPhotoFile}
            />
          </Card>
        )}

        {/* Title & Description */}
        <Card elevated>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '8px', letterSpacing: '-0.02em' }}>{item.title}</h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: COLORS.textMuted }}>📅 {new Date(item.createdAt).toLocaleString()}</span>
            <span style={{
              fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
              backgroundColor: item.urgency === 'high' || item.urgency === 'critical' ? '#FEE2E2' : '#FEF3C7',
              color: item.urgency === 'high' || item.urgency === 'critical' ? COLORS.rejected : COLORS.pending
            }}>
              {(item.urgency || 'medium').toUpperCase()} PRIORITY
            </span>
          </div>

          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
          <p style={{ fontSize: '13px', color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: '12px' }}>{item.description}</p>

          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Location</div>
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary }}>📍 {item.location?.address}</div>
            <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px', fontFamily: 'monospace' }}>
              GeoJSON: [{item.location?.coordinates?.join(', ') || '77.2090, 28.6139'}]
            </div>
          </div>
        </Card>

        {/* Resolution proof */}
        {item.status === 'Resolved' && (
          <Card style={{ backgroundColor: COLORS.resolvedBg, borderColor: COLORS.resolved, marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.resolved, marginBottom: '8px' }}>🎉 Resolved by Ward Officer</div>
            {item.resolutionImage && (
              <img src={item.resolutionImage} alt="Resolution" style={{ width: '100%', height: '160px', borderRadius: '10px', objectFit: 'cover', marginBottom: '10px' }} />
            )}
            <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.textSecondary }}>Officer Note:</div>
            <div style={{ fontSize: '12px', color: COLORS.textPrimary, marginTop: '2px', lineHeight: 1.5 }}>
              {item.resolutionNote || 'Issue inspected and repaired.'}
            </div>
            {item.mttrHours && (
              <div style={{ marginTop: '10px', backgroundColor: '#DCFCE7', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', color: COLORS.resolved }}>
                ⏱️ MTTR (Mean Time to Resolution): {item.mttrHours} hours
              </div>
            )}
          </Card>
        )}

        {/* Assigned Officer */}
        <Card>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>Assigned Department & Officer</div>
          {item.assignedOfficer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: COLORS.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👮‍♂️</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textPrimary }}>{item.assignedOfficer.name}</div>
                <div style={{ fontSize: '11px', color: COLORS.primaryDark, fontWeight: '700' }}>{item.assignedOfficer.department}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: COLORS.textMuted, fontStyle: 'italic' }}>⏳ Awaiting AI verification / officer assignment</div>
          )}
        </Card>

        {/* Timeline */}
        <Card style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '12px' }}>Complaint Lifecycle Tracker</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(item.timeline || []).map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: idx === item.timeline.length - 1 ? COLORS.primary : '#CBD5E1', marginTop: '2px' }} />
                  {idx < item.timeline.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: '#E2E8F0', marginTop: '4px' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: idx < item.timeline.length - 1 ? '6px' : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
                    <span style={{ color: COLORS.textPrimary }}>{step.status}</span>
                    <span style={{ fontSize: '10px', color: COLORS.textMuted }}>{new Date(step.timestamp || step.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginTop: '2px', lineHeight: 1.4 }}>{step.note}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
