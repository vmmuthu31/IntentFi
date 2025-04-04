pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../tokens/ib/IBToken.sol";
import "../rates/LendingRate.sol";
import "../rates/BorrowingRate.sol";
import "../tokens/debt/DebtToken.sol";
import "../tokens/borrowed/BorrowedToken.sol";
import "../tokens/collateral/CollateralToken.sol";
import "../pool/ProtocolReserve.sol";


contract Pool is ReentrancyGuard {

    uint public constant DECIMALS = 1e18;

    uint public constant SAFE_HEALTH_FACTOR = 1e18;

    BorrowedToken public borrowedToken;

    CollateralToken public collateralToken;

    IBToken public ibToken;

    DebtToken public debtToken;

    LendingRate public lendingRate;

    BorrowingRate public borrowingRate;

    OracleGateway public oracleGateway;

    ProtocolReserve public protocolReserve;

    uint public totalLiquidity;

    uint public totalBorrows;

    uint public collateralFactor;

    uint public liquidationThreshold;

    uint public liquidationPenaltyRate;

    mapping(address => uint256) public collateralBalances;

    event DepositAdded(address indexed depositor, address token, uint depositedAmount, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    event FundsWithdrawn(address indexed depositor, uint depositWithInterests, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    event Borrowing(address indexed borrower, uint principalBorrowed, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    event Repayment(address indexed borrower, uint netPayment, uint collateralToReturn, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    event Liquidation(address indexed borrower, address indexed liquidator, uint principalWithInterest, uint collateralSeized, uint liquidatorReward, uint remainingCollateral, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    constructor(address _borrowedToken, address _collateralToken, address _ibToken, address _lendingRate, address _borrowingRate, address _debtToken, address _oracleGateway, address _protocolReserve, uint  _collateralFactor, uint _liquidationThreshold, uint _liquidationPenaltyRate) {

        borrowedToken = BorrowedToken(_borrowedToken);
        collateralToken = CollateralToken(_collateralToken);    
        lendingRate = LendingRate(_lendingRate);
        borrowingRate = BorrowingRate(_borrowingRate);
        oracleGateway = OracleGateway(_oracleGateway);
        protocolReserve = ProtocolReserve(_protocolReserve);
        collateralFactor = _collateralFactor;
        liquidationPenaltyRate = _liquidationPenaltyRate;
        liquidationThreshold = _liquidationThreshold;
        ibToken = IBToken(_ibToken);
        debtToken = DebtToken(_debtToken);
    }

    function deposit(uint256 amount) public nonReentrant {

        require(amount > 0, "The deposit must be greater than 0");
        totalLiquidity += amount; 

        ibToken.recalculateExchangeRate();
        uint exchangeRate = ibToken.getExchangeRate();
        uint ibTokenAllocation = amount * exchangeRate / DECIMALS;

        SafeERC20.safeTransferFrom(borrowedToken, msg.sender, address(this), amount);
        ibToken.mint(msg.sender, ibTokenAllocation);
        
        uint utilizationRate = getUtilizationRate();
        uint newBorrowingRate = borrowingRate.recalculateBorrowingRate(utilizationRate);
        lendingRate.recalculateLendingRate(newBorrowingRate);
        ibToken.recalculateExchangeRate();
        
        emit DepositAdded(msg.sender, address(borrowedToken), amount, totalLiquidity, totalBorrows, utilizationRate);
    }

    function withdraw() public nonReentrant {

        uint ibTokenBalance = ibToken.balanceOf(msg.sender);
        require(ibTokenBalance > 0, "No funds to withdraw");

        ibToken.recalculateExchangeRate();
        uint depositWithInterests = ibToken.getTotalEarned(msg.sender);
        require(totalLiquidity >= depositWithInterests, "The amount of token and interests cannot be withdrawn, because of insufficient liquidity");
        totalLiquidity -= depositWithInterests;

        uint utilizationRate = getUtilizationRate();
        uint newBorrowingRate = borrowingRate.recalculateBorrowingRate(utilizationRate);
        lendingRate.recalculateLendingRate(newBorrowingRate);
        ibToken.recalculateExchangeRate();

        SafeERC20.safeTransfer(borrowedToken, msg.sender, depositWithInterests);

        ibToken.burn(msg.sender, ibTokenBalance);
        emit FundsWithdrawn(msg.sender, depositWithInterests, totalLiquidity, totalBorrows, utilizationRate);
    }

    function borrow(uint amountOfBorrowedToken, uint amountOfCollateralToken) public nonReentrant{

        require(amountOfBorrowedToken > 0, "The amount of token borrowed must be greater than 0");
        require(totalLiquidity >= amountOfBorrowedToken, "The amount of token borrowed must be less than the available liquidity");        
        require(amountOfCollateralToken > 0, "The amount of token borrowed must have a collateral");

        uint collateralPrice = oracleGateway.getCollateralPrice();
        uint collateralRatio = getCollateralRatio(amountOfCollateralToken, amountOfBorrowedToken, collateralPrice);
        require(collateralRatio >= collateralFactor, "The collateral ratio must be greater or equal than the collateral factor");
        uint healthFactor = getHealthFactor(msg.sender, amountOfBorrowedToken, amountOfCollateralToken, collateralPrice);
        require(healthFactor >= SAFE_HEALTH_FACTOR, "The borrower health factor must be greater than 1 to allow the borrowing");        
        
        collateralBalances[msg.sender] += amountOfCollateralToken;
        totalBorrows += amountOfBorrowedToken;
        totalLiquidity -= amountOfBorrowedToken;
        
        debtToken.recalculateDebtIndex();
        uint debtTokenAllocation = (amountOfBorrowedToken * debtToken.getDebtIndex()) / DECIMALS; 
        
        SafeERC20.safeTransferFrom(collateralToken, msg.sender, address(this), amountOfCollateralToken);
        debtToken.mint(msg.sender, debtTokenAllocation);
        SafeERC20.safeTransfer(borrowedToken, msg.sender, amountOfBorrowedToken);

        uint utilizationRate = getUtilizationRate();
        uint newBorrowingRate = borrowingRate.recalculateBorrowingRate(utilizationRate);        
        lendingRate.recalculateLendingRate(newBorrowingRate);
        debtToken.recalculateDebtIndex();   

        emit Borrowing(msg.sender, amountOfBorrowedToken, totalLiquidity, totalBorrows, utilizationRate);
    }

    function repay() public nonReentrant {

        uint debtTokenBalance = debtToken.balanceOf(msg.sender);
        require(debtTokenBalance > 0, "The borrower has no debt to repay");
                
        uint borrowedPrincipalAmount = debtToken.getPrincipalDebt(msg.sender);
        totalBorrows -= borrowedPrincipalAmount;

        debtToken.recalculateDebtIndex(); 
        uint totalDebtOwned = debtToken.getTotalDebtOwed(msg.sender);

        uint accruedInterest = totalDebtOwned - debtTokenBalance;
        uint protocolFee = (accruedInterest * lendingRate.reserveFactor()) / DECIMALS;        
        uint netRepayment = totalDebtOwned - protocolFee;
        totalLiquidity += netRepayment;
        uint collateralToReturn = collateralBalances[msg.sender]; 
        collateralBalances[msg.sender] = 0; 
               
        uint allowance = borrowedToken.allowance(msg.sender, address(this));
        require(totalDebtOwned == allowance, "The amount of token to repay the debt must be equal to borrowed amount including the interests");
        SafeERC20.safeTransferFrom(borrowedToken, msg.sender, address(this), totalDebtOwned);
        SafeERC20.safeApprove(borrowedToken, address(protocolReserve), protocolFee);
        protocolReserve.collectBorrowedTokenFee(protocolFee);
        debtToken.burn(msg.sender, debtTokenBalance);

        SafeERC20.safeTransfer(collateralToken, msg.sender, collateralToReturn);
        
        uint utilizationRate = getUtilizationRate();
        uint newBorrowingRate = borrowingRate.recalculateBorrowingRate(utilizationRate);
        lendingRate.recalculateLendingRate(newBorrowingRate);
        debtToken.recalculateDebtIndex();
        ibToken.recalculateExchangeRate();

        emit Repayment(msg.sender, netRepayment, collateralToReturn, totalLiquidity, totalBorrows, utilizationRate);        
    }

    function liquidate(address borrower) public nonReentrant {

        require(borrower != address(0), "Invalid borrower address");
        uint borrowerDebtBalance = debtToken.balanceOf(borrower);
        require(borrowerDebtBalance > 0, "The borrower has no debt to liquidate");

        uint collateralPrice = oracleGateway.getCollateralPrice();
        uint healthFactor = getHealthFactor(borrower, collateralPrice);
        require(healthFactor < SAFE_HEALTH_FACTOR, "The borrower is not liquidatable, because the health factor is safe");

        uint borrowedPrincipalAmount = debtToken.getPrincipalDebt(borrower);
        totalBorrows -= borrowedPrincipalAmount;

        debtToken.recalculateDebtIndex(); 
        uint repaymentAmountWithInterest = debtToken.getTotalDebtOwed(borrower);
        totalLiquidity += repaymentAmountWithInterest;
        
        uint collateralToSeize = (repaymentAmountWithInterest * (DECIMALS + liquidationPenaltyRate)) / collateralPrice;
        if (collateralToSeize > collateralBalances[borrower]) {            
            collateralToSeize = collateralBalances[borrower];
            console.log("capped newCollateralToSeize", collateralToSeize);
        }       
        uint liquidatorProfit = (collateralToSeize * liquidationPenaltyRate) / DECIMALS;
        uint remainingCollateral = collateralBalances[borrower] - collateralToSeize;
        collateralBalances[borrower] = 0; 

        uint allowance = borrowedToken.allowance(msg.sender, address(this));
        require(repaymentAmountWithInterest == allowance, "The amount of token to repay the debt must be equal to borrowed amount including the interests");
        SafeERC20.safeTransferFrom(borrowedToken, msg.sender, address(this), repaymentAmountWithInterest);
        SafeERC20.safeTransfer(collateralToken, msg.sender, collateralToSeize); 
        if (remainingCollateral > 0) {
            SafeERC20.safeTransfer(collateralToken, borrower, remainingCollateral);
        }
        debtToken.burn(borrower, borrowerDebtBalance);    

        uint utilizationRate = getUtilizationRate();
        uint newBorrowingRate = borrowingRate.recalculateBorrowingRate(utilizationRate);
        lendingRate.recalculateLendingRate(newBorrowingRate);
        debtToken.recalculateDebtIndex();
        ibToken.recalculateExchangeRate();
        emit Liquidation(borrower, msg.sender, repaymentAmountWithInterest, collateralToSeize, liquidatorProfit, remainingCollateral, totalLiquidity, totalBorrows, utilizationRate);
    }
    
    function getUtilizationRate() public view returns (uint) {

        if (totalLiquidity == 0) {
            return 0;
        }
        return (totalBorrows * DECIMALS)/ (totalLiquidity + totalBorrows);
    }

    function getCollateralRatio(uint collateralAmount, uint borrowedAmount, uint collateralPrice) internal pure returns (uint) {
        uint collateralValue = collateralPrice * collateralAmount / DECIMALS;
        uint collateralRatio = (collateralValue * DECIMALS)/ borrowedAmount;
        return collateralRatio;
    }

    function getHealthFactor(address borrower, uint newBorrowedAmount, uint newCollateralAmount, uint collateralPrice) internal view returns (uint) {

        uint currentDebtValue = (debtToken.balanceOf(borrower) / debtToken.getDebtIndex()) * DECIMALS;
        uint totalDebtValue = currentDebtValue + newBorrowedAmount;
        uint totalCollateralValue =  (collateralBalances[borrower] + newCollateralAmount) * collateralPrice / 1e18;
        uint healthFactor = (totalCollateralValue * liquidationThreshold) / totalDebtValue;
        return healthFactor;
    }

    function getHealthFactor(address borrower, uint collateralPrice) internal view returns (uint) {

        uint totalDebtValue = (debtToken.balanceOf(borrower) / debtToken.getDebtIndex()) * DECIMALS;
        require(totalDebtValue > 0, "No debt to calculate health factor");
        uint totalCollateralValue =  collateralBalances[borrower]  * collateralPrice / 1e18;        
        uint healthFactor = (totalCollateralValue * liquidationThreshold) / totalDebtValue;
        return healthFactor;
    }

    function getCollateralBalances(address borrower) public view returns (uint) {
        return collateralBalances[borrower];
    }
}