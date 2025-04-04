 // SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../access/AccessControl.sol";

contract ChainlinkOracleGateway {
    mapping(address => address) public priceFeeds;
    uint8 private constant CHAINLINK_DECIMALS = 8;
    uint private constant PRICE_DECIMALS = 1e18;
    
    event PriceFeedUpdated(address token, address feed);
    
    function setTokenPriceFeed(address token, address priceFeed) external onlyRole(ADMIN_ROLE) {
        priceFeeds[token] = priceFeed;
        emit PriceFeedUpdated(token, priceFeed);
    }
    
    function getPrice(address token) external view returns (uint) {
        address feed = priceFeeds[token];
        require(feed != address(0), "Price feed not found");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        (, int price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        
        // Convert to protocol decimals
        return uint(price) * PRICE_DECIMALS / 10**CHAINLINK_DECIMALS;
    }
} 