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
      "Content-Type": "application/json",
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

export const hrAdminService = {
  async getEmployees() {
    return request("/employees");
  },

  async createEmployee(employee) {
    return request("/employees", {
      method: "POST",
      body: JSON.stringify(employee),
    });
  },

  async toggleEmployeeStatus(employeeId) {
    return request(`/employees/${encodeURIComponent(employeeId)}/status`, {
      method: "PATCH",
    });
  },

  async resetEmployeePassword(employeeId, newPassword = "Reset@123") {
    return request(
      `/employees/${encodeURIComponent(employeeId)}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({
          newPassword,
        }),
      }
    );
  },
};

export default hrAdminService;