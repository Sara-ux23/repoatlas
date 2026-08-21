import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MascotOrbProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showChips?: boolean;
  className?: string;
}

export const MascotOrb: React.FC<MascotOrbProps> = ({
  size = 'hero',
  showChips = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas particle field for ambient data orb effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const particles: { x: number; y: number; r: number; dx: number; dy: number; opacity: number }[] = [];
    const particleCount = size === 'hero' ? 35 : 20;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(37, 99, 235, ${0.15 * (1 - dist / 90)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37, 99, 235, ${p.opacity})`;
        ctx.shadowColor = '#2563EB';
        ctx.shadowBlur = 8;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > width) p.dx *= -1;
        if (p.y < 0 || p.y > height) p.dy *= -1;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [size]);

  const sizeClasses = {
    sm: 'w-48 h-48',
    md: 'w-72 h-72',
    lg: 'w-96 h-96',
    hero: 'w-[420px] h-[420px] md:w-[520px] md:h-[520px]',
  }[size];

  const agentChips = [
    { name: '🧭 Explorer', label: 'Folder & AST Parser', x: '-15%', y: '10%' },
    { name: '🔍 Trace', label: 'Call-Chain Tracker', x: '80%', y: '15%' },
    { name: '🧠 Security', label: 'Vulnerability Scanner', x: '-20%', y: '65%' },
    { name: '🎨 Visualization', label: 'Diagram Synthesizer', x: '75%', y: '70%' },
    { name: '🤖 Manager', label: 'Swarm Orchestrator', x: '30%', y: '-5%' },
  ];

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
      {/* Ambient background particle canvas */}
      <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden opacity-70">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Radial backlight aura */}
      <div className="absolute w-3/4 h-3/4 bg-gradient-to-tr from-[#2563EB]/15 to-[#3B82F6]/15 rounded-full blur-3xl animate-pulse" />

      {/* Main floating Mascot Robot */}
      <motion.div
        animate={{
          y: [0, -14, 0],
          rotate: [-2, 2, -2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        <img
          src="/mascot-robot.png"
          alt="RepoAtlas AI Mascot - Atlas Robot"
          className="w-full h-full object-contain filter drop-shadow-[0_15px_35px_rgba(37,99,235,0.2)] transition-transform duration-500 hover:scale-105"
          onError={(e) => {
            // Fallback SVG graphic if image path differs
            const target = e.target as HTMLElement;
            target.style.display = 'none';
          }}
        />


      </motion.div>

      {/* Floating Agent Chips (for Meet Atlas section) */}
      {showChips &&
        agentChips.map((chip, idx) => (
          <motion.div
            key={chip.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.15, duration: 0.5 }}
            style={{ left: chip.x, top: chip.y }}
            className="absolute z-20 group cursor-pointer"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3 + idx * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: idx * 0.4,
              }}
              className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-[#E5E5E7] text-xs font-mono font-medium text-[#111114] shadow-md flex items-center gap-2 group-hover:border-[#2563EB] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all duration-300"
            >
              <span className="text-[#111114] font-semibold">{chip.name}</span>
              <span className="hidden group-hover:inline text-[10px] text-[#2563EB] font-sans border-l border-[#E5E5E7] pl-2">
                {chip.label}
              </span>
            </motion.div>
          </motion.div>
        ))}
    </div>
  );
};
