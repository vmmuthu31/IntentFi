// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LendingPool.sol";
import "./YieldFarm.sol";

/**
 * @title DeFiPlatform
 * @dev A combined platform that integrates lending and yield farming functionalities
 */
contract DeFiPlatform is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // State variables
    LendingPool public lendingPool;
    YieldFarm public yieldFarm;
    
    // Strategy types
    enum StrategyType { LEND, BORROW_AND_STAKE, LEND_AND_STAKE }
    
    // Strategy information
    struct Strategy {
        StrategyType strategyType;
        address token;           // Main token used in strategy
        address extraToken;      // Secondary token (for multi-token strategies)
        uint256 lendingAmount;   // Amount lent to the lending pool
        uint256 borrowAmount;    // Amount borrowed from the lending pool
        uint256 stakingAmount;   // Amount staked in the yield farm
        uint256 poolId;          // Yield farm pool ID if applicable
        bool isActive;           // Whether the strategy is active
    }
    
    // Mapping of user strategies
    mapping(address => Strategy[]) public userStrategies;
    
    // Events
    event StrategyCreated(address indexed user, uint256 strategyId, StrategyType strategyType);
    event StrategyUpdated(address indexed user, uint256 strategyId);
    event StrategyTerminated(address indexed user, uint256 strategyId);
    
    /**
     * @dev Constructor
     * @param _lendingPool Address of the LendingPool contract
     * @param _yieldFarm Address of the YieldFarm contract
     */
    constructor(address _lendingPool, address _yieldFarm) Ownable(msg.sender) {
        require(_lendingPool != address(0), "Invalid lending pool address");
        require(_yieldFarm != address(0), "Invalid yield farm address");
        
        lendingPool = LendingPool(_lendingPool);
        yieldFarm = YieldFarm(_yieldFarm);
    }
    
    /**
     * @dev Creates a simple lending strategy
     * @param token The token to lend
     * @param amount The amount to lend
     * @return strategyId The ID of the created strategy
     */
    function createLendingStrategy(address token, uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve the lending pool to use the tokens
        IERC20(token).approve(address(lendingPool), amount);
        
        // Deposit into the lending pool
        lendingPool.deposit(token, amount);
        
        // Create a new strategy
        Strategy memory strategy = Strategy({
            strategyType: StrategyType.LEND,
            token: token,
            extraToken: address(0),
            lendingAmount: amount,
            borrowAmount: 0,
            stakingAmount: 0,
            poolId: 0,
            isActive: true
        });
        
        userStrategies[msg.sender].push(strategy);
        uint256 strategyId = userStrategies[msg.sender].length - 1;
        
        emit StrategyCreated(msg.sender, strategyId, StrategyType.LEND);
        
        return strategyId;
    }
    
    /**
     * @dev Creates a borrow and stake strategy
     * @param lendToken The token to use as collateral
     * @param borrowToken The token to borrow
     * @param lendAmount The amount to lend as collateral
     * @param borrowAmount The amount to borrow
     * @param poolId The yield farm pool ID to stake in
     * @return strategyId The ID of the created strategy
     */
    function createBorrowAndStakeStrategy(
        address lendToken,
        address borrowToken,
        uint256 lendAmount,
        uint256 borrowAmount,
        uint256 poolId
    ) external nonReentrant returns (uint256) {
        require(lendAmount > 0, "Lend amount must be greater than 0");
        require(borrowAmount > 0, "Borrow amount must be greater than 0");
        
        // Check if the pool exists and is valid for the borrow token
        (address stakingToken, , , , , , , , ) = yieldFarm.pools(poolId);
        require(stakingToken == borrowToken, "Pool staking token must match borrow token");
        
        // Transfer collateral tokens to this contract
        IERC20(lendToken).safeTransferFrom(msg.sender, address(this), lendAmount);
        
        // Approve and deposit collateral into the lending pool
        IERC20(lendToken).approve(address(lendingPool), lendAmount);
        lendingPool.deposit(lendToken, lendAmount);
        
        // Borrow tokens from the lending pool
        lendingPool.borrow(borrowToken, borrowAmount);
        
        // Approve and stake borrowed tokens in the yield farm
        IERC20(borrowToken).approve(address(yieldFarm), borrowAmount);
        yieldFarm.stake(poolId, borrowAmount);
        
        // Create a new strategy
        Strategy memory strategy = Strategy({
            strategyType: StrategyType.BORROW_AND_STAKE,
            token: lendToken,
            extraToken: borrowToken,
            lendingAmount: lendAmount,
            borrowAmount: borrowAmount,
            stakingAmount: borrowAmount,
            poolId: poolId,
            isActive: true
        });
        
        userStrategies[msg.sender].push(strategy);
        uint256 strategyId = userStrategies[msg.sender].length - 1;
        
        emit StrategyCreated(msg.sender, strategyId, StrategyType.BORROW_AND_STAKE);
        
        return strategyId;
    }
    
    /**
     * @dev Creates a lend and stake strategy
     * @param token The token to lend and stake
     * @param amount The amount to use
     * @param lendRatio The percentage to lend (in basis points, e.g. 5000 = 50%)
     * @param poolId The yield farm pool ID to stake in
     * @return strategyId The ID of the created strategy
     */
    function createLendAndStakeStrategy(
        address token,
        uint256 amount,
        uint256 lendRatio,
        uint256 poolId
    ) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        require(lendRatio > 0 && lendRatio < 10000, "Invalid lend ratio");
        
        // Check if the pool exists and is valid for the token
        (address stakingToken, , , , , , , , ) = yieldFarm.pools(poolId);
        require(stakingToken == token, "Pool staking token must match the token");
        
        // Calculate amounts for lending and staking
        uint256 lendAmount = (amount * lendRatio) / 10000;
        uint256 stakeAmount = amount - lendAmount;
        
        // Transfer tokens to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve and deposit part of tokens into the lending pool
        IERC20(token).approve(address(lendingPool), lendAmount);
        lendingPool.deposit(token, lendAmount);
        
        // Approve and stake the rest of tokens in the yield farm
        IERC20(token).approve(address(yieldFarm), stakeAmount);
        yieldFarm.stake(poolId, stakeAmount);
        
        // Create a new strategy
        Strategy memory strategy = Strategy({
            strategyType: StrategyType.LEND_AND_STAKE,
            token: token,
            extraToken: address(0),
            lendingAmount: lendAmount,
            borrowAmount: 0,
            stakingAmount: stakeAmount,
            poolId: poolId,
            isActive: true
        });
        
        userStrategies[msg.sender].push(strategy);
        uint256 strategyId = userStrategies[msg.sender].length - 1;
        
        emit StrategyCreated(msg.sender, strategyId, StrategyType.LEND_AND_STAKE);
        
        return strategyId;
    }
    
    /**
     * @dev Terminates a strategy and returns all assets to the user
     * @param strategyId The ID of the strategy to terminate
     */
    function terminateStrategy(uint256 strategyId) external nonReentrant {
        require(strategyId < userStrategies[msg.sender].length, "Strategy does not exist");
        
        Strategy storage strategy = userStrategies[msg.sender][strategyId];
        require(strategy.isActive, "Strategy is not active");
        
        if (strategy.strategyType == StrategyType.LEND) {
            // Withdraw from lending pool
            lendingPool.withdraw(strategy.token, strategy.lendingAmount);
            
            // Transfer tokens back to user
            IERC20(strategy.token).safeTransfer(msg.sender, strategy.lendingAmount);
        } 
        else if (strategy.strategyType == StrategyType.BORROW_AND_STAKE) {
            // Unstake from yield farm
            yieldFarm.unstake(strategy.poolId, strategy.stakingAmount);
            
            // Claim any rewards
            if (yieldFarm.pendingRewards(strategy.poolId, address(this)) > 0) {
                yieldFarm.claimRewards(strategy.poolId);
                
                // Get the reward token
                (,address rewardToken, , , , , , , ) = yieldFarm.pools(strategy.poolId);
                
                // Transfer rewards to user
                uint256 rewardBalance = IERC20(rewardToken).balanceOf(address(this));
                if (rewardBalance > 0) {
                    IERC20(rewardToken).safeTransfer(msg.sender, rewardBalance);
                }
            }
            
            // Repay loan
            IERC20(strategy.extraToken).approve(address(lendingPool), strategy.borrowAmount);
            lendingPool.repay(strategy.extraToken, strategy.borrowAmount, address(0));
            
            // Withdraw collateral
            lendingPool.withdraw(strategy.token, strategy.lendingAmount);
            
            // Transfer tokens back to user
            IERC20(strategy.token).safeTransfer(msg.sender, strategy.lendingAmount);
        } 
        else if (strategy.strategyType == StrategyType.LEND_AND_STAKE) {
            // Unstake from yield farm
            yieldFarm.unstake(strategy.poolId, strategy.stakingAmount);
            
            // Claim any rewards
            if (yieldFarm.pendingRewards(strategy.poolId, address(this)) > 0) {
                yieldFarm.claimRewards(strategy.poolId);
                
                // Get the reward token
                (,address rewardToken, , , , , , , ) = yieldFarm.pools(strategy.poolId);
                
                // Transfer rewards to user
                uint256 rewardBalance = IERC20(rewardToken).balanceOf(address(this));
                if (rewardBalance > 0) {
                    IERC20(rewardToken).safeTransfer(msg.sender, rewardBalance);
                }
            }
            
            // Withdraw from lending pool
            lendingPool.withdraw(strategy.token, strategy.lendingAmount);
            
            // Transfer all tokens back to user
            uint256 totalBalance = IERC20(strategy.token).balanceOf(address(this));
            IERC20(strategy.token).safeTransfer(msg.sender, totalBalance);
        }
        
        // Mark strategy as inactive
        strategy.isActive = false;
        
        emit StrategyTerminated(msg.sender, strategyId);
    }
    
    /**
     * @dev Claims yield farm rewards for a strategy
     * @param strategyId The ID of the strategy
     */
    function claimYieldRewards(uint256 strategyId) external nonReentrant {
        require(strategyId < userStrategies[msg.sender].length, "Strategy does not exist");
        
        Strategy storage strategy = userStrategies[msg.sender][strategyId];
        require(strategy.isActive, "Strategy is not active");
        require(strategy.strategyType != StrategyType.LEND, "Strategy does not have yield rewards");
        
        // Claim rewards
        yieldFarm.claimRewards(strategy.poolId);
        
        // Get the reward token
        (,address rewardToken, , , , , , , ) = yieldFarm.pools(strategy.poolId);
        
        // Transfer rewards to user
        uint256 rewardBalance = IERC20(rewardToken).balanceOf(address(this));
        if (rewardBalance > 0) {
            IERC20(rewardToken).safeTransfer(msg.sender, rewardBalance);
        }
    }
    
    /**
     * @dev Gets the number of strategies for a user
     * @param user The user address
     * @return The number of strategies
     */
    function getStrategyCount(address user) external view returns (uint256) {
        return userStrategies[user].length;
    }
    
    /**
     * @dev Gets the strategy information
     * @param user The user address
     * @param strategyId The strategy ID
     * @return strategyType The type of strategy
     * @return token The main token used in the strategy
     * @return extraToken The secondary token (if any)
     * @return lendingAmount The amount lent to the lending pool
     * @return borrowAmount The amount borrowed from the lending pool
     * @return stakingAmount The amount staked in the yield farm
     * @return poolId The yield farm pool ID
     * @return isActive Whether the strategy is active
     */
    function getStrategy(address user, uint256 strategyId) external view returns (
        StrategyType strategyType,
        address token,
        address extraToken,
        uint256 lendingAmount,
        uint256 borrowAmount,
        uint256 stakingAmount,
        uint256 poolId,
        bool isActive
    ) {
        require(strategyId < userStrategies[user].length, "Strategy does not exist");
        
        Strategy memory strategy = userStrategies[user][strategyId];
        
        return (
            strategy.strategyType,
            strategy.token,
            strategy.extraToken,
            strategy.lendingAmount,
            strategy.borrowAmount,
            strategy.stakingAmount,
            strategy.poolId,
            strategy.isActive
        );
    }
    
    /**
     * @dev Calculates the APY for a strategy
     * @param user The user address
     * @param strategyId The strategy ID
     * @return apy The estimated APY in basis points (e.g., 1000 = 10%)
     */
    function calculateStrategyAPY(address user, uint256 strategyId) external view returns (uint256 apy) {
        require(strategyId < userStrategies[user].length, "Strategy does not exist");
        
        Strategy memory strategy = userStrategies[user][strategyId];
        
        if (strategy.strategyType == StrategyType.LEND) {
            // Get the lending APY
            (, , uint256 depositAPY, , ) = lendingPool.getPoolData(strategy.token);
            return depositAPY;
        }
        else if (strategy.strategyType == StrategyType.BORROW_AND_STAKE) {
            // Get the lending APY (cost)
            (, , , uint256 borrowAPY, ) = lendingPool.getPoolData(strategy.extraToken);
            
            // Get the staking APY (revenue)
            uint256 stakingAPY = calculateYieldFarmAPY(strategy.poolId);
            
            // Calculate net APY (staking APY - borrowing APY)
            if (stakingAPY > borrowAPY) {
                return stakingAPY - borrowAPY;
            } else {
                return 0; // If cost exceeds revenue, APY is 0
            }
        }
        else if (strategy.strategyType == StrategyType.LEND_AND_STAKE) {
            // Get the lending APY
            (, , uint256 depositAPY, , ) = lendingPool.getPoolData(strategy.token);
            
            // Get the staking APY
            uint256 stakingAPY = calculateYieldFarmAPY(strategy.poolId);
            
            // Calculate weighted average APY
            uint256 totalAmount = strategy.lendingAmount + strategy.stakingAmount;
            return ((depositAPY * strategy.lendingAmount) + (stakingAPY * strategy.stakingAmount)) / totalAmount;
        }
        
        return 0;
    }
    
    /**
     * @dev Calculates the APY for a yield farm pool
     * @param poolId The pool ID
     * @return apy The estimated APY in basis points
     */
    function calculateYieldFarmAPY(uint256 poolId) internal view returns (uint256 apy) {
        (address stakingToken, address rewardToken, uint256 rewardPerSecond, , , , uint256 totalStaked, , ) = yieldFarm.pools(poolId);
        
        if (totalStaked == 0) return 0;
        
        // Calculate rewards per year
        uint256 rewardsPerYear = rewardPerSecond * 365 days;
        
        // Convert reward value to staking token value (simplified)
        // In a real implementation, we would use the price oracle here
        uint256 rewardValueInUSD = rewardsPerYear; // Simplified
        uint256 totalStakedValueInUSD = totalStaked; // Simplified
        
        // Calculate APY as rewards value / staked value * 10000
        return (rewardValueInUSD * 10000) / totalStakedValueInUSD;
    }
    
    /**
     * @dev Allows the owner to recover wrongly sent tokens
     * @param token The token address
     * @param amount The amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    
}