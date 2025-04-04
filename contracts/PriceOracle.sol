// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev Contract that provides price data for tokens
 */
contract PriceOracle is Ownable {
    // Mapping of token address to its price in USD (18 decimals)
    mapping(address => uint256) private tokenPrices;
    
    // Events
    event PriceUpdated(address indexed token, uint256 price);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Sets or updates the price of a token
     * @param token The address of the token
     * @param price The price of the token in USD (with 18 decimals)
     */
    function setTokenPrice(address token, uint256 price) external onlyOwner {
        tokenPrices[token] = price;
        emit PriceUpdated(token, price);
    }

    /**
     * @dev Sets prices for multiple tokens at once
     * @param tokens Array of token addresses
     * @param prices Array of prices with 18 decimals
     */
    function setBatchTokenPrices(address[] calldata tokens, uint256[] calldata prices) external onlyOwner {
        require(tokens.length == prices.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenPrices[tokens[i]] = prices[i];
            emit PriceUpdated(tokens[i], prices[i]);
        }
    }

    /**
     * @dev Returns the price of a token
     * @param token The address of the token
     * @return The price of the token in USD (18 decimals)
     */
    function getTokenPrice(address token) external view returns (uint256) {
        require(tokenPrices[token] > 0, "Price not set for token");
        return tokenPrices[token];
    }

    /**
     * @dev Converts an amount of tokens to USD value
     * @param token The token address
     * @param amount The amount of tokens (using token's decimals)
     * @param tokenDecimals The token's decimals
     * @return The USD value (18 decimals)
     */
    function getTokenValueInUSD(address token, uint256 amount, uint8 tokenDecimals) external view returns (uint256) {
        require(tokenPrices[token] > 0, "Price not set for token");
        
        // Adjust for token decimals to ensure correct calculation
        if (tokenDecimals < 18) {
            amount = amount * 10**(18 - tokenDecimals);
        } else if (tokenDecimals > 18) {
            amount = amount / 10**(tokenDecimals - 18);
        }
        
        return (amount * tokenPrices[token]) / 1e18;
    }
}