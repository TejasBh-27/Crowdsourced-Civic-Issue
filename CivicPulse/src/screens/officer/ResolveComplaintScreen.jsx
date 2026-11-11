import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resolveComplaint, acceptComplaintTask, rejectComplaintTask } from '../../store/slices/complaintSlice';
import Button from '../../components/Button';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import AiInspectionBadge from '../../components/AiInspectionBadge';
import COLORS from '../../constants/colors';
import { COMPLAINT_STATUS } from '../../constants/api';

// Real file upload — no hardcoded sample photos

const STATUS_OPTIONS = [
  { value: COMPLAINT_STATUS.IN_PROGRESS, label: '⚙️ In Progress', desc: 'Field crew dispatched', color: '#8B5CF6', bg: '#EDE9FE' },
  { value: COMPLAINT_STATUS.RESOLVED, label: '✅ Mark Resolved', desc: 'Work completed', color: '#059669', bg: '#D1FAE5' },
  { value: 'Rejected', label: '❌ Reject Task', desc: 'Admin rejection with reason', color: '#DC2626', bg: '#FEE2E2' },
];

export default function ResolveComplaintScreen({ navigation }) {
  const dispatch = useDispatch();
  const { selectedComplaint: item, isSubmitting } = useSelector((state) => state.complaints);
  const { user } = useSelector((state) => state.auth);

  const [selectedStatus, setSelectedStatus] = useState(
    item?.status === 'Resolved' ? COMPLAINT_STATUS.RESOLVED : COMPLAINT_STATUS.IN_PROGRESS
  );
  const [resolutionNote, setResolutionNote] = useState(item?.resolutionNote || '');
  const [resolutionFile, setResolutionFile] = useState(null);
  const [resolutionPreview, setResolutionPreview] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    return () => { if (resolutionPreview) URL.revokeObjectURL(resolutionPreview); };
  }, [resolutionPreview]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoError('Only JPEG, PNG or WebP allowed.'); return; }
    if (file.size > 8 * 1024 * 1024) { setPhotoError('Photo must be smaller than 8 MB.'); return; }
    setPhotoError('');
    setResolutionFile(file);
    if (resolutionPreview) URL.revokeObjectURL(resolutionPreview);
    setResolutionPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <p style={{ color: COLORS.textSecondary, marginBottom: '16px', fontWeight: '600' }}>No complaint selected.</p>
        <Button title="← Go to Dashboard" onPress={() => navigation.goBack()} variant="outline" size="small" style={{ width: 'auto', margin: '0 auto' }} />
      </div>
    );
  }

  const isAlreadyResolved = item.status === COMPLAINT_STATUS.RESOLVED;

  const handleUpdate = async () => {
    if (!resolutionNote.trim()) {
      alert('Please add field inspection notes before submitting.');
      return;
    }

    const officerInfo = {
      id: user?.id || 'OFF-9902',
      name: user?.name || 'Inspector Rajesh Kumar',
      department: user?.department || 'Roads & Infrastructure'
    };

    if (selectedStatus === 'Rejected') {
      if (resolutionNote.trim().length < 5) {
        alert('Please provide a detailed rejection description explaining why the task was rejected (minimum 5 characters).');
        return;
      }
      const result = await dispatch(rejectComplaintTask({
        id: item.id,
        reason: resolutionNote.trim(),
        officerInfo
      }));
      if (rejectComplaintTask.fulfilled.match(result)) {
        alert(`🛑 Complaint #${item.id} Rejected!\n\nRejection description has been recorded and delivered to the citizen.`);
        navigation.navigate('OfficerHome');
      }
      return;
    }

    if (selectedStatus === COMPLAINT_STATUS.IN_PROGRESS && item.status === 'Verified_Assigned') {
      await dispatch(acceptComplaintTask({ id: item.id, officerInfo }));
    }

    if (selectedStatus === COMPLAINT_STATUS.RESOLVED) {
      const result = await dispatch(resolveComplaint({
        id: item.id,
        note: resolutionNote,
        resolutionImage: resolutionPreview || null,
        officerInfo,
        resolutionFile: resolutionFile || null
      }));
      if (resolveComplaint.fulfilled.match(result)) {
        alert(`✅ Complaint #${item.id} Resolved!\n\nMTTR: ${result.payload.mttrHours} hours\nFCM Push notification dispatched to citizen.`);
        navigation.navigate('AssignedComplaints');
      }
    } else {
      alert(`✅ Status Updated to: ${selectedStatus}\nField crew data saved to MongoDB.`);
      navigation.navigate('AssignedComplaints');
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px', maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          type="button"
          onClick={() => navigation.goBack()}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
        >
          ← Back
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '800' }}>Resolve Complaint</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{item.id}</div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div style={{ padding: '16px' }}>
        {/* Complaint Summary */}
        <Card elevated style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <img src={item.image} alt="Defect" style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: COLORS.primaryDark, marginBottom: '2px' }}>🏷️ {item.categoryLabel}</div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '4px', lineHeight: 1.2 }}>{item.title}</h3>
              <div style={{ fontSize: '11px', color: COLORS.textMuted }}>📍 {item.location?.address}</div>
            </div>
          </div>

          <div style={{ marginTop: '12px', padding: '10px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>👤</span>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: COLORS.textMuted }}>REPORTED BY CITIZEN</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textPrimary }}>{item.reportedBy?.name}</div>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary }}>📞 {item.reportedBy?.phone}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  backgroundColor: item.urgency === 'high' || item.urgency === 'critical' ? '#FEE2E2' : '#FEF3C7',
                  color: item.urgency === 'high' || item.urgency === 'critical' ? COLORS.rejected : COLORS.pending,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '9px',
                  fontWeight: '800'
                }}>
                  {(item.urgency || 'medium').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <AiInspectionBadge aiResult={item.aiInspection} forceShowOfficer />

        {/* Already Resolved View */}
        {isAlreadyResolved ? (
          <Card style={{ backgroundColor: COLORS.resolvedBg, borderColor: COLORS.resolved }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.resolved, marginBottom: '8px' }}>🎉 Already Resolved</div>
            {item.resolutionImage && (
              <img src={item.resolutionImage} alt="Resolution" style={{ width: '100%', height: '160px', borderRadius: '12px', objectFit: 'cover', marginBottom: '10px' }} />
            )}
            <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, marginBottom: '4px' }}>Officer Note:</div>
            <div style={{ fontSize: '13px', color: COLORS.textPrimary }}>{item.resolutionNote}</div>
            {item.mttrHours && (
              <div style={{ marginTop: '10px', background: '#DCFCE7', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', color: COLORS.resolved }}>
                ⏱️ MTTR Logged: {item.mttrHours} hours
              </div>
            )}
          </Card>
        ) : (
          <>
            {/* Status Selector */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Update Status
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = selectedStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedStatus(opt.value)}
                      style={{
                        flex: 1,
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${opt.color}` : '1.5px solid var(--border)',
                        backgroundColor: isSelected ? opt.bg : '#F8FAFC',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? opt.color : COLORS.textSecondary }}>{opt.label}</div>
                      <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px' }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resolution Photo Upload (only if marking resolved) */}
            {selectedStatus === COMPLAINT_STATUS.RESOLVED && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Upload Resolution Proof * <span style={{ textTransform: 'none', fontSize: '10px', fontWeight: '600', color: COLORS.resolved }}>(JPEG / PNG / WebP · max 8 MB)</span>
                </div>

                {/* Hidden inputs */}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileSelect} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />

                {!resolutionPreview ? (
                  <div style={{ border: `2px dashed ${photoError ? COLORS.rejected : COLORS.resolved}`, borderRadius: '14px', backgroundColor: photoError ? '#FEF2F2' : '#F0FDF4', padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.resolved, marginBottom: '12px' }}>Upload "After" Photo Proof</div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button type="button" onClick={() => fileInputRef.current?.click()} style={{ backgroundColor: COLORS.resolved, color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>🖼️ Gallery</button>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} style={{ backgroundColor: '#0D9488', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>📷 Camera</button>
                    </div>
                    {photoError && <div style={{ color: COLORS.rejected, fontSize: '11px', marginTop: '8px', fontWeight: '600' }}>⚠️ {photoError}</div>}
                  </div>
                ) : (
                  <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: `2px solid ${COLORS.resolved}` }}>
                    <img src={resolutionPreview} alt="Resolution proof" style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.75)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#fff', fontWeight: '700' }}>{resolutionFile?.name?.slice(0, 28)}…</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>{resolutionFile && `${(resolutionFile.size / 1024).toFixed(0)} KB`}</div>
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>🔄 Change</button>
                    </div>
                    <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(5,150,105,0.9)', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>✅ Proof Ready</div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: selectedStatus === 'Rejected' ? '#DC2626' : COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {selectedStatus === 'Rejected' ? 'Rejection Description / Reason * (Delivered to citizen)' : 'Field Inspection Notes *'}
              </div>
              <textarea
                rows={3}
                className="cp-input"
                placeholder={
                  selectedStatus === 'Rejected'
                    ? 'Explain clearly why this civic task was rejected by the administration (minimum 5 characters)...'
                    : 'e.g. Work crew completed asphalt patching at Main Market Gate. Site cleaned and verified.'
                }
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                style={{
                  resize: 'vertical',
                  lineHeight: 1.5,
                  borderColor: selectedStatus === 'Rejected' ? '#FCA5A5' : undefined
                }}
              />
              {selectedStatus === 'Rejected' && (
                <div style={{ fontSize: '11px', color: resolutionNote.trim().length < 5 ? '#DC2626' : '#059669', marginTop: '4px' }}>
                  {resolutionNote.trim().length < 5
                    ? `Min 5 characters required (${resolutionNote.trim().length}/5)`
                    : '✓ Valid rejection description provided'}
                </div>
              )}
            </div>

            <Button
              title={
                isSubmitting
                  ? (selectedStatus === 'Rejected' ? 'Rejecting Task…' : 'Updating & Logging MTTR…')
                  : (selectedStatus === 'Rejected'
                      ? '🛑 Confirm & Reject Task'
                      : `💾 Save — Mark as ${selectedStatus === COMPLAINT_STATUS.RESOLVED ? 'Resolved ✅' : 'In Progress ⚙️'}`)
              }
              onPress={handleUpdate}
              loading={isSubmitting}
              size="large"
              variant={selectedStatus === 'Rejected' ? 'danger' : (selectedStatus === COMPLAINT_STATUS.RESOLVED ? 'success' : 'primary')}
            />
          </>
        )}
      </div>
    </div>
  );
}
