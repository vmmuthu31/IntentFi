"use client";
import { useState, useEffect } from "react";

interface TypewriterProps {
  text: string;
  className?: string;
}

const TypewriterEffect: React.FC<TypewriterProps> = ({ text, className = "" }) => {
  // Process the input text to handle literal "\n" strings
  const processedText = text.replace(/\\n/g, "\n");
  
  // Initialize with a structure-preserving placeholder
  const [displayText, setDisplayText] = useState<string[]>(
    Array(processedText.length).fill(" ")
  );
  const [currentFont, setCurrentFont] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const [pauseBeforeDelete, setPauseBeforeDelete] = useState(false);

  // Create an initial structure template that preserves newlines
  useEffect(() => {
    const initialStructure = Array(processedText.length).fill(" ");
    for (let i = 0; i < processedText.length; i++) {
      if (processedText[i] === "\n") {
        initialStructure[i] = "\n";
      }
    }
    setDisplayText(initialStructure);
  }, [processedText]);

  const fontStyles = [
    "font-sans",
    "font-serif",
    "font-bold",
    "italic",
  ];

  useEffect(() => {
    const typingSpeed = isDeleting ? 80 : 100; // Typing is slower, deleting is faster

    if (!isDeleting && charIndex === processedText.length) {
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
      if (!isDeleting && charIndex < processedText.length) {
        // Typing forward - replace the character at current index
        setDisplayText(prev => {
          const newDisplay = [...prev];
          newDisplay[charIndex] = processedText[charIndex];
          return newDisplay;
        });
        setCharIndex((prev) => prev + 1);
      } else if (isDeleting && charIndex > 0) {
        // Deleting - restore space at current index (but preserve newlines)
        setDisplayText(prev => {
          const newDisplay = [...prev];
          if (processedText[charIndex - 1] !== "\n") {
            newDisplay[charIndex - 1] = " ";
          }
          return newDisplay;
        });
        setCharIndex((prev) => prev - 1);
      }
    }, typingSpeed);

    return () => clearInterval(typeInterval);
  }, [charIndex, isDeleting, processedText, pauseBeforeDelete, fontStyles.length]);

  return (
    <span
      className={`whitespace-pre transition-all duration-500 font-normal text-[85px] ease-in-out ${fontStyles[currentFont]} ${className}`}
    >
      {displayText.join("")}
    </span>
  );
};

export default TypewriterEffect;