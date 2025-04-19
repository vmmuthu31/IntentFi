"use client";

import { motion } from "framer-motion";

interface TokenCardProps {
  token: {
    symbol: string;
    balance: string;
    icon?: string;
    price?: number;
  };
  index: number;
  onSelect: (token: { symbol: string; balance: string }) => void;
}

export const TokenCard = ({ token, index, onSelect }: TokenCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => onSelect(token)}
      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 border border-zinc-700 cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(234,88,12,0.1)] group"
    >
      {token.icon && (
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-md group-hover:bg-orange-500/40 transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
          <img
            src={token.icon}
            alt={token.symbol}
            className="w-10 h-10 rounded-full relative z-10"
            onError={(e) => {
              // Fallback to a default image if the icon fails to load
              e.currentTarget.src =
                "https://cryptologos.cc/logos/question-mark.png";
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{token.symbol}</p>
        <p className="text-xs text-gray-400 truncate">
          Balance: {token.balance}
        </p>
      </div>
      <div className="text-right">
        <p className="text-white text-xs leading-snug">
          <span className="font-semibold">Price:</span> $
          {token.price?.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          }) || "0.00"}
        </p>
        <p className="text-xs text-gray-400 leading-snug">
          <span className="font-semibold">Value:</span> $
          {(
            (parseFloat(token.balance) || 0) * (token.price || 0)
          ).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
    </motion.div>
  );
};
