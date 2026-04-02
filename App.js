import React, { useState } from "react";

const API_URL = "https://csc3916-assignment4-kfb5.onrender.com";

export default function App() {
  const [signupForm, setSignupForm] = useState({
    name: "",
    username: "",
    password: "",
  });

  const [signinForm, setSigninForm] = useState({
    username: "",
    password: "",
  });

  const [output, setOutput] = useState("");
  const [savedToken, setSavedToken] = useState(localStorage.getItem("token") || "");

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupForm),
      });

      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setOutput(JSON.stringify({ error: err.message }, null, 2));
    }
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signinForm),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        setSavedToken(data.token);
      }

      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setOutput(JSON.stringify({ error: err.message }, null, 2));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setSavedToken("");
    setOutput(JSON.stringify({ message: "Logged out" }, null, 2));
  };

  const testProtectedRoute = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token || "",
        },
        body: JSON.stringify({
          title: "Interstellar",
          releaseDate: 2014,
          genre: "Sci-Fi",
          actors: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
        }),
      });

      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setOutput(JSON.stringify({ error: err.message }, null, 2));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="mb-4 text-2xl font-bold">Movie API Auth</h1>
          <p className="mb-4 text-sm text-gray-600">
            Replace <code>API_URL</code> with your Render backend URL.
          </p>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="mb-2 text-sm font-semibold">Saved JWT</div>
            <div className="break-all text-xs text-gray-700">
              {savedToken || "No token saved yet"}
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 rounded-xl bg-gray-800 px-4 py-2 text-sm text-white"
            >
              Logout
            </button>
          </div>

          <button
            onClick={testProtectedRoute}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white"
          >
            Test Protected Movie POST
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Sign Up</h2>
          <form onSubmit={handleSignup} className="space-y-3">
            <input
              className="w-full rounded-xl border p-3"
              placeholder="Name"
              value={signupForm.name}
              onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
            />
            <input
              className="w-full rounded-xl border p-3"
              placeholder="Username"
              value={signupForm.username}
              onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
            />
            <input
              className="w-full rounded-xl border p-3"
              type="password"
              placeholder="Password"
              value={signupForm.password}
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
            />
            <button className="w-full rounded-xl bg-green-600 px-4 py-3 text-white">
              Sign Up
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow md:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Sign In</h2>
          <form onSubmit={handleSignin} className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-xl border p-3"
              placeholder="Username"
              value={signinForm.username}
              onChange={(e) => setSigninForm({ ...signinForm, username: e.target.value })}
            />
            <input
              className="rounded-xl border p-3"
              type="password"
              placeholder="Password"
              value={signinForm.password}
              onChange={(e) => setSigninForm({ ...signinForm, password: e.target.value })}
            />
            <button className="rounded-xl bg-indigo-600 px-4 py-3 text-white">
              Sign In
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow md:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Response</h2>
          <pre className="overflow-x-auto rounded-xl bg-gray-900 p-4 text-sm text-green-300">
            {output || "No response yet"}
          </pre>
        </div>
      </div>
    </div>
  );
}
