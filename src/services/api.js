import axios from "axios";

// ====================== AXIOS INSTANCE ======================
const API = axios.create({
  baseURL: "https://student-attendance-server-n48g.onrender.com/api",
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
  API.delete(`/classes/${classId}/students`, { data: { studentIds } });


export default API;
