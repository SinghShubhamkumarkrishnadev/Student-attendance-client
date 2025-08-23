import React, { useEffect, useState } from "react";
import {
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
} from "../services/api";

const StudentPage = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  // filters / search / sort
  const [searchName, setSearchName] = useState("");
  const [searchEnrollment, setSearchEnrollment] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | enrollment | semester
  const [filterDivision, setFilterDivision] = useState("");

  // Fetch all students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data || []);
    } catch (err) {
      console.error("Error fetching students:", err);
      alert("Failed to fetch students");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Handle edit click
  const handleEdit = async (id) => {
    try {
      const student = await getStudentById(id);
      const s = student?.student || student;
      setSelectedStudent(s);
    } catch (err) {
      console.error("Error fetching student:", err);
    }
  };

  // Handle update
  const handleUpdate = async () => {
    try {
      await updateStudent(selectedStudent._id, {
        name: selectedStudent.name,
        semester: selectedStudent.semester,
        division: selectedStudent.division,
      });
      alert("✅ Student updated!");
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      console.error("Error updating student:", err);
      alert("❌ Failed to update student");
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ Are you sure you want to delete this student?"))
      return;
    try {
      await deleteStudent(id);
      alert("🗑️ Student deleted!");
      fetchStudents();
    } catch (err) {
      console.error("Error deleting student:", err);
      alert("❌ Failed to delete student");
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!file) return alert("📂 Please select an Excel file first!");
    try {
      await bulkUploadStudents(file);
      alert("✅ Bulk upload successful!");
      setFile(null);
      fetchStudents();
    } catch (err) {
      console.error("Error bulk uploading:", err);
      alert("❌ Bulk upload failed");
    }
  };

  // Combined filtering + sorting
  const filteredStudents = students
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


  const divisionOptions = React.useMemo(() => {
    const set = new Set(students.map((s) => s.division).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [students]);



  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-purple-700">
        📚 Student Management
      </h2>

      {/* Bulk upload */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md flex items-center gap-4">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="border rounded p-2"
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
          onClick={handleBulkUpload}
        >
          ⬆️ Upload Excel
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

      {/* Edit form */}
      {selectedStudent && (
        <div className="mb-6 border p-6 rounded-2xl bg-yellow-50 shadow-md">
          <h3 className="font-semibold mb-4 text-lg">✏️ Edit Student</h3>
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              value={selectedStudent.name}
              onChange={(e) =>
                setSelectedStudent({ ...selectedStudent, name: e.target.value })
              }
              placeholder="Name"
              className="border p-2 rounded-lg flex-1"
            />
            <input
              type="number"
              value={selectedStudent.semester}
              onChange={(e) =>
                setSelectedStudent({
                  ...selectedStudent,
                  semester: e.target.value,
                })
              }
              placeholder="Semester"
              className="border p-2 rounded-lg flex-1"
            />
            <input
              type="text"
              value={selectedStudent.division || ""}
              onChange={(e) =>
                setSelectedStudent({ ...selectedStudent, division: e.target.value })
              }
              placeholder="Division"
              className="border p-2 rounded-lg flex-1"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
              onClick={handleUpdate}
            >
              💾 Save
            </button>
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition"
              onClick={() => setSelectedStudent(null)}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Student grid */}
      {loading ? (
        <p>⏳ Loading students...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((s) => (
            <div
              key={s._id}
              className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl hover:scale-[1.02] transition cursor-pointer"
            >
              <div className="text-4xl mb-2">🧑‍🎓</div>
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
                  className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                  onClick={() => handleEdit(s._id)}
                >
                  ✏️ Edit
                </button>
                <button
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  onClick={() => handleDelete(s._id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}

          {filteredStudents.length === 0 && (
            <p className="text-gray-500 text-center col-span-full">
              🚫 No students found
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentPage;
