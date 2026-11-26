import {
  API_BASE_URL,
  getAuthToken,
  handleUnauthorized,
} from '../utils/apiConfig';

const API_BASE = `${API_BASE_URL}/hr`;

async function request(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
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
    const failure = new Error(
      data?.message ||
        data?.error ||
        `HR request failed with status ${response.status}`
    );
    failure.status = response.status;
    failure.data = data;
    throw failure;
  }

  return data;
}

function validateEmployeeId(employeeId) {
  if (!employeeId || !String(employeeId).trim()) {
    throw new Error("Employee ID is required.");
  }

  return encodeURIComponent(String(employeeId).trim());
}

export const hrAdminService = {
  async getSettings() {
    return request("/settings");
  },

  async updateSettings(values) {
    if (!values || Object.keys(values).length === 0) {
      throw new Error("No settings to save.");
    }

    return request("/settings", {
      method: "PUT",
      body: JSON.stringify({ values }),
    });
  },

  async getEmployees() {
    return request("/employees");
  },

  async createEmployee(employee) {
    if (!employee) {
      throw new Error("Employee details are required.");
    }

    return request("/employees", {
      method: "POST",
      body: JSON.stringify(employee),
    });
  },

  async updateEmployee(employeeId, employee) {
    const id = validateEmployeeId(employeeId);

    if (!employee) {
      throw new Error("Updated employee details are required.");
    }

    return request(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(employee),
    });
  },

  async deleteEmployee(employeeId) {
    const id = validateEmployeeId(employeeId);

    return request(`/employees/${id}`, {
      method: "DELETE",
    });
  },

  async changeEmployeeStatus(employeeId, status, reason = "HR administrative update") {
    const id = validateEmployeeId(employeeId);

    if (!status) {
      throw new Error("Employee status is required.");
    }

    return request(`/employees/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    });
  },

  async resetEmployeePassword(employeeId, newPassword) {
    const id = validateEmployeeId(employeeId);

    return request(`/employees/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify(newPassword ? { newPassword } : {}),
    });
  },

  async importEmployees(file) {
    if (!file) {
      throw new Error("Please select an Excel file.");
    }

    const formData = new FormData();
    formData.append("file", file);

    return request("/employees/import", {
      method: "POST",
      body: formData,
    });
  },

  async downloadImportTemplate() {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/employees/import-template`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to download Excel import template (${response.status}).`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fairmacs-employee-import-template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default hrAdminService;