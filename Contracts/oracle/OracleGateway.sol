// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;


contract OracleGateway {

    uint public collateralPrice;

    uint public lastUpdatedTimestamp;


    event CollateralPriceUpdated(uint newPrice);

  
    constructor(uint _collateralPrice) {
        collateralPrice = _collateralPrice;
    }

  
    function updateCollateralPrice(uint _newPrice) external {
        collateralPrice = _newPrice;
        lastUpdatedTimestamp = block.timestamp;
        emit CollateralPriceUpdated(_newPrice);
    }


    function getCollateralPrice() external view returns (uint) {
        return collateralPrice;
    }
}