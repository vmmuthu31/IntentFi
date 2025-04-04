// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PriceOracle.sol";

/**
 * @title LendingPool
 * @dev Main contract for lending and borrowing
 */
contract LendingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Token configurations
    struct TokenConfig {
        bool isListed;          // Whether the token is supported
        uint256 collateralFactor; // The loan-to-value ratio (in basis points, e.g., 7500 = 75%)
        uint256 borrowFactor;     // The utilization ratio permitted (in basis points)
        uint256 liquidationThreshold; // Threshold for liquidation (in basis points)
        uint256 liquidationPenalty;   // Penalty for liquidation (in basis points)
        uint256 reserveFactor;      // Percentage of interest allocated to reserves (in basis points)
        uint8 decimals;            // Decimals of the token
    }

    // User account state
    struct AccountData {
        uint256 deposited;      // Amount of tokens deposited
        uint256 borrowed;       // Amount of tokens borrowed
        uint256 lastInterestTimestamp; // Last time interest was calculated
    }

    // Pool state tracking
    struct PoolData {
        uint256 totalDeposits;  // Total deposits in this token
        uint256 totalBorrows;   // Total borrows in this token
        uint256 totalReserves;  // Protocol reserves
        uint256 borrowAPY;      // Current borrow APY (in basis points)
        uint256 depositAPY;     // Current deposit APY (in basis points)
        uint256 lastUpdateTimestamp; // Last time interest rates were updated
    }

    // Liquidation parameters used by helper functions
    struct LiquidationParams {
        address borrower;
        address debtToken;
        address collateralToken;
        uint256 amount;
        uint256 actualLiquidationAmount;
        uint256 collateralToSeize;
    }

    // Constants
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant BASIS_POINTS = 10000; // 100% in basis points
    
    // State variables
    PriceOracle public oracle;
    mapping(address => TokenConfig) public tokenConfigs;
    mapping(address => mapping(address => AccountData)) public accountData; // token => user => data
    mapping(address => PoolData) public poolData; // token => pool data
    address[] public supportedTokens;

    // Events
    event TokenListed(address token, uint256 collateralFactor, uint256 borrowFactor);
    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event Borrow(address indexed user, address indexed token, uint256 amount);
    event Repay(address indexed repayer, address indexed borrower, address indexed token, uint256 amount);
    event Liquidate(address indexed liquidator, address indexed borrower, address indexed token, uint256 amount);
    event InterestRateUpdated(address indexed token, uint256 borrowAPY, uint256 depositAPY);

    constructor(address _oracle) Ownable(msg.sender) {
        oracle = PriceOracle(_oracle);
    }

    /**
     * @dev Add a new token to the lending pool
     * @param token The token address
     * @param collateralFactor The collateral factor in basis points (e.g., 7500 = 75%)
     * @param borrowFactor The borrow factor in basis points
     * @param liquidationThreshold Threshold for liquidation in basis points
     * @param liquidationPenalty Penalty for liquidation in basis points
     * @param reserveFactor Percentage of interest allocated to reserves in basis points
     */
    function listToken(
        address token,
        uint256 collateralFactor,
        uint256 borrowFactor,
        uint256 liquidationThreshold,
        uint256 liquidationPenalty,
        uint256 reserveFactor
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!tokenConfigs[token].isListed, "Token already listed");
        require(collateralFactor <= 9000, "Collateral factor too high"); // Max 90%
        require(borrowFactor <= 9000, "Borrow factor too high"); // Max 90%
        require(liquidationThreshold > collateralFactor, "Invalid liquidation threshold");
        require(liquidationPenalty <= 2000, "Liquidation penalty too high"); // Max 20%
        require(reserveFactor <= 5000, "Reserve factor too high"); // Max 50%

        // Get token decimals
        uint8 decimals;
        try IERC20Metadata(token).decimals() returns (uint8 _decimals) {
            decimals = _decimals;
        } catch {
            decimals = 18; // Default to 18 if the call fails
        }

        tokenConfigs[token] = TokenConfig({
            isListed: true,
            collateralFactor: collateralFactor,
            borrowFactor: borrowFactor,
            liquidationThreshold: liquidationThreshold,
            liquidationPenalty: liquidationPenalty,
            reserveFactor: reserveFactor,
            decimals: decimals
        });

        // Initialize pool data
        poolData[token] = PoolData({
            totalDeposits: 0,
            totalBorrows: 0,
            totalReserves: 0,
            borrowAPY: 500, // Initial 5% APY
            depositAPY: 300, // Initial 3% APY
            lastUpdateTimestamp: block.timestamp
        });

        supportedTokens.push(token);
        emit TokenListed(token, collateralFactor, borrowFactor);
    }

    /**
     * @dev Updates the interest rates for a token based on utilization
     * @param token The token address
     */
    function updateInterestRates(address token) internal {
        TokenConfig storage config = tokenConfigs[token];
        PoolData storage pool = poolData[token];
        
        uint256 utilization;
        if (pool.totalDeposits > 0) {
            utilization = (pool.totalBorrows * BASIS_POINTS) / pool.totalDeposits;
        } else {
            utilization = 0;
        }
        
        // Calculate borrow APY based on utilization (example curve)
        // At 0% utilization: 2% base rate
        // At optimal utilization (80%): 10%
        // Above optimal: exponential increase
        uint256 optimalUtilization = 8000; // 80% optimal utilization
        
        if (utilization <= optimalUtilization) {
            // Linear increase from 2% to 10%
            pool.borrowAPY = 200 + (utilization * 800) / optimalUtilization;
        } else {
            // Exponential increase above optimal
            uint256 excessUtilization = utilization - optimalUtilization;
            pool.borrowAPY = 1000 + (excessUtilization * excessUtilization) / 10000;
        }
        
        // Cap the borrow APY at 100%
        if (pool.borrowAPY > 10000) {
            pool.borrowAPY = 10000;
        }
        
        // Calculate supply APY as a function of the borrow APY and utilization
        pool.depositAPY = (pool.borrowAPY * utilization) / BASIS_POINTS;
        
        // Apply the reserve factor
        pool.depositAPY = (pool.depositAPY * (BASIS_POINTS - config.reserveFactor)) / BASIS_POINTS;
        
        pool.lastUpdateTimestamp = block.timestamp;
        
        emit InterestRateUpdated(token, pool.borrowAPY, pool.depositAPY);
    }

    /**
     * @dev Accrues interest for a specific user and token
     * @param user The user address
     * @param token The token address
     */
    function accrueInterest(address user, address token) internal {
        TokenConfig storage config = tokenConfigs[token];
        require(config.isListed, "Token not listed");
        
        AccountData storage account = accountData[token][user];
        PoolData storage pool = poolData[token];
        
        // Skip if no activity or just initiated
        if (account.lastInterestTimestamp == 0) {
            account.lastInterestTimestamp = block.timestamp;
            return;
        }
        
        uint256 timePassed = block.timestamp - account.lastInterestTimestamp;
        if (timePassed == 0) return;
        
        // Calculate deposit interest
        if (account.deposited > 0) {
            uint256 depositInterest = (account.deposited * pool.depositAPY * timePassed) / (BASIS_POINTS * SECONDS_PER_YEAR);
            account.deposited += depositInterest;
            pool.totalDeposits += depositInterest;
        }
        
        // Calculate borrow interest
        if (account.borrowed > 0) {
            uint256 borrowInterest = (account.borrowed * pool.borrowAPY * timePassed) / (BASIS_POINTS * SECONDS_PER_YEAR);
            account.borrowed += borrowInterest;
            pool.totalBorrows += borrowInterest;
            
            // Add to reserves
            uint256 reserveAmount = (borrowInterest * config.reserveFactor) / BASIS_POINTS;
            pool.totalReserves += reserveAmount;
        }
        
        account.lastInterestTimestamp = block.timestamp;
    }

    /**
     * @dev Deposits tokens into the lending pool
     * @param token The token address
     * @param amount The amount to deposit
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        TokenConfig storage config = tokenConfigs[token];
        require(config.isListed, "Token not listed");
        require(amount > 0, "Amount must be greater than 0");
        
        // Accrue interest
        accrueInterest(msg.sender, token);
        updateInterestRates(token);
        
        // Update state
        accountData[token][msg.sender].deposited += amount;
        poolData[token].totalDeposits += amount;
        
        // Transfer tokens to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposit(msg.sender, token, amount);
    }

    /**
     * @dev Withdraws tokens from the lending pool
     * @param token The token address
     * @param amount The amount to withdraw
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        TokenConfig storage config = tokenConfigs[token];
        require(config.isListed, "Token not listed");
        
        // Accrue interest
        accrueInterest(msg.sender, token);
        
        AccountData storage account = accountData[token][msg.sender];
        PoolData storage pool = poolData[token];
        
        require(amount > 0 && amount <= account.deposited, "Invalid withdrawal amount");
        
        // Check if withdrawal would compromise the health factor
        uint256 newDeposited = account.deposited - amount;
        require(getUserHealthFactor(msg.sender, token, newDeposited, account.borrowed) >= BASIS_POINTS, 
                "Withdrawal would risk liquidation");
        
        // Check if the pool has enough liquidity
        require(pool.totalDeposits - pool.totalBorrows >= amount, "Insufficient liquidity in pool");
        
        // Update state
        account.deposited = newDeposited;
        pool.totalDeposits -= amount;
        
        // Update interest rates
        updateInterestRates(token);
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, token, amount);
    }

    /**
     * @dev Calculates the user's health factor
     * @param user The user address
     * @param simulationToken The token address being modified
     * @param simulationDeposited The new deposited amount of the token (use existing if not changing)
     * @param simulationBorrowed The new borrowed amount of the token (use existing if not changing)
     * @return The health factor in basis points (10000 = 100%, healthy)
     */
    function getUserHealthFactor(
        address user,
        address simulationToken,
        uint256 simulationDeposited,
        uint256 simulationBorrowed
    ) public view returns (uint256) {
        uint256 totalCollateralValueInUSD = 0;
        uint256 totalBorrowedValueInUSD = 0;
        
        // Calculate values for all tokens except the simulation token
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            if (token == simulationToken) continue;
            
            TokenConfig memory config = tokenConfigs[token];
            AccountData memory account = accountData[token][user];
            
            if (account.deposited > 0) {
                uint256 valueInUSD = oracle.getTokenValueInUSD(token, account.deposited, config.decimals);
                // Apply collateral factor
                totalCollateralValueInUSD += (valueInUSD * config.collateralFactor) / BASIS_POINTS;
            }
            
            if (account.borrowed > 0) {
                uint256 valueInUSD = oracle.getTokenValueInUSD(token, account.borrowed, config.decimals);
                totalBorrowedValueInUSD += valueInUSD;
            }
        }
        
        // Add the simulation token
        if (simulationToken != address(0)) {
            TokenConfig memory config = tokenConfigs[simulationToken];
            
            if (simulationDeposited > 0) {
                uint256 valueInUSD = oracle.getTokenValueInUSD(simulationToken, simulationDeposited, config.decimals);
                // Apply collateral factor
                totalCollateralValueInUSD += (valueInUSD * config.collateralFactor) / BASIS_POINTS;
            }
            
            if (simulationBorrowed > 0) {
                uint256 valueInUSD = oracle.getTokenValueInUSD(simulationToken, simulationBorrowed, config.decimals);
                totalBorrowedValueInUSD += valueInUSD;
            }
        }
        
        // Calculate health factor
        if (totalBorrowedValueInUSD == 0) return type(uint256).max; // No borrows, perfectly healthy
        
        return (totalCollateralValueInUSD * BASIS_POINTS) / totalBorrowedValueInUSD;
    }

    /**
     * @dev Borrows tokens from the lending pool
     * @param token The token address
     * @param amount The amount to borrow
     */
    function borrow(address token, uint256 amount) external nonReentrant {
        TokenConfig storage config = tokenConfigs[token];
        require(config.isListed, "Token not listed");
        require(amount > 0, "Amount must be greater than 0");
        
        PoolData storage pool = poolData[token];
        require(pool.totalDeposits - pool.totalBorrows >= amount, "Insufficient liquidity in pool");
        
        // Accrue interest for all supported tokens for this user
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            accrueInterest(msg.sender, supportedTokens[i]);
        }
        
        AccountData storage account = accountData[token][msg.sender];
        uint256 newBorrowed = account.borrowed + amount;
        
        // Ensure the user has enough collateral
        require(getUserHealthFactor(msg.sender, token, account.deposited, newBorrowed) >= BASIS_POINTS,
                "Insufficient collateral");
        
        // Update state
        account.borrowed = newBorrowed;
        pool.totalBorrows += amount;
        
        // Update interest rates
        updateInterestRates(token);
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Borrow(msg.sender, token, amount);
    }

    /**
     * @dev Repays borrowed tokens
     * @param token The token address
     * @param amount The amount to repay (use type(uint256).max to repay all)
     * @param onBehalfOf Address of the user to repay for (default is msg.sender)
     */
    function repay(address token, uint256 amount, address onBehalfOf) external nonReentrant {
        TokenConfig storage config = tokenConfigs[token];
        require(config.isListed, "Token not listed");
        
        address borrower = onBehalfOf == address(0) ? msg.sender : onBehalfOf;
        
        // Accrue interest
        accrueInterest(borrower, token);
        
        AccountData storage account = accountData[token][borrower];
        PoolData storage pool = poolData[token];
        
        require(account.borrowed > 0, "No outstanding borrow");
        
        uint256 repayAmount = amount;
        if (amount == type(uint256).max) {
            repayAmount = account.borrowed;
        }
        
        require(repayAmount <= account.borrowed, "Repay amount exceeds debt");
        
        // Update state
        account.borrowed -= repayAmount;
        pool.totalBorrows -= repayAmount;
        
        // Update interest rates
        updateInterestRates(token);
        
        // Transfer tokens from user to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), repayAmount);
        
        emit Repay(msg.sender, borrower, token, repayAmount);
    }

    /**
     * @dev Helper function to calculate liquidation amounts
     * @param params The liquidation parameters
     * @return The updated liquidation parameters with calculated values
     */
    function calculateLiquidationAmounts(LiquidationParams memory params) internal view returns (LiquidationParams memory) {
        TokenConfig memory debtConfig = tokenConfigs[params.debtToken];
        TokenConfig memory collateralConfig = tokenConfigs[params.collateralToken];
        
        AccountData memory borrowerDebtAccount = accountData[params.debtToken][params.borrower];
        
        // Check liquidation amount
        uint256 maxLiquidationAmount = (borrowerDebtAccount.borrowed * 5000) / BASIS_POINTS; // 50% of debt
        params.actualLiquidationAmount = params.amount > maxLiquidationAmount ? maxLiquidationAmount : params.amount;
        
        // Calculate collateral to seize
        uint256 debtValueInUSD = oracle.getTokenValueInUSD(
            params.debtToken, 
            params.actualLiquidationAmount, 
            debtConfig.decimals
        );
        
        // Add liquidation penalty
        debtValueInUSD = (debtValueInUSD * (BASIS_POINTS + collateralConfig.liquidationPenalty)) / BASIS_POINTS;
        
        AccountData memory borrowerCollateralAccount = accountData[params.collateralToken][params.borrower];
        uint256 collateralValueInUSD = oracle.getTokenValueInUSD(
            params.collateralToken, 
            borrowerCollateralAccount.deposited, 
            collateralConfig.decimals
        );
        
        params.collateralToSeize = (borrowerCollateralAccount.deposited * debtValueInUSD) / collateralValueInUSD;
        if (params.collateralToSeize > borrowerCollateralAccount.deposited) {
            params.collateralToSeize = borrowerCollateralAccount.deposited;
        }
        
        return params;
    }

    /**
     * @dev Liquidates an undercollateralized position
     * @param borrower The borrower to liquidate
     * @param debtToken The token the borrower has borrowed
     * @param collateralToken The token to receive as collateral
     * @param amount The amount of debt to liquidate
     */
    function liquidate(
        address borrower,
        address debtToken,
        address collateralToken,
        uint256 amount
    ) external nonReentrant {
        require(borrower != msg.sender, "Cannot liquidate yourself");
        
        TokenConfig storage debtConfig = tokenConfigs[debtToken];
        TokenConfig storage collateralConfig = tokenConfigs[collateralToken];
        
        require(debtConfig.isListed && collateralConfig.isListed, "Token not listed");
        
        // Accrue interest for all tokens
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            accrueInterest(borrower, supportedTokens[i]);
        }
        
        // Calculate health factor
        uint256 healthFactor = getUserHealthFactor(borrower, address(0), 0, 0);
        require(healthFactor < BASIS_POINTS, "Position not liquidatable");
        
        AccountData storage borrowerDebtAccount = accountData[debtToken][borrower];
        AccountData storage borrowerCollateralAccount = accountData[collateralToken][borrower];
        
        require(borrowerDebtAccount.borrowed > 0, "Borrower has no debt in this token");
        require(borrowerCollateralAccount.deposited > 0, "Borrower has no collateral in this token");
        
        // Calculate liquidation amounts to avoid stack too deep
        LiquidationParams memory params = LiquidationParams({
            borrower: borrower,
            debtToken: debtToken,
            collateralToken: collateralToken,
            amount: amount,
            actualLiquidationAmount: 0,
            collateralToSeize: 0
        });
        
        params = calculateLiquidationAmounts(params);
        
        require(params.actualLiquidationAmount <= borrowerDebtAccount.borrowed, "Liquidation amount too high");
        
        // Update state
        borrowerDebtAccount.borrowed -= params.actualLiquidationAmount;
        borrowerCollateralAccount.deposited -= params.collateralToSeize;
        
        poolData[debtToken].totalBorrows -= params.actualLiquidationAmount;
        poolData[collateralToken].totalDeposits -= params.collateralToSeize;
        
        // Update interest rates
        updateInterestRates(debtToken);
        updateInterestRates(collateralToken);
        
        // Transfer tokens
        IERC20(debtToken).safeTransferFrom(msg.sender, address(this), params.actualLiquidationAmount);
        IERC20(collateralToken).safeTransfer(msg.sender, params.collateralToSeize);
        
        emit Liquidate(msg.sender, borrower, debtToken, params.actualLiquidationAmount);
    }

    /**
     * @dev Gets the user's account data for a specific token
     * @param user The user address
     * @param token The token address
     * @return deposited Amount deposited
     * @return borrowed Amount borrowed
     * @return healthFactor The account health factor
     */
    function getUserAccount(address user, address token) external view returns (
        uint256 deposited,
        uint256 borrowed,
        uint256 healthFactor
    ) {
        AccountData memory account = accountData[token][user];
        
        return (
            account.deposited,
            account.borrowed,
            getUserHealthFactor(user, address(0), 0, 0)
        );
    }

    /**
     * @dev Gets the token's current pool data
     * @param token The token address
     * @return totalDeposits Total deposits
     * @return totalBorrows Total borrows
     * @return depositAPY Current deposit APY
     * @return borrowAPY Current borrow APY
     * @return utilizationRate Current utilization rate
     */
    function getPoolData(address token) external view returns (
        uint256 totalDeposits,
        uint256 totalBorrows,
        uint256 depositAPY,
        uint256 borrowAPY,
        uint256 utilizationRate
    ) {
        PoolData memory pool = poolData[token];
        
        uint256 utilization;
        if (pool.totalDeposits > 0) {
            utilization = (pool.totalBorrows * BASIS_POINTS) / pool.totalDeposits;
        } else {
            utilization = 0;
        }
        
        return (
            pool.totalDeposits,
            pool.totalBorrows,
            pool.depositAPY,
            pool.borrowAPY,
            utilization
        );
    }

    /**
    * @dev Gets a list of all supported tokens
    * @return List of token addresses that are supported by the lending pool
    */
    function getAllSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    /**
    * @dev Gets the token configuration details
    * @param token The token address
    * @return isListed Whether the token is listed
    * @return collateralFactor The collateral factor
    * @return borrowFactor The borrow factor
    * @return liquidationThreshold The liquidation threshold
    * @return liquidationPenalty The liquidation penalty
    * @return reserveFactor The reserve factor
    * @return decimals The token decimals
    */
    function getTokenConfig(address token) external view returns (
        bool isListed,
        uint256 collateralFactor,
        uint256 borrowFactor,
        uint256 liquidationThreshold,
        uint256 liquidationPenalty,
        uint256 reserveFactor,
        uint8 decimals
    ) {
        TokenConfig memory config = tokenConfigs[token];
        return (
            config.isListed,
            config.collateralFactor,
            config.borrowFactor,
            config.liquidationThreshold,
            config.liquidationPenalty,
            config.reserveFactor,
            config.decimals
        );
    }
}

// Interface for ERC20 token with decimals function
interface IERC20Metadata is IERC20 {
    function decimals() external view returns (uint8);
}