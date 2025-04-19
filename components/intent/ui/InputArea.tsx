"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Coins, PlusCircle } from "lucide-react";

interface InputAreaProps {
  input: string;
  isProcessing: boolean;
  isConnected: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  sendMessage: () => void;
}

export const InputArea = ({
  input,
  isProcessing,
  isConnected,
  handleInputChange,
  handleKeyDown,
  sendMessage,
}: InputAreaProps) => {
  return (
    <div className="p-5 border-t border-orange-900/20 bg-gradient-to-b from-zinc-900/90 to-black backdrop-blur">
      <div className="flex gap-3">
        <Textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your intent or question... (e.g., 'Deposit 10 USDC on Celo')"
          className="min-h-11 max-h-32 bg-zinc-800/70 border-orange-900/20 rounded-xl text-white placeholder:text-gray-400 focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500/50 shadow-inner transition-all duration-300"
          disabled={isProcessing}
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || isProcessing}
          className={`px-3 rounded-xl ${
            input.trim() && !isProcessing
              ? "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.3)] hover:shadow-[0_0_12px_rgba(234,88,12,0.4)]"
              : "bg-zinc-700"
          } transition-all duration-300`}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="flex justify-between items-center mt-2.5">
        <p className="text-xs text-gray-500">
          {!isConnected ? (
            <span className="flex items-center gap-1">
              <PlusCircle className="h-3 w-3 text-orange-600" />
              <span className="font-light">
                Connect wallet for personalized suggestions
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-orange-600" />
              <span className="font-light">
                Powered by IntentFi Intelligence
              </span>
            </span>
          )}
        </p>

        <div className="text-[10px] text-gray-600 font-light px-2 py-1 rounded-full border border-zinc-800 bg-black/50">
          {isConnected ? "Wallet Connected" : "Not Connected"}
        </div>
      </div>
    </div>
  );
};
