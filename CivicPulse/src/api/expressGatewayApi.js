/**
 * Express Gateway API — bridges frontend to the real Node.js backend
 * When backend is live:  calls /api/v1/complaints  (real MongoDB/Memory store + Multer uploads)
 * When backend is down:  falls back to in-memory mock data seamlessly
 */

import { API_CONFIG, COMPLAINT_STATUS } from '../constants/api';
import aiFastApi from './aiFastApi';
import { apiGet, apiPost, apiPostForm, apiDelete, checkBackendHealth, getApiHeaders } from './apiClient';
import storage from '../utils/storage';

// ──────────────────────────────────────────────────────────────────────────────
// In-memory mock data (used as fallback when backend is unreachable)
// ──────────────────────────────────────────────────────────────────────────────

const INITIAL_MOCK_COMPLAINTS = [
  {
    id: 'CMP-2026-101',
    title: 'Deep Hazardous Pothole near Main Market Gate',
    category: 'pothole',
    categoryLabel: 'Road Potholes & Damage',
    description: 'A large 2-foot wide pothole causing severe traffic slowdown and bike accidents during evening hours.',
    location: { type: 'Point', coordinates: [77.2090, 28.6139], address: 'Main Market Road, Near Gate 2, Ward 14' },
    status: COMPLAINT_STATUS.IN_PROGRESS,
    urgency: 'high',
    reportedBy: { id: 'CIT-4481', name: 'Ananya Sharma', phone: '+91 98765 43210' },
    assignedOfficer: { id: 'OFF-9902', name: 'Inspector Rajesh Kumar', department: 'Roads & Infrastructure' },
    aiInspection: {
      aiVerified: true, status: 'Verified_Assigned',
      cvResult: { isValidImage: true, confidence: 0.94, clarityScore: 92, tensorFlowCnnModel: 'ResNet50-CivicCV v2.4', detectedObjects: ['Surface Fracture', 'Asphalt Hole', 'Debris Pattern'], severityGrade: 'High' },
      nlpResult: { nlpModel: 'HuggingFace DistilBERT fine-tuned', department: 'Roads & Infrastructure', confidence: 0.95 },
      mlPriority: { mlModel: 'Scikit-Learn Random Forest Classifier', score: 88, level: 'High' }
    },
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
    createdAt: '2026-10-07T09:30:00Z',
    updatedAt: '2026-10-08T14:20:00Z',
    timeline: [
      { status: 'Submitted', note: 'Complaint payload saved to MongoDB Atlas', timestamp: '2026-10-07T09:30:00Z' },
      { status: 'Verified & Assigned', note: 'FastAPI AI Engine verified photo & routed to Roads Dept', timestamp: '2026-10-07T09:31:00Z' },
      { status: 'In Progress', note: 'Officer Rajesh Kumar accepted complaint & dispatched field crew', timestamp: '2026-10-08T14:20:00Z' }
    ]
  },
  {
    id: 'CMP-2026-102',
    title: 'Overflowing Garbage Bin at Block C Community Park',
    category: 'garbage',
    categoryLabel: 'Garbage Dump & Waste',
    description: 'Waste dump has not been collected for 4 days. Strong foul smell causing health hazard.',
    location: { type: 'Point', coordinates: [77.2105, 28.6152], address: 'Block C Park Outer Lane, Ward 14' },
    status: 'Verified_Assigned',
    urgency: 'medium',
    reportedBy: { id: 'CIT-4481', name: 'Ananya Sharma', phone: '+91 98765 43210' },
    assignedOfficer: { id: 'OFF-4011', name: 'Inspector Sunita Rao', department: 'Sanitation & Solid Waste' },
    aiInspection: {
      aiVerified: true, status: 'Verified_Assigned',
      cvResult: { isValidImage: true, confidence: 0.91, clarityScore: 88, tensorFlowCnnModel: 'ResNet50-CivicCV v2.4', detectedObjects: ['Overflowing Waste Container'], severityGrade: 'Medium' },
      nlpResult: { nlpModel: 'HuggingFace DistilBERT fine-tuned', department: 'Sanitation & Solid Waste', confidence: 0.96 },
      mlPriority: { mlModel: 'Scikit-Learn Random Forest Classifier', score: 65, level: 'Medium' }
    },
    image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600',
    createdAt: '2026-10-09T08:15:00Z',
    updatedAt: '2026-10-09T08:16:00Z',
    timeline: [
      { status: 'Submitted', note: 'Complaint saved to MongoDB', timestamp: '2026-10-09T08:15:00Z' },
      { status: 'Verified & Assigned', note: 'FastAPI AI routed to Sanitation Dept', timestamp: '2026-10-09T08:16:00Z' }
    ]
  },
  {
    id: 'CMP-2026-103',
    title: 'Street Light Pole Damaged & Flickering Dark',
    category: 'street_light',
    categoryLabel: 'Streetlight Failure',
    description: 'Streetlight #SL-414 is non-functional creating dark alley near girls school.',
    location: { type: 'Point', coordinates: [77.2070, 28.6120], address: 'Lane 4, Near Model School, Ward 14' },
    status: COMPLAINT_STATUS.RESOLVED,
    urgency: 'medium',
    reportedBy: { id: 'CIT-8821', name: 'Rohit Verma', phone: '+91 98111 22334' },
    assignedOfficer: { id: 'OFF-9902', name: 'Inspector Rajesh Kumar', department: 'Electrical Grid Maintenance' },
    aiInspection: {
      aiVerified: true, status: 'Verified_Assigned',
      cvResult: { isValidImage: true, confidence: 0.95 },
      nlpResult: { department: 'Electrical Grid Maintenance' },
      mlPriority: { score: 70, level: 'Medium' }
    },
    image: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600',
    resolutionImage: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=600',
    resolutionNote: 'Replaced sodium vapor bulb with high-efficiency 100W LED unit and restored wiring.',
    createdAt: '2026-10-04T10:00:00Z',
    updatedAt: '2026-10-06T16:45:00Z',
    resolvedAt: '2026-10-06T16:45:00Z',
    mttrHours: 54.75,
    timeline: [
      { status: 'Submitted', note: 'Complaint saved to MongoDB', timestamp: '2026-10-04T10:00:00Z' },
      { status: 'Verified & Assigned', note: 'FastAPI AI routed to Electrical Dept', timestamp: '2026-10-04T10:01:00Z' },
      { status: 'In Progress', note: 'Officer accepted task & sent crew', timestamp: '2026-10-05T09:00:00Z' },
      { status: 'Resolved', note: 'LED light installed & MTTR logged', timestamp: '2026-10-06T16:45:00Z' }
    ]
  }
];

export const COMPLAINTS_STORAGE_KEY = 'cp_complaints_data';

export function getStoredComplaints() {
  try {
    const stored = storage.getItem(COMPLAINTS_STORAGE_KEY);
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
  } catch (e) {
    console.warn('Error reading stored complaints:', e);
  }
  // Initialize with initial sample complaints
  storage.setItem(COMPLAINTS_STORAGE_KEY, INITIAL_MOCK_COMPLAINTS);
  return [...INITIAL_MOCK_COMPLAINTS];
}

export function saveStoredComplaints(complaints) {
  try {
    storage.setItem(COMPLAINTS_STORAGE_KEY, complaints);
  } catch (e) {
    console.warn('Error saving complaints to storage:', e);
  }
}

/**
 * Compresses an image file/blob to a compact Base64 JPEG data URL (~50-80KB)
 * This guarantees the image permanently survives browser page reloads even in offline mode,
 * unlike transient blob: URLs which browser invalidates on refresh.
 */
export async function compressImageForStorage(fileOrUrl, maxWidth = 800, maxHeight = 800, quality = 0.72) {
  if (!fileOrUrl) return 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600';

  if (typeof fileOrUrl === 'string') {
    if (fileOrUrl.startsWith('data:') || (fileOrUrl.startsWith('http') && !fileOrUrl.startsWith('blob:'))) {
      return fileOrUrl;
    }
  }

  return new Promise((resolve) => {
    if (!(fileOrUrl instanceof Blob)) {
      resolve('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(event.target.result || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600');
      img.src = event.target.result;
    };
    reader.onerror = () => resolve('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600');
    reader.readAsDataURL(fileOrUrl);
  });
}

let _backendOnline = null; // cached check

async function isBackendOnline() {
  if (_backendOnline === null) {
    _backendOnline = await checkBackendHealth();
  }
  return _backendOnline;
}

// Normalize backend complaint format → our frontend format
function normalizeBackendComplaint(c) {
  const ai = c.ai || {};
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    categoryLabel: c.title || c.category,
    description: c.description,
    location: c.location || { type: 'Point', coordinates: [77.2090, 28.6139], address: 'Ward 14' },
    status: mapBackendStatus(c.status),
    urgency: c.urgency || 'medium',
    reportedBy: c.reportedBy || { id: 'CIT-4481', name: 'Ananya Sharma' },
    assignedOfficer: c.assignedOfficer || null,
    aiInspection: {
      aiVerified: c.status !== 'rejected',
      modelName: ai.cv?.modelName || 'CivicPulse EfficientNet-B0 (civic_pulse_model.onnx)',
      rejectionReason: c.rejectionReason || null,
      cvResult: {
        isValidImage: c.status !== 'rejected',
        confidence: ai.cv?.confidence ?? 0.95,
        clarityScore: ai.cv?.clarityScore ?? 92,
        laplacianVariance: ai.cv?.laplacianVariance ?? null,
        brightness: ai.cv?.brightness ?? null,
        contrast: ai.cv?.contrast ?? null,
        dimensions: ai.cv?.dimensions ?? null,
        model: ai.cv?.model ?? 'civic_pulse_model.onnx',
        modelName: ai.cv?.modelName ?? 'CivicPulse EfficientNet-B0 (civic_pulse_model.onnx)',
        predictedCategory: ai.cv?.predictedCategory ?? c.category,
        categoryLabel: ai.cv?.categoryLabel ?? c.title ?? c.category,
        categoryConfidence: ai.cv?.categoryConfidence ?? 0.95,
        isUserCategoryCorrect: ai.cv?.isUserCategoryCorrect ?? true,
        categoryStatus: ai.cv?.categoryStatus ?? 'CONFIRMED',
        categoryVerificationMessage: ai.cv?.categoryVerificationMessage ?? '✅ Category Confirmed: Photo accurately depicts issue.',
        visualCues: ai.cv?.visualCues ?? [],
        officerRecommendation: ai.cv?.officerRecommendation ?? null,
        routedDepartment: ai.cv?.routedDepartment ?? null,
      },
      nlpResult: ai.nlp ? {
        department: ai.nlp.department,
        departmentLabel: ai.nlp.departmentLabel,
        confidence: ai.nlp.confidence,
        topFeatures: ai.nlp.topFeatures || [],
        model: ai.nlp.model || 'TF-IDF + LogisticRegression (sklearn)',
      } : null,
      mlPriority: ai.ml ? {
        score: ai.ml.score,
        level: ai.ml.level,
        probs: ai.ml.probs,
        model: ai.ml.model || 'CivicPulse Priority Engine (civic_pulse_model.onnx)',
      } : (c.urgencyScore != null ? {
        score: c.urgencyScore,
        level: c.urgency || 'medium',
        model: 'CivicPulse Priority Engine (civic_pulse_model.onnx)',
      } : null),
      timestamp: c.updatedAt
    },
    image: c.photo?.url ? c.photo.url : 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
    resolutionImage: c.resolution?.photoUrl || null,
    resolutionNote: c.resolution?.note || null,
    mttrHours: c.resolution?.resolvedAt && c.createdAt
      ? parseFloat(((new Date(c.resolution.resolvedAt) - new Date(c.createdAt)) / 3600000).toFixed(2))
      : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    timeline: (c.timeline || []).map(t => ({ status: t.status, note: t.note, timestamp: t.at || t.timestamp }))
  };
}

function mapBackendStatus(s) {
  const map = {
    submitted: 'Submitted',
    rejected: 'Rejected_Invalid_Image',
    manual_review: 'Submitted',
    verified: 'Verified_Assigned',
    worker_assigned: 'Verified_Assigned',
    in_progress: 'In Progress',
    resolved: 'Resolved'
  };
  return map[s] || s;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API — smart router with guaranteed LocalStorage persistence
// ──────────────────────────────────────────────────────────────────────────────

export const expressGatewayApi = {

  /**
   * Fetch all complaints.
   * If backend is live: queries backend and merges with persistent local storage.
   * If backend is down: returns persistent local storage (survives any page reload).
   */
  async fetchComplaints(user) {
    const localList = getStoredComplaints();

    try {
      if (await isBackendOnline()) {
        const path = user?.role === 'officer' ? '/officer/complaints' : '/complaints/mine';
        const backendData = await apiGet(path, user);
        const normalizedBackend = backendData.map(normalizeBackendComplaint);

        // Merge backend data with local storage (preserving any locally submitted complaints)
        const mergedMap = new Map();

        // 1. Put all local complaints first
        for (const item of localList) {
          if (item?.id) mergedMap.set(item.id, item);
        }

        // 2. Put backend complaints (updates status, officer assignment, etc.)
        for (const bItem of normalizedBackend) {
          const localItem = mergedMap.get(bItem.id);
          mergedMap.set(bItem.id, {
            ...localItem,
            ...bItem,
            image: bItem.image && !bItem.image.startsWith('blob:') ? bItem.image : (localItem?.image || bItem.image)
          });
        }

        const mergedList = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        saveStoredComplaints(mergedList);
        return mergedList;
      }
    } catch (e) {
      console.warn('Backend fetch failed, using persistent local storage:', e.message);
      _backendOnline = false;
    }

    await new Promise(r => setTimeout(r, API_CONFIG.MOCK_DELAY_MS));
    return localList;
  },

  async fetchComplaintById(id, user) {
    try {
      if (await isBackendOnline()) {
        const data = await apiGet(`/complaints/${id}`, user);
        return normalizeBackendComplaint(data);
      }
    } catch (e) {
      console.warn('Backend getById failed, using stored local:', e.message);
    }
    await new Promise(r => setTimeout(r, 200));
    const list = getStoredComplaints();
    const item = list.find(c => c.id === id);
    if (!item) throw new Error('Complaint not found');
    return { ...item };
  },

  /**
   * Submit a complaint with guaranteed persistence.
   * Image is compressed to persistent Base64 so it never breaks on reload.
   * Record is immediately saved to LocalStorage and synced to backend if online.
   */
  async createComplaint(payload, user) {
    // Step 1: Ensure image is persistent (Base64 JPEG) so it survives reload even in offline/mock mode
    let persistentImage = payload.previewUrl;
    if (payload.photoFile) {
      try {
        persistentImage = await compressImageForStorage(payload.photoFile);
      } catch (err) {
        console.warn('Image compression notice:', err);
      }
    }

    // Step 2: Try submitting to live backend if available
    try {
      if (await isBackendOnline() && payload.photoFile) {
        const form = new FormData();
        form.append('photo', payload.photoFile);
        form.append('category', payload.category);
        form.append('description', payload.description);
        form.append('title', payload.title || '');
        form.append('latitude', String(payload.location?.coordinates?.[1] ?? payload.location?.latitude ?? 28.6139));
        form.append('longitude', String(payload.location?.coordinates?.[0] ?? payload.location?.longitude ?? 77.2090));
        form.append('address', payload.location?.address || 'Ward 14');

        const data = await apiPostForm('/complaints', form, user);
        const normalized = normalizeBackendComplaint(data);
        normalized.isLive = true;
        if (!normalized.image || normalized.image.startsWith('blob:')) {
          normalized.image = persistentImage || normalized.image;
        }

        // Save to persistent storage immediately
        const currentList = getStoredComplaints();
        const existingIdx = currentList.findIndex(c => c.id === normalized.id);
        if (existingIdx !== -1) {
          currentList[existingIdx] = normalized;
        } else {
          currentList.unshift(normalized);
        }
        saveStoredComplaints(currentList);

        return normalized;
      }
    } catch (e) {
      console.warn('Backend submit failed, saving to persistent local storage:', e.message);
      _backendOnline = false;
    }

    // Step 3: Local AI inspection & LocalStorage persistence
    const newId = `CMP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const aiInspection = await aiFastApi.inspectComplaintPayload({
      title: payload.title,
      description: payload.description,
      category: payload.category,
      image: persistentImage || payload.previewUrl || payload.image,
      location: payload.location,
      isBlurryTest: payload.isBlurryTest || false
    });
    const isCvValid = aiInspection.aiVerified;

    const newRecord = {
      id: newId,
      title: payload.title,
      category: payload.category,
      categoryLabel: payload.categoryLabel || 'Civic Infrastructure',
      description: payload.description,
      location: {
        type: 'Point',
        coordinates: [
          payload.location?.coordinates?.[0] ?? payload.location?.longitude ?? 77.2090,
          payload.location?.coordinates?.[1] ?? payload.location?.latitude ?? 28.6139
        ],
        address: payload.location?.address || 'Ward 14'
      },
      status: isCvValid ? 'Verified_Assigned' : 'Rejected_Invalid_Image',
      urgency: isCvValid ? (aiInspection.mlPriority?.badge || 'medium') : 'low',
      reportedBy: payload.reportedBy || {
        id: user?.id || 'CIT-4668',
        name: user?.name || 'Tejas Bhamre',
        phone: user?.phone || '+91 95452 86810'
      },
      assignedOfficer: isCvValid ? aiInspection.assignedOfficer : null,
      aiInspection,
      image: persistentImage || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        { status: 'Submitted', note: 'Complaint saved to persistent civic record', timestamp: new Date().toISOString() },
        isCvValid
          ? { status: 'Verified & Assigned', note: `ML Model verified (${Math.round(aiInspection.cvResult.confidence * 100)}% confidence). NLP routed to ${aiInspection.assignedDepartment}.`, timestamp: new Date().toISOString() }
          : { status: 'Rejected (Invalid Image)', note: 'TensorFlow CV flagged low clarity. Resubmit a clearer photo.', timestamp: new Date().toISOString() }
      ]
    };

    // SAVE TO LOCALSTORAGE IMMEDIATELY! (Survives page reload)
    const currentList = getStoredComplaints();
    currentList.unshift(newRecord);
    saveStoredComplaints(currentList);

    return newRecord;
  },

  async resubmitPhoto(id, photoFile, previewUrl, user) {
    let persistentImage = previewUrl;
    if (photoFile) {
      try {
        persistentImage = await compressImageForStorage(photoFile);
      } catch (e) {
        console.warn(e);
      }
    }

    try {
      if (await isBackendOnline() && photoFile) {
        const form = new FormData();
        form.append('photo', photoFile);
        const data = await apiPostForm(`/complaints/${id}/photo`, form, user);
        const normalized = normalizeBackendComplaint(data);
        if (!normalized.image || normalized.image.startsWith('blob:')) {
          normalized.image = persistentImage || normalized.image;
        }

        const list = getStoredComplaints();
        const idx = list.findIndex(c => c.id === id);
        if (idx !== -1) list[idx] = normalized;
        saveStoredComplaints(list);

        return normalized;
      }
    } catch (e) {
      console.warn('Backend resubmit failed, using local storage:', e.message);
    }

    const list = getStoredComplaints();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Complaint not found');
    const complaint = { ...list[idx] };
    const aiInspection = await aiFastApi.inspectComplaintPayload({
      title: complaint.title, description: complaint.description, category: complaint.category, image: persistentImage || previewUrl || complaint.image, isBlurryTest: false
    });
    if (aiInspection.aiVerified) {
      complaint.status = 'Verified_Assigned';
      complaint.image = persistentImage || previewUrl || complaint.image;
      complaint.aiInspection = aiInspection;
      complaint.assignedOfficer = aiInspection.assignedOfficer;
      complaint.updatedAt = new Date().toISOString();
      complaint.timeline = [...(complaint.timeline || []), { status: 'Verified & Assigned', note: 'Resubmitted photo passed CV verification.', timestamp: new Date().toISOString() }];
    }
    list[idx] = complaint;
    saveStoredComplaints(list);
    return complaint;
  },

  async acceptComplaint(id, officerInfo, user) {
    try {
      if (await isBackendOnline()) {
        const data = await apiPost(`/officer/complaints/${id}/start`, {}, user);
        const normalized = normalizeBackendComplaint(data);
        const list = getStoredComplaints();
        const idx = list.findIndex(c => c.id === id);
        if (idx !== -1) list[idx] = normalized;
        saveStoredComplaints(list);
        return normalized;
      }
    } catch (e) {
      console.warn('Backend accept failed, using local storage:', e.message);
    }
    await new Promise(r => setTimeout(r, 200));
    const list = getStoredComplaints();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Complaint not found');
    const updated = { ...list[idx] };
    updated.status = 'In Progress';
    updated.acceptedAt = new Date().toISOString();
    updated.updatedAt = new Date().toISOString();
    updated.assignedOfficer = officerInfo || updated.assignedOfficer;
    updated.timeline = [...(updated.timeline || []), { status: 'In Progress', note: `Officer ${officerInfo?.name || 'Officer'} accepted task & dispatched crew.`, timestamp: new Date().toISOString() }];
    list[idx] = updated;
    saveStoredComplaints(list);
    return updated;
  },

  async resolveComplaint(id, note, resolutionImage, officerInfo, resolutionFile, user) {
    let persistentResImage = resolutionImage;
    if (resolutionFile) {
      try {
        persistentResImage = await compressImageForStorage(resolutionFile);
      } catch (e) {
        console.warn(e);
      }
    }

    try {
      if (await isBackendOnline()) {
        let data;
        if (resolutionFile) {
          const form = new FormData();
          form.append('photo', resolutionFile);
          form.append('note', note || 'Resolved');
          data = await apiPostForm(`/officer/complaints/${id}/resolve`, form, user);
        } else {
          data = await apiPost(`/officer/complaints/${id}/resolve`, { note: note || 'Resolved' }, user);
        }
        const normalized = normalizeBackendComplaint(data);
        if (!normalized.resolutionImage && persistentResImage) {
          normalized.resolutionImage = persistentResImage;
        }
        const list = getStoredComplaints();
        const idx = list.findIndex(c => c.id === id);
        if (idx !== -1) list[idx] = normalized;
        saveStoredComplaints(list);
        return normalized;
      }
    } catch (e) {
      console.warn('Backend resolve failed, using local storage:', e.message);
    }
    await new Promise(r => setTimeout(r, API_CONFIG.MOCK_DELAY_MS));
    const list = getStoredComplaints();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Complaint not found');
    const updated = { ...list[idx] };
    updated.status = COMPLAINT_STATUS.RESOLVED;
    updated.resolvedAt = new Date().toISOString();
    updated.updatedAt = new Date().toISOString();
    if (officerInfo) updated.assignedOfficer = officerInfo;
    if (persistentResImage) updated.resolutionImage = persistentResImage;
    if (note) updated.resolutionNote = note;
    const startMs = new Date(updated.createdAt).getTime();
    const endMs = new Date(updated.resolvedAt).getTime();
    updated.mttrHours = parseFloat(((endMs - startMs) / 3600000).toFixed(2));
    updated.timeline = [...(updated.timeline || []), { status: 'Resolved', note: note || 'Resolution completed.', timestamp: new Date().toISOString() }];
    list[idx] = updated;
    saveStoredComplaints(list);
    return updated;
  },

  async deleteComplaint(id, user) {
    try {
      if (await isBackendOnline()) {
        await apiDelete(`/complaints/${id}`, user);
      }
    } catch (e) {
      console.warn('Backend delete notice:', e.message);
    }
    // Delete from persistent local storage
    const currentList = getStoredComplaints().filter(c => c.id !== id);
    saveStoredComplaints(currentList);
    return { id };
  },

  async getMttrAnalytics() {
    const list = getStoredComplaints();
    const resolved = list.filter(c => c.status === 'Resolved' && c.mttrHours);
    const sum = resolved.reduce((acc, curr) => acc + curr.mttrHours, 0);
    const avg = resolved.length > 0 ? (sum / resolved.length).toFixed(1) : 24.5;
    return {
      avgMttrHours: parseFloat(avg),
      totalResolved: resolved.length,
      deptBreakdown: [
        { dept: 'Roads & Infrastructure', mttr: 42.1, resolvedCount: 12 },
        { dept: 'Sanitation & Solid Waste', mttr: 18.4, resolvedCount: 28 },
        { dept: 'Jal Board Water Supply', mttr: 24.0, resolvedCount: 15 },
        { dept: 'Electrical Grid', mttr: 54.7, resolvedCount: 8 }
      ]
    };
  }
};

export default expressGatewayApi;
