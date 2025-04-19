export const CHAIN_SPECIFIC_INTENTS: Record<string, string[]> = {
  // Celo Alfajores examples
  "44787": [
    "Deposit 10 USDC on Celo",
    "Withdraw 5 CELO from lending pool",
    "Borrow 100 USDT on Celo",
    "Repay 50 USDC loan on Celo",
    "Check my CELO balance",
    "Stake 10 CELO in pool 4",
    "Unstake 5 CELO from pool 4",
    "Get pool information on Celo",
  ],
  // Rootstock examples
  "31": [
    "Deposit 0.1 RBTC on Rootstock",
    "Withdraw 5 USDT from Rootstock",
    "Borrow 10 USDT on Rootstock",
    "Repay 5 RBTC loan on Rootstock",
    "Check my RBTC balance",
    "Stake 1 RBTC in pool 4",
    "Unstake 0.5 RBTC from pool 4",
    "Get pool information on Rootstock",
  ],
  // Saga IFI examples
  "2743859179913000": [
    "Deposit 10 USDC on Saga",
    "Withdraw 5 IFI from lending pool",
    "Borrow 20 USDT on Saga",
    "Repay 10 IFI loan",
    "Check my IFI balance",
    "Stake 5 IFI in pool 4",
    "Unstake 2 IFI from pool 4",
    "Get pool information on Saga",
  ],
  // Default examples for any other chain
  default: [
    "Deposit 10 USDC",
    "Withdraw 5 ETH from lending pool",
    "Borrow 100 USDT",
    "Repay 50 USDC loan",
    "Check my token balance",
    "Stake 10 tokens in pool 4",
    "Unstake 5 tokens from pool 4",
    "Get pool information",
  ],
};
