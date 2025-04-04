"use client";
import { useState, useEffect } from "react";

interface TypewriterProps {
  text: string;
  className?: string;
}

const TypewriterEffect: React.FC<TypewriterProps> = ({ text, className = "" }) => {
  const [maskedText, setMaskedText] = useState(""); // Stores deleted text with spaces
  const [currentFont, setCurrentFont] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const [pauseBeforeDelete, setPauseBeforeDelete] = useState(false);

  const fontStyles = [
    "font-sans",
    "font-serif",
    "font-mono",
    "font-bold",
    "italic",
    "underline",
  ];

  useEffect(() => {
    const typingSpeed = isDeleting ? 80 : 100; // Typing is slower, deleting is faster

    if (!isDeleting && charIndex === text.length) {
      setPauseBeforeDelete(true);
      setTimeout(() => {
        setPauseBeforeDelete(false);
        setIsDeleting(true);
      }, 2000);
      return;
    }

    if (isDeleting && charIndex === 0) {
      setTimeout(() => {
        setIsDeleting(false);
        setCurrentFont((prev) => (prev + 1) % fontStyles.length); // Change font after deletion
      }, 500);
      return;
    }

    if (pauseBeforeDelete) return;

    const typeInterval = setInterval(() => {
      if (!isDeleting && charIndex < text.length) {
        // Typing forward
        setMaskedText(text.substring(0, charIndex + 1)); // Reveal actual text
        setCharIndex((prev) => prev + 1);
      } else if (isDeleting && charIndex > 0) {
        // Replacing characters with spaces while deleting
        setMaskedText((prev) => prev.substring(0, charIndex - 1) + " " + prev.substring(charIndex));
        setCharIndex((prev) => prev - 1);
      }
    }, typingSpeed);

    return () => clearInterval(typeInterval);
  }, [charIndex, isDeleting, text, pauseBeforeDelete, fontStyles.length]);

  return (
    <span
      className={`whitespace-pre transition-all duration-500 ease-in-out ${fontStyles[currentFont]} ${className}`}
    >
      {maskedText}
    </span>
  );
};

export default TypewriterEffect;