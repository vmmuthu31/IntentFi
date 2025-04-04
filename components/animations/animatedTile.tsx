"use client";
import { useState, useEffect, useCallback, ReactNode } from "react";

interface AnimatedTitleProps {
  text: string;
  className?: string;
  children?: ReactNode; // Accept children as a prop
}

const greekSymbols = "αβγδεζηθικλμνξοπρστυφχψω∑∆ΩΛΞ∇ΠΦΨΖ";
const randomCharacters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=<>?/[]{}|";

const getRandomCharacter = (originalChar: string) => {
  if (originalChar === " ") return " ";
  return Math.random() > 0.5
    ? greekSymbols[Math.floor(Math.random() * greekSymbols.length)]
    : randomCharacters[Math.floor(Math.random() * randomCharacters.length)];
};

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ text, className = "", children }) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState<boolean>(false);

  const animateJumble = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    let iterations = 0;
    const maxIterations = 10;
    const intervalTime = 20; 
    const originalText = text.split("");

    let tempText = Array(originalText.length).fill(" ");

    const interval = setInterval(() => {
      if (iterations < maxIterations) {
        tempText = tempText.map((char, index) =>
          index < iterations
            ? originalText[index]
            : getRandomCharacter(originalText[index])
        );

        setDisplayText(tempText.join(""));
        iterations++;
      } else {
        clearInterval(interval);
        setDisplayText(text);
        setIsAnimating(false);
        setHasAnimatedOnce(true);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [text, isAnimating]);

  useEffect(() => {
    if (!hasAnimatedOnce) {
      animateJumble();
    }
  }, [hasAnimatedOnce, animateJumble]);

  const handleMouseEnter = () => {
    if (!isAnimating) {
      animateJumble();
    }
  };

  return (
    <span
      className={`inline-block transition-all duration-500 ease-in-out ${className}`}
      onMouseEnter={handleMouseEnter}
    >
      {displayText} {children} 
    </span>
  );
};

export default AnimatedTitle;