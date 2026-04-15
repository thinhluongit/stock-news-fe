"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { registerUser, clearError } from "../../../store/slices/authSlice";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

interface RegisterForm {
  full_name: string;
  email: string;
  password: string;
  confirm: string;
}

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [form, setForm] = useState<RegisterForm>({
    full_name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [validationError, setValidationError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) dispatch(clearError());
    setValidationError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setValidationError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setValidationError("Password must be at least 6 characters");
      return;
    }
    const result = await dispatch(
      registerUser({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
      }),
    );
    if (registerUser.fulfilled.match(result)) {
      toast.success("Account created! Welcome to ThanhDangBullish 🚀");
      router.push("/");
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              ThanhDang<span className="text-green-400">Bullish</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6 mb-1">
            Create your account
          </h1>
          <p className="text-sm text-gray-400">Join the bullish community</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Full Name"
              id="full_name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
            <Input
              label="Email"
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password *"
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
              required
            />
            <Input
              label="Confirm Password"
              id="confirm"
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repeat your password"
              required
              error={
                validationError && form.confirm ? validationError : undefined
              }
            />

            {displayError && !validationError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {displayError}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-green-400 hover:text-green-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
