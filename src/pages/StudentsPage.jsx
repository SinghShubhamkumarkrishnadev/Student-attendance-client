// src/pages/StudentPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
  batchUpdateStudentsClient,
  batchDeleteStudentsClient,
  addStudent,
} from "../services/api";
import { toast } from "react-toastify";
import { useConfirm } from "../components/ConfirmProvider";
import BatchUpdateModal from "../components/BatchUpdateModal";
import BatchProgress from "../components/BatchProgress";
import { XCircle } from "lucide-react";

const StudentPage = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null); // inline editor model
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const [newStudent, setNewStudent] = useState({
    name: "",
    enrollmentNumber: "",
    semester: "",
    division: "",
  });
  const [adding, setAdding] = useState(false);

  // selection + batch UI state
  const [selectedIds, setSelectedIds] = useState([]);
  const [showSelection, setShowSelection] = useState(false); // controls checkbox visibility
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // per-card edit loading + saving state
  const [editingId, setEditingId] = useState(null); // id currently being fetched for edit
  const [saving, setSaving] = useState(false); // save in progress

  // filters / search / sort
  const [searchName, setSearchName] = useState("");
  const [searchEnrollment, setSearchEnrollment] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | enrollment | semester
  const [filterDivision, setFilterDivision] = useState("");
  const [visibleCount, setVisibleCount] = useState(12); // show first 12 by default

  const [uploading, setUploading] = useState(false);
  const [batchUpdating, setBatchUpdating] = useState(false);

  const [error, setError] = useState("");

  const confirm = useConfirm();

  // Fetch all students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data || []);
    } catch (err) {
      console.error("Error fetching students:", err);
      toast.error("Failed to fetch students");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.enrollmentNumber || !newStudent.semester) {
      toast.error("⚠️ Please fill in Name, Enrollment, and Semester");
      return;
    }

    try {
      setAdding(true);
      await addStudent(newStudent);
      toast.success("✅ Student added!");
      setNewStudent({ name: "", enrollmentNumber: "", semester: "", division: "" });
      fetchStudents();
    } catch (err) {
      console.error("Error adding student:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg ? `Failed to add student: ${backendMsg}` : "Failed to add student";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setAdding(false);
    }
  };


  // Handle inline edit open (per-card loading)
  const handleEdit = async (id) => {
    try {
      setEditingId(id);
      setSelectedStudent(null); // clear any previous inline model while we fetch
      const student = await getStudentById(id);
      const s = student?.student || student;
      setSelectedStudent(s);
    } catch (err) {
      console.error("Error fetching student:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to load student: ${backendMsg}`
        : "Failed to load student details";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setEditingId(null);
    }
  };

  // Handle update (inline)
  const handleUpdate = async () => {
    if (!selectedStudent || !selectedStudent._id) return;
    try {
      setSaving(true);
      await updateStudent(selectedStudent._id, {
        name: selectedStudent.name,
        enrollmentNumber: selectedStudent.enrollmentNumber,
        semester: selectedStudent.semester,
        division: selectedStudent.division,
      });
      toast.success("✅ Student updated!");
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      console.error("Error updating student:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to update student: ${backendMsg}`
        : "Failed to update student";
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    const student = students.find((s) => s._id === id);
    const ok = await confirm({
      title: "Delete Student",
      message: `Are you sure you want to delete "${student?.name || "this student"}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await deleteStudent(id);
      toast.success("🗑️ Student deleted!");
      // remove from selection if needed
      setSelectedIds((prev) => prev.filter((x) => x !== String(id)));
      if (selectedStudent && selectedStudent._id === id) setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      console.error("Error deleting student:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Failed to delete student: ${backendMsg}`
        : "Failed to delete student";
      setError(finalMsg);
      toast.error(finalMsg);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!file) {
      toast.error("📂 Please select an Excel file first!");
      return;
    }
    try {
      setUploading(true);
      await bulkUploadStudents(file);
      toast.success("✅ Bulk upload successful!");
      setFile(null);
      fetchStudents();
    } catch (err) {
      console.error("Error bulk uploading:", err);
      const backendMsg = err.response?.data?.error;
      const finalMsg = backendMsg
        ? `Bulk upload failed: ${backendMsg}`
        : "Bulk upload failed";
      setError(finalMsg)
      toast.error(finalMsg);
    } finally {
      setUploading(false);
    }

  };

  // Client-side batch apply handler (uses batchUpdateStudentsClient)
  const handleApplyBatch = async (updates) => {
    if (!selectedIds.length) {
      toast.error("No students selected for batch update");
      return;
    }

    setProgress({ done: 0, total: selectedIds.length });
    setProgressOpen(true);
    setBatchUpdating(true);

    try {
      const res = await batchUpdateStudentsClient(selectedIds, updates, {
        concurrency: 5,
        onProgress: ({ done, total }) => setProgress({ done, total }),
      });

      if (res.failed.length === 0) {
        toast.success(`Updated ${res.success.length} students`);
      } else {
        toast.warn(`Updated ${res.success.length}, failed ${res.failed.length}. Check console for details.`);
        console.table(res.failed);
      }
      setBatchModalOpen(false);
      setSelectedIds([]);
      setShowSelection(false);
      fetchStudents();
    } catch (err) {
      console.error("Batch update error", err);
      toast.error("Batch update failed");
    } finally {
      setBatchUpdating(false);
      // keep progress visible until user closes
    }
  };

  // Batch delete handler
  const handleBatchDelete = async () => {
    if (!selectedIds.length) {
      toast.error("No students selected for deletion");
      return;
    }

    const ok = await confirm({
      title: "Delete Students",
      message: `Are you sure you want to delete ${selectedIds.length} students? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    setProgress({ done: 0, total: selectedIds.length });
    setProgressOpen(true);
    setBatchUpdating(true);

    try {
      const res = await batchDeleteStudentsClient(selectedIds, {
        concurrency: 5,
        onProgress: ({ done, total }) => setProgress({ done, total }),
      });

      if (res.failed.length === 0) {
        toast.success(`Deleted ${res.success.length} students 🗑️`);
      } else {
        toast.warn(`Deleted ${res.success.length}, failed ${res.failed.length}. Check console for details.`);
        console.table(res.failed);
      }

      setSelectedIds([]);
      setShowSelection(false);
      fetchStudents();
    } catch (err) {
      console.error("Batch delete error", err);
      toast.error("Batch delete failed");
    } finally {
      setBatchUpdating(false);
    }
  };

  // Combined filtering + sorting
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (searchName && !s.name.toLowerCase().includes(searchName.toLowerCase())) return false;
        if (
          searchEnrollment &&
          !(s.enrollmentNumber || "").toLowerCase().includes(searchEnrollment.toLowerCase())
        ) return false;
        if (filterSemester && Number(s.semester) !== Number(filterSemester)) return false;
        if (filterDivision && (s.division || "") !== filterDivision) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        } else if (sortBy === "enrollment") {
          return (a.enrollmentNumber || "").localeCompare(b.enrollmentNumber || "");
        } else if (sortBy === "semester") {
          return Number(a.semester || 0) - Number(b.semester || 0);
        }
        return 0;
      });
  }, [students, searchName, searchEnrollment, filterSemester, filterDivision, sortBy]);

  const visibleStudents = useMemo(() => {
    return filteredStudents.slice(0, visibleCount);
  }, [filteredStudents, visibleCount]);


  const divisionOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.division).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [students]);

  // ---------- Select visible helpers ----------
  const visibleIds = useMemo(() => filteredStudents.map((s) => String(s._id)), [filteredStudents]);

  const areAllVisibleSelected = useMemo(() => {
    if (visibleIds.length === 0) return false;
    return visibleIds.every((id) => selectedIds.includes(id));
  }, [visibleIds, selectedIds]);

  const toggleSelectVisible = () => {
    if (areAllVisibleSelected) {
      // unselect visible
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      // add visible ids
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      setShowSelection(true);
    }
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    setShowSelection(true);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setShowSelection(false);
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-purple-700">
        📚 Student Management
      </h2>

      {/* Add single student */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md">
        <h3 className="text-lg font-semibold mb-3">➕ Add Single Student</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={newStudent.name}
            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
            className="border p-2 rounded-lg shadow"
          />
          <input
            type="text"
            placeholder="Enrollment Number"
            value={newStudent.enrollmentNumber}
            onChange={(e) =>
              setNewStudent({ ...newStudent, enrollmentNumber: e.target.value })
            }
            className="border p-2 rounded-lg shadow"
          />
          <input
            type="number"
            placeholder="Semester"
            value={newStudent.semester}
            onChange={(e) => setNewStudent({ ...newStudent, semester: e.target.value })}
            className="border p-2 rounded-lg shadow"
          />
          <input
            type="text"
            placeholder="Division (optional)"
            value={newStudent.division}
            onChange={(e) => setNewStudent({ ...newStudent, division: e.target.value })}
            className="border p-2 rounded-lg shadow"
          />
        </div>
        <button
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAddStudent}
          disabled={adding}
        >
          {adding ? "⏳ Adding..." : "➕ Add Student"}
        </button>
      </div>

      {/* Bulk upload */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md flex items-center gap-4">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="border rounded p-2"
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleBulkUpload}
          disabled={uploading}
        >
          {uploading ? "⏳ Uploading..." : "⬆️ Upload Excel"}
        </button>

      </div>

      {/* Batch controls */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setBatchModalOpen(true)}
          disabled={selectedIds.length === 0 || batchUpdating}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {batchUpdating
            ? "⏳ Updating..."
            : `🛠️ Batch Update (${selectedIds.length})`}
        </button>

        <button
          onClick={handleBatchDelete}
          disabled={selectedIds.length === 0 || batchUpdating}
          className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {batchUpdating ? "⏳ Deleting..." : `🗑️ Batch Delete (${selectedIds.length})`}
        </button>

        <button
          onClick={clearSelection}
          className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition"
        >
          Clear selection
        </button>

        <button
          onClick={toggleSelectVisible}
          className={`px-3 py-2 rounded-lg border transition ${areAllVisibleSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
        >
          {areAllVisibleSelected ? "Unselect visible" : `Select visible (${visibleIds.length})`}
        </button>

        <button
          onClick={selectAllVisible}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50 transition"
        >
          Select all visible
        </button>

      </div>

      {/* Search & filter row */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="🔍 Search by name..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="border p-2 rounded-lg shadow"
        />
        <input
          type="text"
          placeholder="🔎 Search by enrollment..."
          value={searchEnrollment}
          onChange={(e) => setSearchEnrollment(e.target.value)}
          className="border p-2 rounded-lg shadow"
        />
        <select
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          className="border p-2 rounded-lg shadow"
        >
          <option value="">🎓 All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <option key={sem} value={sem}>Semester {sem}</option>
          ))}
        </select>
        <select
          value={filterDivision}
          onChange={(e) => setFilterDivision(e.target.value)}
          className="border p-2 rounded-lg shadow"
        >
          {divisionOptions.map((div) => (
            <option key={div} value={div}>
              {div === "" ? "🏷️ All Divisions" : `Division ${div}`}
            </option>
          ))}
        </select>
      </div>

      {/* Sort controls */}
      <div className="mb-6 flex items-center gap-4">
        <label className="font-medium text-gray-700">Sort by:</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border p-2 rounded-lg"
        >
          <option value="name">Name (A → Z)</option>
          <option value="enrollment">Enrollment</option>
          <option value="semester">Semester (low → high)</option>
        </select>

        <button
          className="ml-auto px-3 py-1 bg-gray-200 rounded-lg"
          onClick={() => {
            setSearchName("");
            setSearchEnrollment("");
            setFilterSemester("");
            setFilterDivision("");
            setSortBy("name");
          }}
        >
          Reset filters
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-4">
          {error}
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-2"
            onClick={() => setError("")}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Student grid */}
      {loading ? (
        <p>⏳ Loading students...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleStudents.map((s) => {
              const sid = String(s._id);
              const isSelected = selectedIds.includes(sid);
              const isEditing = selectedStudent && selectedStudent._id === s._id;
              const isFetchingThis = editingId === s._id;

              return (
                <div
                  key={s._id}
                  className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl hover:scale-[1.02] transition"
                >
                  <div className="flex items-start gap-3">
                    {/* show checkbox only when selection mode is enabled */}
                    {showSelection && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
                          )
                        }
                        className="mt-1"
                        disabled={saving} // disable selection while saving to avoid race
                      />
                    )}

                    <div className="flex-1">
                      <div className="text-4xl mb-2">🧑‍🎓</div>

                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={selectedStudent.name}
                            onChange={(e) =>
                              setSelectedStudent((st) => ({ ...st, name: e.target.value }))
                            }
                            className="w-full border p-2 rounded mb-2"
                          />
                          <input
                            type="text"
                            value={selectedStudent.enrollmentNumber}
                            onChange={(e) =>
                              setSelectedStudent((st) => ({ ...st, enrollmentNumber: e.target.value }))
                            }
                            className="w-full border p-2 rounded mb-2"
                            placeholder="Enrollment Number"
                            disabled={saving}
                          />

                          <div className="flex gap-2 mb-2">
                            <input
                              type="number"
                              value={selectedStudent.semester}
                              onChange={(e) =>
                                setSelectedStudent((st) => ({ ...st, semester: e.target.value }))
                              }
                              className="border p-2 rounded flex-1"
                              placeholder="Semester"
                              disabled={saving}
                            />
                            <input
                              type="text"
                              value={selectedStudent.division || ""}
                              onChange={(e) =>
                                setSelectedStudent((st) => ({ ...st, division: e.target.value }))
                              }
                              className="border p-2 rounded flex-1"
                              placeholder="Division"
                              disabled={saving}
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={handleUpdate}
                              disabled={saving}
                            >
                              {saving ? "Saving..." : "💾 Save"}
                            </button>
                            <button
                              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => setSelectedStudent(null)}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-bold text-gray-800">{s.name}</h3>
                          <p className="text-sm text-gray-500">🆔 {s.enrollmentNumber}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                              🎓 Semester {s.semester}
                            </span>
                            {s.division && (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                🏷️ {s.division}
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex gap-3">
                            <button
                              className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleEdit(s._id)}
                              disabled={isFetchingThis || saving}
                            >
                              {isFetchingThis ? "Loading..." : "✏️ Edit"}
                            </button>
                            <button
                              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleDelete(s._id)}
                              disabled={saving || isFetchingThis}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleStudents.length === 0 && (
              <p className="text-gray-500 text-center col-span-full">
                🚫 No students found
              </p>
            )}
          </div>
          {/* Show More button */}
          {visibleCount < filteredStudents.length && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
              >
                Show More ({filteredStudents.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Batch modal + progress overlays */}
      <BatchUpdateModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSubmit={handleApplyBatch}
      />

      <BatchProgress
        open={progressOpen}
        done={progress.done}
        total={progress.total}
        onClose={() => setProgressOpen(false)}
      />
    </div>
  );
};

export default StudentPage;
