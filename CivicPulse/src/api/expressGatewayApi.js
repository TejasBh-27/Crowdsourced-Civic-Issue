/**
 * Express Gateway API — bridges frontend to the real Node.js backend
 * When backend is live:  calls /api/v1/complaints  (real MongoDB/Memory store + Multer uploads)
 * When backend is down:  falls back to in-memory mock data seamlessly
 */

import { API_CONFIG, COMPLAINT_STATUS } from '../constants/api';
import aiFastApi from './aiFastApi';
import { apiGet, apiPost, apiPostForm, checkBackendHealth, getApiHeaders } from './apiClient';

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

let mockComplaintsDb = [...INITIAL_MOCK_COMPLAINTS];
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
      rejectionReason: c.rejectionReason || null,
      // CV (real OpenCV results if backend used AI_MODE=http)
      cvResult: {
        isValidImage: c.status !== 'rejected',
        confidence: ai.cv?.confidence ?? 0.92,
        clarityScore: ai.cv?.clarityScore ?? 90,
        laplacianVariance: ai.cv?.laplacianVariance ?? null,
        brightness: ai.cv?.brightness ?? null,
        contrast: ai.cv?.contrast ?? null,
        dimensions: ai.cv?.dimensions ?? null,
        model: ai.cv?.model ?? 'CivicCV-OpenCV v1.0',
      },
      // NLP (real TF-IDF + LogReg results)
      nlpResult: ai.nlp ? {
        department: ai.nlp.department,
        departmentLabel: ai.nlp.departmentLabel,
        confidence: ai.nlp.confidence,
        topFeatures: ai.nlp.topFeatures || [],
        model: ai.nlp.model || 'TF-IDF + LogisticRegression (sklearn)',
      } : null,
      // ML Priority (real RandomForest results)
      mlPriority: ai.ml ? {
        score: ai.ml.score,
        level: ai.ml.level,
        probs: ai.ml.probs,
        featureImportances: ai.ml.featureImportances || [],
        model: ai.ml.model || 'RandomForestClassifier (sklearn)',
      } : (c.urgencyScore != null ? {
        score: c.urgencyScore,
        level: c.urgency || 'medium',
        model: 'RandomForestClassifier (sklearn)',
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
// Public API — smart router (real backend OR mock fallback)
// ──────────────────────────────────────────────────────────────────────────────

export const expressGatewayApi = {

  async fetchComplaints(user) {
    try {
      if (await isBackendOnline()) {
        const path = user?.role === 'officer' ? '/officer/complaints' : '/complaints/mine';
        const data = await apiGet(path, user);
        return data.map(normalizeBackendComplaint);
      }
    } catch (e) {
      console.warn('Backend fetch failed, using mock:', e.message);
      _backendOnline = false;
    }
    await new Promise(r => setTimeout(r, API_CONFIG.MOCK_DELAY_MS));
    return [...mockComplaintsDb];
  },

  async fetchComplaintById(id, user) {
    try {
      if (await isBackendOnline()) {
        const data = await apiGet(`/complaints/${id}`, user);
        return normalizeBackendComplaint(data);
      }
    } catch (e) {
      console.warn('Backend getById failed, using mock:', e.message);
    }
    await new Promise(r => setTimeout(r, 300));
    const item = mockComplaintsDb.find(c => c.id === id);
    if (!item) throw new Error('Complaint not found');
    return { ...item };
  },

  /**
   * Submit a complaint with a real photo file (Blob/File).
   * Uses multipart/form-data POST to /api/v1/complaints when backend is live.
   * Falls back to mock AI inspection when backend is down.
   */
  async createComplaint(payload, user) {
    try {
      if (await isBackendOnline() && payload.photoFile) {
        const form = new FormData();
        form.append('photo', payload.photoFile);
        form.append('category', payload.category);
        form.append('description', payload.description);
        form.append('title', payload.title || '');
        form.append('latitude', String(payload.location?.latitude ?? 28.6139));
        form.append('longitude', String(payload.location?.longitude ?? 77.2090));
        form.append('address', payload.location?.address || 'Ward 14');

        const data = await apiPostForm('/complaints', form, user);
        const normalized = normalizeBackendComplaint(data);
        normalized.isLive = true;
        return normalized;
      }
    } catch (e) {
      console.warn('Backend submit failed, using mock AI:', e.message);
      _backendOnline = false;
    }

    // Mock fallback — run AI inspection locally
    const newId = `CMP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const aiInspection = await aiFastApi.inspectComplaintPayload({
      title: payload.title,
      description: payload.description,
      category: payload.category,
      image: payload.image,
      isBlurryTest: payload.isBlurryTest || false
    });
    const isCvValid = aiInspection.aiVerified;
    const newRecord = {
      id: newId,
      title: payload.title,
      category: payload.category,
      categoryLabel: payload.categoryLabel || 'Civic Infrastructure',
      description: payload.description,
      location: { type: 'Point', coordinates: [payload.location?.longitude || 77.2090, payload.location?.latitude || 28.6139], address: payload.location?.address || 'Ward 14' },
      status: isCvValid ? 'Verified_Assigned' : 'Rejected_Invalid_Image',
      urgency: isCvValid ? (aiInspection.mlPriority?.badge || 'medium') : 'low',
      reportedBy: payload.reportedBy || { id: 'CIT-4481', name: 'Ananya Sharma', phone: '+91 98765 43210' },
      assignedOfficer: isCvValid ? aiInspection.assignedOfficer : null,
      aiInspection,
      image: payload.previewUrl || payload.image || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        { status: 'Submitted', note: 'Saved to mock database (backend offline)', timestamp: new Date().toISOString() },
        isCvValid
          ? { status: 'Verified & Assigned', note: `FastAPI AI verified (${Math.round(aiInspection.cvResult.confidence * 100)}% confidence). NLP routed to ${aiInspection.assignedDepartment}.`, timestamp: new Date().toISOString() }
          : { status: 'Rejected (Invalid Image)', note: 'TensorFlow CV flagged low clarity. Resubmit a clearer photo.', timestamp: new Date().toISOString() }
      ]
    };
    mockComplaintsDb.unshift(newRecord);
    return newRecord;
  },

  async resubmitPhoto(id, photoFile, previewUrl, user) {
    try {
      if (await isBackendOnline() && photoFile) {
        const form = new FormData();
        form.append('photo', photoFile);
        const data = await apiPostForm(`/complaints/${id}/photo`, form, user);
        return normalizeBackendComplaint(data);
      }
    } catch (e) {
      console.warn('Backend resubmit failed, using mock:', e.message);
    }

    const idx = mockComplaintsDb.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Complaint not found');
    const complaint = mockComplaintsDb[idx];
    const aiInspection = await aiFastApi.inspectComplaintPayload({
      title: complaint.title, description: complaint.description, category: complaint.category, image: previewUrl, isBlurryTest: false
    });
    if (aiInspection.aiVerified) {
      complaint.status = 'Verified_Assigned';
      complaint.image = previewUrl || complaint.image;
      complaint.aiInspection = aiInspection;
      complaint.assignedOfficer = aiInspection.assignedOfficer;
      complaint.updatedAt = new Date().toISOString();
      complaint.timeline.push({ status: 'Verified & Assigned', note: 'Resubmitted photo passed CV verification.', timestamp: new Date().toISOString() });
    }
    mockComplaintsDb[idx] = complaint;
    return complaint;
  },

  async acceptComplaint(id, officerInfo, user) {
    try {
      if (await isBackendOnline()) {
        const data = await apiPost(`/officer/complaints/${id}/start`, {}, user);
        return normalizeBackendComplaint(data);
      }
    } catch (e) {
      console.warn('Backend accept failed, using mock:', e.message);
    }
    await new Promise(r => setTimeout(r, 300));
    const idx = mockComplaintsDb.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Complaint not found');
    const updated = { ...mockComplaintsDb[idx] };
    updated.status = 'In Progress';
    updated.acceptedAt = new Date().toISOString();
    updated.updatedAt = new Date().toISOString();
    updated.assignedOfficer = officerInfo || updated.assignedOfficer;
    updated.timeline.push({ status: 'In Progress', note: `Officer ${officerInfo?.name || 'Officer'} accepted task & dispatched crew.`, timestamp: new Date().toISOString() });
    mockComplaintsDb[idx] = updated;
    return updated;
  },

  async resolveComplaint(id, note, resolutionImage, officerInfo, resolutionFile, user) {
    try {
      if (await isBackendOnline()) {
        if (resolutionFile) {
          const form = new FormData();
          form.append('photo', resolutionFile);
          form.append('note', note || 'Resolved');
          const data = await apiPostForm(`/officer/complaints/${id}/resolve`, form, user);
          return normalizeBackendComplaint(data);
        } else {
          const data = await apiPost(`/officer/complaints/${id}/resolve`, { note: note || 'Resolved' }, user);
          return normalizeBackendComplaint(data);
        }
      }
    } catch (e) {
      console.warn('Backend resolve failed, using mock:', e.message);
    }
    await new Promise(r => setTimeout(r, API_CONFIG.MOCK_DELAY_MS));
    const idx = mockComplaintsDb.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Complaint not found');
    const updated = { ...mockComplaintsDb[idx] };
    updated.status = COMPLAINT_STATUS.RESOLVED;
    updated.resolvedAt = new Date().toISOString();
    updated.updatedAt = new Date().toISOString();
    if (officerInfo) updated.assignedOfficer = officerInfo;
    if (resolutionImage) updated.resolutionImage = resolutionImage;
    if (note) updated.resolutionNote = note;
    const startMs = new Date(updated.createdAt).getTime();
    const endMs = new Date(updated.resolvedAt).getTime();
    updated.mttrHours = parseFloat(((endMs - startMs) / 3600000).toFixed(2));
    updated.timeline.push({ status: 'Resolved', note: note || 'Resolution completed.', timestamp: new Date().toISOString() });
    mockComplaintsDb[idx] = updated;
    return updated;
  },

  async getMttrAnalytics() {
    const resolved = mockComplaintsDb.filter(c => c.status === 'Resolved' && c.mttrHours);
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
