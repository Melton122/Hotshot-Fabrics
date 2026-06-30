import { useState } from "react";
import { motion } from "framer-motion";
import { useApp, supabase } from "../AppContext";
import { signInWithPassword, signUpWithPassword } from "../utils/auth";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export function LoginPage() {
  const { setCurrentView, toast } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithPassword(email, password);
    setLoading(false);
    if (error) toast(error.message, "error");
    else {
      toast("Welcome back!", "success");
      setCurrentView("home");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-2xl">HF</span>
          </div>
          <h1 className="text-3xl font-black">Welcome Back</h1>
          <p className="text-zinc-400 mt-2">Sign in to your Hotshot account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Sign In</>}
          </motion.button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-6">
          Don't have an account?{" "}
          <button onClick={() => setCurrentView("register")} className="text-orange-400 hover:underline font-medium">
            Sign up
          </button>
        </p>
      </motion.div>
    </div>
  );
}

export function RegisterPage() {
  const { setCurrentView, toast } = useApp();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast("Email and password are required", "error");
      return;
    }
    
    if (password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    
    setLoading(true);
    const { data, error } = await signUpWithPassword(email, password, fullName);
    setLoading(false);
    
    if (error) {
      toast(error.message || "Failed to create account", "error");
    } else {
      // Create profile
      if (data.user) {
        try {
          await supabase.from("user_profiles").insert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: "customer"
          });
        } catch (profileError) {
          toast("Account created but profile setup failed. Please sign in.", "info");
        }
      }
      
      if (data.session) {
        toast("Account created! You are signed in.", "success");
        setCurrentView("home");
      } else {
        toast("Account created! Please check your email to verify.", "success");
        setCurrentView("login");
      }
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-2xl">HF</span>
          </div>
          <h1 className="text-3xl font-black">Create Account</h1>
          <p className="text-zinc-400 mt-2">Join the Hotshot family</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Create Account</>}
          </motion.button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-6">
          Already have an account?{" "}
          <button onClick={() => setCurrentView("login")} className="text-orange-400 hover:underline font-medium">
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
