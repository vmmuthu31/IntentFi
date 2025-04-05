# DeFi Lending Platform - Functional Flow

## Contract Addresses (Celo Alfajores Testnet)

| Contract      | Address                                      |
|---------------|----------------------------------------------|
| PriceOracle   | 0xec8B24f053f6d20C6B4246069c8254d82C3A4724  |
| LendingPool   | 0x39fE958FfF831592B7Bd85206cb2773706219e2c  |
| YieldFarm     | 0x89d62664E1D3E483d62B12286F7e815F40ead075  |
| DeFiPlatform  | 0x822C01CCaeF0846e25a1C0749fF55757b954D054  |

## Functional Flow Table

| Step | Function | Contract | Description | Parameters | Return Value |
|------|----------|----------|-------------|------------|--------------|
| **Token Management** |
| 1 | `listToken` | LendingPool | Admin adds a new token to the platform | token address, collateralFactor(7500), borrowFactor(8000), liquidationThreshold(8000), liquidationPenalty(1000), reserveFactor(1000) | None |
| 2 | `getAllSupportedTokens` | LendingPool | Get array of all supported token addresses | None | array of token addresses |
| 3 | `getTokenConfig` | LendingPool | Get configuration details for a token | token address | struct with token config details |
| **Lending Operations** |
| 4 | `approve` | ERC20 Token | User approves tokens for the contract | LendingPool address, amount | boolean |
| 5 | `deposit` | LendingPool | User deposits tokens into the lending pool | token address, amount | None |
| 6 | `borrow` | LendingPool | User borrows against their collateral | token address, amount | None |
| 7 | `repay` | LendingPool | User repays borrowed tokens | token address, amount | None |
| 8 | `withdraw` | LendingPool | User withdraws deposited tokens | token address, amount | None |
| 9 | `liquidate` | LendingPool | Liquidator liquidates an underwater position | user address, tokenBorrowed, tokenCollateral, amountToLiquidate | None |
| 10 | `getUserAccount` | LendingPool | Get user's lending position details | user address, token address | struct with position details |
| 11 | `getPoolData` | LendingPool | Get pool statistics | token address | struct with APY, utilization rates |
| **Yield Farming Operations** |
| 12 | `createPool` | YieldFarm | Admin creates a new yield farming pool | stakingToken, rewardToken, rewardsPerSecond, startTime, endTime | pool ID |
| 13 | `stake` | YieldFarm | User stakes tokens in a yield farm | pool ID, amount | None |
| 14 | `unstake` | YieldFarm | User unstakes tokens from a yield farm | pool ID, amount | None |
| 15 | `claimRewards` | YieldFarm | User claims their farming rewards | pool ID | amount of rewards |
| 16 | `getPoolInfo` | YieldFarm | Get information about a yield farm | pool ID | struct with pool details |
| 17 | `getUserStake` | YieldFarm | Get user's staking position | user address, pool ID | struct with stake details |
| **Strategy Management** |
| 18 | `createLendingStrategy` | DeFiPlatform | User creates a lending-only strategy | token address, amount | strategy ID |
| 19 | `createBorrowAndStakeStrategy` | DeFiPlatform | User creates a strategy to borrow one token and stake it | lendToken, borrowToken, lendAmount, borrowAmount, poolId | strategy ID |
| 20 | `createLendAndStakeStrategy` | DeFiPlatform | User creates a strategy to lend and stake the same token | token, amount, poolId | strategy ID |
| 21 | `terminateStrategy` | DeFiPlatform | User terminates an active strategy | strategy ID | None |
| 22 | `getStrategy` | DeFiPlatform | Get details about a specific strategy | user address, strategy ID | struct with strategy details |
| 23 | `getStrategyCount` | DeFiPlatform | Get count of user's strategies | user address | number of strategies |
| 24 | `calculateStrategyAPY` | DeFiPlatform | Calculate the APY of a strategy | user address, strategy ID | APY (basis points) |
| **Price Oracle Operations** |
| 25 | `setTokenPrice` | PriceOracle | Admin sets the price of a token | token address, price | None |
| 26 | `getTokenPrice` | PriceOracle | Get current price of a token | token address | price |

## User Process Flow

1. **Preparation**
   - Obtain test tokens (USDC, celoETH, etc.) on Celo Alfajores testnet
   - Approve DeFiPlatform contract to spend tokens: `ERC20.approve(DeFiPlatform.address, amount)`

2. **Simple Lending**
   - Deposit tokens to earn interest: `LendingPool.deposit(token, amount)` or `DeFiPlatform.createLendingStrategy(token, amount)`
   - Monitor position: `LendingPool.getUserAccount(userAddress, token)`
   - Withdraw with interest: `LendingPool.withdraw(token, amount)` or `DeFiPlatform.terminateStrategy(strategyId)`

3. **Borrowing**
   - Deposit collateral: `LendingPool.deposit(collateralToken, amount)`
   - Borrow against collateral: `LendingPool.borrow(borrowToken, amount)`
   - Monitor health factor: `LendingPool.getUserAccount(userAddress, token).healthFactor`
   - Repay debt: `LendingPool.repay(borrowToken, amount)`

4. **Yield Farming**
   - Stake tokens in farm: `YieldFarm.stake(poolId, amount)`
   - Monitor position: `YieldFarm.getUserStake(userAddress, poolId)`
   - Claim rewards: `YieldFarm.claimRewards(poolId)`
   - Unstake tokens: `YieldFarm.unstake(poolId, amount)`

5. **Advanced Strategies**
   - Borrow and Stake: `DeFiPlatform.createBorrowAndStakeStrategy(lendToken, borrowToken, lendAmount, borrowAmount, poolId)`
   - Lend and Stake: `DeFiPlatform.createLendAndStakeStrategy(token, amount, poolId)`
   - Monitor strategy APY: `DeFiPlatform.calculateStrategyAPY(userAddress, strategyId)`
   - Terminate strategy: `DeFiPlatform.terminateStrategy(strategyId)`

6. **Liquidations**
   - Monitor accounts with health factor < 1: `LendingPool.getUserAccount(userAddress, token).healthFactor`
   - Liquidate positions: `LendingPool.liquidate(userAddress, tokenBorrowed, tokenCollateral, amountToLiquidate)`
   - Receive liquidation bonus: Liquidator gets discounted collateral (10% bonus)

## Contract Interaction Flow Diagram

Typical user interactions with the platform:

1. **Simple User** → Approves Tokens → Creates Lending Strategy → Monitors APY → Terminates Strategy

2. **Advanced User** → Approves Tokens → Deposits Collateral → Borrows Against Collateral → Stakes Borrowed Tokens → Claims Farming Rewards → Repays Loan → Withdraws Collateral

3. **Platform Admin** → Lists New Tokens → Sets Token Prices → Creates Yield Farming Pools → Monitors Platform Metrics
