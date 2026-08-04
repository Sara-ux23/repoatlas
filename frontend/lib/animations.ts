// Motion variants & GSAP configuration for RepoAtlas AI

export const heroVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1], // Expo-out curve from prompt
    },
  }),
};

export const sectionRevealVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const floatVariants = {
  animate: {
    y: [0, -14, 0],
    rotate: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const orbPulseVariants = {
  animate: {
    scale: [1, 1.06, 1],
    opacity: [0.85, 1, 0.85],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const orbRingVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 12,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export const bentoHoverVariants = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -6,
    scale: 1.01,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const buttonSpringVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.03, transition: { type: "spring", stiffness: 400, damping: 17 } },
  tap: { scale: 0.97 },
};
