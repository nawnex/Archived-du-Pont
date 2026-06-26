import React, { useRef } from "react";

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  id?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: "primary" | "secondary";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
}

export default function LiquidButton({
  children,
  id = "liquid-button",
  className = "",
  onClick,
  variant = "primary",
  ...props
}: LiquidButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;
    
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    button.style.setProperty("--mouse-x", `${x}px`);
    button.style.setProperty("--mouse-y", `${y}px`);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;
    button.style.setProperty("--pointer-active", "1");
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;
    button.style.setProperty("--pointer-active", "0");
  };

  const btnClass = variant === "primary" ? "liquid-glass-btn" : "liquid-glass-btn-secondary";

  return (
    <button
      ref={buttonRef}
      id={id}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`group/btn relative ${btnClass} px-6 py-3 rounded-full text-white font-medium tracking-wide text-sm cursor-pointer select-none active:scale-95 overflow-hidden transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Light refraction warping effect background */}
      <span className="absolute inset-0 pointer-events-none liquid-glass-refraction transition-opacity duration-500 rounded-full" />
      
      {/* Specular highlight under the pointer */}
      <span className="absolute inset-0 pointer-events-none liquid-glass-specular transition-opacity duration-500 rounded-full" />

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}



