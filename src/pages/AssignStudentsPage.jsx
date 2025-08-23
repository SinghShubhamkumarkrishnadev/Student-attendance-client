import { useEffect, useMemo, useState } from "react";
import {
  getClasses,
  getStudents,
  assignStudentsToClass,
  removeStudentsFromClass,
} from "../services/api";
import { PlusCircle, XCircle, Search } from "lucide-react";

export default function AssignStudentsPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [error, setError] = useState("");

  // Filters / UI state
  const [searchAvailable, setSearchAvailable] = useState("");
  const [startsWith, setStartsWith] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [searchAssigned, setSearchAssigned] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  const normalizeClassesResp = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.classes)) return res.data.classes;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const normalizeStudentsResp = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data?.students)) return res.data.students;
    return [];
  };

  const fetchClasses = async () => {
    try {
      const res = await getClasses();
      setClasses(normalizeClassesResp(res));
    } catch (err) {
      console.error("fetchClasses error", err);
      setError("⚠️ Failed to load classes");
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await getStudents();
      setStudents(normalizeStudentsResp(res));
    } catch (err) {
      console.error("fetchStudents error", err);
      setError("⚠️ Failed to load students");
    }
  };

  const handleAssign = async () => {
    if (!selectedClass || selectedStudents.length === 0) return;
    try {
      await assignStudentsToClass(selectedClass, selectedStudents);
      alert("✅ Students assigned successfully!");
      setSelectedStudents([]);
      await fetchClasses();
    } catch (err) {
      console.error("handleAssign error", err);
      setError("❌ Failed to assign students");
    }
  };

  const handleRemove = async (studentId) => {
    try {
      await removeStudentsFromClass(selectedClass, [studentId]);
      alert("🗑 Student removed from class");
      await fetchClasses();
    } catch (err) {
      console.error("handleRemove error", err);
      setError("❌ Failed to remove student");
    }
  };

  const findClassById = (id) => classes.find((c) => String(c._id) === String(id));

  // Semester options from full student list
  const semesterOptions = useMemo(() => {
    const set = new Set(students.map((s) => (s.semester || "").toString()).filter(Boolean));
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [students]);

  // Filter students (search + startsWith + semester)
  const filteredAvailable = useMemo(() => {
    let list = students.slice();
    const s = (searchAvailable || "").trim().toLowerCase();

    if (s) {
      list = list.filter(
        (stu) =>
          (stu.name || "").toLowerCase().includes(s) ||
          (stu.enrollmentNumber || "").toLowerCase().includes(s)
      );
    }

    if (startsWith) {
      if (startsWith === "0-9") {
        list = list.filter((stu) => /^\d/.test((stu.name || stu.enrollmentNumber || "").trim()));
      } else {
        const l = startsWith.toLowerCase();
        list = list.filter(
          (stu) =>
            (stu.name || "").trim().toLowerCase().startsWith(l) ||
            (stu.enrollmentNumber || "").trim().toLowerCase().startsWith(l)
        );
      }
    }

    if (semesterFilter) {
      list = list.filter((stu) => String(stu.semester || "") === String(semesterFilter));
    }

    if (divisionFilter) {
      list = list.filter((stu) => String(stu.division || "") === String(divisionFilter));
    }

    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }, [students, searchAvailable, startsWith, semesterFilter, divisionFilter]);

  const totalCount = students.length;
  const availableCount = filteredAvailable.length;
  const selectedCount = selectedStudents.length;
  const assignedCount = selectedClass ? (findClassById(selectedClass)?.students?.length || 0) : 0;

  const areAllVisibleSelected = useMemo(() => {
    if (filteredAvailable.length === 0) return false;
    const filteredIds = filteredAvailable.map((s) => String(s._id));
    return filteredIds.every((id) => selectedStudents.includes(id));
  }, [filteredAvailable, selectedStudents]);

  const handleToggleSelectVisible = () => {
    const visibleIds = filteredAvailable.map((s) => String(s._id));
    if (areAllVisibleSelected) {
      setSelectedStudents((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedStudents((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectAllByFilter = () => {
    const allFilteredIds = filteredAvailable.map((s) => String(s._id));
    setSelectedStudents((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const divisionOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.division).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [students]);


  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2 text-green-700">
        👨‍🎓 Assign Students to Classes
      </h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-xl shadow mb-6">
          {error}
        </div>
      )}

      {/* Select Class */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md">
        <label className="font-medium text-gray-700 mb-2 block">📌 Select Class</label>
        <select
          className="border px-4 py-2 rounded-lg w-full shadow-sm"
          onChange={(e) => {
            setSelectedClass(e.target.value || null);
            setSelectedStudents([]);
          }}
          value={selectedClass || ""}
        >
          <option value="">-- Select a Class --</option>
          {classes.map((cls) => (
            <option key={String(cls._id)} value={String(cls._id)}>
              {cls.classId} - {cls.className} ({cls.division})
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex gap-4 items-center">
          <div className="bg-white p-3 rounded-lg shadow text-sm">
            <div className="text-xs text-gray-500">Total Students</div>
            <div className="font-semibold text-gray-800">{totalCount}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow text-sm">
            <div className="text-xs text-gray-500">Matching Filters</div>
            <div className="font-semibold text-gray-800">{availableCount}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow text-sm">
            <div className="text-xs text-gray-500">Selected</div>
            <div className="font-semibold text-gray-800">{selectedCount}</div>
          </div>
          {selectedClass && (
            <div className="bg-white p-3 rounded-lg shadow text-sm">
              <div className="text-xs text-gray-500">Assigned to class</div>
              <div className="font-semibold text-gray-800">{assignedCount}</div>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-600">
          Tip: Use filters to narrow students, then "Select visible" or "Select all by filter".
        </div>
      </div>

      {/* Selection Panel */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">✅ Select Students</h2>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchAvailable}
                onChange={(e) => setSearchAvailable(e.target.value)}
                className="border pl-9 pr-4 py-2 rounded-xl w-full shadow-sm focus:ring-2 focus:ring-green-400 outline-none"
              />
            </div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg"
            >
              {semesterOptions.map((sem, i) => (
                <option key={i} value={sem}>
                  {sem === "" ? "All Semesters" : `Semester ${sem}`}
                </option>
              ))}
            </select>

            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg"
            >
              {divisionOptions.map((div) => (
                <option key={div} value={div}>
                  {div === "" ? "All Divisions" : `Division ${div}`}
                </option>
              ))}
            </select>


            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={areAllVisibleSelected}
                  onChange={handleToggleSelectVisible}
                  className="w-4 h-4"
                />
                <span className="text-sm">Select visible</span>
              </label>

              <button
                onClick={handleSelectAllByFilter}
                className="px-3 py-2 bg-green-50 border rounded-lg text-sm hover:bg-green-100"
              >
                Select all by filter
              </button>
            </div>
          </div>

          {/* Student Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredAvailable.length === 0 ? (
              <p className="text-gray-500">🚫 No students match the filters.</p>
            ) : (
              filteredAvailable.map((stu) => {
                const sid = String(stu._id);
                const checked = selectedStudents.includes(sid);
                return (
                  <label
                    key={sid}
                    className={`cursor-pointer p-4 rounded-2xl border shadow-md transform transition hover:scale-[1.02] ${checked ? "bg-green-100 border-green-500" : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedStudents((prev) =>
                            prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
                          )
                        }
                      />
                      <div>
                        <p className="font-medium text-gray-800">{stu.name}</p>
                        <p className="text-sm text-gray-500">🆔 {stu.enrollmentNumber}</p>
                        {stu.semester && <p className="text-xs text-gray-400">Sem: {stu.semester}</p>}
                        {stu.division && <p className="text-xs text-gray-400">Div: {stu.division}</p>}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <button
            onClick={handleAssign}
            className="mt-6 bg-green-600 text-white px-5 py-2 rounded-xl shadow hover:bg-green-700 transition flex items-center gap-2"
            disabled={selectedStudents.length === 0}
          >
            <PlusCircle size={18} /> Assign Selected Students ({selectedStudents.length})
          </button>
        </div>
      )}

      {/* Already Assigned Students */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">🎓 Assigned Students</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search assigned students..."
              value={searchAssigned}
              onChange={(e) => setSearchAssigned(e.target.value)}
              className="border pl-9 pr-4 py-2 rounded-xl w-full shadow-sm focus:ring-2 focus:ring-green-400 outline-none"
            />
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {findClassById(selectedClass)
              ?.students
              ?.filter(
                (stu) =>
                  (stu.name || "").toLowerCase().includes(searchAssigned.toLowerCase()) ||
                  (stu.enrollmentNumber || "").toLowerCase().includes(searchAssigned.toLowerCase())
              )
              .map((stu) => (
                <li
                  key={String(stu._id)}
                  className="flex justify-between items-center p-4 rounded-2xl border shadow-md bg-white transform transition hover:scale-[1.02] hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-800">{stu.name}</p>
                    <p className="text-sm text-gray-500">🆔 {stu.enrollmentNumber}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(String(stu._id))}
                    className="text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <XCircle size={16} /> Remove
                  </button>
                </li>
              ))}

            {(!findClassById(selectedClass)?.students?.length) && (
              <p className="text-gray-500 text-center">🚫 No students assigned yet</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
