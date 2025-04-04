// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;


contract BorrowingRate {

    uint public constant DECIMALS = 1e18;

    uint public baseBorrowingrate;

    uint public multiplier;

    uint public borrowingRate;

    
    event BorrowingRateUpdated(uint newBorrowingRate);

   
    constructor(uint _baseBorrowingrate, uint _multiplier) {
        baseBorrowingrate = _baseBorrowingrate;
        multiplier = _multiplier;
    }


     
    function recalculateBorrowingRate(uint utilizationRate) external returns (uint) {
        
        borrowingRate = baseBorrowingrate + (utilizationRate * multiplier) / DECIMALS;
        emit BorrowingRateUpdated(borrowingRate);
        return borrowingRate;
    }

    
    function getBorrowingRate() public view returns (uint) {
        return borrowingRate;
    }

 
    function getBaseBorrowingRate() public view returns (uint) {
        return baseBorrowingrate;
    }
}