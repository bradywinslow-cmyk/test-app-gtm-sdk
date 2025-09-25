import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";

// --- Types ---
export type User = {
  id: string;
  name: string;
  email: string;
};

export type Booking = {
  id: string;
  userId: string;
  service: "Walk" | "Drop-in" | "Overnight";
  date: string; // ISO date (yyyy-mm-dd)
  time: string; // HH:MM
  durationMins: number;
  pets: number;
  notes?: string;
  createdAt: string; // ISO timestamp
};

// --- Auth Context (very lightweight; swap for your real auth later) ---
interface AuthContextValue {
  user: User | null;
  login: (email: string, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("dw_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = (email: string, name: string) => {
    const fakeUser: User = {
      id: crypto.randomUUID(),
      name: name.trim() || email.split("@")[0],
      email,
    };
    localStorage.setItem("dw_user", JSON.stringify(fakeUser));
    setUser(fakeUser);
  };

  const logout = () => {
    localStorage.removeItem("dw_user");
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- Booking storage helpers ---
const BOOKINGS_KEY = "dw_bookings";

function readBookings(): Booking[] {
  const raw = localStorage.getItem(BOOKINGS_KEY);
  return raw ? (JSON.parse(raw) as Booking[]) : [];
}

function writeBookings(all: Booking[]) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(all));
}

function createBooking(data: Omit<Booking, "id" | "createdAt">): Booking {
  const booking: Booking = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = readBookings();
  all.push(booking);
  writeBookings(all);
  return booking;
}

function listUserBookings(userId: string): Booking[] {
  return readBookings().filter((b) => b.userId === userId);
}

// --- UI Components ---
function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="w-full border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="font-semibold text-lg">Winston's Walkers</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link className="hover:underline" to="/services">Services</Link>
          <Link className="hover:underline" to="/pricing">Pricing</Link>
          <Link className="hover:underline" to="/testimonials">Testimonials</Link>
          <Link className="hover:underline" to="/book">Book</Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile" className="text-sm text-gray-700">{user.name}</Link>
              <button onClick={logout} className="px-3 py-1 rounded-full border hover:bg-gray-50 text-sm text-white">
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="px-3 py-1 rounded-full border bg-black text-white text-sm">
              Create profile / Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function Home() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="rounded-2xl border p-8 bg-gradient-to-br from-white to-gray-50">
        <h1 className="text-3xl font-semibold mb-2">Reliable dog walking, right when you need it</h1>
        <p className="text-gray-600 mb-6">Book trusted walkers for daily strolls, drop-ins, or overnight care.</p>
        <div className="flex gap-3">
          <Link to="/services" className="px-4 py-2 rounded-full border">Explore services</Link>
          <Link to="/book" className="px-4 py-2 rounded-full bg-black text-white">Book now</Link>
        </div>
      </div>
    </main>
  );
}

function Services() {
  const services = [
    { title: "Walk", desc: "30–60 min neighborhood walks to burn energy and sniff the roses." },
    { title: "Drop-in", desc: "Short home visits for water, feeding, and quick potty breaks." },
    { title: "Overnight", desc: "In-home care so your pup keeps their routine while you travel." },
  ];
  return (
    <main className="max-w-6xl mx-auto p-6 grid md:grid-cols-3 gap-4">
      {services.map((s) => (
        <div key={s.title} className="border rounded-2xl p-6">
          <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
          <p className="text-gray-600 text-sm">{s.desc}</p>
        </div>
      ))}
    </main>
  );
}

function Pricing() {
  const rows = [
    { service: "Walk (30 min)", price: "$20" },
    { service: "Walk (60 min)", price: "$32" },
    { service: "Drop-in (20 min)", price: "$18" },
    { service: "Overnight (per night)", price: "$85" },
  ];
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Pricing</h2>
      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Service</th>
              <th className="p-3">Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.service} className="border-t">
                <td className="p-3">{r.service}</td>
                <td className="p-3">{r.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Testimonials() {
  const items = [
    { name: "Bailey & Max", text: "Our golden can’t wait for his walker—best part of his day!" },
    { name: "Luna’s family", text: "Super reliable and communicative. The photo updates are everything." },
    { name: "Ollie", text: "They handled our reactive pup with patience and skill. 10/10." },
  ];
  return (
    <main className="max-w-4xl mx-auto p-6 grid gap-4 md:grid-cols-3">
      {items.map((t) => (
        <div key={t.name} className="border rounded-2xl p-5">
          <p className="mb-2">“{t.text}”</p>
          <p className="text-sm text-gray-600">— {t.name}</p>
        </div>
      ))}
    </main>
  );
}

// --- Auth pages ---
function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (user) navigate("/profile");
  }, [user, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return alert("Please enter your email.");
    login(email, name);
    navigate("/profile");
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1" htmlFor='name'>Name</label>
          <input
            className="w-full border rounded-xl p-2"
            placeholder="Fido’s human"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            name="name"
            id="name"
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor='email'>Email</label>
          <input
            className="w-full border rounded-xl p-2"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            name="email"
            id="email"
          />
        </div>
        <button className="w-full px-4 py-2 rounded-xl bg-black text-white">Continue</button>
      </form>
    </main>
  );
}

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  const bookings = listUserBookings(user.id);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <section className="border rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-2">Your profile</h2>
        <p><span className="text-gray-600">Name:</span> {user.name}</p>
        <p><span className="text-gray-600">Email:</span> {user.email}</p>
      </section>

      <section className="border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Your bookings</h3>
          <Link to="/book" className="text-sm underline">New booking</Link>
        </div>
        {bookings.length === 0 ? (
          <p className="text-gray-600">No bookings yet.</p>
        ) : (
          <ul className="divide-y">
            {bookings.map((b) => (
              <li key={b.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{b.service}</p>
                    <p className="text-sm text-gray-600">{b.date} at {b.time} • {b.durationMins} mins • {b.pets} {b.pets === 1 ? "pet" : "pets"}</p>
                    {b.notes && <p className="text-sm text-gray-600">Notes: {b.notes}</p>}
                  </div>
                  <span className="text-xs text-gray-500">Booked {new Date(b.createdAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// --- Booking ---
function Book() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [service, setService] = useState<Booking["service"]>("Walk");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMins, setDurationMins] = useState(30);
  const [pets, setPets] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return alert("Please choose a date and time.");
    setSaving(true);
    const booking = createBooking({ userId: user.id, service, date, time, durationMins, pets, notes });
    setSaving(false);
    navigate("/profile");
    alert(`Booking confirmed for ${booking.date} at ${booking.time}.`);
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Book a service</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Service</label>
          <select className="w-full border rounded-xl p-2" value={service} onChange={(e) => setService(e.target.value as Booking["service"])}>
            <option>Walk</option>
            <option>Drop-in</option>
            <option>Overnight</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input className="w-full border rounded-xl p-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Time</label>
            <input className="w-full border rounded-xl p-2" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Duration (mins)</label>
            <input
              className="w-full border rounded-xl p-2"
              type="number"
              min={20}
              max={240}
              step={10}
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1"># of pets</label>
            <input
              className="w-full border rounded-xl p-2"
              type="number"
              min={1}
              max={6}
              value={pets}
              onChange={(e) => setPets(Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Notes</label>
          <textarea className="w-full border rounded-xl p-2" rows={3} placeholder="Gate code, special instructions…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button disabled={saving} className="w-full px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">
          {saving ? "Saving…" : "Confirm booking"}
        </button>
      </form>
    </main>
  );
}

// --- Route Guard ---
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// --- App Shell ---
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-white text-gray-900">
          <NavBar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/book"
              element={
                <ProtectedRoute>
                  <Book />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
