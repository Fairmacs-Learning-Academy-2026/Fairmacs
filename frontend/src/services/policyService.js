/**
 * Fairmacs KMS — Policies & Agreements Service
 *
 * Integrates with Spring Boot Backend endpoints under /api/hr/policies and /api/policies.
 * Provides complete API access for HR/Admin policy lifecycle, audience assignments,
 * manager submissions, reporting, and secure document streaming.
 */

import {
  API_BASE_URL,
  getAuthToken,
  handleUnauthorized,
} from '../utils/apiConfig';

const HR_POLICY_BASE = `${API_BASE_URL}/hr/policies`;
const MANAGER_POLICY_BASE = `${API_BASE_URL}/manager/policies`;
const POLICY_BASE = `${API_BASE_URL}/policies`;

async function hrRequest(path, options = {}) {
  const token = getAuthToken();

  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${HR_POLICY_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized(true);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `HR Policy request failed with status ${response.status}`
    );
  }

  return data?.data !== undefined ? data.data : data;
}

async function managerRequest(path, options = {}) {
  const token = getAuthToken();

  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${MANAGER_POLICY_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized(true);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Manager Policy request failed with status ${response.status}`
    );
  }

  return data?.data !== undefined ? data.data : data;
}

async function employeeRequest(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${POLICY_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized(true);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Policy request failed with status ${response.status}`
    );
  }

  return data?.data !== undefined ? data.data : data;
}

export const policyService = {
  /**
   * Organization-wide overview dashboard statistics
   */
  async getOverview() {
    return hrRequest('/overview');
  },

  /**
   * List all policies with optional filters
   */
  async getPolicies(params = {}) {
    const query = new URLSearchParams();
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return hrRequest(`${qs}`);
  },

  /**
   * Get single policy document details
   */
  async getPolicy(id) {
    return hrRequest(`/${id}`);
  },

  /**
   * Create a new policy or agreement draft
   */
  async createPolicy(data) {
    return hrRequest('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing policy draft
   */
  async updatePolicy(id, data) {
    return hrRequest(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Upload a new PDF version to Zoho WorkDrive
   */
  async uploadVersion(policyId, formData) {
    return hrRequest(`/${policyId}/versions`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Publish policy version with audience assignment
   */
  async publishPolicy(policyId, data) {
    return hrRequest(`/${policyId}/publish`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Archive a policy document
   */
  async archivePolicy(policyId) {
    return hrRequest(`/${policyId}/archive`, {
      method: 'POST',
    });
  },

  /**
   * Get all versions of a policy document
   */
  async getVersions(policyId) {
    return hrRequest(`/${policyId}/versions`);
  },

  /**
   * Get assignments for a specific policy
   */
  async getPolicyAssignments(policyId) {
    return hrRequest(`/${policyId}/assignments`);
  },

  /**
   * Get compliance summary for a specific policy
   */
  async getPolicyCompliance(policyId) {
    return hrRequest(`/${policyId}/compliance`);
  },

  /**
   * Get all pending manager submissions
   */
  async getSubmissions() {
    return hrRequest('/submissions');
  },

  /**
   * Decide manager submission (APPROVE or REJECT)
   */
  async decideSubmission(policyId, { decision, comments }) {
    return hrRequest(`/submissions/${policyId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, comments }),
    });
  },

  /**
   * List all policy categories
   */
  async getCategories() {
    return hrRequest('/categories');
  },

  /**
   * Create a new category
   */
  async createCategory(categoryData) {
    return hrRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  /**
   * Get organization-wide policy assignments report
   */
  async getAllAssignments(params = {}) {
    const query = new URLSearchParams();
    if (params.policyId) query.append('policyId', params.policyId);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return hrRequest(`/assignments${qs}`);
  },

  /**
   * Export policy assignments report to Excel (.xlsx)
   */
  async exportAssignmentsExcel(params = {}) {
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (params.policyId) query.append('policyId', params.policyId);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${HR_POLICY_BASE}/assignments/export${qs}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to export report (${response.status})`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `policies_acknowledgements_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ==========================================
  // Stage 8: HR/Admin Compliance Reports
  // ==========================================

  /**
   * Organization-wide compliance overview KPI metrics
   */
  async getReportsOverview() {
    return hrRequest('/reports/overview');
  },

  /**
   * Department-wise compliance comparison reports
   */
  async getDepartmentReports(params = {}) {
    const query = new URLSearchParams();
    if (params.departmentId) query.append('departmentId', params.departmentId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return hrRequest(`/reports/departments${qs}`);
  },

  /**
   * Document-wise compliance performance reports
   */
  async getDocumentReports(params = {}) {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.mandatory !== undefined && params.mandatory !== null && params.mandatory !== '') {
      query.append('mandatory', params.mandatory);
    }
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return hrRequest(`/reports/documents${qs}`);
  },

  /**
   * Employee-wise compliance reports with search and filtering
   */
  async getEmployeeReports(params = {}) {
    const query = new URLSearchParams();
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.complianceStatus && params.complianceStatus !== 'ALL') query.append('complianceStatus', params.complianceStatus);
    if (params.userStatus && params.userStatus !== 'ALL') query.append('userStatus', params.userStatus);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return hrRequest(`/reports/employees${qs}`);
  },

  /**
   * Comprehensive acknowledgement history for an individual employee
   */
  async getEmployeeHistory(employeeId) {
    return hrRequest(`/reports/employees/${employeeId}/history`);
  },

  /**
   * Export organization-wide compliance report to styled Excel spreadsheet (.xlsx)
   */
  async exportComplianceExcel(params = {}) {
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.policyId) query.append('policyId', params.policyId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${HR_POLICY_BASE}/reports/export${qs}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.status === 401) {
      handleUnauthorized(true);
    }

    if (!response.ok) {
      throw new Error(`Failed to export compliance report (${response.status})`);
    }

    const blob = await response.blob();
    const filename = `policy_compliance_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return blob;
  },

  /**
   * Export single policy compliance workbook (.xlsx) with 6 comprehensive worksheets for HR/Admin
   */
  async exportPolicyComplianceExcel(policyId) {
    if (!policyId) throw new Error('Policy ID is required for export');
    const token = getAuthToken();
    const response = await fetch(`${HR_POLICY_BASE}/reports/documents/${policyId}/export`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.status === 401) {
      handleUnauthorized(true);
    }

    if (!response.ok) {
      let errorMsg = `Failed to export policy compliance report (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.message) errorMsg = errorJson.message;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
    let filename = `Policy_${policyId}_Compliance_Report.xlsx`;
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          filename = decodeURIComponent(utf8Match[1].trim());
        } catch (_) {}
      } else {
        const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match && match[1]) {
          filename = match[1].trim();
        }
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { blob, filename };
  },

  /**
   * Fetch authenticated PDF blob for in-app viewing
   */
  async fetchPdfBlob(versionId) {
    const token = getAuthToken();
    const response = await fetch(`${POLICY_BASE}/versions/${versionId}/view`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.status === 401) {
      handleUnauthorized(true);
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied: You do not have permission to view this document.');
      }
      if (response.status === 404) {
        throw new Error('Document version not found or no longer available.');
      }
      throw new Error(`Failed to load document (${response.status})`);
    }

    return await response.blob();
  },

  /**
   * Download document PDF (respects allowDownload and HR Admin administrative override)
   */
  async downloadPdf(versionId, filename = 'document.pdf') {
    const token = getAuthToken();
    const response = await fetch(`${POLICY_BASE}/versions/${versionId}/download`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.status === 401) {
      handleUnauthorized(true);
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Document download is restricted by organization policy. In-app viewing only.');
      }
      throw new Error(`Failed to download document (${response.status})`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ==========================================
  // Manager Operations
  // ==========================================

  /**
   * Manager department overview metrics
   */
  async getManagerOverview() {
    return managerRequest('/overview');
  },

  /**
   * List departments managed by the logged-in manager
   */
  async getManagerDepartments() {
    return managerRequest('/departments');
  },

  /**
   * List published policies applicable to manager's department hierarchy
   */
  async getManagerPolicies() {
    return managerRequest('');
  },

  /**
   * Submit department policy or SOP for HR approval (multipart form-data)
   */
  async submitManagerPolicy(formData) {
    return managerRequest('/submissions', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * List manager's department submissions with HR review comments
   */
  async getManagerSubmissions() {
    return managerRequest('/submissions');
  },

  /**
   * Get department policy assignments for reports & pending acknowledgements
   */
  async getManagerReports(params = {}) {
    const query = new URLSearchParams();
    if (params.policyId) query.append('policyId', params.policyId);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return managerRequest(`/reports${qs}`);
  },

  /**
   * Export department assignments to styled Excel spreadsheet
   */
  async exportManagerReportsExcel(params = {}) {
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (params.policyId) query.append('policyId', params.policyId);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${MANAGER_POLICY_BASE}/reports/export${qs}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to export department report (${response.status})`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `department_policies_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ==========================================
  // Stage 8: Manager Compliance Reports
  // ==========================================

  /**
   * Manager department compliance reports (strictly scoped to hierarchy)
   */
  async getManagerDepartmentReports(params = {}) {
    const query = new URLSearchParams();
    if (params.departmentId) query.append('departmentId', params.departmentId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return managerRequest(`/reports/departments${qs}`);
  },

  /**
   * Manager document compliance performance reports
   */
  async getManagerDocumentReports(params = {}) {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.mandatory !== undefined && params.mandatory !== null && params.mandatory !== '') {
      query.append('mandatory', params.mandatory);
    }
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return managerRequest(`/reports/documents${qs}`);
  },

  /**
   * Manager employee compliance reports with search and status filtering
   */
  async getManagerEmployeeReports(params = {}) {
    const query = new URLSearchParams();
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.complianceStatus && params.complianceStatus !== 'ALL') query.append('complianceStatus', params.complianceStatus);
    if (params.userStatus && params.userStatus !== 'ALL') query.append('userStatus', params.userStatus);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return managerRequest(`/reports/employees${qs}`);
  },

  /**
   * Scoped employee acknowledgement history for manager's department
   */
  async getManagerEmployeeHistory(employeeId) {
    return managerRequest(`/reports/employees/${employeeId}/history`);
  },

  /**
   * Export department compliance report to styled Excel spreadsheet (.xlsx)
   */
  async exportManagerComplianceExcel(params = {}) {
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.policyId) query.append('policyId', params.policyId);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${MANAGER_POLICY_BASE}/reports/export${qs}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.status === 401) {
      handleUnauthorized(true);
    }

    if (!response.ok) {
      throw new Error(`Failed to export department compliance report (${response.status})`);
    }

    const blob = await response.blob();
    const filename = `department_compliance_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return blob;
  },

  /**
   * Export policy compliance report workbook (.xlsx) scoped to Manager's authorized department hierarchy
   */
  async exportManagerPolicyComplianceExcel(policyId) {
    if (!policyId) throw new Error('Policy ID is required for export');
    const token = getAuthToken();
    const response = await fetch(`${MANAGER_POLICY_BASE}/reports/documents/${policyId}/export`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.status === 401) {
      handleUnauthorized(true);
    }

    if (!response.ok) {
      let errorMsg = `Failed to export manager policy compliance report (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.message) errorMsg = errorJson.message;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
    let filename = `Department_Policy_${policyId}_Compliance_Report.xlsx`;
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          filename = decodeURIComponent(utf8Match[1].trim());
        } catch (_) {}
      } else {
        const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match && match[1]) {
          filename = match[1].trim();
        }
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { blob, filename };
  },

  /**
   * Send in-app reminder notification to employee for pending policy
   */
  async sendManagerReminder(assignmentId) {
    return managerRequest(`/assignments/${assignmentId}/remind`, {
      method: 'POST',
    });
  },

  // ==========================================
  // Employee Profile Operations (Stage 5)
  // ==========================================

  /**
   * Get assigned policies & agreements for the authenticated user
   */
  async getMyAssignments(status = 'ALL') {
    const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return employeeRequest(`/my-assignments${qs}`);
  },

  /**
   * Get immutable acknowledgement history for the authenticated user
   */
  async getMyAcknowledgements() {
    return employeeRequest('/my-acknowledgements');
  },

  /**
   * Get active policy categories for employee filtering
   */
  async getEmployeeCategories() {
    return employeeRequest('/categories');
  },

  /**
   * Submit explicit employee acknowledgement for an assigned policy (Stage 6)
   */
  async acknowledgePolicy(assignmentId, payload = {}) {
    return employeeRequest(`/assignments/${assignmentId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({
        confirmed: true,
        ...payload,
      }),
    });
  },
};

export default policyService;
