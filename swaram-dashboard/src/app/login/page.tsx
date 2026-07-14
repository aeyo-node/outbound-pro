"use client";

import React, { useState, useEffect } from "react";
import { Headset, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.className = "login-body";
    // If already logged in, redirect
    const token = localStorage.getItem("swaram_token");
    const role = localStorage.getItem("swaram_role");
    if (token) {
      window.location.href = role === "superadmin" ? "/admin" : "/app";
    }
    return () => { document.body.className = ""; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Invalid email or password");
        setLoading(false);
        return;
      }
      // Store token and user info
      localStorage.setItem("swaram_token", data.token);
      localStorage.setItem("swaram_role", data.user.role);
      localStorage.setItem("swaram_user", JSON.stringify(data.user));
      localStorage.setItem("swaram_auth", "true"); // legacy compat
      // Redirect based on role
      window.location.href = data.user.role === "superadmin" ? "/admin" : "/app";
    } catch (err) {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-[#FFD166]/[0.04] rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#FFD166]/[0.02] rounded-full blur-[120px]" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFD166] to-[#FF9F1C] flex items-center justify-center">
            <Headset className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">swaram</h1>
            <p className="text-xs text-gray-600 -mt-0.5">സ്വരം Dashboard</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Email</label>
              <div className="flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#FFD166]/40 transition-colors">
                <Mail className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-transparent outline-none text-white placeholder-gray-400 w-full text-sm autofill-fix"
                  autoComplete="off" name="swaram-email" required />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Password</label>
              <div className="flex items-center gap-3 border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#FFD166]/40 transition-colors">
                <Lock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="bg-transparent outline-none text-white placeholder-gray-400 w-full text-sm autofill-fix"
                  autoComplete="off" name="swaram-pass" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className={`cta-btn w-full justify-center !py-3.5 text-base ${loading ? "opacity-60 cursor-wait" : ""}`}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <a href="/" className="text-xs text-gray-600 hover:text-[#FFD166] transition-colors">
              ← Back to Swaram Home
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-8">
          © 2026 Swaram AI. Enterprise Voice Intelligence.
        </p>
      </div>
    </div>
  );
}
