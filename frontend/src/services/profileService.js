import { API_BASE_URL, getAuthHeaders, getAuthToken, handleUnauthorized } from '../utils/apiConfig';

/**
 * Handle API response helper
 */
async function handleResponse(response) {
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch {
      // not JSON
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) return null;
  const json = await response.json();
  return json && json.data !== undefined ? json.data : json;
}

/**
 * Profile Service — Complete API client for Employee Profile Centre
 */
export const profileService = {
  /**
   * Fetch current authenticated user's complete profile
   */
  async getMyProfile() {
    const res = await fetch(`${API_BASE_URL}/profile/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Fetch specific employee's profile by ID or Employee ID (HR or Department Manager)
   */
  async getProfile(identifier) {
    const res = await fetch(`${API_BASE_URL}/profile/${identifier}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Update personal information (basic & address)
   */
  async updatePersonalInfo(personalInfo, targetUserId = null) {
    const query = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : '';
    const res = await fetch(`${API_BASE_URL}/profile/personal-info${query}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(personalInfo),
    });
    return handleResponse(res);
  },

  /**
   * Add or update emergency contact
   */
  async saveEmergencyContact(contact, targetUserId = null) {
    const query = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : '';
    const res = await fetch(`${API_BASE_URL}/profile/emergency-contacts${query}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(contact),
    });
    return handleResponse(res);
  },

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(contactId) {
    const res = await fetch(`${API_BASE_URL}/profile/emergency-contacts/${contactId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Update user preferences (notifications, theme, language)
   */
  async updatePreferences(preferences, targetUserId = null) {
    const query = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : '';
    const res = await fetch(`${API_BASE_URL}/profile/preferences${query}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(preferences),
    });
    return handleResponse(res);
  },

  /**
   * Submit an employment status change request (e.g. Leave, Sabbatical, Resignation)
   */
  async submitStatusRequest({ requestedStatus, reason, effectiveStartDate, effectiveEndDate, documentUrl, startDate, endDate }) {
    const sDate = startDate || effectiveStartDate;
    const eDate = endDate || effectiveEndDate;
    const res = await fetch(`${API_BASE_URL}/profile/status-requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        requestedStatus,
        reason,
        startDate: sDate,
        effectiveStartDate: sDate,
        endDate: eDate,
        effectiveEndDate: eDate,
        supportingDocumentFileId: documentUrl,
      }),
    });
    return handleResponse(res);
  },

  /**
   * Get pending status requests awaiting manager review or HR approval
   */
  async getPendingStatusRequests() {
    const res = await fetch(`${API_BASE_URL}/profile/status-requests/pending`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Manager review and recommend/oppose status change request
   */
  async reviewStatusRequest(requestId, recommendation, comment) {
    const res = await fetch(`${API_BASE_URL}/profile/status-requests/${requestId}/manager-review`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ recommendation, comment }),
    });
    return handleResponse(res);
  },

  /**
   * HR Admin final approve or reject status change request
   */
  async decideStatusRequest(requestId, approved, comment) {
    const res = await fetch(`${API_BASE_URL}/profile/status-requests/${requestId}/hr-decision`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ approve: approved, approved, comment }),
    });
    return handleResponse(res);
  },

  /**
   * HR Admin direct status change (immediate administrative override)
   */
  async directChangeStatus(identifier, newStatus, reason, comment) {
    const res = await fetch(`${API_BASE_URL}/profile/status/direct-change`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        employeeId: identifier,
        targetUserId: typeof identifier === 'number' ? identifier : null,
        status: newStatus,
        newStatus,
        reason,
        comment,
      }),
    });
    return handleResponse(res);
  },

  /**
   * Get employee documents (Zoho WorkDrive managed)
   */
  async getDocuments(targetUserId = null) {
    const query = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : '';
    const res = await fetch(`${API_BASE_URL}/profile/documents${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Upload document to Zoho WorkDrive category folder
   */
  async uploadDocument(file, category, targetUserId = null, isCompanyPolicy = false) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (targetUserId) formData.append('userId', targetUserId);
    if (isCompanyPolicy) formData.append('isCompanyPolicy', 'true');

    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/profile/documents/upload`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return handleResponse(res);
  },

  /**
   * Replace existing document in Zoho WorkDrive
   */
  async replaceDocument(documentId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/profile/documents/${documentId}/replace`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return handleResponse(res);
  },

  /**
   * Secure streaming download of document from Zoho WorkDrive
   */
  async downloadDocument(documentId, fileName = 'document.pdf') {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/profile/documents/${documentId}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      throw new Error(`Failed to download document (${res.status})`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  },

  /**
   * Delete document
   */
  async deleteDocument(documentId) {
    const res = await fetch(`${API_BASE_URL}/profile/documents/${documentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

export default profileService;
