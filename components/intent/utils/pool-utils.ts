// Define the type for pool data
export interface PoolInfo {
  poolId: number;
  stakingToken: string;
  rewardToken: string;
  rewardPerSecond: string;
  totalStaked: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  apy: string;
}

// Fetch pool information from API
export const fetchPoolInformation = async (chainId: number) => {
  const response = await fetch("/api/blockchain/getpools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chainId }),
  });
  const { success, data } = await response.json();
  if (!success) throw new Error("Failed to fetch pool data");
  return data;
};

// Generate dynamic pool data based on the chain
export const generateDynamicPoolDataForChain = (chain: string): PoolInfo[] => {
  const currentDate = new Date();
  const oneWeekLater = new Date(currentDate);
  oneWeekLater.setDate(currentDate.getDate() + 7);

  const oneMonthLater = new Date(currentDate);
  oneMonthLater.setMonth(currentDate.getMonth() + 1);

  // Chain-specific tokens configuration
  const chainTokens: {
    [key: string]: { symbol: string; name: string; baseApy: number }[];
  } = {
    celo: [
      { symbol: "CELO", name: "Celo", baseApy: 8.5 },
      { symbol: "cUSD", name: "Celo Dollar", baseApy: 6.2 },
      { symbol: "cEUR", name: "Celo Euro", baseApy: 5.9 },
      { symbol: "USDC", name: "USD Coin", baseApy: 4.7 },
      { symbol: "DAI", name: "Dai Stablecoin", baseApy: 4.5 },
      { symbol: "WBTC", name: "Wrapped Bitcoin", baseApy: 3.2 },
    ],
    rootstock: [
      { symbol: "RBTC", name: "Rootstock BTC", baseApy: 7.2 },
      { symbol: "USDT", name: "Tether", baseApy: 5.3 },
      { symbol: "USDC", name: "USD Coin", baseApy: 5.1 },
      { symbol: "DOC", name: "Dollar on Chain", baseApy: 6.8 },
      { symbol: "RIF", name: "RSK Infrastructure Framework", baseApy: 9.4 },
      { symbol: "SOV", name: "Sovryn", baseApy: 10.5 },
    ],
    saga: [
      { symbol: "IFI", name: "IntentFi", baseApy: 12.0 },
      { symbol: "USDC", name: "USD Coin", baseApy: 7.5 },
      { symbol: "USDT", name: "Tether", baseApy: 7.2 },
      { symbol: "DAI", name: "Dai Stablecoin", baseApy: 6.9 },
      { symbol: "ETH", name: "Ethereum", baseApy: 5.3 },
      { symbol: "WBTC", name: "Wrapped Bitcoin", baseApy: 4.1 },
    ],
    default: [
      { symbol: "ETH", name: "Ethereum", baseApy: 5.7 },
      { symbol: "USDC", name: "USD Coin", baseApy: 4.2 },
      { symbol: "USDT", name: "Tether", baseApy: 4.0 },
      { symbol: "DAI", name: "Dai Stablecoin", baseApy: 3.8 },
      { symbol: "WBTC", name: "Wrapped Bitcoin", baseApy: 2.5 },
      { symbol: "LINK", name: "Chainlink", baseApy: 6.3 },
    ],
  };

  // Determine which token set to use based on chain
  let tokenSet = chainTokens.default;
  if (chain.includes("celo")) tokenSet = chainTokens.celo;
  if (chain.includes("root") || chain.includes("rbtc"))
    tokenSet = chainTokens.rootstock;
  if (chain.includes("saga") || chain.includes("ifi"))
    tokenSet = chainTokens.saga;

  // Generate chain-specific APY with randomization
  const getChainSpecificApy = (baseApy: number, poolId: number): string => {
    // Add slight randomization to APY
    const variation = Math.random() * 1.5 - 0.75; // -0.75% to +0.75%
    let finalApy = baseApy + variation;

    // Boost APY for higher pool IDs (newer pools often have boosted rewards)
    finalApy += poolId * 0.4;

    // Apply chain-specific multipliers
    if (chain.includes("celo")) finalApy *= 1.2;
    if (chain.includes("root") || chain.includes("rbtc")) finalApy *= 1.1;
    if (chain.includes("saga") || chain.includes("ifi")) finalApy *= 1.5;

    return `${finalApy.toFixed(1)}%`;
  };

  // Generate realistic total staked amounts
  const getTotalStaked = (symbol: string, poolId: number): string => {
    const baseAmount =
      tokenSet.findIndex((t) => t.symbol === symbol) === 0 ? 100 : 20;
    let multiplier = 1;

    // Popular tokens have more staked
    if (["ETH", "USDC", "WBTC", "CELO", "RBTC", "IFI"].includes(symbol)) {
      multiplier = 2.5;
    }

    // Featured pools (like pool 4) have more staked
    if (poolId === 4) multiplier *= 3;
    if (poolId === 0) multiplier *= 1.5;

    const randomFactor = 0.5 + Math.random() * 1.5; // 0.5x to 2x randomization
    const stakedAmount = baseAmount * multiplier * randomFactor;

    // Format based on token type (more precision for expensive tokens)
    if (["ETH", "WBTC", "RBTC"].includes(symbol)) {
      return stakedAmount.toFixed(6);
    }
    return stakedAmount.toFixed(2);
  };

  // Generate pool data using the chain-specific tokens
  return Array.from({ length: 6 }, (_, i) => {
    // Select token for this pool - each pool uses a different token to stake
    const stakingToken = tokenSet[i % tokenSet.length];

    // For reward tokens, use a different token (typically the platform token)
    const rewardTokenIndex = i === 4 ? 0 : (i + 3) % tokenSet.length;
    const rewardToken = tokenSet[rewardTokenIndex];

    return {
      poolId: i,
      stakingToken: stakingToken.symbol,
      rewardToken: rewardToken.symbol,
      rewardPerSecond: (0.000000000000000005 * (i + 1)).toFixed(18),
      totalStaked: getTotalStaked(stakingToken.symbol, i),
      startTime:
        i === 0
          ? new Date(currentDate.getTime() + 86400000).toLocaleString()
          : currentDate.toLocaleString(),
      endTime:
        i === 0
          ? oneMonthLater.toLocaleString()
          : oneWeekLater.toLocaleString(),
      isActive: Math.random() > 0.2, // 20% chance of inactive pool
      apy: getChainSpecificApy(stakingToken.baseApy, i),
    };
  });
};

// Format pool information in a readable way with visual enhancements
export const formatPoolInformation = (
  pools: PoolInfo[],
  getDefaultToken: () => string
): string => {
  // Sort pools by APY (descending)
  const sortedPools = [...pools].sort((a, b) => {
    const apyA = parseFloat(a.apy.replace("%", ""));
    const apyB = parseFloat(b.apy.replace("%", ""));
    return apyB - apyA;
  });

  // Find highest APY pool
  const highestApyPool = sortedPools[0];

  let formattedInfo = `## Staking Pools\n\n`;
  formattedInfo += `Total Active Pools: ${
    pools.filter((p) => p.isActive).length
  } | Total Tokens Staked: ${pools
    .reduce((sum, pool) => sum + parseFloat(pool.totalStaked), 0)
    .toFixed(2)}\n\n`;

  // Highlight the best APY pool
  formattedInfo += `🔥 **Best APY:** Pool ${highestApyPool.poolId} offering ${highestApyPool.apy} for staking ${highestApyPool.stakingToken}\n\n`;

  formattedInfo += sortedPools
    .map((pool) => {
      const isHighestApy = pool.poolId === highestApyPool.poolId;

      return (
        `### Pool ${pool.poolId} ${isHighestApy ? "⭐" : ""} ${
          pool.isActive ? "(Active)" : "(Inactive)"
        }\n` +
        `- **APY:** ${isHighestApy ? `**${pool.apy}**` : pool.apy}\n` +
        `- **Staking Token:** ${pool.stakingToken}\n` +
        `- **Reward Token:** ${pool.rewardToken}\n` +
        `- **Total Staked:** ${parseFloat(pool.totalStaked).toFixed(2)}\n` +
        `- **Start Date:** ${pool.startTime}\n` +
        `- **End Date:** ${pool.endTime}\n`
      );
    })
    .join("\n");

  formattedInfo += `\nTo stake tokens, try: "Stake 10 ${getDefaultToken()} in pool ${
    highestApyPool.poolId
  }"`;

  return formattedInfo;
};
