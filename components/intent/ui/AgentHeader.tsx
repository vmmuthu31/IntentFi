"use client";

import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

interface AgentHeaderProps {
  isProcessing: boolean;
  isTyping: boolean;
  handleClearChat: () => void;
}

export const AgentHeader = ({
  isProcessing,
  isTyping,
  handleClearChat,
}: AgentHeaderProps) => {
  return (
    <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 p-4 border-b border-orange-800/20 flex justify-between items-center sticky top-0 z-10 backdrop-blur">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center mr-3 shadow-[0_0_8px_rgba(234,88,12,0.5)]">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h3
            className="font-medium text-white text-lg"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            IntentFi Agent
          </h3>
          <p className="text-xs text-gray-400 flex items-center">
            {isProcessing ? (
              <span className="flex items-center gap-1">
                <span className="animate-pulse text-orange-500">•</span>{" "}
                Processing intent...
              </span>
            ) : isTyping ? (
              <span className="flex items-center gap-1">
                <span className="animate-pulse">•</span> Synthesizing
                response...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="text-orange-500">•</span> Ready for
                instructions
              </span>
            )}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClearChat}
        className="h-8 w-8 rounded-full hover:bg-orange-950 transition-colors duration-300"
      >
        <X className="h-4 w-4 text-orange-500" />
      </Button>
    </div>
  );
};
