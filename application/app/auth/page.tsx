import { LoginForm } from "@/components/login-form";
import { DitherBackground } from "@/components/dither-background";
import { DITHER_COLORS } from "@/lib/dither-presets";

export default function AuthPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" aria-label="home" className="flex gap-2 items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Epitrello
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block overflow-hidden">
        <DitherBackground
          waveColor={DITHER_COLORS.trelloBlue}
          colorNum={6}
          pixelSize={3}
          waveSpeed={0.03}
          waveFrequency={2}
          waveAmplitude={0.2}
          enableMouseInteraction={true}
          mouseRadius={0.4}
          className="opacity-80"
        />
        <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
          <div className="max-w-md text-center text-white px-4">
            <h2 className="text-3xl font-bold mb-4 leading-tight">Welcome back!</h2>
            <p className="text-lg opacity-90 leading-relaxed">
              Sign in to access your boards and continue collaborating with your team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
