import { LoginForm } from "@/components/auth/login-form";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400">Sign in to continue to your workspace</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
