// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;


contract LendingRate {

    uint public constant DECIMALS = 1e18;

  
    uint public reserveFactor;


   
    uint public lendingRate;

   
    event LendingRateUpdated(uint newLendingRate);


    
    constructor(uint _reserveFactor) {
        require(reserveFactor <= DECIMALS, "Reserve factor exceeds 100%");
        reserveFactor = _reserveFactor;
    }

  
    function recalculateLendingRate(uint borrowingRate) external returns (uint) {
        lendingRate = borrowingRate * (DECIMALS - reserveFactor) / DECIMALS;
        emit LendingRateUpdated(lendingRate);
        return lendingRate;
    }

   
    function getLendingRate() public view returns (uint) {
        return lendingRate;
    }
}