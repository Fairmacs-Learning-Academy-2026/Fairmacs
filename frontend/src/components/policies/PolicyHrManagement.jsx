import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  LayoutGrid,
  Library,
  Plus,
  Send,
  Inbox,
  BarChart3,
  History,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { policyService } from '../../services/policyService';
import { API_BASE_URL, getAuthToken, authFetch } from '../../utils/apiConfig';

// Subcomponents
import PolicyOverviewTab from './PolicyOverviewTab';
import PolicyLibraryTab from './PolicyLibraryTab';
import PolicyApprovalTab from './PolicyApprovalTab';
import PolicyReportsTab from './PolicyReportsTab';
import PolicyCreateModal from './PolicyCreateModal';
import PolicyPublishModal from './PolicyPublishModal';
import PolicyVersionHistoryModal from './PolicyVersionHistoryModal';
import PolicyPdfViewerModal from './PolicyPdfViewerModal';

export default function PolicyHrManagement() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, library, create, publish, approvals, reports, history

  // Data States
  const [overview, setOverview] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Loading & Notice States
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal States
  const [pdfModal, setPdfModal] = useState({ open: false, versionId: null, title: '', versionNumber: '', allowDownload: true });
  const [versionHistoryModal, setVersionHistoryModal] = useState({ open: false, policy: null });
  const [createModal, setCreateModal] = useState({ open: false, existingPolicy: null });
  const [publishModal, setPublishModal] = useState({ open: false, policy: null });

  // Notice helper
  const showNotice = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice(null);
    }, 5000);
  };

  // Master Data Refresh
  const loadMasterData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovData, polData, catData, subData] = await Promise.all([
        policyService.getOverview().catch(() => null),
        policyService.getPolicies().catch(() => []),
        policyService.getCategories().catch(() => []),
        policyService.getSubmissions().catch(() => []),
      ]);

      setOverview(ovData);
      setPolicies(Array.isArray(polData) ? polData : polData?.data || []);
      setCategories(Array.isArray(catData) ? catData : catData?.data || []);
      setSubmissions(Array.isArray(subData) ? subData : subData?.data || []);

      // Fetch departments using authenticated fetch
      const token = getAuthToken();
      authFetch(`${API_BASE_URL}/departments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((deptList) => setDepartments(Array.isArray(deptList) ? deptList : []))
        .catch((e) => console.error('Failed to load departments:', e));
    } catch (err) {
      console.error('Failed to load Policy management data:', err);
      showNotice('error', err.message || 'Unable to load Policies & Agreements data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Document Viewing Action (authenticated PDF stream)
  const handleViewDocument = (docOrVersion) => {
    let versionId = null;
    let title = '';
    let versionNumber = '1.0';
    let allowDownload = true;

    if (docOrVersion.workdriveFileId || docOrVersion.versionNumber) {
      // Version object passed directly
      versionId = docOrVersion.id;
      title = docOrVersion.workdriveFileName || 'Policy Document';
      versionNumber = docOrVersion.versionNumber;
      allowDownload = docOrVersion.allowDownload !== false;
    } else {
      // PolicyDocumentDTO passed
      const targetVer = docOrVersion.currentVersion || docOrVersion.latestVersion;
      if (!targetVer) {
        showNotice('error', 'This policy does not have an uploaded version yet.');
        return;
      }
      versionId = targetVer.id;
      title = docOrVersion.title;
      versionNumber = targetVer.versionNumber;
      allowDownload = targetVer.allowDownload !== false;
    }

    setPdfModal({
      open: true,
      versionId,
      title,
      versionNumber,
      allowDownload,
    });
  };

  // Archive Action
  const handleArchiveDocument = async (policyId) => {
    try {
      await policyService.archivePolicy(policyId);
      showNotice('success', 'Policy document archived successfully.');
      loadMasterData();
    } catch (err) {
      console.error('Archive failed:', err);
      showNotice('error', err.message || 'Failed to archive policy document.');
    }
  };

  // Callback when a document is created or version uploaded
  const handleDocumentCreated = (savedDoc, proceedToPublish) => {
    showNotice(
      'success',
      `Document "${savedDoc.title}" ${savedDoc.latestVersion ? 'version uploaded' : 'saved as draft'}.`
    );
    loadMasterData();

    if (proceedToPublish) {
      setPublishModal({ open: true, policy: savedDoc });
    }
  };

  // Callback when a document is published
  const handleDocumentPublished = (publishedDoc) => {
    showNotice(
      'success',
      `Policy "${publishedDoc.title}" published successfully! Targeted employees have been notified.`
    );
    loadMasterData();
  };

  // Quick navigation handlers from overview
  const pendingApprovalsCount = submissions.length || overview?.pendingApprovals || 0;

  return (
    <div className="space-y-6">
      {/* Toast Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Module Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Policies & Agreements Management
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={loadMasterData}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Refresh Policy Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModal({ open: true, existingPolicy: null })}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Document</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (7 Sections per Stage 3 specification) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1.5 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
        {/* 1. Overview */}
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Overview</span>
        </button>

        {/* 2. Document Library */}
        <button
          onClick={() => setActiveTab('library')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'library'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Library className="w-4 h-4" />
          <span>Document Library</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'library' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {policies.length}
          </span>
        </button>

        {/* 3. Create / Upload */}
        <button
          onClick={() => setCreateModal({ open: true, existingPolicy: null })}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap text-slate-600 hover:text-slate-900 hover:bg-slate-100`}
        >
          <Plus className="w-4 h-4" />
          <span>Create / Upload</span>
        </button>

        {/* 4. Publish & Assign */}
        <button
          onClick={() => {
            if (policies.length === 0) {
              showNotice('error', 'Please create a policy before assigning.');
              return;
            }
            // Pick first policy or switch to library
            const target = policies.find((p) => p.documentStatus === 'DRAFT') || policies[0];
            setPublishModal({ open: true, policy: target });
          }}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap text-slate-600 hover:text-slate-900 hover:bg-slate-100`}
        >
          <Send className="w-4 h-4" />
          <span>Publish & Assign</span>
        </button>

        {/* 5. Approval Requests */}
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'approvals'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Approval Requests</span>
          {pendingApprovalsCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'approvals'
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        {/* 6. Acknowledgement Reports */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Acknowledgement Reports</span>
        </button>
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'overview' && (
          <PolicyOverviewTab
            overview={overview}
            loading={loading}
            onRefresh={loadMasterData}
            onViewDocument={handleViewDocument}
            onGoToApprovals={() => setActiveTab('approvals')}
            onGoToLibrary={() => setActiveTab('library')}
            onGoToReports={() => setActiveTab('reports')}
          />
        )}

        {activeTab === 'library' && (
          <PolicyLibraryTab
            policies={policies}
            categories={categories}
            departments={departments}
            loading={loading}
            onViewDocument={handleViewDocument}
            onPublishDocument={(doc) => setPublishModal({ open: true, policy: doc })}
            onUploadNewVersion={(doc) => setCreateModal({ open: true, existingPolicy: doc })}
            onViewVersionHistory={(doc) => setVersionHistoryModal({ open: true, policy: doc })}
            onViewComplianceReport={(doc) => {
              setActiveTab('reports');
            }}
            onArchiveDocument={handleArchiveDocument}
            onCreateNew={() => setCreateModal({ open: true, existingPolicy: null })}
          />
        )}

        {activeTab === 'approvals' && (
          <PolicyApprovalTab
            submissions={submissions}
            loading={loading}
            onRefresh={loadMasterData}
            onViewDocument={handleViewDocument}
            onSuccess={(msg) => {
              showNotice('success', msg);
              loadMasterData();
            }}
          />
        )}

        {activeTab === 'reports' && (
          <PolicyReportsTab
            policies={policies}
            departments={departments}
          />
        )}
      </div>

      {/* Modals */}
      {/* 1. PDF Viewer Modal */}
      {pdfModal.open && (
        <PolicyPdfViewerModal
          versionId={pdfModal.versionId}
          title={pdfModal.title}
          versionNumber={pdfModal.versionNumber}
          allowDownload={pdfModal.allowDownload}
          onClose={() => setPdfModal({ open: false, versionId: null, title: '', versionNumber: '', allowDownload: true })}
        />
      )}

      {/* 2. Version History Modal */}
      {versionHistoryModal.open && versionHistoryModal.policy && (
        <PolicyVersionHistoryModal
          policy={versionHistoryModal.policy}
          onClose={() => setVersionHistoryModal({ open: false, policy: null })}
          onViewVersion={(ver) => handleViewDocument(ver)}
          onUploadNewVersion={(pol) => {
            setVersionHistoryModal({ open: false, policy: null });
            setCreateModal({ open: true, existingPolicy: pol });
          }}
        />
      )}

      {/* 3. Create / Upload Modal */}
      {createModal.open && (
        <PolicyCreateModal
          existingPolicy={createModal.existingPolicy}
          categories={categories}
          departments={departments}
          onClose={() => setCreateModal({ open: false, existingPolicy: null })}
          onSuccess={handleDocumentCreated}
        />
      )}

      {/* 4. Publish & Assign Modal */}
      {publishModal.open && publishModal.policy && (
        <PolicyPublishModal
          policy={publishModal.policy}
          departments={departments}
          onClose={() => setPublishModal({ open: false, policy: null })}
          onPublished={handleDocumentPublished}
        />
      )}
    </div>
  );
}
