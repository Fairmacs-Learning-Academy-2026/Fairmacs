import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowUpDown,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle,
  Download,
  Eye,
  Heart,
  KeyRound,
  LayoutGrid,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  Upload,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import "../styles/employee-directory-glass.css";
import { useAuth } from "../context/AuthContext";
import hrAdminService from "../services/hrAdminService";
import { profileService } from "../services/profileService";

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "TRAINER", label: "Trainer" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR_ADMIN", label: "HR / Admin" },
];

const DEPARTMENT_OPTIONS = [
  "People Operations",
  "Accounts",
  "Admin",
  "Operations",
  "Documentation",
  "Customer Service",
  "Pricing",
  "Information Technology",
  "Sales",
  "General",
];

function formatPosition(pos) {
  if (!pos) return "";
  const s = String(pos).trim().toUpperCase();
  if (s.startsWith("L") && s.length === 2 && ["0", "1", "2", "3", "4"].includes(s[1])) {
    return "P" + s[1];
  }
  if (["P0", "P1", "P2", "P3", "P4"].includes(s)) {
    return s;
  }
  return s;
}

function getEmployeePositionCode(user) {
  const role = String(user?.role || "EMPLOYEE").toUpperCase();
  if (role === "TRAINER") return "";
  const code = formatPosition(user?.position || user?.positionBand || user?.level);
  return ["P0", "P1", "P2", "P3", "P4"].includes(code) ? code : "P2";
}

const POSITION_OPTIONS = [
  { value: "P0", label: "P0 — Trainee" },
  { value: "P1", label: "P1 — Assistant" },
  { value: "P2", label: "P2 — Executive / Senior Executive" },
  { value: "P3", label: "P3 — Asst. Manager / Manager / Sr. Manager" },
  { value: "P4", label: "P4 — Vice President" },
];

const POSITION_BUBBLE_META = [
  {
    code: "P0",
    shortTitle: "Trainee",
    bg: "rgba(244, 241, 236, 0.96)",
    activeBg: "#E2E8F0",
    text: "#1F2328",
    subText: "#4A5058",
    offsetX: -102,
    offsetY: 16,
  },
  {
    code: "P1",
    shortTitle: "Assistant",
    bg: "rgba(191, 227, 255, 0.88)",
    activeBg: "#93C5FD",
    text: "#0B5CAB",
    subText: "#1E40AF",
    offsetX: -48,
    offsetY: -22,
  },
  {
    code: "P2",
    shortTitle: "Executive",
    bg: "rgba(207, 243, 227, 0.92)",
    activeBg: "#86EFAC",
    text: "#0F5132",
    subText: "#166534",
    offsetX: 12,
    offsetY: 14,
  },
  {
    code: "P3",
    shortTitle: "Manager",
    bg: "rgba(228, 218, 255, 0.92)",
    activeBg: "#C4B5FD",
    text: "#3B0764",
    subText: "#4C1D95",
    offsetX: 66,
    offsetY: -20,
  },
  {
    code: "P4",
    shortTitle: "VP",
    bg: "rgba(255, 217, 199, 0.92)",
    activeBg: "#FDBA74",
    text: "#9A3412",
    subText: "#9A3412",
    offsetX: 112,
    offsetY: 20,
  },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TERMINATED", label: "Terminated" },
];

const SORT_OPTIONS = [
  { value: "NAME_ASC", label: "name A–Z" },
  { value: "JOINED_DESC", label: "newest joined" },
  { value: "DEPT_ASC", label: "department" },
  { value: "POS_ASC", label: "position band" },
];

const DEFAULT_FORM = {
  id: "",
  name: "",
  email: "",
  role: "EMPLOYEE",
  department: "Operations",
  designation: "Executive",
  level: "P2",
  position: "P2",
  branch: "Corporate HQ",
  joiningDate: new Date().toISOString().slice(0, 10),
  status: "ACTIVE",
  temporaryPassword: "",
};

const AVATAR_PALETTES = [
  { bg: "#BFE3FF", text: "#0B5CAB" },
  { bg: "#CFF3E3", text: "#0F5132" },
  { bg: "#FFD9C7", text: "#9A3412" },
  { bg: "#E4DAFF", text: "#4C1D95" },
  { bg: "#FDE68A", text: "#854D0E" },
];

const CLOUD_POSITIONS = [
  { top: "8%", left: "26%", size: 46 },
  { top: "6%", left: "58%", size: 42 },
  { top: "24%", left: "8%", size: 40 },
  { top: "28%", left: "40%", size: 52 },
  { top: "26%", left: "74%", size: 44 },
  { top: "56%", left: "20%", size: 44 },
  { top: "58%", left: "52%", size: 42 },
  { top: "10%", left: "84%", size: 36 },
];

function getAvatarPalette(seed = "") {
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getInitials(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function generateClientTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*_-+=";
  const all = upper + lower + digits + special;
  const randomBytes = new Uint32Array(14);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i += 1) {
      randomBytes[i] = Math.floor(Math.random() * 0xffffffff);
    }
  }
  const chars = [
    upper[randomBytes[0] % upper.length],
    lower[randomBytes[1] % lower.length],
    digits[randomBytes[2] % digits.length],
    special[randomBytes[3] % special.length],
  ];
  for (let i = 4; i < 14; i += 1) {
    chars.push(all[randomBytes[i] % all.length]);
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes[i] % (i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join("");
}

function normaliseStatus(user) {
  const raw = String(user?.statusCode || user?.status || "ACTIVE")
    .toUpperCase()
    .replaceAll(" ", "_");
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

function statusMeta(status) {
  const map = {
    ACTIVE: { dot: "#16A34A", bg: "rgba(207, 243, 227, 0.78)", text: "#0F5132" },
    ON_LEAVE: { dot: "#D97706", bg: "rgba(254, 243, 199, 0.88)", text: "#92400E" },
    INACTIVE: { dot: "#64748B", bg: "rgba(241, 245, 249, 0.92)", text: "#475569" },
    TERMINATED: { dot: "#DC2626", bg: "rgba(254, 226, 226, 0.88)", text: "#991B1B" },
  };
  return map[status] || map.INACTIVE;
}

function roleBadgeStyle(role) {
  switch (role) {
    case "HR_ADMIN":
      return { bg: "rgba(191, 227, 255, 0.82)", text: "#0B5CAB", border: "rgba(11, 92, 171, 0.2)" };
    case "MANAGER":
      return { bg: "rgba(228, 218, 255, 0.82)", text: "#4C1D95", border: "rgba(76, 29, 149, 0.16)" };
    case "TRAINER":
      return { bg: "rgba(255, 217, 199, 0.85)", text: "#9A3412", border: "rgba(154, 52, 18, 0.16)" };
    default:
      return { bg: "rgba(244, 241, 236, 0.95)", text: "#334155", border: "rgba(31, 35, 40, 0.10)" };
  }
}

function formatJoinedLabel(joiningDate) {
  if (!joiningDate || joiningDate === "Not provided") return "Corporate Roster";
  const parsed = new Date(joiningDate);
  if (Number.isNaN(parsed.getTime())) return String(joiningDate).slice(0, 10);
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const DESIGNATION_OPTIONS_BY_POSITION = {
  P0: ["Trainee"],
  P1: ["Assistant"],
  P2: ["Executive", "Senior Executive"],
  P3: ["Assistant Manager", "Manager", "Senior Manager"],
  P4: ["Vice President"],
  L0: ["Trainee"],
  L1: ["Assistant"],
  L2: ["Executive", "Senior Executive"],
  L3: ["Assistant Manager", "Manager", "Senior Manager"],
  L4: ["Vice President"],
};

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
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("TABLE"); // "TABLE" | "CARDS"
  const [sortBy, setSortBy] = useState("NAME_ASC");
  const [selectedIds, setSelectedIds] = useState([]);

  // Add / Edit Employee Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [busyEmployee, setBusyEmployee] = useState("");
  const [excelInputKey, setExcelInputKey] = useState(0);

  // View Full Employee Profile Modal state (Personal Details, Emergency Contacts, Address, etc.)
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [viewedProfileData, setViewedProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const isTrainer = formData.role === "TRAINER";

  // Lock background page scroll cleanly while either modal is open
  useEffect(() => {
    if (!showModal && !viewingEmployee) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showModal && !isSubmitting) {
          setShowModal(false);
          setEditingEmployee(null);
          setFormError("");
        } else if (viewingEmployee) {
          setViewingEmployee(null);
          setViewedProfileData(null);
          setProfileError("");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showModal, viewingEmployee, isSubmitting]);

  const openViewProfileModal = async (employee) => {
    setViewingEmployee(employee);
    setViewedProfileData(null);
    setProfileError("");
    setProfileLoading(true);
    const identifier = getEmployeeId(employee) || employee?.userId || employee?.id;
    try {
      const data = await profileService.getProfile(encodeURIComponent(String(identifier).trim()));
      setViewedProfileData(data || {});
    } catch (err) {
      setProfileError(err?.message || "Unable to fetch extended profile details.");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeViewProfileModal = () => {
    setViewingEmployee(null);
    setViewedProfileData(null);
    setProfileError("");
  };

  const switchViewMode = (mode) => {
    if (mode === viewMode) return;
    if (typeof document !== "undefined" && typeof document.startViewTransition === "function") {
      document.startViewTransition(() => setViewMode(mode));
    } else {
      setViewMode(mode);
    }
  };

  const cycleSort = () => {
    const idx = SORT_OPTIONS.findIndex((o) => o.value === sortBy);
    setSortBy(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].value);
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = (usersList || []).filter((user) => {
      const role = String(user.role || "EMPLOYEE").toUpperCase();
      const posCode = getEmployeePositionCode(user);
      const department = user.department || "Operations";
      const status = normaliseStatus(user);
      const matchesRole = roleFilter === "ALL" || role === roleFilter;
      const matchesPos = positionFilter === "ALL" || posCode === positionFilter;
      const matchesDept = deptFilter === "ALL" || department === deptFilter;
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesSearch =
        !search ||
        [
          user.name,
          getEmployeeId(user),
          user.email,
          department,
          user.designation,
          user.branch,
          posCode,
          role,
        ].some((value) => String(value || "").toLowerCase().includes(search));
      return matchesRole && matchesPos && matchesDept && matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "JOINED_DESC") {
        return String(b.joiningDate || "").localeCompare(String(a.joiningDate || ""));
      }
      if (sortBy === "DEPT_ASC") {
        return String(a.department || "Operations").localeCompare(
          String(b.department || "Operations")
        );
      }
      if (sortBy === "POS_ASC") {
        return String(getEmployeePositionCode(a) || "Z").localeCompare(
          String(getEmployeePositionCode(b) || "Z")
        );
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [usersList, searchTerm, roleFilter, positionFilter, deptFilter, statusFilter, sortBy]);

  // Rich real metrics computed 100% from existing usersList
  const overviewStats = useMemo(() => {
    const list = usersList || [];
    const total = list.length;
    const activeList = list.filter((u) => normaliseStatus(u) === "ACTIVE");
    const active = activeList.length;
    const onLeave = list.filter((u) => normaliseStatus(u) === "ON_LEAVE").length;
    const inactive = list.filter((u) => normaliseStatus(u) === "INACTIVE").length;
    const terminated = list.filter((u) => normaliseStatus(u) === "TERMINATED").length;

    // Position counts P0 - P4
    const positionCounts = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
    for (const u of list) {
      const code = getEmployeePositionCode(u);
      if (code && positionCounts[code] !== undefined) {
        positionCounts[code] += 1;
      }
    }
    const totalPositioned =
      positionCounts.P0 +
      positionCounts.P1 +
      positionCounts.P2 +
      positionCounts.P3 +
      positionCounts.P4;
    const maxPosCount = Math.max(1, ...Object.values(positionCounts));

    const positionBreakdown = POSITION_BUBBLE_META.map((meta) => {
      const count = positionCounts[meta.code] || 0;
      const pct = totalPositioned > 0 ? Math.round((count / totalPositioned) * 100) : 0;
      const size = Math.round(52 + (count / maxPosCount) * 26);
      return { ...meta, count, pct, size };
    });

    const deptSet = new Set(list.map((u) => u.department || "Operations"));
    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

    // Real department distribution curve for sparkline
    const deptCounts = DEPARTMENT_OPTIONS.slice(0, 6).map(
      (d) => list.filter((u) => (u.department || "Operations") === d).length
    );
    const maxDept = Math.max(1, ...deptCounts);
    const sparkPoints = deptCounts
      .map((val, idx) => {
        const x = (idx / (deptCounts.length - 1)) * 120;
        const y = 34 - (val / maxDept) * 26;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" L ");

    const currentYear = String(new Date().getFullYear());
    const joinedThisYear = list.filter((u) =>
      String(u.joiningDate || "").startsWith(currentYear)
    ).length;

    return {
      total,
      active,
      onLeave,
      inactive,
      terminated,
      nonActive: total - active,
      activePct,
      deptCount: deptSet.size || 1,
      positionBreakdown,
      joinedThisYear,
      avatarSample: (activeList.length ? activeList : list).slice(0, 8),
      avatarOverflow: Math.max(0, total - 8),
      sparkPath: `M ${sparkPoints}`,
    };
  }, [usersList]);

  const setField = (field, value) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "role") {
        if (value === "TRAINER") {
          next.level = "";
          next.position = "";
          if (!next.designation || (DESIGNATION_OPTIONS_BY_POSITION[current.level] || []).includes(next.designation)) {
            next.designation = "Trainer";
          }
        } else {
          const restoredPos = formatPosition(current.position || current.level) || "P2";
          next.level = restoredPos;
          next.position = restoredPos;
          const allowed = DESIGNATION_OPTIONS_BY_POSITION[restoredPos] || [];
          if (!allowed.includes(next.designation)) {
            next.designation = allowed[0] || "Executive";
          }
        }
      }

      if (field === "level" || field === "position") {
        const normPos = formatPosition(value);
        next.level = normPos;
        next.position = normPos;
        const allowedDesignations = DESIGNATION_OPTIONS_BY_POSITION[normPos] || [];
        if (!allowedDesignations.includes(next.designation)) {
          next.designation = allowedDesignations[0] || "";
        }
      }

      return next;
    });
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      ...DEFAULT_FORM,
      temporaryPassword: "",
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    const role = String(employee.role || "EMPLOYEE").toUpperCase();
    const rawPos =
      role === "TRAINER"
        ? ""
        : formatPosition(employee.position || employee.positionBand || employee.level) || "P2";
    const allowedDesignations = DESIGNATION_OPTIONS_BY_POSITION[rawPos] || [];
    const defaultDesignation =
      role === "TRAINER"
        ? employee.designation || "Trainer"
        : allowedDesignations.includes(employee.designation)
        ? employee.designation
        : allowedDesignations[0] || employee.designation || "Executive";

    setEditingEmployee(employee);
    setFormData({
      ...DEFAULT_FORM,
      id: getEmployeeId(employee),
      name: employee.name || "",
      email: employee.email || "",
      role,
      department: DEPARTMENT_OPTIONS.includes(employee.department)
        ? employee.department
        : "Operations",
      designation: defaultDesignation,
      level: rawPos,
      position: rawPos,
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
    const empPos = formatPosition(formData.position || formData.level);
    if (!isTrainer && !empPos) {
      setFormError("Select a position for this role. Trainers do not have a position.");
      return;
    }

    const designationOptions = DESIGNATION_OPTIONS_BY_POSITION[empPos] || [];
    if (!isTrainer && !designationOptions.includes(formData.designation)) {
      setFormError("Select a designation that matches the employee position.");
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
      level: isTrainer ? null : empPos,
      position: isTrainer ? null : empPos,
      branch: formData.branch.trim() || "Corporate HQ",
      joiningDate: formData.joiningDate || null,
      status: formData.status,
    };
    if (!editingEmployee && formData.temporaryPassword && formData.temporaryPassword.trim()) {
      payload.password = formData.temporaryPassword.trim();
    }

    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        await hrAdminService.updateEmployee(getEmployeeId(editingEmployee), payload);
        if (typeof loadEmployees === "function") await loadEmployees();
        setNotice({ type: "success", message: "Employee details updated successfully." });
      } else {
        await createEmployee(payload);
        setNotice({
          type: "success",
          message:
            formData.temporaryPassword && formData.temporaryPassword.trim()
              ? "Employee account created with the password you entered. They must change it at first login."
              : "Employee account created with the shared initial password. They must change it at first login.",
        });
      }
      setShowModal(false);
      setEditingEmployee(null);
    } catch (error) {
      setFormError(
        error?.message || `Unable to ${editingEmployee ? "update" : "create"} employee.`
      );
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
      if (result?.success === false) {
        const rowErrors = Array.isArray(result.errors) ? result.errors : [];
        const shown = rowErrors.slice(0, 8).join(" | ");
        const more = rowErrors.length > 8 ? ` ... and ${rowErrors.length - 8} more` : "";
        throw new Error(
          (result.message ||
            result.error ||
            "Excel import failed. Check the required columns and try again.") +
            (shown ? ` ${shown}${more}` : "")
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
        message:
          (result?.message || "Employee Excel import completed successfully.") +
          " New employees sign in with the shared initial password (System Settings) and must change it at first login.",
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
    const currentStatus = normaliseStatus(employee);
    if (status === currentStatus) return;

    let reason = "Administrative status update";
    if (typeof window !== "undefined" && typeof window.prompt === "function") {
      const enteredReason = window.prompt(
        `Provide a mandatory reason for changing ${
          employee.name || "employee"
        }'s status to ${statusLabel(status)}:`,
        "Administrative status update"
      );
      if (enteredReason === null) return;
      if (!enteredReason.trim()) {
        setNotice({
          type: "error",
          message: "A reason is mandatory for changing employment status.",
        });
        return;
      }
      reason = enteredReason.trim();
    }

    const id = getEmployeeId(employee);
    setBusyEmployee(id);
    setNotice(null);
    try {
      await changeEmployeeStatus(id, status, reason);
      if (typeof loadEmployees === "function") await loadEmployees();
      setNotice({
        type: "success",
        message: `${employee.name || "Employee"} status changed to ${statusLabel(status)}.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error?.message || "Unable to change employee status.",
      });
    } finally {
      setBusyEmployee("");
    }
  };

  const handleResetPassword = async (employee) => {
    const id = getEmployeeId(employee);
    const suggestedTemp = generateClientTemporaryPassword();
    const enteredTemp = window.prompt(
      `Enter or copy the one-time temporary password for ${employee.name || id}.\n(The employee will be required to change this password on their next login):`,
      suggestedTemp
    );
    if (enteredTemp === null) return;
    setBusyEmployee(id);
    setNotice(null);
    try {
      const res = await resetUserPassword(id, enteredTemp.trim() || undefined);
      if (res?.success === false) {
        throw new Error(res.message || "Unable to reset password.");
      }
      setNotice({
        type: "success",
        message: `Password reset completed for ${
          employee.name || id
        }. Mandatory first-login password change is now active.`,
      });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Unable to reset password." });
    } finally {
      setBusyEmployee("");
    }
  };

  const handleDelete = async (employee) => {
    const id = getEmployeeId(employee);
    const confirmed = window.confirm(
      `Deactivate ${
        employee.name || id
      } (${id})? This should preserve the employee's training and certificate history.`
    );
    if (!confirmed) return;

    setBusyEmployee(id);
    setNotice(null);
    try {
      await hrAdminService.deleteEmployee(id);
      if (typeof loadEmployees === "function") await loadEmployees();
      setNotice({ type: "success", message: `${employee.name || id} was deactivated.` });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error?.message ||
          "Unable to deactivate employee. Confirm the backend DELETE endpoint is implemented.",
      });
    } finally {
      setBusyEmployee("");
    }
  };

  const toggleRowSelect = (id) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredUsers.map((u) => getEmployeeId(u)).filter(Boolean);
    if (!visibleIds.length) return;
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setRoleFilter("ALL");
    setPositionFilter("ALL");
    setDeptFilter("ALL");
    setStatusFilter("ALL");
  };

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    roleFilter !== "ALL" ||
    positionFilter !== "ALL" ||
    deptFilter !== "ALL" ||
    statusFilter !== "ALL";

  const renderField = (label, field, options = {}) => (
    <div className="min-w-0 flex flex-col" key={field}>
      <label
        htmlFor={`employee-${field}`}
        className="block min-h-[20px] text-xs font-bold text-[#4A5058] mb-1.5 truncate"
      >
        {label}
        {options.required ? " *" : ""}
      </label>
      {options.options ? (
        <select
          id={`employee-${field}`}
          value={formData[field] ?? ""}
          onChange={(event) => setField(field, event.target.value)}
          required={options.required}
          disabled={options.disabled}
          className="emp-modal-input"
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
          value={options.overrideValue !== undefined ? options.overrideValue : formData[field] ?? ""}
          onChange={(event) => setField(field, event.target.value)}
          required={options.required}
          disabled={options.disabled}
          placeholder={options.placeholder || ""}
          autoComplete={options.autoComplete}
          className="emp-modal-input"
        />
      )}
    </div>
  );

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "name A–Z";

  // Extract structured View Profile fields with clean fallbacks to the directory record
  const personalDetails =
    viewedProfileData?.personalInformation || viewedProfileData?.personalInfo || {};
  const employmentDetails = viewedProfileData?.employmentInfo || {};
  const emergencyContacts = Array.isArray(viewedProfileData?.emergencyContacts)
    ? viewedProfileData.emergencyContacts
    : [];
  const addressParts = [
    personalDetails.addressLine1 || personalDetails.addressHouse,
    personalDetails.addressLine2 || personalDetails.addressStreet,
    [
      personalDetails.city || personalDetails.addressCity,
      personalDetails.state || personalDetails.addressState,
      personalDetails.postalCode || personalDetails.addressPincode,
    ]
      .filter(Boolean)
      .join(", "),
    personalDetails.country || personalDetails.addressCountry,
  ].filter((part) => part && String(part).trim().length > 0);

  return (
    <div className="emp-reel-shell">
      {/* Soft Iridescent Daylight Glows (Seamless — No Outer Box Frame) */}
      <div className="emp-reel-ambient" aria-hidden="true" />

      {/* =====================================================================
          1. TOP HEADER & REEL-STYLE SEGMENTED FILTER / SEARCH / ACTION BAR
      ====================================================================== */}
      <section className="emp-glass-panel p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F2328] mt-1">
              Employee Accounts
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              key={excelInputKey}
              id="employee-excel-import"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleImport}
              disabled={isImporting}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await hrAdminService.downloadImportTemplate();
                } catch (err) {
                  setNotice({
                    type: "error",
                    message: err?.message || "Unable to download template.",
                  });
                }
              }}
              className="emp-btn-glass"
              title="Download Excel Import Template (.xlsx)"
            >
              <Download size={14} />
              <span>Download Template</span>
            </button>

            <label
              htmlFor="employee-excel-import"
              className="emp-btn-glass"
              style={{ opacity: isImporting ? 0.6 : 1 }}
            >
              <Upload size={14} />
              <span>{isImporting ? "Importing..." : "Import Excel"}</span>
            </label>

            <button type="button" onClick={openAddModal} className="emp-btn-primary">
              <UserPlus size={15} />
              <span>Onboard Employee</span>
            </button>
          </div>
        </div>

        {/* Unified Segmented Status Pills + Search Input + Position/Role/Department Selects */}
        <div className="mt-5 pt-4 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="emp-pill-track" role="tablist" aria-label="Filter by account status">
            {[
              { value: "ALL", label: "All accounts" },
              { value: "ACTIVE", label: "Active" },
              { value: "ON_LEAVE", label: "On Leave" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "TERMINATED", label: "Terminated" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.value}
                data-active={statusFilter === tab.value ? "true" : "false"}
                onClick={() => setStatusFilter(tab.value)}
                className="emp-pill-tab"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] justify-end">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#575E68]"
              />
              <input
                aria-label="Search employees"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, ID, email or dept..."
                className="emp-input-pill w-full !pl-9"
               enterKeyHint="search" />
            </div>

            <select
              aria-label="Filter by position band"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="emp-input-pill font-semibold"
            >
              <option value="ALL">All Positions (P0–P4)</option>
              {POSITION_OPTIONS.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {pos.value} ({pos.label.split("—")[1]?.trim() || pos.value})
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="emp-input-pill font-semibold"
            >
              <option value="ALL">All Roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by department"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="emp-input-pill font-semibold"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENT_OPTIONS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="emp-btn-glass !px-3 text-xs text-[#0B5CAB]"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Notice Banner */}
      {notice && (
        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium border ${
            notice.type === "error"
              ? "bg-[#FEF2F2]/90 border-[#FECACA] text-[#991B1B]"
              : "bg-[#F0FDF4]/90 border-[#BBF7D0] text-[#166534]"
          }`}
        >
          {notice.type === "error" ? (
            <AlertCircle size={17} className="shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={17} className="shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{notice.message}</span>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setNotice(null)}
            className="rounded-full p-1 hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* =====================================================================
          2. REEL-INSPIRED 3-CARD BENTO OVERVIEW STRIP (100% REAL DATA)
      ====================================================================== */}
      <div>
        <div className="emp-bento-overview">
          {/* BENTO CARD 1: Active Workforce + Organic Floating Avatar Cluster */}
          <div className="emp-glass-hero-card p-5 sm:p-6 flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#4A5058]">
                Active workforce accounts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 border border-white px-3 py-1 text-xs font-bold text-[#1F2328] shadow-xs emp-tabular">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
                {overviewStats.active} active now
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-6">
                <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1F2328] emp-tabular">
                  {overviewStats.active.toLocaleString("en-IN")}
                </div>
                <div className="mt-2 text-xs font-semibold text-[#4A5058] emp-tabular">
                  <span className="text-[#0F766E] font-bold">
                    {overviewStats.activePct}% active
                  </span>{" "}
                  · {overviewStats.active} of {overviewStats.total} registered seats
                </div>
              </div>

              <div
                className="sm:col-span-6 relative h-32 w-full"
                aria-label="Sample of active employees"
              >
                {overviewStats.avatarSample.map((person, idx) => {
                  const pos = CLOUD_POSITIONS[idx % CLOUD_POSITIONS.length];
                  const pal = getAvatarPalette(getEmployeeId(person) || person.name);
                  return (
                    <button
                      key={getEmployeeId(person) || person.email || idx}
                      type="button"
                      title={`View profile: ${person.name || "Employee"} (${person.department || "Operations"})`}
                      onClick={() => openViewProfileModal(person)}
                      style={{
                        position: "absolute",
                        top: pos.top,
                        left: pos.left,
                        width: pos.size,
                        height: pos.size,
                        backgroundColor: pal.bg,
                        color: pal.text,
                        fontSize: pos.size >= 46 ? 13 : 11,
                      }}
                      className="emp-avatar-node"
                    >
                      {getInitials(person.name)}
                    </button>
                  );
                })}
                {overviewStats.avatarOverflow > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "6%",
                      right: "4%",
                      height: 36,
                      minWidth: 42,
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-white/92 text-[#0B5CAB] text-[11px] font-extrabold px-2.5 border-2 border-white shadow-md emp-tabular"
                  >
                    +{overviewStats.avatarOverflow}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* BENTO CARD 2: Accounts by positions (P0, P1, P2, P3, P4 Bubble Cluster) */}
          <div className="emp-glass-panel p-5 sm:p-6 flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#4A5058]">
                Accounts by positions
              </span>
              {positionFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setPositionFilter("ALL")}
                  className="text-[11px] font-bold text-[#0B5CAB] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {/* 5-Bubble Constellation for P0, P1, P2, P3, P4 */}
            <div
              className="relative h-32 my-1 flex items-center justify-center"
              aria-label="Employee accounts by position band P0 through P4"
            >
              {overviewStats.positionBreakdown.map((band, idx) => {
                const isActive = positionFilter === band.code;
                return (
                  <button
                    key={band.code}
                    type="button"
                    onClick={() =>
                      setPositionFilter(isActive ? "ALL" : band.code)
                    }
                    title={`${band.code} (${band.shortTitle}): ${band.count} employees — click to filter`}
                    style={{
                      width: band.size,
                      height: band.size,
                      background: isActive ? band.activeBg : band.bg,
                      transform: `translate(${band.offsetX}px, ${band.offsetY}px)`,
                      zIndex: isActive ? 40 : 10 + idx,
                      boxShadow: isActive
                        ? "0 0 0 2.5px #0B5CAB, 0 10px 24px rgba(11, 92, 171, 0.22)"
                        : undefined,
                    }}
                    className="emp-role-bubble absolute"
                  >
                    <span
                      style={{ color: band.text }}
                      className="text-sm sm:text-base font-extrabold leading-none emp-tabular"
                    >
                      {band.count}
                    </span>
                    <span
                      style={{ color: band.subText }}
                      className="text-[10px] font-extrabold tracking-tight mt-0.5"
                    >
                      {band.code}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-medium text-[#575E68] emp-tabular flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {overviewStats.positionBreakdown.map((band, i) => (
                <React.Fragment key={band.code}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <span>
                    <strong className="text-[#1F2328]">{band.code}</strong> {band.pct}%
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* BENTO CARD 3: Two Stacked Metric Cards (Departments Sparkline + Status Bar) */}
          <div className="flex flex-col gap-3.5 justify-between">
            <div className="emp-glass-panel p-4 sm:p-5 flex-1 flex flex-col justify-between">
              <div className="text-xs font-semibold text-[#4A5058]">
                Active departments &amp; intake
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#1F2328] leading-none emp-tabular">
                    {overviewStats.deptCount}
                  </div>
                  <div className="text-[11px] text-[#575E68] mt-1 emp-tabular">
                    {overviewStats.joinedThisYear > 0
                      ? `${overviewStats.joinedThisYear} onboarded this year`
                      : "Divisions staffed"}
                  </div>
                </div>

                <svg
                  width="124"
                  height="38"
                  viewBox="0 0 124 38"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <defs>
                    <linearGradient id="empSparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0B5CAB" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#0B5CAB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${overviewStats.sparkPath} L 120,38 L 0,38 Z`}
                    fill="url(#empSparkGrad)"
                  />
                  <path
                    d={overviewStats.sparkPath}
                    stroke="#0B5CAB"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="emp-glass-panel p-4 sm:p-5 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#4A5058]">
                  Leave &amp; inactive status
                </span>
                {overviewStats.onLeave > 0 && (
                  <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-bold text-[#92400E] emp-tabular">
                    {overviewStats.onLeave} on leave
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-baseline gap-1.5 emp-tabular">
                <span className="text-2xl font-extrabold text-[#1F2328]">
                  {overviewStats.nonActive}
                </span>
                <span className="text-xs font-semibold text-[#575E68]">
                  of {overviewStats.total} non-active
                </span>
              </div>

              <div
                className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-black/[0.07] gap-0.5"
                aria-hidden="true"
              >
                <div
                  style={{
                    width: `${Math.max(6, overviewStats.activePct)}%`,
                    background: "#0B5CAB",
                  }}
                  className="rounded-full"
                />
                {overviewStats.onLeave > 0 && (
                  <div
                    style={{
                      width: `${Math.max(
                        5,
                        Math.round((overviewStats.onLeave / Math.max(1, overviewStats.total)) * 100)
                      )}%`,
                      background: "#F59E0B",
                    }}
                    className="rounded-full"
                  />
                )}
                {overviewStats.inactive + overviewStats.terminated > 0 && (
                  <div
                    style={{
                      width: `${Math.max(
                        5,
                        Math.round(
                          ((overviewStats.inactive + overviewStats.terminated) /
                            Math.max(1, overviewStats.total)) *
                            100
                        )
                      )}%`,
                      background: "#EF4444",
                    }}
                    className="rounded-full"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. DIRECTORY BAR WITH SORT + SIGNATURE `TABLE ⇄ CARDS` VIEW SWITCHER
      ====================================================================== */}
      <section className="emp-glass-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-black/[0.07]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-extrabold text-[#1F2328]">All accounts</h2>
            <span className="text-xs text-[#575E68] emp-tabular">
              {filteredUsers.length} of {overviewStats.total} accounts · sorted by{" "}
              <strong className="text-[#1F2328]">{currentSortLabel}</strong>
            </span>
            {selectedIds.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#BFE3FF]/75 px-3 py-0.5 text-xs font-bold text-[#0B5CAB] emp-tabular">
                <span>{selectedIds.length} selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  aria-label="Clear selected rows"
                  className="hover:underline"
                >
                  Clear
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleSort}
              title={`Sort by (currently ${currentSortLabel})`}
              className="emp-btn-glass !px-3"
            >
              <ArrowUpDown size={14} />
              <span className="hidden sm:inline">Sort: {currentSortLabel}</span>
            </button>

            <div className="emp-pill-track" role="tablist" aria-label="Directory layout view">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "TABLE"}
                data-active={viewMode === "TABLE" ? "true" : "false"}
                onClick={() => switchViewMode("TABLE")}
                className="emp-pill-tab"
              >
                <Table2 size={14} />
                <span>Table</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "CARDS"}
                data-active={viewMode === "CARDS" ? "true" : "false"}
                onClick={() => switchViewMode("CARDS")}
                className="emp-pill-tab"
              >
                <LayoutGrid size={14} />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================================
            VIEW A: INTERACTIVE DIRECTORY TABLE (DEFAULT)
        ==================================================================== */}
        {viewMode === "TABLE" ? (
          <div key="table-view" className="w-full overflow-x-auto emp-animate-in">
            <table className="emp-table">
              <thead>
                <tr>
                  <th style={{ width: 42 }}>
                    <button
                      type="button"
                      onClick={toggleSelectAllVisible}
                      aria-label="Select all visible employees"
                      className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors duration-150 ${
                        filteredUsers.length > 0 &&
                        filteredUsers.every((u) => selectedIds.includes(getEmployeeId(u)))
                          ? "bg-[#0B5CAB] border-[#0B5CAB] text-white"
                          : "bg-white/85 border-black/20 text-transparent"
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                  </th>
                  <th>Employee</th>
                  <th>Position &amp; Role</th>
                  <th>Department &amp; Title</th>
                  <th>Status</th>
                  <th>Employee Dossier</th>
                  <th>Branch / Joined</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((employee) => {
                  const id = getEmployeeId(employee);
                  const role = String(employee.role || "EMPLOYEE").toUpperCase();
                  const status = normaliseStatus(employee);
                  const busy = busyEmployee === id;
                  const isSelected = selectedIds.includes(id);
                  const pal = getAvatarPalette(id || employee.name);
                  const roleStyle = roleBadgeStyle(role);
                  const stMeta = statusMeta(status);
                  const posLabel =
                    role === "TRAINER"
                      ? "Trainer Faculty"
                      : getEmployeePositionCode(employee) || "P2";

                  return (
                    <tr key={id || employee.email} data-selected={isSelected ? "true" : "false"}>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleRowSelect(id)}
                          aria-label={`Select ${employee.name || id}`}
                          aria-pressed={isSelected}
                          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors duration-150 ${
                            isSelected
                              ? "bg-[#0B5CAB] border-[#0B5CAB] text-white"
                              : "bg-white/85 border-black/20 text-transparent"
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                      </td>

                      <td>
                        <div className="flex items-center gap-3 min-w-[210px]">
                          <div
                            style={{ backgroundColor: pal.bg, color: pal.text }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold text-xs border-2 border-white shadow-xs"
                          >
                            {getInitials(employee.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#1F2328] text-sm truncate">
                              {employee.name || "Unnamed employee"}
                            </div>
                            <div className="text-xs text-[#575E68] truncate">
                              {employee.email || "No email"} ·{" "}
                              <span className="font-semibold text-[#1F2328] emp-tabular">
                                {id || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center rounded-lg bg-[#F4F1EC] border border-black/10 px-2 py-0.5 text-xs font-extrabold text-[#1F2328] emp-tabular">
                            {posLabel}
                          </span>
                          <span
                            style={{
                              backgroundColor: roleStyle.bg,
                              color: roleStyle.text,
                              border: `1px solid ${roleStyle.border}`,
                            }}
                            className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold"
                          >
                            {ROLE_OPTIONS.find((r) => r.value === role)?.label || role}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="font-semibold text-[#1F2328]">
                          {employee.department || "Operations"}
                        </div>
                        <div className="text-xs text-[#575E68] mt-0.5">
                          {employee.designation || "—"}
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            style={{ backgroundColor: stMeta.bg, color: stMeta.text }}
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                          >
                            <span
                              style={{ backgroundColor: stMeta.dot }}
                              className="h-1.5 w-1.5 rounded-full"
                              aria-hidden="true"
                            />
                            {statusLabel(status)}
                          </span>
                          <select
                            aria-label={`Change status for ${employee.name || id}`}
                            value={status}
                            disabled={busy}
                            onChange={(event) =>
                              handleStatusChange(employee, event.target.value)
                            }
                            className="rounded-lg border border-black/10 bg-white/85 px-2 py-1 text-[11px] font-semibold text-[#4A5058]"
                          >
                            {STATUS_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* View Employee Profile Action (Personal Details, Emergency Contacts, Address) */}
                      <td>
                        <button
                          type="button"
                          onClick={() => openViewProfileModal(employee)}
                          className="emp-btn-glass !py-1.5 !px-3 text-xs font-bold text-[#0B5CAB]"
                        >
                          <Eye size={13} />
                          <span>View Profile</span>
                        </button>
                      </td>

                      <td>
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F2328]">
                          <MapPin size={12} className="text-[#0B5CAB]" />
                          <span>{employee.branch || "Corporate HQ"}</span>
                        </div>
                        <div className="text-[11px] text-[#575E68] mt-0.5 emp-tabular">
                          {formatJoinedLabel(employee.joiningDate)}
                        </div>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Edit employee"
                            aria-label={`Edit ${employee.name || id}`}
                            onClick={() => openEditModal(employee)}
                            className="emp-btn-glass !p-2 text-[#0B5CAB]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Reset password"
                            aria-label={`Reset password for ${employee.name || id}`}
                            disabled={busy}
                            onClick={() => handleResetPassword(employee)}
                            className="emp-btn-glass !p-2 text-[#4C1D95] disabled:opacity-50"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            type="button"
                            title="Deactivate employee"
                            aria-label={`Deactivate ${employee.name || id}`}
                            disabled={busy}
                            onClick={() => handleDelete(employee)}
                            className="emp-btn-glass !p-2 text-[#DC2626] disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="!py-14 text-center">
                      <Users size={30} className="mx-auto mb-2.5 text-[#575E68]/60" />
                      <div className="text-sm font-bold text-[#1F2328]">No employees found</div>
                      <div className="text-xs text-[#575E68] mt-1">
                        Try another search term or clear your active filters.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* =================================================================
              VIEW B: 3-COLUMN REEL BENTO EMPLOYEE CARDS GRID
          ================================================================== */
          <div key="cards-view" className="emp-cards-grid emp-animate-in">
            {filteredUsers.map((employee, idx) => {
              const id = getEmployeeId(employee);
              const role = String(employee.role || "EMPLOYEE").toUpperCase();
              const status = normaliseStatus(employee);
              const busy = busyEmployee === id;
              const isSelected = selectedIds.includes(id);
              const pal = getAvatarPalette(id || employee.name);
              const roleStyle = roleBadgeStyle(role);
              const stMeta = statusMeta(status);
              const posLabel =
                role === "TRAINER"
                  ? "Trainer"
                  : getEmployeePositionCode(employee) || "P2";

              return (
                <article
                  key={id || employee.email || idx}
                  data-selected={isSelected ? "true" : "false"}
                  style={{
                    animationDelay: `${Math.min(idx * 28, 240)}ms`,
                  }}
                  className="emp-person-card emp-animate-in"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleRowSelect(id)}
                        title="Select employee card"
                        style={{ backgroundColor: pal.bg, color: pal.text }}
                        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-extrabold text-sm border-2 border-white shadow-xs"
                      >
                        {isSelected ? <Check size={16} strokeWidth={3} /> : getInitials(employee.name)}
                      </button>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#1F2328] truncate">
                          {employee.name || "Unnamed employee"}
                        </h3>
                        <p className="text-xs text-[#575E68] truncate">
                          {employee.email || "No email"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Edit employee"
                        aria-label={`Edit ${employee.name || id}`}
                        onClick={() => openEditModal(employee)}
                        className="emp-btn-glass !p-1.5 text-[#0B5CAB]"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        title="Reset password"
                        aria-label={`Reset password for ${employee.name || id}`}
                        disabled={busy}
                        onClick={() => handleResetPassword(employee)}
                        className="emp-btn-glass !p-1.5 text-[#4C1D95] disabled:opacity-50"
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        type="button"
                        title="Deactivate employee"
                        aria-label={`Deactivate ${employee.name || id}`}
                        disabled={busy}
                        onClick={() => handleDelete(employee)}
                        className="emp-btn-glass !p-1.5 text-[#DC2626] disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#F4F1EC] border border-black/10 px-2.5 py-0.5 text-xs font-extrabold text-[#1F2328] emp-tabular">
                      {posLabel}
                    </span>

                    <span
                      style={{
                        backgroundColor: roleStyle.bg,
                        color: roleStyle.text,
                        border: `1px solid ${roleStyle.border}`,
                      }}
                      className="rounded-lg px-2.5 py-0.5 text-xs font-bold"
                    >
                      {ROLE_OPTIONS.find((r) => r.value === role)?.label || role}
                    </span>

                    <span
                      style={{ backgroundColor: stMeta.bg, color: stMeta.text }}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                    >
                      <span
                        style={{ backgroundColor: stMeta.dot }}
                        className="h-1.5 w-1.5 rounded-full"
                        aria-hidden="true"
                      />
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/[0.06] text-xs">
                    <div className="min-w-0">
                      <div className="text-[11px] text-[#575E68]">Department</div>
                      <div className="font-bold text-[#1F2328] truncate mt-0.5">
                        {employee.department || "Operations"}
                      </div>
                      <div className="text-[11px] text-[#575E68] truncate">
                        {employee.designation || "—"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] text-[#575E68]">Branch &amp; Status</div>
                      <div className="font-bold text-[#1F2328] truncate mt-0.5">
                        {employee.branch || "Corporate HQ"}
                      </div>
                      <select
                        aria-label={`Change status for ${employee.name || id}`}
                        value={status}
                        disabled={busy}
                        onChange={(event) =>
                          handleStatusChange(employee, event.target.value)
                        }
                        className="mt-1 rounded-md border border-black/10 bg-[#FBF8F3] px-1.5 py-0.5 text-[11px] font-semibold text-[#4A5058]"
                      >
                        {STATUS_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Card Footer: ID / Joined + View Profile Action */}
                  <div className="pt-2.5 border-t border-black/[0.05] flex items-center justify-between gap-3 text-[11px] emp-tabular">
                    <span className="font-semibold text-[#575E68] truncate">
                      {id || "—"} · {formatJoinedLabel(employee.joiningDate)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openViewProfileModal(employee)}
                      className="emp-btn-glass !py-1 !px-2.5 text-xs font-bold text-[#0B5CAB]"
                    >
                      <Eye size={13} />
                      <span>View Profile</span>
                    </button>
                  </div>
                </article>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="col-span-full py-14 text-center">
                <Users size={30} className="mx-auto mb-2.5 text-[#575E68]/60" />
                <div className="text-sm font-bold text-[#1F2328]">No employees found</div>
                <div className="text-xs text-[#575E68] mt-1">
                  Try another search term or clear your active filters.
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================================
          4. PORTALED ONBOARD / EDIT EMPLOYEE MODAL (FIXED 5×2 GRID — ZERO SHIFTING)
      ====================================================================== */}
      {showModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
            className="emp-modal-backdrop"
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="employee-modal-title"
              className="emp-modal-dialog emp-animate-in max-w-[680px]"
            >
              {/* Pinned Header */}
              <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-black/[0.08] bg-white/80 shrink-0">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0B5CAB]">
                    <UserPlus size={14} />
                    <span>{editingEmployee ? "Organization Account" : "New Employee"}</span>
                  </div>
                  <h2
                    id="employee-modal-title"
                    className="text-xl font-extrabold text-[#1F2328] mt-0.5"
                  >
                    {editingEmployee ? "Edit Employee" : "Onboard Employee"}
                  </h2>
                  <p className="text-xs text-[#575E68] mt-0.5">
                    {editingEmployee
                      ? "Update the employee's organization profile, position band, and role allocation."
                      : "Create an employee account and organization profile."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={closeModal}
                  className="emp-btn-glass !p-2"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Fixed-Slot Form Body */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="emp-modal-scroll-body px-6 py-5 space-y-4">
                  {formError && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-semibold text-[#991B1B]"
                    >
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Strict 2-Column × 5-Row Grid (10 Fixed Slots — Never Shifts When Role Changes) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderField("Employee ID", "id", {
                      required: !editingEmployee,
                      disabled: Boolean(editingEmployee),
                      placeholder: "e.g. FM-1001",
                    })}
                    {renderField("Full Name", "name", {
                      required: true,
                      placeholder: "Employee full name",
                      autoComplete: "name",
                    })}
                    {renderField("Official Email", "email", {
                      required: true,
                      type: "email",
                      placeholder: "name@fairmacs.com",
                      autoComplete: "email",
                    })}
                    {renderField("Role", "role", {
                      required: true,
                      options: ROLE_OPTIONS,
                    })}
                    {renderField("Department", "department", {
                      required: true,
                      options: DEPARTMENT_OPTIONS,
                    })}
                    {isTrainer
                      ? renderField("Employee Position", "level", {
                          disabled: true,
                          overrideValue: "Not applicable (Trainer Faculty)",
                        })
                      : renderField("Employee Position", "level", {
                          required: true,
                          options: POSITION_OPTIONS,
                        })}
                    {isTrainer
                      ? renderField("Designation", "designation", {
                          required: true,
                          placeholder: "e.g. Trainer",
                        })
                      : renderField("Designation", "designation", {
                          required: true,
                          options: (DESIGNATION_OPTIONS_BY_POSITION[formData.level] || []).map(
                            (designation) => ({
                              value: designation,
                              label: designation,
                            })
                          ),
                        })}
                    {renderField("Branch / Location", "branch", {
                      placeholder: "e.g. Corporate HQ",
                    })}
                    {renderField("Joining Date", "joiningDate", { type: "date" })}
                    {renderField("Account Status", "status", {
                      required: true,
                      options: STATUS_OPTIONS,
                    })}
                  </div>

                  {!editingEmployee && (
                    <div className="flex items-start gap-3 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF]/90 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#BFE3FF] text-[#0B5CAB]">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold text-[#0B5CAB] mb-1.5">
                          Initial Password
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                          <input
                            type="text"
                            value={formData.temporaryPassword || ""}
                            onChange={(e) => setField("temporaryPassword", e.target.value)}
                            className="emp-modal-input font-mono font-bold"
                            placeholder="Leave blank to use the shared initial password"
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#4A5058] leading-relaxed">
                          Leave this blank and the employee gets the shared initial password set in System Settings (the same one used for bulk upload). Type a password only to give this one employee a different one (min 8 chars, upper, lower, number, symbol). Either way they must change it at first sign-in.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5 rounded-2xl border border-black/[0.07] bg-white/80 p-3.5 text-xs text-[#4A5058] leading-relaxed">
                    <CalendarDays size={16} className="shrink-0 mt-0.5 text-[#0B5CAB]" />
                    <div>
                      <strong className="text-[#1F2328]">Position mapping:</strong> P0 Trainee, P1 Assistant, P2 Executive / Senior Executive, P3 Assistant Manager / Manager / Senior Manager, P4 Vice President. Trainers do not have a position.
                    </div>
                  </div>
                </div>

                {/* Pinned Footer */}
                <div className="px-6 py-4 border-t border-black/[0.08] bg-white/85 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="emp-btn-glass !px-5 !py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="emp-btn-primary !px-5 !py-2.5 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      "Saving..."
                    ) : editingEmployee ? (
                      <>
                        <CheckCircle size={15} />
                        <span>Save Changes</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} />
                        <span>Create Employee</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body
        )}

      {/* =====================================================================
          5. PORTALED VIEW FULL EMPLOYEE PROFILE MODAL (PERSONAL, ADDRESS, EMERGENCY)
      ====================================================================== */}
      {viewingEmployee &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeViewProfileModal();
            }}
            className="emp-modal-backdrop"
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="view-employee-profile-title"
              className="emp-modal-dialog emp-animate-in max-w-[780px]"
            >
              {/* Pinned Employee Profile Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5 border-b border-black/[0.08] bg-white/85 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    style={{
                      backgroundColor: getAvatarPalette(
                        getEmployeeId(viewingEmployee) || viewingEmployee.name
                      ).bg,
                      color: getAvatarPalette(
                        getEmployeeId(viewingEmployee) || viewingEmployee.name
                      ).text,
                    }}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-extrabold text-lg border-2 border-white shadow-sm"
                  >
                    {getInitials(viewingEmployee.name)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        id="view-employee-profile-title"
                        className="text-lg sm:text-xl font-extrabold text-[#1F2328] truncate"
                      >
                        {personalDetails.fullName || viewingEmployee.name || "Employee"}
                      </h2>
                      <span
                        style={{
                          backgroundColor: statusMeta(normaliseStatus(viewingEmployee)).bg,
                          color: statusMeta(normaliseStatus(viewingEmployee)).text,
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                      >
                        <span
                          style={{
                            backgroundColor: statusMeta(normaliseStatus(viewingEmployee)).dot,
                          }}
                          className="h-1.5 w-1.5 rounded-full"
                        />
                        {statusLabel(normaliseStatus(viewingEmployee))}
                      </span>
                      <span className="rounded-lg bg-[#F4F1EC] border border-black/10 px-2 py-0.5 text-xs font-extrabold text-[#1F2328] emp-tabular">
                        {String(viewingEmployee.role || "").toUpperCase() === "TRAINER"
                          ? "Trainer Faculty"
                          : getEmployeePositionCode(viewingEmployee) || "P2"}
                      </span>
                    </div>

                    <p className="text-xs text-[#575E68] mt-1 truncate emp-tabular">
                      {viewingEmployee.designation || "Specialist"} ·{" "}
                      {viewingEmployee.department || "Operations"} · ID:{" "}
                      <strong className="text-[#1F2328]">
                        {getEmployeeId(viewingEmployee) || "—"}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingEmployee;
                      closeViewProfileModal();
                      openEditModal(target);
                    }}
                    className="emp-btn-glass text-xs text-[#0B5CAB]"
                  >
                    <Pencil size={13} />
                    <span>Edit Account</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Close employee profile"
                    onClick={closeViewProfileModal}
                    className="emp-btn-glass !p-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Dossier Content */}
              <div className="emp-modal-scroll-body px-6 py-5 space-y-5">
                {profileLoading && (
                  <div className="rounded-2xl border border-black/[0.06] bg-white/80 p-5 text-xs font-semibold text-[#575E68] flex items-center gap-2.5">
                    <RefreshCw size={15} className="animate-spin text-[#0B5CAB]" />
                    <span>Loading personal details and emergency contacts...</span>
                  </div>
                )}

                {profileError && !profileLoading && (
                  <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#991B1B] flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {/* Section A: Personal Information & Residential Address */}
                <div className="rounded-2xl border border-black/[0.07] bg-white/88 p-5">
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-black/[0.06]">
                    <User size={16} className="text-[#0B5CAB]" />
                    <h3 className="text-sm font-extrabold text-[#1F2328]">
                      Personal Information &amp; Residential Address
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-2.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#575E68]">
                        Personal Details
                      </div>
                      <dl className="divide-y divide-black/[0.06]">
                        <div className="py-2 flex items-center justify-between gap-3">
                          <dt className="text-[#575E68]">Full Legal Name</dt>
                          <dd className="font-bold text-[#1F2328] text-right">
                            {personalDetails.fullName || viewingEmployee.name || "—"}
                          </dd>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <dt className="text-[#575E68]">Personal Email</dt>
                          <dd className="font-semibold text-[#1F2328] text-right truncate max-w-[220px]">
                            {personalDetails.personalEmail || "Not provided"}
                          </dd>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <dt className="text-[#575E68]">Mobile Phone</dt>
                          <dd className="font-semibold text-[#1F2328] text-right emp-tabular">
                            {personalDetails.mobileNumber ||
                              personalDetails.personalPhone ||
                              "Not provided"}
                          </dd>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <dt className="text-[#575E68]">Date of Birth</dt>
                          <dd className="font-semibold text-[#1F2328] text-right emp-tabular">
                            {personalDetails.dateOfBirth || "Not provided"}
                          </dd>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <dt className="text-[#575E68]">Gender</dt>
                          <dd className="font-semibold text-[#1F2328] text-right">
                            {personalDetails.gender || "Not provided"}
                          </dd>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-3">
                          <dt className="text-[#575E68]">Blood Group</dt>
                          <dd className="font-extrabold text-[#991B1B] text-right">
                            {personalDetails.bloodGroup || "Not provided"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#575E68]">
                        Residential Address
                      </div>
                      <div className="rounded-xl border border-black/[0.07] bg-[#FBF8F3] p-4 min-h-[148px] flex flex-col justify-center">
                        {addressParts.length > 0 &&
                        !(addressParts.length === 1 && addressParts[0] === "India") ? (
                          <div className="space-y-1 text-xs text-[#1F2328] leading-relaxed">
                            {addressParts.map((line, i) => (
                              <div
                                key={i}
                                className={i === 0 ? "font-bold text-[#1F2328]" : "text-[#4A5058]"}
                              >
                                {line}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-[#575E68]">
                            No residential address has been recorded by this employee yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Emergency Contacts */}
                <div className="rounded-2xl border border-black/[0.07] bg-white/88 p-5">
                  <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-black/[0.06]">
                    <div className="flex items-center gap-2">
                      <Heart size={16} className="text-[#DC2626]" />
                      <h3 className="text-sm font-extrabold text-[#1F2328]">
                        Emergency Contacts
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#F4F1EC] px-2.5 py-0.5 text-[11px] font-bold text-[#4A5058] emp-tabular">
                      {emergencyContacts.length} recorded
                    </span>
                  </div>

                  {emergencyContacts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-black/15 bg-[#FBF8F3] py-6 px-4 text-center">
                      <Phone size={20} className="mx-auto mb-1.5 text-[#575E68]" />
                      <div className="text-xs font-bold text-[#1F2328]">
                        No emergency contacts added yet
                      </div>
                      <div className="text-[11px] text-[#575E68] mt-0.5">
                        Emergency contacts configured by the employee in their Profile Centre will appear here.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {emergencyContacts.map((contact, idx) => (
                        <div
                          key={contact.id || idx}
                          className="rounded-xl border border-black/[0.08] bg-[#FBF8F3] p-4 space-y-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold text-[#1F2328]">
                              {contact.name || "Contact"}
                            </span>
                            {contact.relationship && (
                              <span className="rounded-md bg-white border border-black/10 px-2 py-0.5 text-[10px] font-bold text-[#4A5058]">
                                {contact.relationship}
                              </span>
                            )}
                            {contact.isPrimary && (
                              <span className="rounded-full bg-[#CFF3E3] px-2 py-0.5 text-[10px] font-extrabold text-[#0F5132]">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-xs text-[#4A5058] emp-tabular">
                            <div className="flex items-center gap-1.5 font-semibold text-[#1F2328]">
                              <Phone size={12} className="text-[#0B5CAB]" />
                              <span>{contact.primaryPhone || "—"}</span>
                            </div>
                            {contact.secondaryPhone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-[#575E68]">
                                <Phone size={11} />
                                <span>{contact.secondaryPhone} (Alt)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section C: Official Organization & Reporting Standing */}
                <div className="rounded-2xl border border-black/[0.07] bg-white/88 p-5">
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-black/[0.06]">
                    <Briefcase size={16} className="text-[#0B5CAB]" />
                    <h3 className="text-sm font-extrabold text-[#1F2328]">
                      Organization &amp; Employment Standing
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-[11px] text-[#575E68]">Official Email</div>
                      <div className="font-bold text-[#0B5CAB] mt-0.5 truncate flex items-center gap-1">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">
                          {employmentDetails.officialEmail || viewingEmployee.email || "—"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#575E68]">Branch / Office</div>
                      <div className="font-bold text-[#1F2328] mt-0.5">
                        {employmentDetails.branch || viewingEmployee.branch || "Corporate HQ"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#575E68]">Joining Date</div>
                      <div className="font-bold text-[#1F2328] mt-0.5 emp-tabular">
                        {formatJoinedLabel(
                          employmentDetails.joiningDate || viewingEmployee.joiningDate
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#575E68]">Department</div>
                      <div className="font-bold text-[#1F2328] mt-0.5">
                        {employmentDetails.department || viewingEmployee.department || "Operations"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#575E68]">Designation &amp; Band</div>
                      <div className="font-bold text-[#1F2328] mt-0.5">
                        {employmentDetails.designation || viewingEmployee.designation || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#575E68]">Reporting Manager</div>
                      <div className="font-bold text-[#1F2328] mt-0.5">
                        {employmentDetails.reportingManager?.name
                          ? `${employmentDetails.reportingManager.name} (${employmentDetails.reportingManager.designation || "Manager"})`
                          : "Direct / Department Lead"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pinned Footer */}
              <div className="px-6 py-4 border-t border-black/[0.08] bg-white/85 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={closeViewProfileModal}
                  className="emp-btn-primary !px-5 !py-2"
                >
                  Close Profile
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </div>
  );
}
