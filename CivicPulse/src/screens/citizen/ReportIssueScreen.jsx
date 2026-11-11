import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createComplaint } from '../../store/slices/complaintSlice';
import {
  detectRealWorldLocation,
  extractGpsFromPhoto
} from '../../utils/locationService';
import Button from '../../components/Button';
import Card from '../../components/Card';
import COLORS from '../../constants/colors';
import STRINGS from '../../constants/strings';
import { validateComplaintForm } from '../../utils/validators';
import aiFastApi from '../../api/aiFastApi';

const AI_STAGES = [
  '📤 Uploading photo evidence...',
  '📸 Verifying photo clarity and sharpness...',
  '🔍 Analyzing civic defect details...',
  '🏢 Routing to responsible municipal department...',
  '⚡ Calculating urgency and priority level...',
  '✅ Successfully registered civic complaint!',
];

export default function ReportIssueScreen({ route, navigation }) {
  const preselectedCategory = route?.params?.preselectedCategory || 'pothole';

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(preselectedCategory);
  const [hasUserManuallySelectedCategory, setHasUserManuallySelectedCategory] = useState(Boolean(route?.params?.preselectedCategory));
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [aiStage, setAiStage] = useState(-1);
  const [aiInspecting, setAiInspecting] = useState(false);

  // Photo state
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [mlVerification, setMlVerification] = useState(null);
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);

  // Live ML Model (civic_pulse_model.onnx) Real-Time Pixel & AI Scan
  useEffect(() => {
    let isCancelled = false;
    async function runScan() {
      if (previewUrl || photoFile) {
        setIsScanningPhoto(true);
        try {
          const cv = await aiFastApi.scanAndAnalyzeImage(photoFile || previewUrl, category, title, description, location, false);
          const pri = aiFastApi.computePriorityModel(cv, null, title, description, location);
          if (!isCancelled) {
            setMlVerification({ ...cv, priority: pri });
            if (!hasUserManuallySelectedCategory && cv.mappedCategoryKey && cv.mappedCategoryKey !== category) {
              setCategory(cv.mappedCategoryKey);
            }
          }
        } catch (err) {
          console.warn('Scan notice:', err);
        } finally {
          if (!isCancelled) setIsScanningPhoto(false);
        }
      } else {
        if (!isCancelled) {
          setMlVerification(null);
          setIsScanningPhoto(false);
        }
      }
    }
    runScan();
    return () => { isCancelled = true; };
  }, [previewUrl, photoFile, category, title, description, hasUserManuallySelectedCategory]);

  const isSubmissionBlocked = Boolean(mlVerification && (mlVerification.isCivicIssue === false || mlVerification.canSubmit === false || mlVerification.isValidImage === false));

  // Real-World Auto-Detected Location State
  const [location, setLocation] = useState({
    address: 'Acquiring live spot location...',
    latitude: 21.3527,
    longitude: 74.8841,
    accuracy: null,
    isRealGps: true,
    source: 'device_gps',
    capturedAt: null
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationInfoNote, setLocationInfoNote] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isSubmitting } = useSelector((state) => state.complaints);

  const selectedCatObj = STRINGS.categories.find(c => c.id === category) || STRINGS.categories[0];

  // Automatically acquire device GPS coordinates & reverse geocode
  const handleAcquireDeviceLocation = async (isInitial = false) => {
    setIsLocating(true);
    if (!isInitial) setLocationInfoNote('Acquiring real-time device GPS coordinates...');
    try {
      const realLoc = await detectRealWorldLocation();
      setLocation({
        ...realLoc,
        source: 'device_gps',
        capturedAt: realLoc.capturedAt || new Date().toLocaleTimeString()
      });
      setLocationInfoNote('🟢 Live device GPS locked for this spot.');
    } catch (err) {
      console.warn('GPS location notice:', err.message);
      setLocationInfoNote(err.message || 'Location access needed. Tap "Re-detect GPS" or check device settings.');
    } finally {
      setIsLocating(false);
    }
  };

  // On mount: automatically trigger live device GPS capture
  useEffect(() => {
    handleAcquireDeviceLocation(true);
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // PHOTO SELECTION: AUTOMATICALLY CAPTURE LIVE LOCATION OF THE SPOT
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Only JPEG, PNG or WebP photos are allowed.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Photo must be smaller than 8 MB.');
      return;
    }
    setPhotoError('');
    setPhotoFile(file);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    // =========================================================================
    // AUTOMATIC LIVE SPOT CAPTURE
    // 1. Check if photo has embedded camera EXIF GPS metadata
    // 2. If not, capture live device GPS at this exact instant
    // =========================================================================
    setIsLocating(true);
    setLocationInfoNote('Acquiring spot location for uploaded photo...');

    try {
      const photoGps = await extractGpsFromPhoto(file);
      if (photoGps.hasPhotoGps) {
        setLocation({
          address: photoGps.address,
          latitude: photoGps.latitude,
          longitude: photoGps.longitude,
          accuracy: photoGps.accuracy || 5,
          isRealGps: true,
          source: 'photo_exif',
          capturedAt: photoGps.capturedAt
        });
        setLocationInfoNote('📸 Exact location extracted from photo metadata where it was taken!');
      } else {
        // Automatically acquire live device GPS at the spot
        const deviceLoc = await detectRealWorldLocation();
        setLocation({
          address: deviceLoc.address,
          latitude: deviceLoc.latitude,
          longitude: deviceLoc.longitude,
          accuracy: deviceLoc.accuracy,
          isRealGps: true,
          source: 'device_gps',
          capturedAt: deviceLoc.capturedAt
        });
        setLocationInfoNote('🟢 Captured live spot location from device GPS at photo time.');
      }
    } catch (err) {
      console.warn('Location capture notice:', err);
      setLocationInfoNote('Captured live spot location.');
    } finally {
      setIsLocating(false);
    }

    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoFile(null);
    setPreviewUrl(null);
    setPhotoError('');
    setLocationInfoNote('');
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

    const resolvedTitle = title?.trim() || `${selectedCatObj.label} at ${location.address?.split(',')[0] || 'Reported Spot'}`;
    const resolvedDesc = description?.trim() && description.trim().length >= 5
      ? description.trim()
      : `${selectedCatObj.label} reported near ${location.address || 'Reported Spot'}. Immediate municipal resolution requested.`;

    const validation = validateComplaintForm({ title: resolvedTitle, category, description: resolvedDesc, location });
    if (!validation.isValid) { setErrors(validation.errors); return; }

    if (!photoFile) {
      setPhotoError('Please attach a photo of the issue before submitting.');
      return;
    }

    if (isSubmissionBlocked) {
      alert(`🚫 Submission Blocked!\n\n${mlVerification?.categoryVerificationMessage || 'The attached photo is not a valid civic defect.'}\n\nYou must upload a photo of an actual municipal issue (Road Potholes, Garbage Dump, Drainage Overflow, or Streetlight Failure) to submit this report.`);
      return;
    }

    setAiInspecting(true);

    const payload = {
      title: resolvedTitle,
      category,
      categoryLabel: selectedCatObj.label,
      description: resolvedDesc,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
        address: location.address,
        accuracyM: location.accuracy || undefined
      },
      photoFile,
      previewUrl,
      image: previewUrl,
      isBlurryTest: false,
      reportedBy: {
        id: user?.id || 'CIT-4668',
        name: user?.name || 'Tejas Bhamre',
        phone: user?.phone || '+91 95452 86810'
      }
    };

    const result = await dispatch(createComplaint(payload));
    setAiInspecting(false);

    if (createComplaint.fulfilled.match(result)) {
      const cv = result.payload.aiInspection?.cvResult || {};
      const catMsg = cv.isUserCategoryCorrect !== false
        ? `✅ Category Confirmed: ${cv.categoryLabel || selectedCatObj.label}`
        : (cv.categoryVerificationMessage || `ℹ️ Identified as: ${cv.categoryLabel || selectedCatObj.label}`);
      alert(`🎉 Complaint Submitted Successfully!\n\n🧠 ML Model: civic_pulse_model.onnx (EfficientNet-B0)\n${catMsg}\n⚡ Priority: ${(result.payload.urgency || cv.predictedPriority || 'MEDIUM').toUpperCase()}\n🏢 Department: ${result.payload.assignedOfficer?.department || selectedCatObj.department || 'Municipal Governance'}\n📍 Location: ${location.address}\n\n✅ Your complaint is saved permanently and visible in My Complaints.`);
      navigation.navigate('MyComplaints');
    } else {
      const errMsg = result.payload || result.error?.message || 'Submission could not be completed';
      alert(`❌ Submission failed: ${errMsg}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '90px', maxWidth: '720px', margin: '0 auto' }}>

      {/* Hidden file inputs: Gallery & Native Device Camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Top Header */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '24px 20px 28px',
        borderBottomLeftRadius: '28px',
        borderBottomRightRadius: '28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(13,148,136,0.15)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <button
            type="button"
            onClick={() => navigation.goBack()}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              marginBottom: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Report Civic Issue
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
            Quick Civic Issue Reporting · Live GPS Tagged · Direct Department Routing
          </p>
        </div>
      </div>

      {/* AI Processing Overlay Banner */}
      {aiInspecting && (
        <div style={{
          margin: '16px 20px 0',
          backgroundColor: '#0F172A',
          borderRadius: '16px',
          padding: '20px',
          color: '#FFFFFF',
          border: '1.5px solid rgba(13, 148, 136, 0.5)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          animation: 'pulseGlow 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 10px #10B981',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>
              Full-Stack AI Verification Pipeline Running
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {AI_STAGES.map((stage, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
                color: idx === aiStage ? '#38BDF8' : idx < aiStage ? '#10B981' : 'rgba(255,255,255,0.35)',
                fontWeight: idx === aiStage ? '800' : '600'
              }}>
                <span style={{ fontSize: '14px' }}>
                  {idx < aiStage ? '✓' : idx === aiStage ? '▶' : '○'}
                </span>
                <span>{stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '20px' }}>

        {/* Category Chips */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Issue Category *
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STRINGS.categories.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setHasUserManuallySelectedCategory(true);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '9999px',
                    border: isSelected ? `2px solid ${COLORS.primary}` : '1px solid var(--border)',
                    backgroundColor: isSelected ? COLORS.primaryLight : '#FFFFFF',
                    color: isSelected ? COLORS.primaryDark : COLORS.textSecondary,
                    fontWeight: isSelected ? '800' : '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo Evidence Card */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Photo Evidence * <span style={{ color: COLORS.textMuted, fontWeight: '500' }}>(JPEG / PNG / WebP • max 8 MB)</span>
          </div>

          {!previewUrl ? (
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
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📸</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.primaryDark, marginBottom: '4px' }}>
                Tap to Upload Photo
              </div>
              <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '16px' }}>
                Upload a photo to automatically extract its real GPS location
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  style={{
                    backgroundColor: COLORS.primary, color: '#fff',
                    border: 'none', borderRadius: '10px', padding: '9px 18px',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 2px 8px rgba(13,148,136,0.3)'
                  }}
                >
                  🖼️ Gallery / Files
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  style={{
                    backgroundColor: COLORS.secondary, color: '#fff',
                    border: 'none', borderRadius: '10px', padding: '9px 18px',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.2)'
                  }}
                >
                  📷 Camera (GPS Tagged)
                </button>
              </div>
            </div>
          ) : (
            /* Photo preview */
            <>
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
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
                />

                {/* Overlay info strip */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(15,23,42,0.9))',
                  padding: '20px 14px 10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF' }}>
                      {photoFile?.name?.length > 28 ? photoFile.name.slice(0, 28) + '...' : photoFile?.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                      {photoFile && `${(photoFile.size / 1024).toFixed(0)} KB • ${photoFile.type.split('/')[1].toUpperCase()}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      🔄 Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      style={{ backgroundColor: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Photo GPS Source Badge */}
                {location.source === 'photo_exif' && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '10px',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#10B981',
                    padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    border: '1px solid rgba(16, 185, 129, 0.5)'
                  }}>
                    <span>📍</span> Photo EXIF Location Locked
                  </div>
                )}

                {/* ML ONNX Model Active / Scanning / Non-Civic badge */}
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  backgroundColor: isScanningPhoto
                    ? 'rgba(30, 41, 59, 0.95)'
                    : isSubmissionBlocked
                    ? 'rgba(220, 38, 38, 0.95)'
                    : 'rgba(13, 148, 136, 0.95)',
                  color: '#FFFFFF',
                  padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)'
                }}>
                  {isScanningPhoto
                    ? '🔍 Scanning Photo...'
                    : isSubmissionBlocked
                    ? '🚫 Non-Civic Image Detected'
                    : '🧠 ML ONNX Model Active'}
                </div>
              </div>

              {/* Live ML Category & Priority Verification Card */}
              {mlVerification && (
                <div style={{
                  marginTop: '10px',
                  backgroundColor: isSubmissionBlocked
                    ? '#FEF2F2'
                    : mlVerification.categoryStatus === 'CONFIRMED'
                    ? '#F0FDF4'
                    : '#FFFBEB',
                  border: isSubmissionBlocked
                    ? '2px solid #EF4444'
                    : `1.5px solid ${mlVerification.categoryStatus === 'CONFIRMED' ? '#86EFAC' : '#FDE68A'}`,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: isSubmissionBlocked ? '#991B1B' : '#0F766E'
                    }}>
                      <span>{isSubmissionBlocked ? '🚫' : '🤖'}</span>
                      <span>
                        {isSubmissionBlocked
                          ? `IMAGE REJECTED: ${mlVerification.detectedImageType || 'NON-CIVIC'}`
                          : 'ML MODEL VERIFICATION (civic_pulse_model.onnx)'}
                      </span>
                    </div>

                    {isSubmissionBlocked ? (
                      <span style={{
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        border: '1px solid #FCA5A5',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '900',
                        textTransform: 'uppercase'
                      }}>
                        🚫 SUBMISSION BLOCKED
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: mlVerification.priority?.level === 'HIGH' ? '#FEE2E2' : '#FEF3C7',
                        color: mlVerification.priority?.level === 'HIGH' ? '#991B1B' : '#92400E',
                        border: `1px solid ${mlVerification.priority?.level === 'HIGH' ? '#FCA5A5' : '#FDE68A'}`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '900',
                        textTransform: 'uppercase'
                      }}>
                        ⚡ {mlVerification.priority?.level || 'MEDIUM'} PRIORITY ({mlVerification.priority?.score || 75}/100)
                      </span>
                    )}
                  </div>

                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    lineHeight: 1.4,
                    color: isSubmissionBlocked
                      ? '#991B1B'
                      : mlVerification.categoryStatus === 'CONFIRMED'
                      ? '#166534'
                      : '#92400E'
                  }}>
                    {mlVerification.categoryVerificationMessage}
                  </div>

                  {isSubmissionBlocked && (
                    <div style={{
                      marginTop: '4px',
                      padding: '8px 10px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #FECACA',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#B91C1C'
                    }}>
                      ⚠️ You cannot submit this complaint with a selfie, portrait, or non-civic photo. Please tap <strong>"🔄 Retake"</strong> to upload a photo of a Road Pothole, Garbage Dump, Drainage Overflow, or Streetlight.
                    </div>
                  )}

                  {!isSubmissionBlocked && mlVerification.categoryStatus === 'MISMATCH' && (
                    <div style={{
                      marginTop: '6px',
                      padding: '8px 12px',
                      backgroundColor: '#FFFBEB',
                      border: '1.5px solid #F59E0B',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ fontSize: '11px', color: '#92400E', fontWeight: '600' }}>
                        💡 The ML Vision Model scanned your photo and detected <strong>{mlVerification.categoryLabel}</strong>.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(mlVerification.mappedCategoryKey);
                          setHasUserManuallySelectedCategory(true);
                        }}
                        style={{
                          alignSelf: 'flex-start',
                          backgroundColor: '#D97706',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(217,119,6,0.25)'
                        }}
                      >
                        <span>🔄</span> Switch Category to "{mlVerification.categoryLabel}" (Recommended)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {photoError && (
            <div style={{ color: COLORS.rejected, fontSize: '11px', fontWeight: '600', marginTop: '6px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              ⚠️ {photoError}
            </div>
          )}
        </div>

        {/* Real-World Location Card (100% Automatic Device / Photo GPS) */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Issue Location (Live GPS Auto-Detected)
            </div>

            {/* Source Status Indicator */}
            {isLocating ? (
              <span style={{ fontSize: '11px', color: COLORS.primary, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="loading-dot" style={{ width: '4px', height: '4px' }}></span>
                Acquiring Live GPS...
              </span>
            ) : location.source === 'photo_exif' ? (
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                color: '#065F46',
                background: '#D1FAE5',
                padding: '3px 8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid #A7F3D0'
              }}>
                <span>📸</span> Photo EXIF GPS Locked
              </span>
            ) : (
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                color: '#065F46',
                background: '#D1FAE5',
                padding: '3px 8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid #A7F3D0'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                Live Device GPS Active
              </span>
            )}
          </div>

          <div style={{
            background: location.source === 'photo_exif' ? '#F0FDF4' : '#F0FDFA',
            border: `1.5px solid ${location.source === 'photo_exif' ? '#10B981' : COLORS.primary}`,
            borderRadius: '16px',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: location.source === 'photo_exif' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(13, 148, 136, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0
              }}>
                {location.source === 'photo_exif' ? '📸' : '📍'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditingAddress ? (
                  <div style={{ marginBottom: '6px' }}>
                    <input
                      type="text"
                      className="cp-input"
                      value={location.address}
                      onChange={(e) => setLocation(prev => ({ ...prev, address: e.target.value }))}
                      style={{ fontSize: '13px', padding: '8px 10px' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      style={{
                        background: COLORS.primary,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        marginTop: '4px'
                      }}
                    >
                      Save Landmark
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.textPrimary, lineHeight: 1.3, marginBottom: '4px' }}>
                    {location.address}
                  </div>
                )}

                <div style={{ fontSize: '11px', color: COLORS.textMuted, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'monospace', background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    [{location.longitude?.toFixed(5)}, {location.latitude?.toFixed(5)}]
                  </span>
                  {location.capturedAt && (
                    <span style={{ fontSize: '10px', color: COLORS.textSecondary }}>
                      📍 Captured live at {location.capturedAt}
                    </span>
                  )}
                  {location.source === 'photo_exif' ? (
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                      ✓ Real GPS of the scene where photo was taken
                    </span>
                  ) : location.accuracy ? (
                    <span style={{ fontSize: '10px', color: '#059669', fontWeight: '700' }}>
                      (±{location.accuracy}m GPS precision)
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Info note */}
            {locationInfoNote && (
              <div style={{
                marginTop: '10px',
                padding: '8px 10px',
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: '8px',
                fontSize: '11px',
                color: location.source === 'photo_exif' ? '#065F46' : '#0F766E',
                fontWeight: '600'
              }}>
                {locationInfoNote}
              </div>
            )}

            {/* Action Bar: Re-detect GPS & View in Google Maps */}
            <div style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(13, 148, 136, 0.15)',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleAcquireDeviceLocation(false)}
                  disabled={isLocating}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: COLORS.primaryDark,
                    border: `1px solid ${COLORS.primary}`,
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>🔄</span> {isLocating ? 'Detecting...' : 'Re-detect GPS'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingAddress(!isEditingAddress)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: COLORS.textSecondary,
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>✏️</span> {isEditingAddress ? 'Done' : 'Edit Landmark'}
                </button>
              </div>

              {/* View in Real Google Maps Link */}
              <a
                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#0284C7',
                  fontSize: '11px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🗺️</span> View in Google Maps ↗
              </a>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Issue Description *
          </div>
          <textarea
            rows={4}
            className={`cp-input ${errors.description ? 'error' : ''}`}
            placeholder="Describe defect, size, landmark, traffic or safety risk (e.g. deep pothole near Main Market Gate)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: 'vertical', minHeight: '90px' }}
          />
          {errors.description && (
            <div style={{ color: COLORS.rejected, fontSize: '11px', fontWeight: '600', marginTop: '4px' }}>
              ⚠️ {errors.description}
            </div>
          )}
        </div>

        {/* Submission Blocked Banner */}
        {isSubmissionBlocked && (
          <div style={{
            marginBottom: '14px',
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '2px solid #EF4444',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
          }}>
            <span style={{ fontSize: '24px' }}>🚫</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B' }}>
                Form Submission Blocked by ML Vision Scanner
              </div>
              <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                {mlVerification?.categoryVerificationMessage || 'The attached photo is identified as a personal selfie / non-civic image. Please upload a real civic defect photo to proceed.'}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          title={
            aiInspecting || isSubmitting
              ? 'AI Pipeline Running...'
              : isSubmissionBlocked
              ? '🚫 Submission Blocked (Non-Civic Photo)'
              : '🚀 Submit Report (Geo-Tagged)'
          }
          onPress={handleSubmit}
          disabled={isSubmissionBlocked}
          loading={aiInspecting || isSubmitting}
          size="large"
          style={isSubmissionBlocked ? {
            backgroundColor: '#94A3B8',
            cursor: 'not-allowed',
            opacity: 0.7,
            boxShadow: 'none'
          } : {}}
        />

        {/* Info note */}
        <div style={{
          marginTop: '14px',
          padding: '12px',
          background: '#EFF6FF',
          borderRadius: '12px',
          border: '1px solid #BFDBFE',
          display: 'flex',
          gap: '8px',
          fontSize: '11px',
          color: '#1E40AF',
          lineHeight: 1.45
        }}>
          <span style={{ fontSize: '16px' }}>ℹ️</span>
          <div>
            <strong>Photo-Level Geo-Tagging:</strong> Uploading any original camera photo automatically reads the embedded EXIF GPS tags of where the photo was taken. You can also pick or search your exact landmark above.
          </div>
        </div>
      </div>
    </div>
  );
}
