import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

// Every animation in the app goes through these helpers so reduced motion is honored
// in one place: movement is dropped and only short opacity changes remain.
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const motionDuration = (seconds: number) => (reducedMotion() ? 0 : seconds);

export { gsap, useGSAP };
