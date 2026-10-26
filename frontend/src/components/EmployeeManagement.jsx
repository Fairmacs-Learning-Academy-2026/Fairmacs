import React, { useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  X,
  Filter,
  MapPin,
  CalendarDays,
  Upload,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import hrAdminService from "../services/hrAdminService";

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "TRAINER", label: "Trainer" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR_ADMIN", label: "HR / Admin" },
];

const DEPARTMENT_OPTIONS = [
  "Human Resource",
  "Accounts",
  "Admin",
  "Operations",
  "Documentation",
  "Customer Service",
  "Pricing",
  "IT & Technology",
  "Sales",
  "General / Common",
];

const LEVEL_OPTIONS = [
  { value: "L0", label: "L0 — Trainee" },
  { value: "L1", label: "L1 — Assistant" },
  { value: "L2", label: "L2 — Executive / Senior Executive" },
  { value: "L3", label: "L3 — Assistant Manager / Manager / Senior Manager" },
  { value: "L4", label: "L4 — Vice President" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TERMINATED", label: "Terminated" },
];

const DEFAULT_FORM = {
  id: "",
  name: "",
  email: "",
  role: "EMPLOYEE",
  department: "Operations",
  designation: "",
  level: "L2",
  branch: "Corporate HQ",
  joiningDate: new Date().toISOString().slice(0, 10),
  status: "ACTIVE",
};

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 18, color: "#172033" },
  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 22,
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 16,
  },
  eyebrow: {
    display: "flex", alignItems: "center", gap: 8, color: "#2563eb",
    fontSize: 11, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase",
  },
  title: { margin: "7px 0 0", fontSize: 25, fontWeight: 800, color: "#0f172a" },
  subtitle: { margin: "7px 0 0", color: "#64748b", fontSize: 13 },
  button: {
    border: "1px solid #dbe3ef", background: "#fff", color: "#334155",
    borderRadius: 9, padding: "10px 13px", display: "inline-flex",
    alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer",
    fontSize: 12, fontWeight: 750, whiteSpace: "nowrap",
  },
  primary: {
    border: "1px solid #2563eb", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    color: "#fff", borderRadius: 9, padding: "10px 14px", display: "inline-flex",
    alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer",
    fontSize: 12, fontWeight: 800, whiteSpace: "nowrap",
  },
  input: {
    width: "100%", boxSizing: "border-box", border: "1px solid #dbe3ef",
    borderRadius: 9, padding: "10px 11px", color: "#0f172a",
    background: "#fff", outlineColor: "#60a5fa", fontSize: 13,
  },
  label: { display: "block", color: "#475569", fontSize: 12, fontWeight: 750, marginBottom: 6 },
  field: { minWidth: 0 },
  modalOverlay: {
    position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.55)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    width: "min(760px, 100%)", maxHeight: "92vh", overflowY: "auto",
    background: "#fff", borderRadius: 18, padding: 24,
    boxShadow: "0 24px 70px rgba(15,23,42,.25)",
  },
  tableWrap: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 1040, textAlign: "left" },
  th: {
    padding: "12px 14px", background: "#f8fafc", color: "#64748b",
    fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".6px",
    borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
  },
  td: { padding: "13px 14px", borderBottom: "1px solid #edf2f7", fontSize: 12, verticalAlign: "middle" },
};

function normaliseStatus(user) {
  const raw = String(user?.statusCode || user?.status || "ACTIVE").toUpperCase().replaceAll(" ", "_");
  if (raw === "ON_LEAVE") return "ON_LEAVE";
  if (raw === "TERMINATED") return "TERMINATED";
  if (raw === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}

function getEmployeeId(employee) {
  return employee?.employeeId || employee?.id || employee?.userId || "";
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status || "Active";
}

function statusStyle(status) {
  const map = {
    ACTIVE: { background: "#dcfce7", color: "#166534" },
    INACTIVE: { background: "#f1f5f9", color: "#475569" },
    ON_LEAVE: { background: "#fef3c7", color: "#92400e" },
    TERMINATED: { background: "#fee2e2", color: "#991b1b" },
  };
  return {
    display: "inline-block", borderRadius: 999, padding: "5px 9px",
    fontSize: 10, fontWeight: 800, ...(map[status] || map.INACTIVE),
  };
}

export default function EmployeeManagement() {
  const {
    usersList = [],
    createEmployee,
    importEmployees,
    changeEmployeeStatus,
    resetUserPassword,
    loadEmployees,
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [busyEmployee, setBusyEmployee] = useState("");
  const [excelInputKey, setExcelInputKey] = useState(0);

  const isTrainer = formData.role === "TRAINER";

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return (usersList || []).filter((user) => {
      const role = String(user.role || "EMPLOYEE").toUpperCase();
      const department = user.department || "Operations";
      const status = normaliseStatus(user);
      const matchesRole = roleFilter === "ALL" || role === roleFilter;
      const matchesDept = deptFilter === "ALL" || department === deptFilter;
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesSearch = !search || [
        user.name, getEmployeeId(user), user.email, department, user.designation,
        user.branch, user.level, role,
      ].some((value) => String(value || "").toLowerCase().includes(search));
      return matchesRole && matchesDept && matchesStatus && matchesSearch;
    });
  }, [usersList, searchTerm, roleFilter, deptFilter, statusFilter]);

  const counts = useMemo(() => {
    const list = usersList || [];
    return {
      total: list.length,
      active: list.filter((u) => normaliseStatus(u) === "ACTIVE").length,
      trainers: list.filter((u) => String(u.role).toUpperCase() === "TRAINER").length,
      inactive: list.filter((u) => normaliseStatus(u) !== "ACTIVE").length,
    };
  }, [usersList]);

  const DESIGNATION_OPTIONS_BY_LEVEL = {
    L0: ["Trainee"],
    L1: ["Assistant"],
    L2: ["Executive", "Senior Executive"],
    L3: ["Assistant Manager", "Manager", "Senior Manager"],
    L4: ["Vice President"],
  };

  const setField = (field, value) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "role") {
        if (value === "TRAINER") {
          next.level = "";
        } else if (!next.level) {
          next.level = "L2";
        }
      }

      if (field === "level") {
        const allowedDesignations = DESIGNATION_OPTIONS_BY_LEVEL[value] || [];
        if (!allowedDesignations.includes(next.designation)) {
          next.designation = allowedDesignations[0] || "";
        }
      }

      if (field === "role" && value === "TRAINER") {
        next.designation = current.designation || "";
      }

      return next;
    });
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({ ...DEFAULT_FORM });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      ...DEFAULT_FORM,
      id: getEmployeeId(employee),
      name: employee.name || "",
      email: employee.email || "",
      role: String(employee.role || "EMPLOYEE").toUpperCase(),
      department: DEPARTMENT_OPTIONS.includes(employee.department) ? employee.department : "Operations",
      designation: employee.designation || "",
      level: String(employee.role || "").toUpperCase() === "TRAINER" ? "" : (employee.level || "L2"),
      branch: employee.branch || "Corporate HQ",
      joiningDate: employee.joiningDate ? String(employee.joiningDate).slice(0, 10) : "",
      status: normaliseStatus(employee),
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
    setEditingEmployee(null);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setNotice(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.designation.trim()) {
      setFormError("Please complete the employee name, email and designation.");
      return;
    }
    if (!editingEmployee && !formData.id.trim()) {
      setFormError("Please enter an Employee ID.");
      return;
    }
    if (!isTrainer && !formData.level) {
      setFormError("Select a level for this role. Trainers do not have a level.");
      return;
    }

    const designationOptions = DESIGNATION_OPTIONS_BY_LEVEL[formData.level] || [];
    if (!isTrainer && !designationOptions.includes(formData.designation)) {
      setFormError("Select a designation that matches the employee level.");
      return;
    }

    const payload = {
      employeeId: formData.id.trim(),
      id: formData.id.trim(),
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      department: formData.department,
      designation: formData.designation.trim(),
      level: isTrainer ? null : formData.level,
      branch: formData.branch.trim() || "Corporate HQ",
      joiningDate: formData.joiningDate || null,
      status: formData.status,
    };
    if (!editingEmployee) payload.password = "Employee@123";

    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        await hrAdminService.updateEmployee(getEmployeeId(editingEmployee), payload);
        if (typeof loadEmployees === "function") await loadEmployees();
        setNotice({ type: "success", message: "Employee details updated successfully." });
      } else {
        await createEmployee(payload);
        setNotice({ type: "success", message: "Employee account created successfully." });
      }
      setShowModal(false);
      setEditingEmployee(null);
    } catch (error) {
      setFormError(error?.message || `Unable to ${editingEmployee ? "update" : "create"} employee.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setNotice(null);
    setIsImporting(true);
    try {
      const result = await importEmployees(file);

      // AuthContext may return { success: false } instead of throwing.
      // Treat that response as a failure so the UI never shows false success.
      if (result?.success === false) {
        throw new Error(
          result.message ||
          result.error ||
          "Excel import failed. Check the required columns and try again."
        );
      }

      if (typeof loadEmployees === "function") {
        const refreshResult = await loadEmployees();

        if (refreshResult?.success === false && !refreshResult?.skipped) {
          throw new Error(
            refreshResult.message ||
            "Import response was received, but the employee list could not be refreshed."
          );
        }
      }

      setNotice({
        type: "success",
        message: result?.message || "Employee Excel import completed successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error?.message || "Excel import failed.",
      });
    } finally {
      setIsImporting(false);
      setExcelInputKey((key) => key + 1);
    }
  };

  const handleStatusChange = async (employee, status) => {
    const id = getEmployeeId(employee);
    setBusyEmployee(id);
    setNotice(null);
    try {
      await changeEmployeeStatus(id, status);
      if (typeof loadEmployees === "function") await loadEmployees();
      setNotice({ type: "success", message: `${employee.name || "Employee"} status changed to ${statusLabel(status)}.` });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Unable to change employee status." });
    } finally {
      setBusyEmployee("");
    }
  };

  const handleResetPassword = async (employee) => {
    const id = getEmployeeId(employee);
    if (!window.confirm(`Reset the password for ${employee.name || id}?`)) return;
    setBusyEmployee(id);
    setNotice(null);
    try {
      await resetUserPassword(id, "Reset@123");
      setNotice({ type: "success", message: `Password reset completed for ${employee.name || id}. Use your approved password-sharing process to communicate the temporary password.` });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Unable to reset password." });
    } finally {
      setBusyEmployee("");
    }
  };

  const handleDelete = async (employee) => {
    const id = getEmployeeId(employee);
    const confirmed = window.confirm(
      `Deactivate ${employee.name || id} (${id})? This should preserve the employee's training and certificate history.`
    );
    if (!confirmed) return;

    setBusyEmployee(id);
    setNotice(null);
    try {
      await hrAdminService.deleteEmployee(id);
      if (typeof loadEmployees === "function") await loadEmployees();
      setNotice({ type: "success", message: `${employee.name || id} was deactivated.` });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Unable to deactivate employee. Confirm the backend DELETE endpoint is implemented." });
    } finally {
      setBusyEmployee("");
    }
  };

  const renderField = (label, field, options = {}) => (
    <div style={styles.field} key={field}>
      <label style={styles.label} htmlFor={`employee-${field}`}>{label}{options.required ? " *" : ""}</label>
      {options.options ? (
        <select
          id={`employee-${field}`}
          value={formData[field] ?? ""}
          onChange={(event) => setField(field, event.target.value)}
          required={options.required}
          disabled={options.disabled}
          style={styles.input}
        >
          {options.options.map((item) => (
            <option key={item.value ?? item} value={item.value ?? item}>
              {item.label ?? item}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`employee-${field}`}
          type={options.type || "text"}
          value={formData[field] ?? ""}
          onChange={(event) => setField(field, event.target.value)}
          required={options.required}
          disabled={options.disabled}
          placeholder={options.placeholder || ""}
          autoComplete={options.autoComplete}
          style={styles.input}
        />
      )}
    </div>
  );

  return (
    <div className="animate-fade-in" style={styles.page}>
      <section style={{ ...styles.panel, background: "linear-gradient(120deg,#ffffff 0%,#f4f8ff 100%)" }}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}><ShieldCheck size={15} /> HR Governance & User Directory</div>
            <h1 style={styles.title}>Employee Accounts</h1>
            <p style={styles.subtitle}>Onboard employees, manage access, and maintain employee profiles.</p>
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <input
              key={excelInputKey}
              id="employee-excel-import"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleImport}
              disabled={isImporting}
              style={{ display: "none" }}
            />
            <label htmlFor="employee-excel-import" style={{ ...styles.button, opacity: isImporting ? 0.6 : 1 }}>
              <Upload size={15} /> {isImporting ? "Importing..." : "Import Excel"}
            </label>
            <button type="button" onClick={openAddModal} style={styles.primary}>
              <UserPlus size={16} /> Onboard Employee
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div role="status" style={{
          display: "flex", alignItems: "flex-start", gap: 9, padding: "12px 14px",
          borderRadius: 10, border: `1px solid ${notice.type === "error" ? "#fecaca" : "#bbf7d0"}`,
          color: notice.type === "error" ? "#991b1b" : "#166534",
          background: notice.type === "error" ? "#fef2f2" : "#f0fdf4", fontSize: 12,
        }}>
          {notice.type === "error" ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span style={{ flex: 1 }}>{notice.message}</span>
          <button type="button" aria-label="Dismiss notice" onClick={() => setNotice(null)} style={{ ...styles.button, padding: 4, border: 0, background: "transparent" }}><X size={14} /></button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 13 }}>
        {[
          { label: "Total Accounts", value: counts.total, icon: <Users size={18} />, tint: "#eff6ff", color: "#1d4ed8" },
          { label: "Active Accounts", value: counts.active, icon: <CheckCircle size={18} />, tint: "#f0fdf4", color: "#15803d" },
          { label: "Trainers", value: counts.trainers, icon: <ShieldCheck size={18} />, tint: "#f5f3ff", color: "#6d28d9" },
          { label: "Inactive / Other", value: counts.inactive, icon: <AlertCircle size={18} />, tint: "#fff7ed", color: "#c2410c" },
        ].map((item) => (
          <div key={item.label} style={{ ...styles.panel, padding: 17, display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: item.tint, color: item.color }}>
              {item.icon}
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{item.label}</div>
              <div style={{ color: "#0f172a", fontSize: 23, fontWeight: 850, marginTop: 2 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <section style={styles.panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 15, color: "#334155", fontSize: 13, fontWeight: 800 }}>
          <Filter size={16} /> Search and filter employees
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", top: 11, left: 11, color: "#94a3b8" }} />
            <input
              aria-label="Search employees"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, ID, email..."
              style={{ ...styles.input, paddingLeft: 35 }}
            />
          </div>
          <select aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={styles.input}>
            <option value="ALL">All Roles ({ROLE_OPTIONS.length})</option>
            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <select aria-label="Filter by department" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={styles.input}>
            <option value="ALL">All Departments</option>
            {DEPARTMENT_OPTIONS.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.input}>
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <button type="button" style={styles.button} onClick={() => { setSearchTerm(""); setRoleFilter("ALL"); setDeptFilter("ALL"); setStatusFilter("ALL"); }}>
            <RefreshCw size={14} /> Clear Filters
          </button>
        </div>
      </section>

      <section style={{ ...styles.panel, padding: 0, overflow: "hidden" }}>
        <div style={{ ...styles.header, padding: "18px 22px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 850, color: "#0f172a" }}>Employee Directory</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
              Showing {filteredUsers.length} of {(usersList || []).length} accounts
            </div>
          </div>
          <button type="button" style={styles.button} onClick={() => typeof loadEmployees === "function" && loadEmployees()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Employee", "Employee ID", "Role / Level", "Department", "Designation", "Branch", "Status", "Actions"].map((heading) => (
                  <th key={heading} style={styles.th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((employee) => {
                const id = getEmployeeId(employee);
                const role = String(employee.role || "EMPLOYEE").toUpperCase();
                const status = normaliseStatus(employee);
                const busy = busyEmployee === id;
                return (
                  <tr key={id || employee.email}>
                    <td style={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                        <div style={{ width: 37, height: 37, flexShrink: 0, borderRadius: 12, background: "#eff6ff", color: "#1d4ed8", display: "grid", placeItems: "center", fontWeight: 850 }}>
                          {(employee.name || "?").trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 12 }}>{employee.name || "Unnamed employee"}</div>
                          <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{employee.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 800, color: "#334155" }}>{id || "—"}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 750 }}>{ROLE_OPTIONS.find((r) => r.value === role)?.label || role}</div>
                      <div style={{ marginTop: 4, color: "#64748b", fontSize: 10 }}>{role === "TRAINER" ? "No level" : (employee.level || "Level not set")}</div>
                    </td>
                    <td style={styles.td}>{employee.department || "Operations"}</td>
                    <td style={styles.td}>{employee.designation || "—"}</td>
                    <td style={styles.td}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={12} color="#94a3b8" />{employee.branch || "Corporate HQ"}</span></td>
                    <td style={styles.td}>
                      <div style={statusStyle(status)}>{statusLabel(status)}</div>
                      <select
                        aria-label={`Change status for ${employee.name || id}`}
                        value={status}
                        disabled={busy}
                        onChange={(event) => handleStatusChange(employee, event.target.value)}
                        style={{ ...styles.input, marginTop: 7, padding: "6px 7px", minWidth: 112, fontSize: 10 }}
                      >
                        {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button type="button" title="Edit employee" aria-label={`Edit ${employee.name || id}`} onClick={() => openEditModal(employee)} style={{ ...styles.button, padding: "7px 8px", color: "#1d4ed8" }}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" title="Reset password" aria-label={`Reset password for ${employee.name || id}`} disabled={busy} onClick={() => handleResetPassword(employee)} style={{ ...styles.button, padding: "7px 8px", color: "#7c3aed", opacity: busy ? .5 : 1 }}>
                          <KeyRound size={14} />
                        </button>
                        <button type="button" title="Deactivate employee" aria-label={`Deactivate ${employee.name || id}`} disabled={busy} onClick={() => handleDelete(employee)} style={{ ...styles.button, padding: "7px 8px", color: "#dc2626", opacity: busy ? .5 : 1 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...styles.td, padding: "48px 16px", textAlign: "center" }}>
                    <Users size={28} color="#94a3b8" style={{ margin: "0 auto 10px" }} />
                    <div style={{ color: "#334155", fontWeight: 800 }}>No employees found</div>
                    <div style={{ color: "#64748b", marginTop: 5 }}>Try another search term or change the filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="employee-modal-title" style={styles.modal}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingBottom: 17, marginBottom: 18, borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <div style={styles.eyebrow}><UserPlus size={14} /> {editingEmployee ? "Employee Profile" : "New Employee"}</div>
                <h2 id="employee-modal-title" style={{ margin: "7px 0 0", color: "#0f172a", fontSize: 21, fontWeight: 850 }}>
                  {editingEmployee ? "Edit Employee" : "Onboard Employee"}
                </h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>
                  {editingEmployee ? "Update the employee's organization profile." : "Create an employee account and organization profile."}
                </p>
              </div>
              <button type="button" aria-label="Close modal" onClick={closeModal} style={{ ...styles.button, padding: 7 }}><X size={17} /></button>
            </div>

            {formError && (
              <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: 11, borderRadius: 9, fontSize: 12, marginBottom: 15 }}>
                <AlertCircle size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />{formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: "18px 16px", padding: "2px 1px 0",
              }}>
                {renderField("Employee ID", "id", { required: !editingEmployee, disabled: Boolean(editingEmployee), placeholder: "e.g. FM-1001" })}
                {renderField("Full Name", "name", { required: true, placeholder: "Employee full name", autoComplete: "name" })}
                {renderField("Official Email", "email", { required: true, type: "email", placeholder: "name@fairmacs.com", autoComplete: "email" })}
                {renderField("Role", "role", { required: true, options: ROLE_OPTIONS })}
                {renderField("Department", "department", { required: true, options: DEPARTMENT_OPTIONS })}
                {!isTrainer && renderField("Employee Level", "level", { required: true, options: LEVEL_OPTIONS })}
                {isTrainer
                  ? renderField("Designation", "designation", { required: true, placeholder: "e.g. Trainer" })
                  : renderField("Designation", "designation", {
                      required: true,
                      options: (DESIGNATION_OPTIONS_BY_LEVEL[formData.level] || []).map((designation) => ({
                        value: designation,
                        label: designation,
                      })),
                    })}
                {renderField("Branch / Location", "branch", { placeholder: "e.g. Chennai" })}
                {renderField("Joining Date", "joiningDate", { type: "date" })}
                {renderField("Account Status", "status", { required: true, options: STATUS_OPTIONS })}

              </div>

              {!editingEmployee && (
                <div style={{
                  marginTop: 20, padding: "13px 15px", display: "flex", alignItems: "flex-start", gap: 11,
                  borderRadius: 13, border: "1px solid #bfdbfe",
                  background: "linear-gradient(110deg, #eff6ff 0%, #f8fbff 100%)",
                }}>
                  <div style={{
                    width: 32, height: 32, flexShrink: 0, display: "grid", placeItems: "center",
                    borderRadius: 10, background: "#dbeafe", color: "#1d4ed8",
                  }}>
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <div style={{ color: "#1e40af", fontSize: 12, fontWeight: 850 }}>Initial password: Employee@123</div>
                    <div style={{ marginTop: 4, color: "#526783", fontSize: 11, lineHeight: 1.55 }}>
                      This password is assigned automatically when the account is created. The employee should change it after their first sign-in.
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                marginTop: 12, background: "rgba(248,250,252,.85)", border: "1px solid #e2e8f0",
                borderRadius: 13, padding: "13px 15px", display: "flex", gap: 10,
                color: "#526176", fontSize: 11, lineHeight: 1.65,
              }}>
                <CalendarDays size={16} style={{ flexShrink: 0, marginTop: 1, color: "#64748b" }} />
                <div>
                  <strong style={{ color: "#334155" }}>Level mapping:</strong> L0 Trainee, L1 Assistant, L2 Executive / Senior Executive, L3 Assistant Manager / Manager / Senior Manager, L4 Vice President. Trainers do not have a level.
                </div>
              </div>

              <div style={{
                display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24,
                paddingTop: 20, borderTop: "1px solid #e6edf5",
              }}>
                <button type="button" onClick={closeModal} disabled={isSubmitting} style={{ ...styles.button, padding: "11px 17px", borderRadius: 10, background: "#fff" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ ...styles.primary, padding: "11px 18px", borderRadius: 10, boxShadow: "0 5px 12px rgba(37,99,235,.18)", opacity: isSubmitting ? .7 : 1 }}>
                  {isSubmitting ? "Saving..." : editingEmployee ? <><CheckCircle size={15} /> Save Changes</> : <><UserPlus size={15} /> Create Employee</>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
