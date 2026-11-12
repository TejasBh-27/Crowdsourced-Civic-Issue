import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, updateUserProfile } from '../../store/slices/authSlice';
import { fetchComplaints } from '../../store/slices/complaintSlice';
import { detectRealWorldLocation } from '../../utils/locationService';
import { compressImageToBase64, getPersistedAvatar, savePersistedAvatar, removePersistedAvatar } from '../../utils/avatarStorage';
import Button from '../../components/Button';
import Card from '../../components/Card';
import COLORS from '../../constants/colors';
import { isComplaintOwnedByUser } from '../../utils/userFilter';

const WARDS = [
  'Ward 14 - Central Zone',
  'Ward 07 - Market & Commercial District',
  'Ward 03 - Residential North',
  'Ward 11 - South Industrial Area',
  'Ward 05 - West Suburbs',
];

const PRESET_AVATARS = [
  { id: 'male_1', label: 'Professional Male', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  { id: 'male_2', label: 'Casual Male', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
  { id: 'male_3', label: 'Executive Male', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: 'female_1', label: 'Professional Female', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
];

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, role } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.complaints);

  const isOfficer = role === 'officer';

  // Stats calculation strictly scoped to this citizen's complaints
  const userComplaints = isOfficer ? items : (items || []).filter(c => isComplaintOwnedByUser(c, user));
  const resolvedCount = userComplaints.filter(c => c.status === 'Resolved').length;
  const activeCount = userComplaints.filter(c => c.status === 'In Progress' || c.status === 'Verified_Assigned').length;
  const civicPoints = Math.max(50, (resolvedCount * 25) + (activeCount * 10) + (userComplaints.length * 5));

  // =========================================================================
  // 1. LIVE DEVICE LOCATION STATE (AUTO-DETECTED REAL GPS)
  // =========================================================================
  const [liveLocation, setLiveLocation] = useState({
    address: 'Detecting live device GPS...',
    latitude: 21.3527,
    longitude: 74.8841,
    accuracy: null,
    isRealGps: false,
    capturedAt: null,
    error: null
  });
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [liveLocationMsg, setLiveLocationMsg] = useState('');

  const acquireLiveLocation = async (isInitial = false) => {
    setIsDetectingGps(true);
    if (!isInitial) setLiveLocationMsg('📡 Querying high-accuracy device GPS satellite lock...');
    try {
      const loc = await detectRealWorldLocation();
      setLiveLocation({
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        isRealGps: true,
        capturedAt: loc.capturedAt || new Date().toLocaleTimeString(),
        error: null
      });
      setLiveLocationMsg('🟢 Live spot location successfully detected from your device GPS.');
    } catch (err) {
      console.warn('Live location retrieval error:', err);
      setLiveLocation(prev => ({
        ...prev,
        error: err.message || 'Location permission not granted',
        address: prev.address === 'Detecting live device GPS...' ? 'Device GPS signal pending — tap "Re-detect GPS"' : prev.address
      }));
      setLiveLocationMsg('⚠️ ' + (err.message || 'Please enable GPS/Location in your mobile browser.'));
    } finally {
      setIsDetectingGps(false);
    }
  };

  useEffect(() => {
    acquireLiveLocation(true);
    dispatch(fetchComplaints());
  }, [dispatch]);

  // =========================================================================
  // 2. MY OWN / REGISTERED ADDRESS STATE (EDITABLE & PERSISTENT)
  // =========================================================================
  const initialAddress = user?.address && user.address !== 'City Resident' && user.address !== 'B-42, Park View Apartments'
    ? user.address
    : 'Near R.C. Patel Campus, Karwand Road, Shirpur, 425405';

  const [ownAddress, setOwnAddress] = useState(initialAddress);
  const [ownWard, setOwnWard] = useState(user?.ward || WARDS[0]);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressSaveSuccess, setAddressSaveSuccess] = useState(false);

  // Address edit fields
  const [addressFields, setAddressFields] = useState({
    street: ownAddress,
    ward: ownWard,
    city: 'Shirpur',
    state: 'Maharashtra',
    pincode: '425405'
  });

  const handleStartEditAddress = () => {
    setAddressFields({
      street: ownAddress,
      ward: ownWard,
      city: 'Shirpur',
      state: 'Maharashtra',
      pincode: '425405'
    });
    setIsEditingAddress(true);
    setAddressSaveSuccess(false);
  };

  const handleSaveAddress = () => {
    const combined = `${addressFields.street.trim()}${addressFields.city ? ', ' + addressFields.city.trim() : ''}${addressFields.state ? ', ' + addressFields.state.trim() : ''}${addressFields.pincode ? ' - ' + addressFields.pincode.trim() : ''}`;
    setOwnAddress(combined);
    setOwnWard(addressFields.ward);
    setIsEditingAddress(false);

    // Save to Redux store & persist in storage
    dispatch(updateUserProfile({
      address: combined,
      ward: addressFields.ward
    }));

    setAddressSaveSuccess(true);
    setTimeout(() => setAddressSaveSuccess(false), 4000);
  };

  const handleCopyLiveGpsToOwnAddress = () => {
    if (!liveLocation.address || liveLocation.address.includes('Detecting')) {
      alert('Please wait for live GPS to finish detecting before copying.');
      return;
    }
    setOwnAddress(liveLocation.address);
    dispatch(updateUserProfile({
      address: liveLocation.address
    }));
    setAddressSaveSuccess(true);
    setTimeout(() => setAddressSaveSuccess(false), 4000);
  };

  // =========================================================================
  // 3. PERSISTENT AVATAR PICKER STATE (GALLERY, CAMERA & PERSISTENCE)
  // =========================================================================
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [photoSaveSuccess, setPhotoSaveSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamError, setWebcamError] = useState('');

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const defaultFallbackAvatar = isOfficer ? PRESET_AVATARS[2].url : PRESET_AVATARS[0].url;
  const currentAvatar = getPersistedAvatar(user, user?.avatar || defaultFallbackAvatar);

  const applyNewAvatar = (base64) => {
    dispatch(updateUserProfile({ avatar: base64 }));
    savePersistedAvatar(user, base64);
    setPhotoSaveSuccess(true);
    setTimeout(() => setPhotoSaveSuccess(false), 5000);
  };

  const handleSelectAvatar = (url) => {
    applyNewAvatar(url);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const base64 = await compressImageToBase64(file, 320, 0.85);
      applyNewAvatar(base64);
    } catch (err) {
      alert('Could not process photo: ' + err.message);
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const startLiveWebcam = async () => {
    setWebcamError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });
      streamRef.current = stream;
      setIsWebcamOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
      }, 150);
    } catch (err) {
      console.warn('Live webcam error:', err);
      setWebcamError('Camera access unavailable. Launching device camera...');
      setTimeout(() => {
        cameraInputRef.current?.click();
        setIsWebcamOpen(false);
      }, 700);
    }
  };

  const stopLiveWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsWebcamOpen(false);
  };

  const snapLivePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 480;
    const height = video.videoHeight || 480;
    const size = Math.min(width, height);
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const sx = (width - size) / 2;
    const sy = (height - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    stopLiveWebcam();
    applyNewAvatar(base64);
  };

  const handleResetAvatar = () => {
    removePersistedAvatar(user);
    dispatch(updateUserProfile({ avatar: defaultFallbackAvatar }));
    setPhotoSaveSuccess(true);
    setTimeout(() => setPhotoSaveSuccess(false), 3000);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of CivicPulse?')) {
      dispatch(logout());
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text);
    alert(`Copied ${label}: ${text}`);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '110px', maxWidth: '1080px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px' }}>

      {/* =====================================================================
          1. HERO PROFILE CARD (MODERN DUAL-THEME GRADIENT)
      ===================================================================== */}
      <div style={{
        marginTop: '16px',
        background: isOfficer
          ? 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)'
          : 'linear-gradient(135deg, #0F172A 0%, #115E59 60%, #0D9488 100%)',
        borderRadius: '24px',
        padding: '32px 24px 28px',
        color: '#FFFFFF',
        boxShadow: '0 12px 36px rgba(13,148,136,0.18)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative backdrop glow */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Avatar with edit button */}
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
            <img
              src={currentAvatar}
              alt="Profile Avatar"
              style={{
                width: '92px',
                height: '92px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #10B981',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                display: 'block'
              }}
            />
            {/* Verified green badge */}
            <div
              title="Verified Account"
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '2px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                border: '2px solid #0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '900'
              }}
            >
              ✓
            </div>

            {/* Change Avatar Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAvatarPicker(!showAvatarPicker);
              }}
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: '1.5px solid rgba(255,255,255,0.4)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
              title="Change Profile Photo"
            >
              📷
            </button>

            {/* Tap to edit pill */}
            <div
              style={{
                marginTop: '6px',
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                borderRadius: '20px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: '800',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              📷 Edit Photo
            </div>
          </div>

          {/* Name & Persona Badges */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span style={{
                backgroundColor: isOfficer ? 'rgba(165,180,252,0.2)' : 'rgba(94,234,212,0.2)',
                color: isOfficer ? '#C7D2FE' : '#5EEAD4',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.04em',
                border: `1px solid ${isOfficer ? 'rgba(165,180,252,0.4)' : 'rgba(94,234,212,0.4)'}`
              }}>
                {isOfficer ? '👮‍♂️ MUNICIPAL OFFICER' : '👤 VERIFIED CITIZEN'}
              </span>

              <span style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#E2E8F0',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              onClick={() => copyToClipboard(user?.id || 'CIT-4668', 'User ID')}
              title="Click to copy ID"
              >
                🆔 {user?.id || (isOfficer ? 'OFF-9902' : 'CIT-4668')} 📋
              </span>
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: '900',
              margin: '0 0 6px 0',
              color: '#FFFFFF',
              letterSpacing: '-0.02em'
            }}>
              {user?.name || (isOfficer ? 'Officer Rajesh Kumar' : 'Tejas Bhamre')}
            </h1>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                📱 +91 {user?.phone || '9545286810'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                📧 {user?.email || 'tejas.bhamre@civicpulse.gov'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                📍 {ownWard}
              </span>
            </div>
          </div>
        </div>

        {/* Hidden File and Camera Inputs */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Real-time Success Notification */}
        {photoSaveSuccess && (
          <div style={{
            marginTop: '16px',
            backgroundColor: '#065F46',
            color: '#ECFDF5',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1.5px solid #10B981',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
            boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
          }}>
            <span style={{ fontSize: '16px' }}>✅</span>
            <span>Profile photo updated! Saved permanently to your account across logouts.</span>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessingPhoto && (
          <div style={{
            marginTop: '12px',
            backgroundColor: '#0F172A',
            color: '#93C5FD',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #3B82F6',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⏳</span>
            <span>Optimizing and saving photo to account...</span>
          </div>
        )}

        {/* Profile Photo Management Panel */}
        {showAvatarPicker && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: 'rgba(15,23,42,0.96)',
            borderRadius: '18px',
            border: '1.5px solid rgba(94, 234, 212, 0.4)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📸</span> Change Profile Photo
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                  Choose from Gallery or snap with Camera · Will not change after logout
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopLiveWebcam();
                  setShowAvatarPicker(false);
                }}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Live WebCam Stream Box if open */}
            {isWebcamOpen && (
              <div style={{
                textAlign: 'center',
                backgroundColor: '#000000',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                border: '2px solid #10B981'
              }}>
                <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '800', marginBottom: '8px' }}>
                  🎥 Live Camera Active
                </div>
                <div style={{
                  width: '200px',
                  height: '200px',
                  margin: '0 auto 12px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid #10B981',
                  backgroundColor: '#1E293B'
                }}>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={snapLivePhoto}
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    📸 Snap & Save Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopLiveWebcam}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* WebCam Error Notification */}
            {webcamError && (
              <div style={{ color: '#FCA5A5', fontSize: '11px', marginBottom: '10px', fontWeight: '600' }}>
                ⚠️ {webcamError}
              </div>
            )}

            {/* Gallery and Camera Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {/* Option 1: Gallery */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isProcessingPhoto}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1.5px dashed rgba(94, 234, 212, 0.45)',
                  borderRadius: '14px',
                  padding: '16px 14px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              >
                <div style={{ fontSize: '28px' }}>🖼️</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#5EEAD4' }}>
                    Choose from Gallery
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                    Select photo from device album / files
                  </div>
                </div>
              </button>

              {/* Option 2: Mobile / Native Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isProcessingPhoto}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1.5px dashed rgba(59, 130, 246, 0.45)',
                  borderRadius: '14px',
                  padding: '16px 14px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              >
                <div style={{ fontSize: '28px' }}>📸</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#93C5FD' }}>
                    Take with Camera
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                    Open mobile selfie / rear camera
                  </div>
                </div>
              </button>

              {/* Option 3: Live In-Browser Webcam */}
              <button
                type="button"
                onClick={startLiveWebcam}
                disabled={isProcessingPhoto || isWebcamOpen}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1.5px dashed rgba(168, 85, 247, 0.45)',
                  borderRadius: '14px',
                  padding: '16px 14px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              >
                <div style={{ fontSize: '28px' }}>💻</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#D8B4FE' }}>
                    Live Webcam
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                    Snap selfie right on desktop/web
                  </div>
                </div>
              </button>
            </div>

            {/* Presets and Reset */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.12)',
              paddingTop: '14px',
              marginTop: '12px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                Or choose a civic preset avatar:
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {PRESET_AVATARS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectAvatar(p.url)}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'center',
                      border: currentAvatar === p.url ? '2.5px solid #10B981' : '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      padding: '6px',
                      backgroundColor: currentAvatar === p.url ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <img src={p.url} alt={p.label} style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ fontSize: '9px', color: '#E2E8F0', marginTop: '4px', fontWeight: '600' }}>{p.label}</div>
                  </div>
                ))}

                {/* Reset to default button */}
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#E2E8F0',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ↺ Reset to Default
                </button>
              </div>
            </div>

            {/* Persistence Guarantee Note */}
            <div style={{
              marginTop: '14px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '10px',
              color: '#A7F3D0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🔒</span>
              <span><strong>Persistent Storage:</strong> Your custom photo will remain saved even after you log out. It only changes when you choose to change it.</span>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. METRICS & IMPACT STATS CARDS
      ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginTop: '16px'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' }}>Total Filed</span>
            <span style={{ fontSize: '20px' }}>📋</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: COLORS.primaryDark, marginTop: '4px' }}>
            {userComplaints.length}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.textMuted, fontWeight: '600', marginTop: '2px' }}>
            Civic issues reported
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' }}>In Progress</span>
            <span style={{ fontSize: '20px' }}>⏳</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: COLORS.inProgress, marginTop: '4px' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.textMuted, fontWeight: '600', marginTop: '2px' }}>
            Under active municipal repair
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' }}>Resolved</span>
            <span style={{ fontSize: '20px' }}>✅</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: COLORS.resolved, marginTop: '4px' }}>
            {resolvedCount}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.textMuted, fontWeight: '600', marginTop: '2px' }}>
            Fixed & verified closed
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' }}>Civic Score</span>
            <span style={{ fontSize: '20px' }}>⭐</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#D97706', marginTop: '4px' }}>
            {civicPoints} <span style={{ fontSize: '14px', fontWeight: '700', color: COLORS.textMuted }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
            Active Community Contributor
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. MAIN TWO-COLUMN DASHBOARD (ADDRESS & LOCATION FOCUS)
      ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '16px',
        marginTop: '18px'
      }}>

        {/* -------------------------------------------------------------------
            COLUMN 1: MY LIVE DEVICE LOCATION (REAL-TIME GPS SPOT)
        ------------------------------------------------------------------- */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          border: '1.5px solid #0D9488',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>📡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: COLORS.textPrimary }}>
                    Live Device Location
                  </h3>
                  <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
                    Real-time hardware GPS coordinates
                  </div>
                </div>
              </div>

              {isDetectingGps ? (
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: COLORS.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span className="loading-dot" style={{ width: '5px', height: '5px' }}></span>
                  Acquiring GPS...
                </span>
              ) : liveLocation.isRealGps ? (
                <span style={{
                  backgroundColor: '#D1FAE5',
                  color: '#065F46',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  border: '1px solid #A7F3D0'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                  Live GPS Locked
                </span>
              ) : (
                <span style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>
                  GPS Signal Ready
                </span>
              )}
            </div>

            {/* Address Display Box */}
            <div style={{
              backgroundColor: '#F0FDFA',
              border: '1px solid #CCFBF1',
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '14px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#0F766E', textTransform: 'uppercase', marginBottom: '4px' }}>
                Current Spot Detected:
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textPrimary, lineHeight: 1.4 }}>
                {liveLocation.address}
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'monospace',
                  backgroundColor: '#E0F2FE',
                  color: '#0369A1',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700'
                }}>
                  [{liveLocation.longitude?.toFixed(5)}, {liveLocation.latitude?.toFixed(5)}]
                </span>
                {liveLocation.capturedAt && (
                  <span style={{ fontSize: '11px', color: COLORS.textMuted }}>
                    📍 {liveLocation.capturedAt}
                  </span>
                )}
                {liveLocation.accuracy && (
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                    (±{liveLocation.accuracy}m high-precision)
                  </span>
                )}
              </div>
            </div>

            {liveLocationMsg && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                backgroundColor: liveLocation.isRealGps ? '#ECFDF5' : '#FFFBEB',
                color: liveLocation.isRealGps ? '#065F46' : '#92400E',
                fontWeight: '600',
                marginBottom: '14px'
              }}>
                {liveLocationMsg}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border)'
          }}>
            <button
              type="button"
              onClick={() => acquireLiveLocation(false)}
              disabled={isDetectingGps}
              style={{
                flex: 1,
                minWidth: '120px',
                backgroundColor: '#FFFFFF',
                color: COLORS.primaryDark,
                border: `1px solid ${COLORS.primary}`,
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🔄</span> {isDetectingGps ? 'Querying...' : 'Re-detect GPS'}
            </button>

            <button
              type="button"
              onClick={handleCopyLiveGpsToOwnAddress}
              style={{
                flex: 1,
                minWidth: '160px',
                backgroundColor: COLORS.primary,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>📌</span> Set as My Own Address
            </button>

            <a
              href={`https://www.google.com/maps?q=${liveLocation.latitude},${liveLocation.longitude}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#0284C7',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                padding: '8px 10px'
              }}
            >
              🗺️ Google Maps ↗
            </a>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            COLUMN 2: MY OWN / REGISTERED HOME ADDRESS (EDITABLE & PERMANENT)
        ------------------------------------------------------------------- */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>🏡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: COLORS.textPrimary }}>
                    My Registered Address
                  </h3>
                  <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
                    Permanent residence on civic record
                  </div>
                </div>
              </div>

              {!isEditingAddress && (
                <button
                  type="button"
                  onClick={handleStartEditAddress}
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: COLORS.textPrimary,
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>✏️</span> Edit Address
                </button>
              )}
            </div>

            {addressSaveSuccess && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                ✅ Address successfully saved to your profile record!
              </div>
            )}

            {!isEditingAddress ? (
              /* VIEW MODE */
              <div>
                <div style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '14px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Residential Street / Landmark:
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.textPrimary, lineHeight: 1.4 }}>
                    {ownAddress}
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.textMuted }}>Municipal Ward</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.primaryDark }}>{ownWard}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.textMuted }}>Resident Status</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#16A34A' }}>✓ Primary Residence</div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: COLORS.textMuted, lineHeight: 1.4 }}>
                  💡 <strong>Tip:</strong> You can edit this address any time, or click <strong>"Set as My Own Address"</strong> on the Live GPS card to sync with where you are standing right now.
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, display: 'block', marginBottom: '4px' }}>
                    Street / Flat / Colony / Landmark *
                  </label>
                  <input
                    type="text"
                    className="cp-input"
                    value={addressFields.street}
                    onChange={(e) => setAddressFields({ ...addressFields, street: e.target.value })}
                    placeholder="e.g. Near R.C. Patel Campus, Karwand Road"
                    style={{ fontSize: '13px', padding: '8px 10px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, display: 'block', marginBottom: '4px' }}>
                      City / District *
                    </label>
                    <input
                      type="text"
                      className="cp-input"
                      value={addressFields.city}
                      onChange={(e) => setAddressFields({ ...addressFields, city: e.target.value })}
                      placeholder="Shirpur"
                      style={{ fontSize: '13px', padding: '8px 10px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, display: 'block', marginBottom: '4px' }}>
                      Pincode *
                    </label>
                    <input
                      type="text"
                      className="cp-input"
                      value={addressFields.pincode}
                      onChange={(e) => setAddressFields({ ...addressFields, pincode: e.target.value })}
                      placeholder="425405"
                      style={{ fontSize: '13px', padding: '8px 10px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, display: 'block', marginBottom: '4px' }}>
                    Assigned Municipal Ward *
                  </label>
                  <select
                    className="cp-input"
                    value={addressFields.ward}
                    onChange={(e) => setAddressFields({ ...addressFields, ward: e.target.value })}
                    style={{ fontSize: '13px', padding: '8px 10px' }}
                  >
                    {WARDS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSaveAddress}
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.primary,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    💾 Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: COLORS.textSecondary,
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. CITIZEN RECORD DETAILS & QUICK ACTIONS (SIDE-BY-SIDE ON DESKTOP)
      ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '16px',
        marginTop: '16px'
      }}>
        {/* Account Details Record */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Registered Citizen Record
          </div>

          {[
            { icon: '👤', label: 'Full Name', value: user?.name || 'Tejas Bhamre' },
            { icon: '📱', label: 'Registered Mobile', value: `+91 ${user?.phone || '9545286810'}` },
            { icon: '📧', label: 'Email Address', value: user?.email || 'tejas.bhamre@civicpulse.gov' },
            { icon: '📍', label: 'Registered Ward', value: ownWard },
            { icon: '🏠', label: 'Registered Address', value: ownAddress },
            isOfficer ? { icon: '🏛️', label: 'Assigned Department', value: user?.department || 'Roads & Infrastructure' } : null,
            isOfficer ? { icon: '🪪', label: 'Badge ID', value: user?.badgeNumber || 'MCD-8841' } : null,
            { icon: '🆔', label: 'Account Identifier', value: user?.id || (isOfficer ? 'OFF-9902' : 'CIT-4668') },
            { icon: '🛡️', label: 'Account Persona', value: isOfficer ? 'Municipal Staff / Officer' : 'Verified Citizen' },
          ].filter(Boolean).map((row, idx) => (
            <div key={idx} style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              paddingBottom: '10px',
              marginBottom: '10px',
              borderBottom: idx === 8 ? 'none' : '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{row.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' }}>{row.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textPrimary, wordBreak: 'break-word' }}>{row.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Civic Navigation & Shortcuts */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Civic Operations & Shortcuts
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigation?.navigate ? navigation.navigate('Report') : null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#F0FDFA',
                  border: '1.5px solid #0D9488',
                  color: COLORS.primaryDark,
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>📸</span>
                  <div>
                    <div>Report New Civic Issue</div>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textMuted }}>AI camera inspection & routing</div>
                  </div>
                </div>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => navigation?.navigate ? navigation.navigate('MyComplaints') : null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border)',
                  color: COLORS.textPrimary,
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>📋</span>
                  <div>
                    <div>Track My Complaints</div>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: COLORS.textMuted }}>View real-time resolution status</div>
                  </div>
                </div>
                <span>→</span>
              </button>
            </div>

            {/* AI Architecture Mini-Card */}
            <div style={{
              marginTop: '16px',
              padding: '14px',
              backgroundColor: '#F0FDF4',
              borderRadius: '12px',
              border: '1px solid #86EFAC'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803D', marginBottom: '6px' }}>
                🤖 CivicPulse AI Processing Pipeline
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {['TensorFlow CV', 'DistilBERT NLP', 'Scikit-Learn ML', 'Live Mobile GPS', 'FastAPI Python', 'Node.js Gateway'].map(t => (
                  <span key={t} style={{
                    background: '#DCFCE7',
                    color: '#14532D',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: '700'
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Logout Action */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <Button
              title="🚪 Sign Out of Account"
              onPress={handleLogout}
              variant="outline"
              size="large"
            />
          </div>
        </div>
      </div>
    </div>
  );
}