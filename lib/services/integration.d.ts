import { BigNumber } from "ethers";
import { ethers } from "ethers";
// Define the TokenBalance type
export interface TokenBalance {
  symbol: string;
  amount: string;
  usdValue?: number;
}

// Define the Web3Provider type
export type Web3Provider = ethers.providers.ExternalProvider;

// Define the Provider type
export type Provider = ethers.providers.Provider;

// Define the integration object interface
declare interface IntegrationInterface {
  formatUnits: (value: string | BigNumber, decimals?: number) => string;
  parseUnits: (value: string, decimals?: number) => BigNumber;
  // eslint-disable-next-line
  approveWithWagmi: (params: { chainId: number }) => Promise<any>;
  // eslint-disable-next-line
  setTokenPrice: (params: any) => Promise<any>;
  // eslint-disable-next-line
  getTokenBalance: (params: any) => Promise<string>;
  // eslint-disable-next-line
  checkAllowance: (params: any) => Promise<any>;
  // eslint-disable-next-line
  fundFaucet: (params: any) => Promise<any>;
  // eslint-disable-next-line
  deposit: (params: any) => Promise<any>;
  // eslint-disable-next-line
  withdraw: (params: any) => Promise<any>;
  // eslint-disable-next-line
  borrow: (params: any) => Promise<any>;
  // eslint-disable-next-line
  repay: (params: any) => Promise<any>;
  // eslint-disable-next-line
  listToken: (params: any) => Promise<any>;
  // eslint-disable-next-line
  createPool: (params: any) => Promise<any>;
  // eslint-disable-next-line
  getPoolInformation: (params: { chainId: number }) => Promise<any>;
  // eslint-disable-next-line
  stake: (params: any) => Promise<any>;
  // eslint-disable-next-line
  unstake: (params: any) => Promise<any>;
  // eslint-disable-next-line
  getUserPoolInfo: (params: any) => Promise<any>;
  // eslint-disable-next-line
  claimRewards: (params: any) => Promise<any>;
  // eslint-disable-next-line
  emergencyWithdraw: (params: any) => Promise<any>;

  // GOAT SDK Functions
  // eslint-disable-next-line
  getPricePrediction: (params: any) => Promise<any>;
  // eslint-disable-next-line
  getTokenInsights: (params: any) => Promise<any>;
  // eslint-disable-next-line
  getTokenInfo: (params: any) => Promise<any>;
  // eslint-disable-next-line
  bridgeTokens: (params: any) => Promise<any>;
  // eslint-disable-next-line
  resolveEnsName: (params: any) => Promise<any>;
  // eslint-disable-next-line
  addBalancerLiquidity: (params: any) => Promise<any>;

  // Optional methods that might not exist in all environments
  getTokenBalancesWithGoat?: (
    chainId: number,
    account: string,
    provider: Provider
  ) => Promise<TokenBalance[]>;

  getSwapQuote?: (params: {
    chainId: number;
    provider: Provider;
    address: string;
    inputToken: string;
    outputToken: string;
    amount: string;
  }) => Promise<{
    expectedOutput: string;
    estimatedPriceImpact: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    routeDescription: string;
  }>;

  executeSwap?: (params: {
    chainId: number;
    provider: Provider;
    address: string;
    inputToken: string;
    outputToken: string;
    amount: string;
    slippage?: number;
    // eslint-disable-next-line
  }) => Promise<any>;
}

// Export the integration interface
export const integration: IntegrationInterface;
