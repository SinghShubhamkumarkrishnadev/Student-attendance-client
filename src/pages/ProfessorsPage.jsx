import { useEffect, useMemo, useState } from "react";
import { addProfessor, getProfessors, updateProfessor, deleteProfessor } from "../services/api";
import { PlusCircle, Edit, XCircle, User, BookOpen, Loader2, Filter, Search, RefreshCw, SortAsc, SortDesc } from "lucide-react";

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  // New UI state
  const [search, setSearch] = useState("");
  const [startsWith, setStartsWith] = useState(""); // "", "A".."Z", "0-9"
  const [sortBy, setSortBy] = useState("name"); // "name" | "username"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getProfessors();
      // keep your existing response shape usage
      setProfessors(res?.data?.professors || []);
    } catch (err) {
      console.error(err);
      setError("⚠️ Failed to load professors");
      setProfessors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfessor = async (e) => {
    e.preventDefault();
    try {
      await addProfessor(form);
      setForm({ name: "", username: "", password: "" });
      fetchProfessors();
    } catch {
      setError("❌ Failed to add professor");
    }
  };

  const handleUpdateProfessor = async (id) => {
    try {
      const prof = professors.find((p) => p._id === id);
      await updateProfessor(id, { name: prof.name, username: prof.username });
      setEditId(null);
      fetchProfessors();
    } catch {
      setError("❌ Failed to update professor");
    }
  };

  const handleDeleteProfessor = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteProfessor(id);
      fetchProfessors();
    } catch {
      setError("❌ Failed to delete professor");
    }
  };

  // -------- Filtering + searching + sorting --------
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    let list = Array.isArray(professors) ? professors.slice() : [];

    // search by name or username
    if (s) {
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(s) ||
          (p.username || "").toLowerCase().includes(s)
      );
    }

    // startsWith filter
    if (startsWith) {
      if (startsWith === "0-9") {
        list = list.filter((p) => /^\d/.test((p.name || "").trim()));
      } else {
        const letter = startsWith.toLowerCase();
        list = list.filter((p) => (p.name || "").trim().toLowerCase().startsWith(letter));
      }
    }

    // sorting
    list.sort((a, b) => {
      const av = (a[sortBy] || "").toString().toLowerCase();
      const bv = (b[sortBy] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [professors, search, startsWith, sortBy, sortDir]);

  const resetFilters = () => {
    setSearch("");
    setStartsWith("");
    setSortBy("name");
    setSortDir("asc");
  };

  const letters = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "0-9"];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <h1 className="text-3xl font-extrabold text-purple-700 mb-6 flex items-center gap-2">
        👩‍🏫 Manage Professors
      </h1>

      {error && <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}

      {/* Controls: Search + Filters + Sort */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-purple-600" />
            <select
              value={startsWith}
              onChange={(e) => setStartsWith(e.target.value)}
              className="border rounded-lg px-3 py-2"
              title="Filter by first letter of name"
            >
              {letters.map((l, idx) => (
                <option key={idx} value={l}>
                  {l === "" ? "All" : l}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2"
              title="Sort field"
            >
              <option value="name">Sort by Name</option>
              <option value="username">Sort by Username</option>
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
              onClick={resetFilters}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              title="Reset"
            >
              <RefreshCw size={16} /> Reset
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing <span className="font-semibold">{filtered.length}</span> of{" "}
          <span className="font-semibold">{Array.isArray(professors) ? professors.length : 0}</span>{" "}
          professors
        </div>
      </div>

      {/* Add Professor Form */}
      <div className="bg-purple-50 p-6 rounded-2xl shadow-md mb-8">
        <h2 className="text-lg font-semibold text-purple-700 mb-4 flex items-center gap-2">
          <PlusCircle /> Add New Professor
        </h2>
        <form onSubmit={handleAddProfessor} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="👨‍🏫 Professor Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            required
          />
          <input
            type="text"
            placeholder="🔑 Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            required
          />
          <input
            type="password"
            placeholder="🔒 Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            required
          />
          <button
            type="submit"
            className="md:col-span-3 bg-purple-600 hover:bg-purple-700 transition text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <PlusCircle /> Add Professor
          </button>
        </form>
      </div>

      {/* Professors List */}
      {loading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="animate-spin text-purple-600" size={32} />
          <span className="ml-2">Loading Professors...</span>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600 text-center">📭 No professors match your filters</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((prof) => (
            <div
              key={prof._id}
              className="bg-white shadow-md rounded-xl p-5 border hover:shadow-lg transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <User className="text-purple-600" size={32} />
                {editId === prof._id ? (
                  <input
                    value={prof.name}
                    onChange={(e) =>
                      setProfessors((prev) =>
                        prev.map((p) => (p._id === prof._id ? { ...p, name: e.target.value } : p))
                      )
                    }
                    className="px-2 py-1 border rounded w-full"
                  />
                ) : (
                  <h3 className="text-lg font-bold text-gray-800 truncate">{prof.name}</h3>
                )}
              </div>
              <p className="text-gray-600 mb-4 flex items-center gap-2">
                <BookOpen size={18} className="text-purple-500" />
                {editId === prof._id ? (
                  <input
                    value={prof.username}
                    onChange={(e) =>
                      setProfessors((prev) =>
                        prev.map((p) =>
                          p._id === prof._id ? { ...p, username: e.target.value } : p
                        )
                      )
                    }
                    className="px-2 py-1 border rounded w-full"
                  />
                ) : (
                  <span className="truncate">{prof.username}</span>
                )}
              </p>
              <div className="flex gap-2">
                {editId === prof._id ? (
                  <>
                    <button
                      onClick={() => handleUpdateProfessor(prof._id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      💾 Save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      ❌ Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditId(prof._id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                    >
                      <Edit size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProfessor(prof._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                    >
                      <XCircle size={16} /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
