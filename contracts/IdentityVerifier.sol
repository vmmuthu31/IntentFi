// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "https://raw.githubusercontent.com/selfxyz/self/main/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {IVcAndDiscloseCircuitVerifier} from "https://raw.githubusercontent.com/selfxyz/self/main/contracts/contracts/interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IIdentityVerificationHubV1} from "https://raw.githubusercontent.com/selfxyz/self/main/contracts/contracts/interfaces/IIdentityVerificationHubV1.sol";
import {CircuitConstants} from "https://raw.githubusercontent.com/selfxyz/self/main/contracts/contracts/constants/CircuitConstants.sol";
import {Formatter} from "https://raw.githubusercontent.com/selfxyz/self/main/contracts/contracts/libraries/Formatter.sol";
import {CircuitAttributeHandler} from "https://raw.githubusercontent.com/selfxyz/self/main/contracts/contracts/libraries/CircuitAttributeHandler.sol";
import {ISelfVerificationRoot} from "https://raw.githubusercontent.com/selfxyz/self/main/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

/**
 * @title IdentityVerifier
 * @dev A contract that uses Self protocol to verify user identity for KYC
 * Used as a gatekeeper for lending protocol operations
 */
contract IdentityVerifier is SelfVerificationRoot {
    // Mapping to track verified addresses
    mapping(address => bool) public verifiedUsers;
    
    // Mapping for age verification
    mapping(address => uint256) public userAge;
    
    // Mapping for country verification (not blacklisted)
    mapping(address => bool) public validCountry;
    
    // Mapping for OFAC check (not blacklisted)
    mapping(address => bool) public ofacCleared;
    
    // Mapping for tracking all verified attributes
    mapping(address => VerificationStatus) public userVerification;
    
    // Structure to hold verification status
    struct VerificationStatus {
        bool isVerified;
        bool ageVerified;
        bool countryVerified;
        bool ofacVerified;
        uint256 verificationTimestamp;
    }
    
    // Owner of the contract who can modify settings
    address public owner;
    
    // Events
    event UserVerified(address indexed user, uint256 timestamp);
    event VerificationConfigUpdated(
        bool olderThanEnabled,
        uint256 olderThan,
        bool forbiddenCountriesEnabled,
        bool ofacEnabled
    );
    
    /**
     * @dev Constructor that initializes the SelfVerificationRoot
     * @param _identityVerificationHub Address of Self's IdentityVerificationHub
     * @param _scope Application-specific identifier
     * @param _attestationId ID for document type (e.g., 1 for passports)
     * @param _olderThanEnabled Enable age verification
     * @param _olderThan Minimum age required
     * @param _forbiddenCountriesEnabled Enable country restriction
     * @param _forbiddenCountriesListPacked Packed list of restricted countries
     * @param _ofacEnabled Array of flags for OFAC check types
     */
    constructor(
        address _identityVerificationHub,
        uint256 _scope,
        uint256 _attestationId,
        bool _olderThanEnabled,
        uint256 _olderThan,
        bool _forbiddenCountriesEnabled,
        uint256[4] memory _forbiddenCountriesListPacked,
        bool[3] memory _ofacEnabled
    ) 
        SelfVerificationRoot(
            _identityVerificationHub, 
            _scope,
            _attestationId,
            _olderThanEnabled,
            _olderThan,
            _forbiddenCountriesEnabled,
            _forbiddenCountriesListPacked,
            _ofacEnabled
        )
    {
        owner = msg.sender;
    }
    
    /**
     * @dev Modifier to restrict function access to the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }
    
    /**
     * @dev Override the verifySelfProof function to add custom verification logic
     * @param proof The proof generated from Self protocol
     */
    function verifySelfProof(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    ) 
        public 
        override 
    {
        // Call the parent implementation for basic verification
        super.verifySelfProof(proof);
        
        // Extract the user identifier (address) from the proof
        address userAddress = address(uint160(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]));
        
        // Mark the address as verified and update verification data
        verifiedUsers[userAddress] = true;
        
        // Extract attribute data
        uint256[3] memory revealedDataPacked = extractRevealedData(proof);
        
        // Update the user's specific verifications
        updateUserVerifications(userAddress, revealedDataPacked);
        
        // Update the overall verification status
        userVerification[userAddress] = VerificationStatus({
            isVerified: true,
            ageVerified: _verificationConfig.olderThanEnabled,
            countryVerified: _verificationConfig.forbiddenCountriesEnabled,
            ofacVerified: _verificationConfig.ofacEnabled[0] || _verificationConfig.ofacEnabled[1] || _verificationConfig.ofacEnabled[2],
            verificationTimestamp: block.timestamp
        });
        
        // Emit event
        emit UserVerified(userAddress, block.timestamp);
    }
    
    /**
     * @dev Extract revealed data from the proof
     * @param proof The proof to extract data from
     * @return revealedDataPacked Array of packed revealed data
     */
    function extractRevealedData(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    ) 
        internal 
        pure 
        returns (uint256[3] memory) 
    {
        uint256[3] memory revealedDataPacked;
        
        for (uint256 i = 0; i < 3; i++) {
            revealedDataPacked[i] = proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_REVEALED_DATA_PACKED_INDEX + i];
        }
        
        return revealedDataPacked;
    }
    
    /**
     * @dev Update the user's specific verifications
     * @param userAddress The address of the user
     * @param revealedDataPacked The packed data from the proof
     */
    function updateUserVerifications(
        address userAddress, 
        uint256[3] memory revealedDataPacked
    ) 
        internal 
    {
        // Convert packed data to bytes
        bytes memory charcodes = Formatter.fieldElementsToBytes(revealedDataPacked);
        
        // Update age verification if enabled
        if (_verificationConfig.olderThanEnabled) {
            uint256 age = CircuitAttributeHandler.getOlderThan(charcodes);
            userAge[userAddress] = age;
        }
        
        // Update country verification if enabled
        if (_verificationConfig.forbiddenCountriesEnabled) {
            // If the proof passes with forbidden countries check, the user's country is valid
            validCountry[userAddress] = true;
        }
        
        // Update OFAC verification if enabled
        if (_verificationConfig.ofacEnabled[0] || _verificationConfig.ofacEnabled[1] || _verificationConfig.ofacEnabled[2]) {
            // If the proof passes with OFAC check, the user is not on the sanctions list
            ofacCleared[userAddress] = true;
        }
    }
    
    /**
     * @dev Update the verification configuration
     * @param newVerificationConfig The new verification configuration
     */
    function updateVerificationConfig(
        ISelfVerificationRoot.VerificationConfig memory newVerificationConfig
    ) 
        external 
        onlyOwner 
    {
        _verificationConfig = newVerificationConfig;
        
        emit VerificationConfigUpdated(
            newVerificationConfig.olderThanEnabled,
            newVerificationConfig.olderThan,
            newVerificationConfig.forbiddenCountriesEnabled,
            newVerificationConfig.ofacEnabled[0] || newVerificationConfig.ofacEnabled[1] || newVerificationConfig.ofacEnabled[2]
        );
    }
    
    /**
     * @dev Check if a user is verified with KYC
     * @param user The address to check
     * @return True if the user is verified
     */
    function isVerified(address user) external view returns (bool) {
        return verifiedUsers[user];
    }
    
    /**
     * @dev Get the full verification status of a user
     * @param user The address to check
     * @return VerificationStatus struct with all verification details
     */
    function getVerificationStatus(address user) external view returns (VerificationStatus memory) {
        return userVerification[user];
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}