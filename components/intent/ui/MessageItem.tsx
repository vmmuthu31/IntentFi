"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ZapIcon } from "lucide-react";
import { Message } from "../utils/message-utils";
import { formatTime } from "../utils/message-utils";
import { TokenCard } from "./TokenCard";

interface MessageItemProps {
  message: Message;
  handleAction: (action: string, intent?: string) => void;
  handleSelectToken: (token: { symbol: string; balance: string }) => void;
}

export const MessageItem = ({
  message,
  handleAction,
  handleSelectToken,
}: MessageItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`rounded-xl relative ${
          message.role === "user"
            ? "bg-gradient-to-br from-orange-700/20 to-orange-900/20 border border-orange-600/30 shadow-[0_0_10px_rgba(234,88,12,0.1)]"
            : "bg-gradient-to-br from-zinc-800/70 to-zinc-900/70 border border-zinc-700 shadow-lg"
        } p-5 ${
          message.isLoading ? "min-w-[120px] min-h-[40px]" : ""
        } max-w-[85%] backdrop-blur-sm`}
      >
        {message.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-light">
              {message.content}
            </p>

            {/* Display tokens if available */}
            {message.tokens && message.tokens.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {message.tokens.map((token, tidx) => (
                  <TokenCard
                    key={tidx}
                    token={token}
                    index={tidx}
                    onSelect={handleSelectToken}
                  />
                ))}
              </div>
            )}

            {/* Display action buttons if available */}
            {message.actions && message.actions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {message.actions.map((action, aidx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: aidx * 0.1 }}
                    key={aidx}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(action.action, action.intent)}
                      className={`${
                        action.action === "DIRECT_INTENT"
                          ? "bg-gradient-to-r from-orange-900/50 to-orange-950/50 border-orange-600/30 hover:bg-orange-800/30 text-orange-400"
                          : "bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700/90"
                      } text-gray-200 flex items-center gap-1 rounded-lg transition-all duration-300 hover:shadow-[0_0_10px_rgba(234,88,12,0.15)] py-2`}
                    >
                      {action.action === "DIRECT_INTENT" ? (
                        <ZapIcon className="mr-1 h-3.5 w-3.5 text-orange-500" />
                      ) : (
                        <ArrowRight className="mr-1 h-3.5 w-3.5" />
                      )}
                      {action.label}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}

            <span className="text-[10px] text-gray-500 absolute bottom-1.5 right-3 opacity-60">
              {formatTime(message.timestamp)}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
};
