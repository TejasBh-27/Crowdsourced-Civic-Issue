import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createComplaint } from '../../store/slices/complaintSlice';
import Button from '../../components/Button';
import Card from '../../components/Card';
import COLORS from '../../constants/colors';
import STRINGS from '../../constants/strings';
import { validateComplaintForm } from '../../utils/validators';

const AI_STAGES = [
  '📡 Uploading photo to Node.js Gateway...',
  '🔍 OpenCV pre-processing image...',
  '🧠 TensorFlow ResNet50-CivicCV running...',
  '💬 DistilBERT NLP classifying complaint...',
  '📊 Scikit-Learn ML scoring priority...',
  '✅ Saving record to database...',
];

export default function ReportIssueScreen({ route, navigation }) {
  const preselectedCategory = route?.params?.preselectedCategory || 'pothole';

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(preselectedCategory);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [aiStage, setAiStage] = useState(-1);
  const [aiInspecting, setAiInspecting] = useState(false);

  // 📷 Photo state
  const [photoFile, setPhotoFile] = useState(null);       // actual File object
  const [previewUrl, setPreviewUrl] = useState(null);     // local blob URL for display
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [location] = useState({
    address: 'Main Market Road, Ward 14 — Central Zone',
    latitude: 28.6139,
    longitude: 77.2090
  });

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isSubmitting } = useSelector((state) => state.complaints);

  const selectedCatObj = STRINGS.categories.find(c => c.id === category) || STRINGS.categories[0];

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Only JPEG, PNG or WebP photos are allowed.');
      return;
    }
    // Validate size (8MB)
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Photo must be smaller than 8 MB.');
      return;
    }
    setPhotoError('');
    setPhotoFile(file);
    // Revoke old preview
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoFile(null);
    setPreviewUrl(null);
    setPhotoError('');
  };

  useEffect(() => {
    let interval;
    if (aiInspecting) {
      setAiStage(0);
      let stage = 0;
      interval = setInterval(() => {
        stage++;
        if (stage < AI_STAGES.length) setAiStage(stage);
        else clearInterval(interval);
      }, 600);
    } else {
      setAiStage(-1);
    }
    return () => clearInterval(interval);
  }, [aiInspecting]);

  const handleSubmit = async () => {
    setErrors({});
    setPhotoError('');

    // Validate form
    const validation = validateComplaintForm({ title, category, description, location });
    if (!validation.isValid) { setErrors(validation.errors); return; }

    if (!photoFile) {
      setPhotoError('Please attach a photo of the issue before submitting.');
      return;
    }

    setAiInspecting(true);

    const payload = {
      title,
      category,
      categoryLabel: selectedCatObj.label,
      description,
      location,
      photoFile,        // real File object → multipart upload to backend
      previewUrl,       // used as fallback image URL in mock mode
      image: previewUrl,
      isBlurryTest: false,
      reportedBy: {
        id: user?.id || 'CIT-4481',
        name: user?.name || 'Ananya Sharma',
        phone: user?.phone || '+91 98765 43210'
      }
    };

    const result = await dispatch(createComplaint(payload));
    setAiInspecting(false);

    if (createComplaint.fulfilled.match(result)) {
      const verified = result.payload.aiInspection?.aiVerified;
      const isLive = result.payload.isLive;
      if (!verified) {
        alert(`⚠️ TensorFlow CV Rejected!\n\n${result.payload.aiInspection?.rejectionReason || 'Photo did not pass image clarity check.'}\n\nPlease resubmit a clearer photo from 3–5 feet distance.`);
      } else {
        alert(`🎉 ${isLive ? '✅ Saved to Database!' : 'Verified by AI!'}\nRouted to: ${result.payload.assignedOfficer?.department || 'Assigned Department'}\n${isLive ? 'Photo uploaded to server.' : 'Running in mock mode — start backend for real storage.'}`);
      }
      navigation.navigate('MyComplaints');
    } else {
      alert(`❌ Submission failed: ${result.error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px', maxWidth: '640px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '28px 20px 24px',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
      }}>
        <button
          type="button"
          onClick={() => navigation.goBack()}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', marginBottom: '12px' }}
        >
          ← Back
        </button>
        <h2 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          Report Civic Issue
        </h2>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          FastAPI AI · TensorFlow CV · DistilBERT NLP · Scikit-Learn ML · Express + DB
        </p>
      </div>

      {/* AI Processing Full-Screen Overlay */}
      {aiInspecting && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(15,23,42,0.92)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px'
        }}>
          <div style={{ fontSize: '52px', marginBottom: '16px', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⚙️</div>
          <h3 style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '800', marginBottom: '6px', textAlign: 'center' }}>
            AI Pipeline Executing
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '24px', textAlign: 'center', maxWidth: '280px' }}>
            Your photo is being uploaded & analyzed by the Python FastAPI microservice
          </p>

          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px 20px', maxWidth: '340px', width: '100%' }}>
            {AI_STAGES.map((stage, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '7px 0',
                opacity: idx <= aiStage ? 1 : 0.3,
                transition: 'opacity 0.4s ease'
              }}>
                <span style={{ fontSize: '12px', width: '16px', textAlign: 'center' }}>
                  {idx < aiStage ? '✅' : idx === aiStage ? '⏳' : '○'}
                </span>
                <span style={{ fontSize: '12px', color: idx <= aiStage ? '#FFFFFF' : 'rgba(255,255,255,0.35)', fontWeight: idx === aiStage ? '700' : '400' }}>
                  {stage}
                </span>
              </div>
            ))}
          </div>

          {previewUrl && (
            <img src={previewUrl} alt="Uploading" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', marginTop: '20px', border: '2px solid rgba(255,255,255,0.2)' }} />
          )}
        </div>
      )}

      <div style={{ padding: '16px 20px' }}>

        {/* Category Chips */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Issue Category *
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STRINGS.categories.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} style={{
                  padding: '6px 12px', borderRadius: '9999px',
                  border: isSelected ? `1.5px solid ${COLORS.primary}` : '1px solid var(--border)',
                  backgroundColor: isSelected ? COLORS.primaryLight : '#F8FAFC',
                  color: isSelected ? COLORS.primaryDark : COLORS.textSecondary,
                  fontWeight: isSelected ? '800' : '600', fontSize: '12px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.15s ease'
                }}>
                  <span>{cat.icon}</span><span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Issue Title *
          </div>
          <input
            type="text"
            className={`cp-input ${errors.title ? 'error' : ''}`}
            placeholder="e.g. Deep hazardous pothole near Main Market Gate"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <div style={{ color: COLORS.rejected, fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>⚠️ {errors.title}</div>}
        </div>

        {/* ─── PHOTO UPLOAD ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Photo Evidence * <span style={{ color: COLORS.primary, textTransform: 'none', fontSize: '10px', fontWeight: '600' }}>(JPEG / PNG / WebP · max 8 MB)</span>
          </div>

          {/* Hidden inputs */}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />

          {!previewUrl ? (
            /* Upload prompt box */
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${photoError ? COLORS.rejected : COLORS.primary}`,
                borderRadius: '16px',
                backgroundColor: photoError ? '#FEF2F2' : '#F0FDFA',
                padding: '28px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📷</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.primaryDark, marginBottom: '4px' }}>
                Tap to Upload Photo
              </div>
              <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '16px' }}>
                Choose from gallery or take a new photo
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  style={{
                    backgroundColor: COLORS.primary, color: '#fff',
                    border: 'none', borderRadius: '10px', padding: '9px 18px',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  🖼️ Gallery / Files
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  style={{
                    backgroundColor: COLORS.secondaryLight, color: '#fff',
                    border: 'none', borderRadius: '10px', padding: '9px 18px',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  📸 Camera
                </button>
              </div>
            </div>
          ) : (
            /* Photo preview */
            <div style={{
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              border: `2px solid ${COLORS.primary}`,
              backgroundColor: '#000'
            }}>
              <img
                src={previewUrl}
                alt="Selected"
                style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
              />
              {/* Overlay info strip */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(15,23,42,0.85))',
                padding: '16px 12px 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF' }}>
                    {photoFile?.name?.length > 30 ? photoFile.name.slice(0, 30) + '…' : photoFile?.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                    {photoFile && `${(photoFile.size / 1024).toFixed(0)} KB · ${photoFile.type.split('/')[1].toUpperCase()}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    🔄 Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{ backgroundColor: 'rgba(220,38,38,0.8)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* TF CV ready badge */}
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                backgroundColor: 'rgba(5, 150, 105, 0.9)', color: '#FFFFFF',
                padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800'
              }}>
                🤖 Ready for TF CV
              </div>
            </div>
          )}

          {photoError && (
            <div style={{ color: COLORS.rejected, fontSize: '11px', fontWeight: '600', marginTop: '6px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              ⚠️ {photoError}
            </div>
          )}
        </div>
        {/* ─────────────────────────────────────────────────────────────────────── */}

        {/* Location */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Location (GeoJSON Point)
          </div>
          <div style={{ background: '#F0FDFA', border: `1.5px solid ${COLORS.primary}40`, borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textPrimary }}>{location.address}</div>
              <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px', fontFamily: 'monospace' }}>[{location.longitude}, {location.latitude}]</div>
            </div>
            <span style={{ background: COLORS.primaryLight, color: COLORS.primaryDark, padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>📡 GPS</span>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Description (NLP Input) *
          </div>
          <textarea
            rows={3}
            className={`cp-input ${errors.description ? 'error' : ''}`}
            placeholder="Describe defect, size, location landmark, safety risk… DistilBERT NLP will classify department."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
          {errors.description && <div style={{ color: COLORS.rejected, fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>⚠️ {errors.description}</div>}
        </div>

        {/* Submit */}
        <Button
          title={aiInspecting || isSubmitting ? '🤖 AI Pipeline Running…' : '🚀 Submit & Upload to Backend'}
          onPress={handleSubmit}
          loading={aiInspecting || isSubmitting}
          size="large"
        />

        {/* Info note */}
        <div style={{ marginTop: '12px', padding: '10px 12px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE', display: 'flex', gap: '8px', fontSize: '11px', color: '#1E40AF' }}>
          <span>ℹ️</span>
          <span>Photo uploads to the <strong>Express backend</strong> on port 4000. Start it with <code style={{ background: '#DBEAFE', padding: '1px 4px', borderRadius: '3px' }}>npm run dev</code> inside <code>/backend</code>. Falls back to mock AI when offline.</span>
        </div>
      </div>
    </div>
  );
}
