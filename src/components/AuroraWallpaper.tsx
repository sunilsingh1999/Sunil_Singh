export function AuroraWallpaper() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#04040a]"
    >
      {/* Deep Space Base Radial Depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_0%,rgba(88,28,135,0.22),transparent_70%),radial-gradient(ellipse_75%_55%_at_50%_100%,rgba(6,78,107,0.18),transparent_70%)]" />

      {/* Moving Royal-Purple Aurora Wave */}
      <div className="aurora-orb-purple absolute -top-[18%] -left-[12%] h-[62vw] w-[62vw] max-h-[680px] max-w-[680px] rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.38)_0%,rgba(126,34,206,0.14)_45%,transparent_72%)] blur-[88px]" />

      {/* Moving Electric Cyan Aurora Wave */}
      <div className="aurora-orb-cyan absolute top-[18%] -right-[14%] h-[58vw] w-[58vw] max-h-[640px] max-w-[640px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.30)_0%,rgba(6,182,212,0.12)_48%,transparent_72%)] blur-[96px]" />

      {/* Moving Imperial Gold Aurora Wave */}
      <div className="aurora-orb-gold absolute -bottom-[16%] left-[18%] h-[55vw] w-[55vw] max-h-[600px] max-w-[600px] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.26)_0%,rgba(245,158,11,0.10)_48%,transparent_74%)] blur-[92px]" />

      {/* Secondary Magenta-Cyan Horizon Ribbon */}
      <div className="aurora-orb-cyan absolute top-[48%] left-[8%] h-[36vw] w-[68vw] max-h-[380px] max-w-[820px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.16)_0%,rgba(59,130,246,0.12)_50%,transparent_75%)] blur-[90px]" />

      {/* Nothing OS Subtle Precision Dot Matrix */}
      <div className="nothing-dot-grid absolute inset-0 opacity-65" />

      {/* Subtle Vignette for Crisp Foreground Contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(3,3,8,0.68)_100%)]" />
    </div>
  );
}
