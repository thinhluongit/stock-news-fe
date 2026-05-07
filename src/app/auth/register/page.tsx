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
import { useLocale } from "../../../i18n/LocaleContext";

interface RegisterForm {
  full_name: string;
  email: string;
  password: string;
  confirm: string;
}

type FieldErrors = Partial<Record<keyof RegisterForm, string>>;

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { loading, error } = useAppSelector((s) => s.auth);
  const { t } = useLocale();
  const [form, setForm] = useState<RegisterForm>({
    full_name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (error) dispatch(clearError());
    if (fieldErrors[name as keyof RegisterForm]) {
      setFieldErrors((fe) => ({ ...fe, [name]: undefined }));
    }
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!form.full_name.trim()) {
      errors.full_name = t("auth.register.error_full_name_required");
    }
    if (form.password.length < 6) {
      errors.password = t("auth.register.error_password_short");
    }
    if (form.password !== form.confirm) {
      errors.confirm = t("auth.register.error_password_mismatch");
    }
    return errors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
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
      toast.success(t("auth.register.toast_success"));
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              ThanhDang<span className="text-green-400">Bullish</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-1">
            {t("auth.register.title")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("auth.register.subtitle")}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t("auth.register.full_name")}
              id="full_name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder={t("auth.register.full_name")}
              required
              error={fieldErrors.full_name}
            />
            <Input
              label={t("auth.register.email")}
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
              label={t("auth.register.password")}
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t("auth.register.password_placeholder")}
              required
              error={fieldErrors.password}
            />
            <Input
              label={t("auth.register.confirm_password")}
              id="confirm"
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={handleChange}
              placeholder={t("auth.register.confirm_placeholder")}
              required
              error={fieldErrors.confirm}
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              {t("auth.register.submit")}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          {t("auth.register.has_account")}{" "}
          <Link
            href="/auth/login"
            className="text-green-400 hover:text-green-300 font-medium transition-colors"
          >
            {t("auth.register.login_link")}
          </Link>
        </p>
      </div>
    </div>
  );
}
