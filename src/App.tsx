import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// --- Types ---
export type User = {
  id: string;
  name: string;
  email: string;
};

export type BookingRow = {
  id: string;
  user_id: string;
  service: "Walk" | "Drop-in" | "Overnight";
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  duration_mins: number;
  pets: number;
  notes?: string | null;
  created_at: string;
};

// --- Supabase Client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnon);

// --- Auth Context (Supabase) ---
interface AuthContextValue {
  user: User | null;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, name: (u.user_metadata?.name as string) ?? (u.email as string), email: u.email as string } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, name: (u.user_metadata?.name as string) ?? (u.email as string), email: u.email as string } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    const u = data.user;
    if (u) {
      await supabase.from("profiles").upsert({ id: u.id, email: u.email, name: name ?? null });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo(() => ({ user, signUp, signIn, signOut }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- Data helpers (Supabase) ---
async function createBooking(data: Omit<BookingRow, "id" | "created_at">): Promise<BookingRow> {
  const { data: rows, error } = await supabase.from("bookings").insert(data).select("*").limit(1);
  if (error) throw error;
  return rows![0] as BookingRow;
}

async function listUserBookings(userId: string): Promise<BookingRow[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookingRow[];
}

// --- UI Components ---
function NavBar() {
  const { user, signOut } = useAuth();
  return (
    <nav className="w-full border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="font-semibold text-lg">Happy Trails</span>
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
              <button onClick={signOut} className="px-3 py-1 rounded-full border hover:bg-gray-50 text-sm">Log out</button>
            </>
          ) : (
            <Link to="/login" className="px-3 py-1 rounded-full border bg-black text-white text-sm">Create profile / Login</Link>
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
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (user) navigate("/profile"); }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      navigate("/profile");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Auth error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Create profile / Login</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" className="accent-black" checked={mode==='signin'} onChange={() => setMode('signin')} />
            Sign in
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" className="accent-black" checked={mode==='signup'} onChange={() => setMode('signup')} />
            Create account
          </label>
        </div>
        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
        <div>
          <label className="block text-sm mb-1">Name {mode==='signup' && <span className="text-gray-400">(optional)</span>}</label>
          <input className="w-full border rounded-xl p-2" placeholder="Fido’s human" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded-xl p-2" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input className="w-full border rounded-xl p-2" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button disabled={loading} className="w-full px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">
          {loading ? "Working…" : (mode==='signin' ? "Sign in" : "Create account")}
        </button>
      </form>
    </main>
  );
}

// --- Booking ---
function Book() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [service, setService] = useState<BookingRow["service"]>("Walk");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMins, setDurationMins] = useState(30);
  const [pets, setPets] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);
  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!date || !time) return alert("Please choose a date and time.");
    setSaving(true);
    try {
      await createBooking({
        user_id: user.id,
        service,
        date,
        time: time.length === 5 ? `${time}:00` : time,
        duration_mins: durationMins,
        pets,
        notes: notes || null,
      });
      navigate("/profile");
      alert(`Booking confirmed for ${date} at ${time}.`);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error creating booking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Book a service</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Service</label>
          <select className="w-full border rounded-xl p-2" value={service} onChange={(e) => setService(e.target.value as BookingRow["service"]) }>
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
            <input className="w-full border rounded-xl p-2" type="number" min={20} max={240} step={10} value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm mb-1"># of pets</label>
            <input className="w-full border rounded-xl p-2" type="number" min={1} max={6} value={pets} onChange={(e) => setPets(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Notes</label>
          <textarea className="w-full border rounded-xl p-2" rows={3} placeholder="Gate code, special instructions…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
        <button disabled={saving} className="w-full px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">{saving ? "Saving…" : "Confirm booking"}</button>
      </form>
    </main>
  );
}

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listUserBookings(user.id).then(setBookings).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

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
        {loading ? (
          <p className="text-gray-600">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-600">No bookings yet.</p>
        ) : (
          <ul className="divide-y">
            {bookings.map((b) => (
              <li key={b.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{b.service}</p>
                    <p className="text-sm text-gray-600">{b.date} at {b.time.slice(0,5)} • {b.duration_mins} mins • {b.pets} {b.pets === 1 ? "pet" : "pets"}</p>
                    {b.notes && <p className="text-sm text-gray-600">Notes: {b.notes}</p>}
                  </div>
                  <span className="text-xs text-gray-500">Booked {new Date(b.created_at).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
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
            <Route path="/book" element={<ProtectedRoute><Book /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
