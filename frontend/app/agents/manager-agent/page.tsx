'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';

// Declare custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          url?: string;
          'loading-anim-type'?: string;
        },
        HTMLElement
      >;
    }
  }
}

export default function ManagerAgentPage() {
  useEffect(() => {
    // Dynamically load official Spline WebGL viewer script
    const existingScript = document.querySelector('script[src*="spline-viewer"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@splinetool/viewer@1.9.72/build/spline-viewer.js';
      document.head.appendChild(script);
    }

    // Inject CSS override into Spline Viewer's Shadow DOM to hide logo
    const interval = setInterval(() => {
      const viewer = document.querySelector('spline-viewer');
      if (viewer && viewer.shadowRoot) {
        if (!viewer.shadowRoot.querySelector('#hide-logo-style')) {
          const style = document.createElement('style');
          style.id = 'hide-logo-style';
          style.textContent = `
            #logo, #spline-logo, a[href*="spline"], .watermark, [class*="logo"], [class*="watermark"] {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
          `;
          viewer.shadowRoot.appendChild(style);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col font-sans">
      <Navbar />
      
      {/* Full-Bleed Hero Section Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 flex flex-col items-center">
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full flex flex-col items-center text-center space-y-6"
        >
          {/* Centered Header Block */}
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#2563EB] uppercase tracking-wider block font-semibold">
              Pipeline Stage 02
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111114] tracking-tight">
              Manager Agent
            </h1>
          </div>

          {/* Unboxed Full-Screen 3D Robot Visual (No white box container, fits screen) */}
          <div className="w-full flex items-center justify-center relative pt-2">
            {/* Ambient Blue Backlight Blur */}
            <div className="absolute w-[500px] h-[500px] rounded-full bg-[#2563EB]/15 blur-3xl pointer-events-none animate-pulse" />

            {/* Unboxed Canvas Container */}
            <div className="relative z-10 w-full max-w-6xl h-[560px] sm:h-[700px] overflow-hidden bg-transparent flex items-center justify-center">
              <spline-viewer
                url="https://prod.spline.design/a5tBEkRdYTDjQ8t0/scene.splinecode"
                loading-anim-type="spinner"
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '0px',
                  width: '100%',
                  height: 'calc(100% + 140px)',
                }}
              />
            </div>
          </div>
        </motion.section>
      </div>

      <Footer />
    </main>
  );
}
