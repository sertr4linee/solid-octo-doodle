import { RegisterForm } from "@/components/register-form";
import { DitherBackground } from "@/components/dither-background";
import { DITHER_COLORS } from "@/lib/dither-presets";

export default function RegisterPage() {
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
            <RegisterForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block overflow-hidden">
        <DitherBackground
          waveColor={DITHER_COLORS.trelloPurple}
          colorNum={6}
          pixelSize={3}
          waveSpeed={0.035}
          waveFrequency={2.5}
          waveAmplitude={0.22}
          enableMouseInteraction={true}
          mouseRadius={0.35}
          className="opacity-80"
        />
        <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
          <div className="max-w-md text-center text-white px-4">
            <h2 className="text-3xl font-bold mb-4 leading-tight">Join Epitrello</h2>
            <p className="text-lg opacity-90 leading-relaxed">
              Create your account and start organizing your projects with ease.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
