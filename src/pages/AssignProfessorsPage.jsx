// src/pages/AssignProfessorsPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getClasses,
  getProfessors,
  assignProfessorsToClass,
  removeProfessorsFromClass,
} from "../services/api";
import { PlusCircle, XCircle, Search, RefreshCw } from "lucide-react";

export default function AssignProfessorsPage() {
  const [classes, setClasses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null); // will store _id string
  const [selectedProfs, setSelectedProfs] = useState([]); // array of _id strings
  const [error, setError] = useState("");
  const [searchAvailable, setSearchAvailable] = useState("");
  const [searchAssigned, setSearchAssigned] = useState("");
  const [startsWith, setStartsWith] = useState("");

  useEffect(() => {
    fetchClasses();
    fetchProfessors();
  }, []);

  // Accept either an array or axios-like response
  const normalizeClassesResp = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.classes)) return res.data.classes;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const normalizeProfessorsResp = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.professors)) return res.data.professors;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const fetchClasses = async () => {
    try {
      const res = await getClasses();
      const list = normalizeClassesResp(res);
      setClasses(list);
    } catch (err) {
      console.error("fetchClasses error", err);
      setError("⚠️ Failed to load classes");
    }
  };

  const fetchProfessors = async () => {
    try {
      const res = await getProfessors();
      const list = normalizeProfessorsResp(res);
      setProfessors(list);
    } catch (err) {
      console.error("fetchProfessors error", err);
      setError("⚠️ Failed to load professors");
    }
  };

  const handleAssign = async () => {
    if (!selectedClass || selectedProfs.length === 0) return;
    try {
      await assignProfessorsToClass(selectedClass, selectedProfs);
      alert("✅ Professors assigned successfully!");
      setSelectedProfs([]);
      await fetchClasses(); // refresh classes to show assigned professors (populated)
    } catch (err) {
      console.error("handleAssign error", err);
      setError("❌ Failed to assign professors");
    }
  };

  const handleRemove = async (profId) => {
    try {
      await removeProfessorsFromClass(selectedClass, [profId]);
      alert("🗑 Professor removed from class");
      await fetchClasses();
    } catch (err) {
      console.error("handleRemove error", err);
      setError("❌ Failed to remove professor");
    }
  };

  // helper to find class by id string robustly
  const findClassById = (id) => classes.find((c) => String(c._id) === String(id));

  // Available professors (all professors; no "assigned" flag on professor itself)
  // We assume professors list is the source of truth and assigned ones are shown inside class.professors
  const availableProfessors = useMemo(() => professors.slice(), [professors]);

  // filtered list based on search + startsWith (+ optional divisionFilter)
  const filteredAvailable = useMemo(() => {
    let list = professors.slice();
    const s = (searchAvailable || "").trim().toLowerCase();

    if (s) {
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(s) ||
          (p.username || "").toLowerCase().includes(s)
      );
    }

    if (startsWith) {
      if (startsWith === "0-9") {
        list = list.filter((p) => /^\d/.test((p.name || p.username || "").trim()));
      } else {
        const l = startsWith.toLowerCase();
        list = list.filter(
          (p) =>
            (p.name || "").trim().toLowerCase().startsWith(l) ||
            (p.username || "").trim().toLowerCase().startsWith(l)
        );
      }
    }

    // Removed division filtering

    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }, [professors, searchAvailable, startsWith, selectedClass]);


  // counts
  const totalCount = professors.length;
  const selectedCount = selectedProfs.length;
  const assignedCount = selectedClass ? (findClassById(selectedClass)?.professors?.length || 0) : 0;

  // when switching class, clear selected professors to avoid accidental assign
  const handleClassChange = (value) => {
    setSelectedClass(value || null);
    setSelectedProfs([]);
    setSearchAssigned("");
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2 text-purple-700">
        👩‍🏫 Assign Professors to Classes
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
          onChange={(e) => handleClassChange(e.target.value)}
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

      {/* Summary / counts */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex gap-4 items-center">
          <div className="bg-white p-3 rounded-lg shadow text-sm">
            <div className="text-xs text-gray-500">Total Professors</div>
            <div className="font-semibold text-gray-800">{totalCount}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow text-sm">
            <div className="text-xs text-gray-500">Selected</div>
            <div className="font-semibold text-gray-800">{selectedCount}</div>
          </div>
          {selectedClass && (
            <div className="bg-white p-3 rounded-lg shadow text-sm">
              <div className="text-xs text-gray-500">Assigned to selected class</div>
              <div className="font-semibold text-gray-800">{assignedCount}</div>
            </div>
          )}
        </div>
      </div>

      {/* Professors Selection */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">✅ Select Professors</h2>

          {/* Filters row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search professors..."
                className="border pl-10 pr-4 py-2 rounded-xl w-full shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
                value={searchAvailable}
                onChange={(e) => setSearchAvailable(e.target.value)}
              />
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredAvailable.length === 0 ? (
              <p className="text-gray-500">🚫 No professors match the filters.</p>
            ) : (
              filteredAvailable.map((prof) => {
                const profIdStr = String(prof._id);
                const checked = selectedProfs.includes(profIdStr);
                return (
                  <label
                    key={profIdStr}
                    className={`border rounded-xl px-4 py-3 cursor-pointer flex items-center gap-2 shadow-sm transition ${checked ? "bg-purple-100 border-purple-500" : "hover:bg-gray-50"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedProfs((prev) =>
                          prev.includes(profIdStr) ? prev.filter((id) => id !== profIdStr) : [...prev, profIdStr]
                        )
                      }
                    />
                    <span className="font-medium text-gray-700">{prof.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{prof.username}</span>
                  </label>
                );
              })
            )}
          </div>

          <button
            onClick={handleAssign}
            className="mt-6 bg-purple-600 text-white px-5 py-2 rounded-xl shadow hover:bg-purple-700 transition flex items-center gap-2"
            disabled={selectedProfs.length === 0}
          >
            <PlusCircle size={18} /> Assign Selected Professors ({selectedProfs.length})
          </button>
        </div>
      )}

      {/* Already Assigned Professors */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">🎓 Assigned Professors</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search assigned professors..."
              className="border pl-10 pr-4 py-2 rounded-xl w-full shadow-sm"
              value={searchAssigned}
              onChange={(e) => setSearchAssigned(e.target.value)}
            />
          </div>

          <ul className="space-y-3">
            {findClassById(selectedClass)
              ?.professors
              ?.filter((prof) => (prof.name || "").toLowerCase().includes(searchAssigned.toLowerCase()))
              .map((prof) => (
                <li
                  key={String(prof._id)}
                  className="flex justify-between items-center border p-3 rounded-xl shadow-sm hover:bg-gray-50 transition"
                >
                  <p className="font-medium text-gray-800">{prof.name}</p>
                  <button
                    onClick={() => handleRemove(String(prof._id))}
                    className="text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <XCircle size={16} /> Remove
                  </button>
                </li>
              ))}

            {(!findClassById(selectedClass)?.professors?.length) && (
              <p className="text-gray-500 text-center">🚫 No professors assigned yet</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
