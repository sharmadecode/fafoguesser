import { useEffect, useRef } from "react";

export function useLandingInteractions() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const quickBtnRef = useRef<HTMLButtonElement>(null);
  const shapesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const isFine = window.matchMedia("(pointer: fine)").matches;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isFine || isReduced) return;

    const cardEl = cardRef.current;
    const quickBtnEl = quickBtnRef.current;
    const shapesEl = shapesRef.current;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let hasMouse = false;

    let currShapeX = 0;
    let currShapeY = 0;

    let targetCardRotX = 0;
    let targetCardRotY = 0;
    let currCardRotX = 0;
    let currCardRotY = 0;

    let targetBtnX = 0;
    let targetBtnY = 0;
    let currBtnX = 0;
    let currBtnY = 0;

    let isOverCard = false;
    let rafId: number | null = null;

    const onMouseMove = (e: MouseEvent) => {
      hasMouse = true;
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Card tilt tracking
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        if (
          mouseX >= rect.left &&
          mouseX <= rect.right &&
          mouseY >= rect.top &&
          mouseY <= rect.bottom
        ) {
          isOverCard = true;
          const px = (mouseX - (rect.left + rect.width / 2)) / (rect.width / 2);
          const py = (mouseY - (rect.top + rect.height / 2)) / (rect.height / 2);
          targetCardRotX = Math.max(-4, Math.min(4, -py * 4));
          targetCardRotY = Math.max(-4, Math.min(4, px * 4));
        } else {
          isOverCard = false;
          targetCardRotX = 0;
          targetCardRotY = 0;
        }
      }

      // Magnetic quick play button
      if (quickBtnEl && !quickBtnEl.disabled) {
        const rect = quickBtnEl.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2;
        const btnCenterY = rect.top + rect.height / 2;
        const dx = mouseX - btnCenterX;
        const dy = mouseY - btnCenterY;
        const dist = Math.hypot(dx, dy);
        const radius = Math.max(rect.width, rect.height) / 2 + 40;
        if (dist < radius && dist > 0) {
          const strength = 1 - dist / radius;
          targetBtnX = (dx / dist) * 7 * strength;
          targetBtnY = (dy / dist) * 7 * strength;
        } else {
          targetBtnX = 0;
          targetBtnY = 0;
        }
      } else {
        targetBtnX = 0;
        targetBtnY = 0;
      }
    };

    const onMouseLeave = () => {
      hasMouse = false;
      targetCardRotX = 0;
      targetCardRotY = 0;
      targetBtnX = 0;
      targetBtnY = 0;
      isOverCard = false;
    };

    const loop = () => {
      if (hasMouse) {
        const normX = (mouseX - window.innerWidth / 2) / (window.innerWidth / 2 || 1);
        const normY = (mouseY - window.innerHeight / 2) / (window.innerHeight / 2 || 1);
        currShapeX += (-normX * 24 - currShapeX) * 0.08;
        currShapeY += (-normY * 24 - currShapeY) * 0.08;
      } else {
        currShapeX += (0 - currShapeX) * 0.08;
        currShapeY += (0 - currShapeY) * 0.08;
      }

      if (shapesEl) {
        shapesEl.style.setProperty("--px", `${currShapeX.toFixed(2)}px`);
        shapesEl.style.setProperty("--py", `${currShapeY.toFixed(2)}px`);
      }

      currCardRotX += (targetCardRotX - currCardRotX) * 0.12;
      currCardRotY += (targetCardRotY - currCardRotY) * 0.12;
      if (cardEl) {
        if (isOverCard || Math.abs(currCardRotX) > 0.05 || Math.abs(currCardRotY) > 0.05) {
          cardEl.style.transform = `perspective(1000px) rotateX(${currCardRotX.toFixed(2)}deg) rotateY(${currCardRotY.toFixed(2)}deg)`;
        } else {
          cardEl.style.transform = "";
        }
      }

      currBtnX += (targetBtnX - currBtnX) * 0.15;
      currBtnY += (targetBtnY - currBtnY) * 0.15;
      if (quickBtnEl) {
        if (Math.abs(currBtnX) > 0.05 || Math.abs(currBtnY) > 0.05) {
          quickBtnEl.style.transform = `translate3d(${currBtnX.toFixed(1)}px, ${currBtnY.toFixed(1)}px, 0)`;
        } else {
          quickBtnEl.style.transform = "";
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (cardEl) cardEl.style.transform = "";
      if (quickBtnEl) quickBtnEl.style.transform = "";
    };
  }, []);

  return { containerRef, cardRef, quickBtnRef, shapesRef };
}
