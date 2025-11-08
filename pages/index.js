import { useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error("Please enter username and password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "PUT", // Login uses PUT
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ Store session info
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("username", data.username);

        toast.success("Login successful!");

        // ✅ Redirect to chat page
        router.push("/chat");
      } else {
        toast.error(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => router.push("/register");
  const handleForgotPassword = () => router.push("/forgot_password");

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-96 border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Chat App Login
        </h1>

        <form className="flex flex-col" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            className="border border-gray-400 p-2 mb-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full border border-gray-400 p-2 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <p
            onClick={handleForgotPassword}
            className="mb-4 text-xs text-gray-600 text-right hover:text-blue-600 transition cursor-pointer"
          >
            Forgot Password?
          </p>

          <button
            type="submit"
            disabled={loading}
            className={`${
              loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"
            } text-white p-2 rounded-md transition duration-200`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p
            onClick={handleRegister}
            className="mt-4 text-sm text-gray-700 text-center cursor-pointer"
          >
            Don&apos;t have an account?{" "}
            <span className="text-blue-500 hover:underline">Sign Up</span>
          </p>
        </form>
      </div>
    </div>
  );
}
