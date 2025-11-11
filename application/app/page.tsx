import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-8">
          Welcome to Better Auth
        </h1>
        <p className="text-xl text-white mb-8">
          Authentication made simple with Magic Link, OAuth & Email/Password
        </p>
        <div className="space-x-4">
          <Link
            href="/auth"
            className="inline-block px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-white hover:text-indigo-600"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
