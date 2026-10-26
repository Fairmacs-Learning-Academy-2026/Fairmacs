const API_BASE = "http://localhost:8080/api/hr";

function getToken() {
  return (
    localStorage.getItem("fairmacs_lms_token") ||
    localStorage.getItem("fairmacs_token") ||
    ""
  );
}

async function request(path, options = {}) {
  const token = getToken();

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
        `HR request failed with status ${response.status}`
    );
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
  // =========================================================
  // GET ALL EMPLOYEES
  // =========================================================
  async getEmployees() {
    return request("/employees");
  },

  // =========================================================
  // CREATE EMPLOYEE
  // =========================================================
  async createEmployee(employee) {
    if (!employee) {
      throw new Error("Employee details are required.");
    }

    return request("/employees", {
      method: "POST",
      body: JSON.stringify(employee),
    });
  },

  // =========================================================
  // UPDATE EMPLOYEE DETAILS
  // Requires backend: PUT /api/hr/employees/{employeeId}
  // =========================================================
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

  // =========================================================
  // DELETE / DEACTIVATE EMPLOYEE
  // Requires backend: DELETE /api/hr/employees/{employeeId}
  // Backend should preserve training history where required.
  // =========================================================
  async deleteEmployee(employeeId) {
    const id = validateEmployeeId(employeeId);

    return request(`/employees/${id}`, {
      method: "DELETE",
    });
  },

  // =========================================================
  // CHANGE EMPLOYEE LIFECYCLE STATUS
  // =========================================================
  async changeEmployeeStatus(employeeId, status) {
    const id = validateEmployeeId(employeeId);

    if (!status) {
      throw new Error("Employee status is required.");
    }

    return request(`/employees/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // =========================================================
  // RESET EMPLOYEE PASSWORD
  // =========================================================
  async resetEmployeePassword(
    employeeId,
    newPassword = "Reset@123"
  ) {
    const id = validateEmployeeId(employeeId);

    return request(`/employees/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  },

  // =========================================================
  // IMPORT EMPLOYEES FROM EXCEL
  // =========================================================
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
};

export default hrAdminService;