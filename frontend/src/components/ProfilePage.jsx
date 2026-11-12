import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Mail,
  Building2,
  Briefcase,
  BadgeCheck,
  Lock,
  RefreshCw,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  Heart,
  FileText,
  Upload,
  Download,
  Trash2,
  Plus,
  Clock,
  Award,
  BookOpen,
  Eye,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Info,
  Sliders,
  ExternalLink,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import UserAvatar from './UserAvatar';
import PasswordModal from './PasswordModal';

const POSITION_BANDS = {
  P0: { label: 'P0 - Trainee / Intern', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  P1: { label: 'P1 - Assisstant / Executive', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  P2: { label: 'P2 - Senior Specialist', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  P3: { label: 'P3 - Lead / Manager', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  P4: { label: 'P4 - Principal / Director', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const DOCUMENT_CATEGORIES = [
  { id: 'ALL', label: 'All Documents' },
  { id: 'Offer Letter', label: 'Offer Letter', hrOnly: true },
  { id: 'Appointment Letter', label: 'Appointment Letter', hrOnly: true },
  { id: 'Employment Agreement', label: 'Employment Agreement', hrOnly: true },
  { id: 'Identity Documents', label: 'Identity Documents', hrOnly: false },
  { id: 'Educational Certificates', label: 'Educational Certificates', hrOnly: false },
  { id: 'Experience Certificates', label: 'Experience Certificates', hrOnly: false },
  { id: 'Other HR Documents', label: 'Other HR Documents', hrOnly: true },
  { id: 'Company Policies', label: 'Company Policies', hrOnly: false, readOnly: true },
];

export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();

  // Profile data states
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Sub-section edit states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({});
  const [editingEmergencyContact, setEditingEmergencyContact] = useState(null);
  const [emergencyForm, setEmergencyForm] = useState({
    name: '',
    relationship: 'Spouse',
    primaryPhone: '',
    secondaryPhone: '',
    isPrimary: false,
  });

  // Document management
  const [docCategoryFilter, setDocCategoryFilter] = useState('ALL');
  const [uploadCategory, setUploadCategory] = useState('Identity Documents');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState(null);

  const currentUserRole = authUser?.role || 'EMPLOYEE';
  const isHrAdmin = currentUserRole === 'HR_ADMIN' || currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN';
  const isManager = currentUserRole === 'MANAGER';

  // Load profile data
  const loadProfile = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      if (data?.personalInformation) {
        setPersonalForm({
          fullName: data.personalInformation.fullName || data.fullName || '',
          personalEmail: data.personalInformation.personalEmail || '',
          mobileNumber: data.personalInformation.mobileNumber || '',
          dateOfBirth: data.personalInformation.dateOfBirth || '',
          gender: data.personalInformation.gender || '',
          bloodGroup: data.personalInformation.bloodGroup || '',
          addressLine1: data.personalInformation.addressLine1 || '',
          addressLine2: data.personalInformation.addressLine2 || '',
          city: data.personalInformation.city || '',
          state: data.personalInformation.state || '',
          country: data.personalInformation.country || 'India',
          postalCode: data.personalInformation.postalCode || '',
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      showFeedback('error', err.message || 'Unable to load profile data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      if (refreshUser) await refreshUser();
      await loadProfile(true);
      showFeedback('success', 'Synchronization successful');
    } catch (err) {
      showFeedback('error', 'Failed to synchronize profile.');
    }
  };

  // 1. Save Personal Information
  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    try {
      // Validate mobile if entered
      if (personalForm.mobileNumber && !/^[+0-9\s-]{8,18}$/.test(personalForm.mobileNumber)) {
        showFeedback('error', 'Please enter a valid phone number (8-18 digits).');
        return;
      }
      // Validate postal code if entered
      if (personalForm.postalCode && !/^[A-Za-z0-9\s-]{3,10}$/.test(personalForm.postalCode)) {
        showFeedback('error', 'Please enter a valid postal/PIN code.');
        return;
      }

      await profileService.updatePersonalInfo(personalForm);
      showFeedback('success', 'Personal information updated successfully.');
      setIsEditingPersonal(false);
      await loadProfile(true);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to update personal information.');
    }
  };

  // 2. Save Emergency Contact
  const handleSaveEmergencyContact = async (e) => {
    e.preventDefault();
    if (!emergencyForm.name?.trim() || !emergencyForm.primaryPhone?.trim()) {
      showFeedback('error', 'Contact name and primary phone are required.');
      return;
    }
    try {
      await profileService.saveEmergencyContact({
        id: editingEmergencyContact?.id,
        ...emergencyForm,
      });
      showFeedback('success', `Emergency contact ${editingEmergencyContact ? 'updated' : 'added'} successfully.`);
      setShowEmergencyModal(false);
      setEditingEmergencyContact(null);
      setEmergencyForm({
        name: '',
        relationship: 'Spouse',
        primaryPhone: '',
        secondaryPhone: '',
        isPrimary: false,
      });
      await loadProfile(true);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to save emergency contact.');
    }
  };

  const handleDeleteEmergencyContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this emergency contact?')) return;
    try {
      await profileService.deleteEmergencyContact(contactId);
      showFeedback('success', 'Emergency contact deleted.');
      await loadProfile(true);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to delete emergency contact.');
    }
  };

  // 3. Document Upload (Zoho WorkDrive)
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showFeedback('error', 'Please select a file to upload.');
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      showFeedback('error', 'File size exceeds maximum limit of 25MB.');
      return;
    }

    setUploadingDoc(true);
    try {
      await profileService.uploadDocument(selectedFile, uploadCategory);
      showFeedback('success', `Document "${selectedFile.name}" successfully uploaded to Zoho WorkDrive.`);
      setShowUploadModal(false);
      setSelectedFile(null);
      await loadProfile(true);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to upload document to Zoho WorkDrive.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDoc = async (doc) => {
    setDownloadingDocId(doc.id);
    try {
      await profileService.downloadDocument(doc.id, doc.fileName);
      showFeedback('success', `Downloaded "${doc.fileName}"`);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to download document from Zoho WorkDrive.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await profileService.deleteDocument(docId);
      showFeedback('success', 'Document deleted.');
      await loadProfile(true);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to delete document.');
    }
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    const docs = profile?.documents || [];
    if (docCategoryFilter === 'ALL') return docs;
    if (docCategoryFilter === 'Company Policies') {
      return docs.filter((d) => d.isCompanyPolicy);
    }
    return docs.filter((d) => d.category === docCategoryFilter);
  }, [profile?.documents, docCategoryFilter]);

  // Loading skeleton
  if (loading && !profile) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const profileData = profile || {};
  const displayEmployeeId = profile?.employeeId || profileData?.employeeId || user?.employeeId || '—';
  const displayEmail = profile?.officialEmail || profile?.email || profileData?.email || profileData?.officialEmail || user?.email || '—';
  const displayDesignation = profile?.designation || profileData?.designation || user?.designation || '—';
  const displayDepartment = profile?.department || profileData?.department || user?.department || '—';
  const displayBranch = (
    profile?.branch ||
    profile?.employmentInfo?.branch ||
    profile?.officeLocation ||
    profile?.employmentInfo?.officeLocation ||
    profileData?.branch ||
    profileData?.officeLocation ||
    user?.branch ||
    ''
  ).trim() || '—';

  const rawBand = profile?.positionBand || profile?.employmentInfo?.positionBand || profileData?.positionBand || user?.positionBand || 'P1';
  const positionBandCode = String(rawBand).trim().toUpperCase();
  const bandBadgeStyles = {
    P0: 'bg-slate-100 text-slate-700 border-slate-300',
    P1: 'bg-blue-50 text-blue-700 border-blue-200',
    P2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    P3: 'bg-purple-50 text-purple-700 border-purple-200',
    P4: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const bandBadgeStyle = bandBadgeStyles[positionBandCode] || bandBadgeStyles.P1;

  const bandInfo = POSITION_BANDS[profile?.positionBand || profileData?.positionBand] || POSITION_BANDS.P1;
  const statusColors = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    ON_LEAVE: 'bg-amber-100 text-amber-800 border-amber-300',
    INACTIVE: 'bg-rose-100 text-rose-800 border-rose-300',
    TERMINATED: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-800 dark:text-slate-100">
      {/* Synchronize status notification banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all duration-300 ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. PROFILE HEADER */}
      {/* ============================================================== */}
      <section
        id="profile-header"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Deterministic Initial-Based Circular Avatar (Strict: No Photo Uploads) */}
            <UserAvatar
              name={profile?.fullName || authUser?.name}
              employeeId={profile?.employeeId || authUser?.employeeId}
              email={profile?.officialEmail || authUser?.email}
              size="2xl"
              status={profile?.employmentStatus || 'ACTIVE'}
            />

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {profile?.fullName || authUser?.name || 'Authorized Employee'}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    statusColors[profile?.employmentStatus] || statusColors.ACTIVE
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                  {profile?.employmentStatus || 'ACTIVE'}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bandInfo.color}`}
                >
                  {bandInfo.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {profile?.designation || 'Specialist'}
                </span>
                <span>•</span>
                <span>{profile?.department || 'Operations'}</span>
                <span>•</span>
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                  ID: {profile?.employeeId || '—'}
                </span>
              </div>

              {/* Profile Completion Meter */}
              <div className="pt-2 flex items-center gap-3">
                <div className="w-40 sm:w-56 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${profile?.profileCompletionPercentage || 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {profile?.profileCompletionPercentage || 0}% Complete
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition"
              title="Synchronize profile details from backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Lock className="w-3.5 h-3.5" />
              Change Password
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. PERSONAL INFORMATION (Replaces Role & Security Governance) */}
      {/* ============================================================== */}
      <section
        id="personal-info"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personal Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Contact coordinates, biological details, and residential address.
            </p>
          </div>

          <div>
            {!isEditingPersonal ? (
              <button
                type="button"
                onClick={() => setIsEditingPersonal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 transition"
              >
                Edit Details
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePersonalInfo}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditingPersonal ? (
          <form onSubmit={handleSavePersonalInfo} className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Full Legal Name</span>
                    {!isHrAdmin && (
                      <span className="text-[10px] text-amber-600 flex items-center gap-0.5 font-normal">
                        <Lock className="w-2.5 h-2.5" /> HR Controlled
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    disabled={!isHrAdmin}
                    value={personalForm.fullName || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    value={personalForm.personalEmail || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, personalEmail: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. employee@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    value={personalForm.mobileNumber || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={personalForm.dateOfBirth || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gender (Optional)
                  </label>
                  <select
                    value={personalForm.gender || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group (Optional)
                  </label>
                  <select
                    value={personalForm.bloodGroup || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Residential Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    House / Flat / Door No. & Building
                  </label>
                  <input
                    type="text"
                    value={personalForm.addressLine1 || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, addressLine1: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. Flat 402, Lotus Towers"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Street, Area & Landmark
                  </label>
                  <input
                    type="text"
                    value={personalForm.addressLine2 || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, addressLine2: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. Outer Ring Road, Near Tech Park"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={personalForm.city || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State / Province</label>
                  <input
                    type="text"
                    value={personalForm.state || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">PIN / Postal Code</label>
                  <input
                    type="text"
                    value={personalForm.postalCode || ''}
                    onChange={(e) => setPersonalForm({ ...personalForm, postalCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={personalForm.country || 'India'}
                    onChange={(e) => setPersonalForm({ ...personalForm, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Basic Credentials
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Full Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {profile?.personalInformation?.fullName || profile?.fullName || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Personal Email</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {profile?.personalInformation?.personalEmail || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Mobile Phone</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {profile?.personalInformation?.mobileNumber || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Date of Birth</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {profile?.personalInformation?.dateOfBirth || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Gender</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {profile?.personalInformation?.gender || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Blood Group</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {profile?.personalInformation?.bloodGroup || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Residential Address
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-1">
                {profile?.personalInformation?.addressLine1 || profile?.personalInformation?.city ? (
                  <>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {profile.personalInformation.addressLine1}
                    </p>
                    {profile.personalInformation.addressLine2 && (
                      <p className="text-slate-600 dark:text-slate-300">{profile.personalInformation.addressLine2}</p>
                    )}
                    <p className="text-slate-600 dark:text-slate-300">
                      {[profile.personalInformation.city, profile.personalInformation.state, profile.personalInformation.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs pt-1 font-semibold">
                      {profile.personalInformation.country || 'India'}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 italic text-xs py-2">
                    No residential address recorded. Click &quot;Edit Details&quot; to configure.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 3. EMERGENCY CONTACT */}
      {/* ============================================================== */}
      <section
        id="emergency-contacts"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              Emergency Contacts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Individuals to notify in the event of an urgent or medical situation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingEmergencyContact(null);
              setEmergencyForm({
                name: '',
                relationship: 'Spouse',
                primaryPhone: '',
                secondaryPhone: '',
                isPrimary: (profile?.emergencyContacts || []).length === 0,
              });
              setShowEmergencyModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Contact
          </button>
        </div>

        {(profile?.emergencyContacts || []).length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Phone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No emergency contacts configured</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Please add at least one primary emergency contact to ensure Fairmacs can reach your loved ones if necessary.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.emergencyContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{contact.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                      {contact.relationship}
                    </span>
                    {contact.isPrimary && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 pt-1">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{contact.primaryPhone}</span>
                    </div>
                    {contact.secondaryPhone && (
                      <div className="flex items-center gap-1.5 font-mono text-slate-500">
                        <Phone className="w-3 h-3 text-slate-400 opacity-60" />
                        <span>{contact.secondaryPhone} (Alt)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmergencyContact(contact);
                      setEmergencyForm({
                        name: contact.name,
                        relationship: contact.relationship,
                        primaryPhone: contact.primaryPhone,
                        secondaryPhone: contact.secondaryPhone || '',
                        isPrimary: Boolean(contact.isPrimary),
                      });
                      setShowEmergencyModal(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                    title="Edit Contact"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEmergencyContact(contact.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 4. EMPLOYMENT INFORMATION */}
      {/* ============================================================== */}
      <section
        id="employment-info"
        className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Employment Information
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official corporate standing, organizational hierarchy, and office location.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          {/* 1. Employee ID */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Employee ID</span>
            <div className="font-mono font-bold text-slate-900 text-sm">
              {displayEmployeeId}
            </div>
          </div>

          {/* 2. Official Corporate Email */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Official Corporate Email</span>
            <div
              className="font-medium text-blue-600 text-sm truncate"
              title={displayEmail !== '—' ? displayEmail : undefined}
            >
              {displayEmail}
            </div>
          </div>

          {/* 3. Designation */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Designation</span>
            <div className="font-semibold text-slate-900 text-sm">
              {displayDesignation}
            </div>
          </div>

          {/* 4. Department */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Department</span>
            <div className="font-semibold text-slate-900 text-sm">
              {displayDepartment}
            </div>
          </div>

          {/* 5. Position Band */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Position Band</span>
            <div className="flex items-center min-h-[24px]">
              <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded text-xs font-bold border tracking-wide ${bandBadgeStyle}`}>
                {positionBandCode}
              </span>
            </div>
          </div>

          {/* 6. Office / Branch Location */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Office / Branch Location</span>
            <div className="font-medium text-slate-900 text-sm flex items-center gap-1.5 min-h-[24px]">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{displayBranch}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. MY DOCUMENTS (Zoho WorkDrive Integration) */}
      {/* ============================================================== */}
      <section
        id="my-documents"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              My Documents
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setUploadCategory('Identity Documents');
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Document
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setDocCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                docCategoryFilter === cat.id
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Document Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-2.5">Document Name</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Upload Date</th>
                <th className="px-4 py-2.5">Size</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic">
                    No documents found in this category.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate max-w-xs">{doc.fileName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                      {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        disabled={downloadingDocId === doc.id}
                        onClick={() => handleDownloadDoc(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded transition"
                        title="Download from Zoho WorkDrive"
                      >
                        <Download className={`w-3.5 h-3.5 ${downloadingDocId === doc.id ? 'animate-bounce' : ''}`} />
                        <span>{downloadingDocId === doc.id ? 'Streaming...' : 'Download'}</span>
                      </button>
                      {(isHrAdmin || doc.category === 'Identity Documents') && !doc.isCompanyPolicy && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. LEARNING & DEVELOPMENT */}
      {/* ============================================================== */}
      <section
        id="learning-development"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Learning & Development
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live statistics from your assigned courses, certifications, and learning milestones.
            </p>
          </div>

          <a
            href="/progress"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <span>Progress Hub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Assigned Courses</span>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {profile?.learningDevelopment?.assignedCourses || 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">In Progress</span>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
              {profile?.learningDevelopment?.inProgressCourses || 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Completed Courses</span>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
              {profile?.learningDevelopment?.completedCourses || 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Certificates Earned</span>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
              {profile?.learningDevelopment?.certificatesEarned || 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Learning Hours</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {profile?.learningDevelopment?.totalLearningHours || 0} hrs
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href="/courses"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            Explore Course Catalog
          </a>
          <a
            href="/certificates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            View My Certificates
          </a>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. EMPLOYMENT TIMELINE */}
      {/* ============================================================== */}
      <section
        id="employment-timeline"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5"
      >
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Employment Timeline
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Key milestones, career movements, and organizational transitions at Fairmacs.
          </p>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {(profile?.timelineEvents || []).length === 0 ? (
            <div className="text-xs text-slate-400 italic">No timeline events recorded yet.</div>
          ) : (
            profile.timelineEvents.map((evt, idx) => (
              <div key={evt.id || idx} className="relative group">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900 group-hover:scale-125 transition" />
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{evt.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {evt.description && (
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">{evt.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* MODAL 1: EMERGENCY CONTACT ADD/EDIT */}
      {/* ============================================================== */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingEmergencyContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmergencyContact} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={emergencyForm.name}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Relationship *</label>
                <select
                  value={emergencyForm.relationship}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, relationship: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Guardian', 'Other'].map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Primary Phone *</label>
                <input
                  type="tel"
                  required
                  value={emergencyForm.primaryPhone}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, primaryPhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Alternate Phone (Optional)</label>
                <input
                  type="tel"
                  value={emergencyForm.secondaryPhone}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, secondaryPhone: e.target.value })}
                  placeholder="+91 98765 43211"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={emergencyForm.isPrimary}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, isPrimary: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Set as Primary Emergency Contact</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DOCUMENT UPLOAD (ZOHO WORKDRIVE) */}
      {/* ============================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload to Zoho WorkDrive
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Category *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {DOCUMENT_CATEGORIES.filter((c) => c.id !== 'ALL' && c.id !== 'Company Policies' && (!c.hrOnly || isHrAdmin)).map(
                    (cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Choose File *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/40 dark:file:text-blue-300"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Supported formats: PDF, DOCX, PNG, JPG (Maximum 25MB).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
                >
                  <Upload className={`w-3.5 h-3.5 ${uploadingDoc ? 'animate-bounce' : ''}`} />
                  <span>{uploadingDoc ? 'Uploading to Zoho...' : 'Upload File'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
