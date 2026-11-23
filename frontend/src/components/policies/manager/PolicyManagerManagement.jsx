import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  LayoutGrid,
  Library,
  PlusCircle,
  Inbox,
  BarChart3,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { policyService } from '../../../services/policyService';

// Subcomponents
import PolicyManagerOverviewTab from './PolicyManagerOverviewTab';
import PolicyManagerDocumentsTab from './PolicyManagerDocumentsTab';
import PolicyManagerSubmissionsTab from './PolicyManagerSubmissionsTab';
import PolicyManagerReportsTab from './PolicyManagerReportsTab';
import PolicyManagerPendingTab from './PolicyManagerPendingTab';
import PolicyManagerSubmitModal from './PolicyManagerSubmitModal';
import PolicyPdfViewerModal from '../PolicyPdfViewerModal';

export default function PolicyManagerManagement() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, documents, submissions, reports, pending

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
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [pdfModal, setPdfModal] = useState({
    open: false,
    versionId: null,
    title: '',
    versionNumber: '',
    allowDownload: true,
  });

  // Notice Helper
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
      const [ovData, polData, catData, deptData, subData] = await Promise.all([
        policyService.getManagerOverview().catch((e) => {
          console.error('Failed to load manager overview:', e);
          return null;
        }),
        policyService.getManagerPolicies().catch((e) => {
          console.error('Failed to load manager policies:', e);
          return [];
        }),
        policyService.getCategories().catch((e) => {
          console.error('Failed to load categories:', e);
          return [];
        }),
        policyService.getManagerDepartments().catch((e) => {
          console.error('Failed to load manager departments:', e);
          return [];
        }),
        policyService.getManagerSubmissions().catch((e) => {
          console.error('Failed to load manager submissions:', e);
          return [];
        }),
      ]);

      setOverview(ovData);
      setPolicies(Array.isArray(polData) ? polData : polData?.data || []);
      setCategories(Array.isArray(catData) ? catData : catData?.data || []);
      setDepartments(Array.isArray(deptData) ? deptData : deptData?.data || []);
      setSubmissions(Array.isArray(subData) ? subData : subData?.data || []);
    } catch (err) {
      console.error('Failed to load Manager Policies data:', err);
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

    if (docOrVersion.activeVersionId) {
      versionId = docOrVersion.activeVersionId;
      title = docOrVersion.title;
      versionNumber = docOrVersion.activeVersionNumber || '1.0';
      allowDownload = docOrVersion.allowDownload !== false;
    } else if (docOrVersion.latestVersion && docOrVersion.latestVersion.id) {
      versionId = docOrVersion.latestVersion.id;
      title = docOrVersion.title;
      versionNumber = docOrVersion.latestVersion.versionNumber || '1.0';
      allowDownload = docOrVersion.latestVersion.allowDownload !== false;
    } else if (docOrVersion.policyVersionId) {
      versionId = docOrVersion.policyVersionId;
      title = docOrVersion.title || docOrVersion.policyTitle;
      versionNumber = docOrVersion.versionNumber || '1.0';
      allowDownload = docOrVersion.allowDownload !== false;
    } else if (docOrVersion.id) {
      versionId = docOrVersion.id;
      title = docOrVersion.title || 'Policy Document';
      versionNumber = docOrVersion.versionNumber || '1.0';
      allowDownload = docOrVersion.allowDownload !== false;
    }

    if (!versionId) {
      showNotice('error', 'No active PDF version available for viewing.');
      return;
    }

    setPdfModal({
      open: true,
      versionId,
      title,
      versionNumber,
      allowDownload,
    });
  };

  const pendingSubmissionsCount = overview?.pendingSubmissionsCount || 0;
  const overdueCount = overview?.totalOverdue || 0;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Toast Notice Banner */}
      {notice && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md px-4 py-3 rounded-xl shadow-lg border flex items-center justify-between gap-3 text-xs font-medium animate-in slide-in-from-top-2 duration-200 ${
            notice.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-200 shadow-red-500/10'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 shadow-emerald-500/10'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 hover:text-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Policies &amp; Agreements
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Manager Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor team compliance, submit department SOPs for HR approval, and track employee acknowledgements.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={loadMasterData}
                disabled={loading}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Refresh master data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:shadow active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Policy / SOP</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-4 -mb-4 overflow-x-auto border-t border-slate-100 pt-1 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Department Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2.5 font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Library className="w-4 h-4" />
              <span>Department Documents</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px]">
                {policies.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2.5 font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'submissions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>My Submissions</span>
              {pendingSubmissionsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                  {pendingSubmissionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2.5 font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Acknowledgement Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pending &amp; Follow-up</span>
              {overdueCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                  {overdueCount} Overdue
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'overview' && (
          <PolicyManagerOverviewTab
            overview={overview}
            loading={loading}
            onRefresh={loadMasterData}
            onViewDocument={handleViewDocument}
            onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
            onGoToDocuments={() => setActiveTab('documents')}
            onGoToSubmissions={() => setActiveTab('submissions')}
            onGoToReports={() => setActiveTab('reports')}
            onGoToPending={() => setActiveTab('pending')}
          />
        )}

        {activeTab === 'documents' && (
          <PolicyManagerDocumentsTab
            policies={policies}
            categories={categories}
            loading={loading}
            onViewDocument={handleViewDocument}
            onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
          />
        )}

        {activeTab === 'submissions' && (
          <PolicyManagerSubmissionsTab
            submissions={submissions}
            loading={loading}
            onViewDocument={handleViewDocument}
            onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
          />
        )}

        {activeTab === 'reports' && (
          <PolicyManagerReportsTab
            policies={policies}
            departments={departments}
          />
        )}

        {activeTab === 'pending' && (
          <PolicyManagerPendingTab
            departments={departments}
            policies={policies}
            onShowNotice={showNotice}
          />
        )}
      </main>

      {/* Submit Policy / SOP Modal */}
      <PolicyManagerSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitted={() => {
          setIsSubmitModalOpen(false);
          showNotice('success', 'Department policy/SOP submitted successfully for HR review.');
          loadMasterData();
          setActiveTab('submissions');
        }}
        categories={categories}
        departments={departments}
      />

      {/* Authenticated In-App PDF Viewer Modal */}
      {pdfModal.open && (
        <PolicyPdfViewerModal
          versionId={pdfModal.versionId}
          title={pdfModal.title}
          versionNumber={pdfModal.versionNumber}
          allowDownload={pdfModal.allowDownload}
          onClose={() =>
            setPdfModal({
              open: false,
              versionId: null,
              title: '',
              versionNumber: '',
              allowDownload: true,
            })
          }
        />
      )}
    </div>
  );
}
