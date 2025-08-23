import { useEffect, useMemo, useState } from "react";
import {
  createClass,
  getClasses,
  updateClass,
  deleteClass,
} from "../services/api";
import {
  PlusCircle,
  Edit,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  SortAsc,
  SortDesc,
} from "lucide-react";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [classForm, setClassForm] = useState({
    className: "",
    division: "",
  });
  const [editClassId, setEditClassId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // New UI state
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [startsWith, setStartsWith] = useState("");
  const [sortBy, setSortBy] = useState("classId");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getClasses();
      setClasses(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Error fetching classes", err);
      setError("⚠️ Failed to load classes");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await createClass({
        className: classForm.className,
        division: classForm.division,
      });
      setClassForm({ className: "", division: "" });
      fetchClasses();
    } catch (err) {
      console.error("Error adding class", err);
      setError("❌ Failed to add class");
    }
  };

  const handleUpdateClass = async (id) => {
    try {
      const cls = classes.find((c) => c._id === id);
      if (!cls) return;
      await updateClass(id, {
        className: cls.className,
        division: cls.division,
      });
      setEditClassId(null);
      fetchClasses();
    } catch (err) {
      console.error("Error updating class", err);
      setError("❌ Failed to update class");
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await deleteClass(id);
      fetchClasses();
    } catch (err) {
      console.error("Error deleting class", err);
      setError("❌ Failed to delete class");
    }
  };

  const letters = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "0-9"];

  const divisionOptions = useMemo(() => {
    const set = new Set((classes || []).map((c) => (c.division || "").trim()).filter(Boolean));
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [classes]);

  const filtered = useMemo(() => {
    let list = Array.isArray(classes) ? classes.slice() : [];
    const s = search.trim().toLowerCase();

    if (s) {
      list = list.filter((c) => {
        const id = (c.classId || "").toString().toLowerCase();
        const name = (c.className || "").toLowerCase();
        return id.includes(s) || name.includes(s);
      });
    }
    if (divisionFilter) {
      list = list.filter((c) => (c.division || "") === divisionFilter);
    }
    if (startsWith) {
      if (startsWith === "0-9") {
        list = list.filter((c) => /^\d/.test((c.classId || c.className || "").toString().trim()));
      } else {
        const l = startsWith.toLowerCase();
        list = list.filter((c) =>
          ((c.classId || "").toString().trim().toLowerCase().startsWith(l)) ||
          ((c.className || "").trim().toLowerCase().startsWith(l))
        );
      }
    }
    list.sort((a, b) => {
      const av = (a[sortBy] || "").toString().toLowerCase();
      const bv = (b[sortBy] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [classes, search, divisionFilter, startsWith, sortBy, sortDir]);

  const resetControls = () => {
    setSearch("");
    setDivisionFilter("");
    setStartsWith("");
    setSortBy("classId");
    setSortDir("asc");
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <h1 className="text-2xl font-bold text-purple-700 mb-6">🏫 Manage Classes</h1>

      {error && (
        <div className="mb-4 bg-red-100 text-red-700 p-2 rounded">{error}</div>
      )}

      {/* Controls: Search + Filters + Sort */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Class ID or Class Name..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-purple-600" />
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
              title="Filter by division"
            >
              {divisionOptions.map((d, i) => (
                <option key={i} value={d}>
                  {d === "" ? "All Divisions" : `Division ${d}`}
                </option>
              ))}
            </select>

            <select
              value={startsWith}
              onChange={(e) => setStartsWith(e.target.value)}
              className="border rounded-lg px-3 py-2"
              title="Filter by first letter/number"
            >
              {letters.map((l, i) => (
                <option key={i} value={l}>
                  {l === "" ? "Any Letter/Number" : l}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2"
              title="Sort by"
            >
              <option value="classId">Sort by Class ID</option>
              <option value="className">Sort by Class Name</option>
              <option value="division">Sort by Division</option>
            </select>

            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              title="Toggle sort direction"
            >
              {sortDir === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
              {sortDir.toUpperCase()}
            </button>

            <button
              onClick={resetControls}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              title="Reset"
            >
              <RefreshCw size={16} /> Reset
            </button>
          </div>
        </div>

        <div className="mt-1 text-sm text-gray-600">
          Showing <span className="font-semibold">{filtered.length}</span> of{" "}
          <span className="font-semibold">{Array.isArray(classes) ? classes.length : 0}</span> classes
        </div>
      </div>

      {/* Add Class Form */}
      <form
        onSubmit={handleAddClass}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border"
      >
        <input
          type="text"
          placeholder="Class Name (e.g., Computer Science)"
          value={classForm.className}
          onChange={(e) => setClassForm({ ...classForm, className: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
          required
        />
        <input
          type="text"
          placeholder="Division (e.g., A)"
          value={classForm.division}
          onChange={(e) => setClassForm({ ...classForm, division: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
          required
        />
        <button
          type="submit"
          className="md:col-span-3 flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <PlusCircle size={18} /> Add Class
        </button>
      </form>

      {/* Classes List */}
      {loading ? (
        <p className="text-gray-500">⏳ Loading classes...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">🚫 No classes match your filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow border bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-purple-100 text-left">
                <th className="p-3">🆔 Class ID</th>
                <th className="p-3">🏫 Class Name</th>
                <th className="p-3">📌 Division</th>
                <th className="p-3">⚙️ Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cls) => (
                <tr key={cls._id} className="border-b hover:bg-gray-50 transition">
                  {/* Class ID always displayed as non-editable text */}
                  <td className="p-3">{cls.classId}</td>

                  <td className="p-3">
                    {editClassId === cls._id ? (
                      <input
                        value={cls.className}
                        onChange={(e) =>
                          setClasses((prev) =>
                            prev.map((c) =>
                              c._id === cls._id ? { ...c, className: e.target.value } : c
                            )
                          )
                        }
                        className="px-2 py-1 border rounded-lg"
                      />
                    ) : (
                      cls.className
                    )}
                  </td>

                  <td className="p-3">
                    {editClassId === cls._id ? (
                      <input
                        value={cls.division}
                        onChange={(e) =>
                          setClasses((prev) =>
                            prev.map((c) =>
                              c._id === cls._id ? { ...c, division: e.target.value } : c
                            )
                          )
                        }
                        className="px-2 py-1 border rounded-lg"
                      />
                    ) : (
                      cls.division
                    )}
                  </td>

                  <td className="p-3 flex gap-2">
                    {editClassId === cls._id ? (
                      <>
                        <button
                          onClick={() => handleUpdateClass(cls._id)}
                          className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1"
                        >
                          ✅ Save
                        </button>
                        <button
                          onClick={() => setEditClassId(null)}
                          className="px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 flex items-center gap-1"
                        >
                          <XCircle size={16} /> Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditClassId(cls._id)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          <Edit size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls._id)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <XCircle size={16} /> Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
