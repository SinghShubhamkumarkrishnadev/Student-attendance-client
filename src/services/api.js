import axios from "axios";

// ====================== AXIOS INSTANCE ======================
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});


// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("hodToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ====================== HOD APIs ======================
export const registerHod = (data) => API.post("/hods/register", data);
export const verifyOtp = (data) => API.post("/hods/verify-otp", data);
export const loginHod = (data) => API.post("/hods/login", data);
export const getHodProfile = () => API.get("/hods/profile");

// ====================== PROFESSOR APIs ======================
export const addProfessor = (profData) => API.post("/professors", profData);
export const getProfessors = () => API.get("/professors");
export const getProfessorById = (id) => API.get(`/professors/${id}`);
export const deleteProfessor = (id) => API.delete(`/professors/${id}`);
export const updateProfessor = (id, profData) =>
  API.put(`/professors/${id}`, profData);

// ====================== CLASS APIs ======================

// Create new class
export const createClass = (classData) => API.post("/classes", classData);

// Get all classes (HOD → populated)
export const getClasses = async () => {
  const res = await API.get("/classes?populate=true");
  return (
    res.data?.data || res.data?.classes || res.data?.data?.classes || []
  );
};

// Get specific class by ID
export const getClassById = (id) => API.get(`/classes/${id}`);

// Update class details
export const updateClass = (id, classData) =>
  API.put(`/classes/${id}`, classData);

// Delete class
export const deleteClass = (id) => API.delete(`/classes/${id}`);


// Assign professors to a class
export const assignProfessorsToClass = (classId, professorIds) =>
  API.post(`/classes/${classId}/professors`, { professorIds });

// Remove professors from a class
export const removeProfessorsFromClass = (classId, professorIds) =>
  API.delete(`/classes/${classId}/professors`, { data: { professorIds } });


// ====================== STUDENT APIs ======================
// Bulk upload students via Excel
export const bulkUploadStudents = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await API.post("/students/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data || [];
};

// Get all students (with optional filters)
export const getStudents = async (params = {}) => {
  const res = await API.get("/students", { params });

  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.students)) return res.data.students;
  if (Array.isArray(res.data?.data?.students)) return res.data.data.students;

  return [];
};

// Get student by ID
export const getStudentById = async (id) => {
  const res = await API.get(`/students/${id}`);
  return res.data.data?.student || res.data.student;
};

// Update student
export const updateStudent = async (id, studentData) => {
  const res = await API.put(`/students/${id}`, studentData);
  return res.data.data?.student || res.data.student;
};

// Delete student
export const deleteStudent = async (id) => {
  const res = await API.delete(`/students/${id}`);
  return res.data.data?.message || res.data.message;
};

// ====================== CLASS → STUDENT ASSIGNMENT APIs ======================

// Assign students to a class
export const assignStudentsToClass = (classId, studentIds) =>
  API.post(`/classes/${classId}/students`, { studentIds });

// Remove students from a class
export const removeStudentsFromClass = (classId, studentIds) =>
  API.delete(`/classes/${classId}/students`, {
    headers: { "Content-Type": "application/json" },
    data: { studentIds },
  });

// ====================== CLIENT-SIDE BATCH UPDATER ======================
// Uses the existing updateStudent endpoint for each id; concurrency-controlled.
// onProgress is optional and called with { done, total }
// IMPORTANT: For safety we only allow 'semester' and 'division' to be sent
export const batchUpdateStudentsClient = async (
  studentIds,
  updates,
  { concurrency = 5, onProgress } = {}
) => {
  // sanitize updates: allow only semester and division
  const allowed = {};
  if (updates && typeof updates === "object") {
    if (updates.hasOwnProperty("semester")) {
      // ensure we send a number if possible
      const s = updates.semester;
      allowed.semester =
        s === "" || s === null || typeof s === "undefined" ? undefined : Number(s);
      // if Number(s) is NaN, we won't include it
      if (Number.isNaN(allowed.semester)) delete allowed.semester;
    }
    if (updates.hasOwnProperty("division")) {
      const d = updates.division;
      if (d !== null && typeof d !== "undefined" && String(d).trim() !== "") {
        allowed.division = String(d);
      }
    }
  }

  // if nothing to send after sanitization, fail early
  if (!allowed || Object.keys(allowed).length === 0) {
    throw new Error("No valid fields to update. Only 'semester' and 'division' are allowed.");
  }

  const results = { success: [], failed: [] };
  const ids = Array.from(new Set((studentIds || []).map(String))); // dedupe
  let done = 0;

  // Worker that consumes the shared queue
  const queue = ids.slice();
  const runWorker = async () => {
    while (queue.length) {
      const id = queue.shift();
      try {
        await updateStudent(id, allowed);
        results.success.push(id);
      } catch (err) {
        results.failed.push({ id, error: err?.response?.data || err?.message || err });
      } finally {
        done += 1;
        onProgress?.({ done, total: ids.length });
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, () =>
    runWorker()
  );
  await Promise.all(workers);

  return results;
};

// ====================== CLIENT-SIDE BULK DELETE (single API call) ======================
export const batchDeleteStudentsClient = async (
  studentIds,
  { onProgress } = {}
) => {
  const results = { success: [], failed: [] };
  const ids = Array.from(new Set((studentIds || []).map(String))); // dedupe

  if (ids.length === 0) return results;

  try {
    const res = await deleteStudentsBulk(ids);
    results.success = ids;

    if (onProgress) onProgress({ done: ids.length, total: ids.length });

    return results;
  } catch (err) {
    results.failed = ids.map((id) => ({ id, error: err?.response?.data || err?.message || err }));
    if (onProgress) onProgress({ done: ids.length, total: ids.length });
    return results;
  }
};


// Bulk delete students in one API call
export const deleteStudentsBulk = async (studentIds) => {
  const res = await API.delete("/students", {
    headers: { "Content-Type": "application/json" },
    data: { studentIds },
  });
  return res.data.data || res.data;
};


// ====================== CLIENT-SIDE BATCH REMOVER ======================
// Calls backend once with all studentIds
// onProgress is optional but now trivial (0 → 100%)
export const batchRemoveStudentsFromClassClient = async (
  classId,
  studentIds,
  { onProgress } = {}
) => {
  const results = { success: [], failed: [] };
  const ids = Array.from(new Set((studentIds || []).map(String))); // dedupe

  if (ids.length === 0) return results;

  try {
    // ✅ Single API call with all IDs at once
    await removeStudentsFromClass(classId, ids);
    results.success = ids;
  } catch (err) {
    results.failed = ids.map((id) => ({ id, error: err }));
  }

  if (onProgress) onProgress({ done: ids.length, total: ids.length });
  return results;
};




export default API;
