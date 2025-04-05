// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IVcAndDiscloseCircuitVerifier} from "@selfxyz/contracts/contracts/interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IIdentityVerificationHubV1} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV1.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Formatter} from "@selfxyz/contracts/contracts/libraries/Formatter.sol";
import {CircuitAttributeHandler} from "@selfxyz/contracts/contracts/libraries/CircuitAttributeHandler.sol";
import {CircuitConstants} from "@selfxyz/contracts/contracts/constants/CircuitConstants.sol";

/**
 * @title IdentityVerifier
 * @dev A contract that uses Self protocol to verify user identity for KYC
 * Used as a gatekeeper for IntentFI operations
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
        string nationality;
        string residenceCountry;
    }
    
    // Owner of the contract who can modify settings
    address public owner;

    // Verification expiration time in seconds (default: 90 days)
    uint256 public verificationExpiryTime = 90 days;
    
    // Mapping to track nullifiers to prevent replay attacks
    mapping(uint256 => bool) internal _nullifiers;

    // Events
    event UserVerified(address indexed user, uint256 timestamp);
    event VerificationRevoked(address indexed user, uint256 timestamp);
    event VerificationConfigUpdated(
        bool olderThanEnabled,
        uint256 olderThan,
        bool forbiddenCountriesEnabled,
        bool ofacEnabled
    );
    event VerificationExpiryTimeUpdated(uint256 newExpiryTime);
    
    // Errors
    error RegisteredNullifier();
    error UserNotVerified();
    error VerificationExpired();

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
     * @dev Modifier to check if a user is verified
     */
    modifier onlyVerified(address user) {
        if (!_isVerified(user)) {
            revert UserNotVerified();
        }
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
        // Verify basic requirements
        if (_scope != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (_attestationId != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        if (_nullifiers[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]]) {
            revert RegisteredNullifier();
        }

        // Verify the proof with the identity verification hub
        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result = _identityVerificationHub.verifyVcAndDisclose(
            IIdentityVerificationHubV1.VcAndDiscloseHubProof({
                olderThanEnabled: _verificationConfig.olderThanEnabled,
                olderThan: _verificationConfig.olderThan,
                forbiddenCountriesEnabled: _verificationConfig.forbiddenCountriesEnabled,
                forbiddenCountriesListPacked: _verificationConfig.forbiddenCountriesListPacked,
                ofacEnabled: _verificationConfig.ofacEnabled,
                vcAndDiscloseProof: proof
            })
        );

        // Extract the user identifier (address) from the proof
        address userAddress = address(uint160(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]));
        
        // Mark the nullifier as used
        _nullifiers[result.nullifier] = true;
        
        // Mark the address as verified
        verifiedUsers[userAddress] = true;
        
        // Extract attribute data
        uint256[3] memory revealedDataPacked = extractRevealedData(proof);
        
        // Update the user's specific verifications and extract country information
        (string memory nationality, string memory residenceCountry) = updateUserVerifications(userAddress, revealedDataPacked);
        
        // Update the overall verification status
        userVerification[userAddress] = VerificationStatus({
            isVerified: true,
            ageVerified: _verificationConfig.olderThanEnabled,
            countryVerified: _verificationConfig.forbiddenCountriesEnabled,
            ofacVerified: _verificationConfig.ofacEnabled[0] || _verificationConfig.ofacEnabled[1] || _verificationConfig.ofacEnabled[2],
            verificationTimestamp: block.timestamp,
            nationality: nationality,
            residenceCountry: residenceCountry
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
    * @return nationality The user's nationality if revealed
    * @return residenceCountry The user's residence country if revealed
    */
    function updateUserVerifications(
        address userAddress, 
        uint256[3] memory revealedDataPacked
    ) 
        internal 
        returns (string memory nationality, string memory residenceCountry) 
    {
        // Convert packed data to bytes
        bytes memory charcodes = Formatter.fieldElementsToBytes(revealedDataPacked);
        
        // Update age verification if enabled
        if (_verificationConfig.olderThanEnabled) {
            uint256 age = CircuitAttributeHandler.getOlderThan(charcodes);
            userAge[userAddress] = age;
        }
        
        // Extract nationality
        nationality = CircuitAttributeHandler.getNationality(charcodes);
        
        // For residence country, we can use the issuing state as an approximation
        // or leave it empty if not available
        // residenceCountry = CircuitAttributeHandler.getIssuingState(charcodes);
        residenceCountry = ""; // This should be populated if we have the data
        
        // Update country verification if enabled
        if (_verificationConfig.forbiddenCountriesEnabled) {
            // If the proof passes with forbidden countries check, the user's country is valid
            validCountry[userAddress] = true;
        }
        
        // Update OFAC verification if enabled
        if (_verificationConfig.ofacEnabled[0]) {
            // Check passport number against OFAC
            uint256 passportNoOfacStatus = CircuitAttributeHandler.getPassportNoOfac(charcodes);
            ofacCleared[userAddress] = (passportNoOfacStatus == 1); // Assuming 1 means PASS
        } else if (_verificationConfig.ofacEnabled[1]) {
            // Check name and date of birth against OFAC
            uint256 nameAndDobOfacStatus = CircuitAttributeHandler.getNameAndDobOfac(charcodes);
            ofacCleared[userAddress] = (nameAndDobOfacStatus == 1); // Assuming 1 means PASS
        } else if (_verificationConfig.ofacEnabled[2]) {
            // Check name and year of birth against OFAC
            uint256 nameAndYobOfacStatus = CircuitAttributeHandler.getNameAndYobOfac(charcodes);
            ofacCleared[userAddress] = (nameAndYobOfacStatus == 1); // Assuming 1 means PASS
        }
        
        return (nationality, residenceCountry);
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
     * @dev Update the verification expiry time
     * @param newExpiryTime The new expiry time in seconds
     */
    function updateVerificationExpiryTime(uint256 newExpiryTime) external onlyOwner {
        verificationExpiryTime = newExpiryTime;
        emit VerificationExpiryTimeUpdated(newExpiryTime);
    }
    
    /**
     * @dev Internal function to check if a user is verified with KYC
     * @param user The address to check
     * @return True if the user is verified and verification hasn't expired
     */
    function _isVerified(address user) internal view returns (bool) {
        // If user was never verified, return false immediately
        if (!verifiedUsers[user]) {
            return false;
        }

        // If verification expiry is disabled (set to 0), return cached verification status
        if (verificationExpiryTime == 0) {
            return verifiedUsers[user];
        }

        // Check if verification has expired
        VerificationStatus memory status = userVerification[user];
        if (status.verificationTimestamp + verificationExpiryTime < block.timestamp) {
            // Verification has expired
            return false;
        }

        // Verification is valid and hasn't expired
        return true;
    }
    
    /**
     * @dev Check if a user is verified with KYC (public view function)
     * @param user The address to check
     * @return True if the user is verified and verification hasn't expired
     */
    function isVerified(address user) external view returns (bool) {
        return _isVerified(user);
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
     * @dev Check if a user's verification has expired
     * @param user The address to check
     * @return True if verification has expired
     */
    function isVerificationExpired(address user) external view returns (bool) {
        if (!verifiedUsers[user]) {
            return true; // Never verified = expired
        }

        if (verificationExpiryTime == 0) {
            return false; // Expiry disabled = not expired
        }

        VerificationStatus memory status = userVerification[user];
        return status.verificationTimestamp + verificationExpiryTime < block.timestamp;
    }

    /**
     * @dev Time remaining until verification expires
     * @param user The address to check
     * @return Time in seconds until expiry, 0 if already expired
     */
    function timeUntilExpiry(address user) external view returns (uint256) {
        if (!verifiedUsers[user]) {
            return 0; // Not verified
        }

        if (verificationExpiryTime == 0) {
            return type(uint256).max; // Never expires
        }

        VerificationStatus memory status = userVerification[user];
        uint256 expiryTime = status.verificationTimestamp + verificationExpiryTime;
        
        if (expiryTime <= block.timestamp) {
            return 0; // Already expired
        }

        return expiryTime - block.timestamp;
    }
    
    /**
     * @dev Manually verify a user's KYC status (for administrative purposes)
     * @param user The address of the user to verify
     * @param nationality Optional nationality of the user
     * @param residenceCountry Optional residence country of the user
     */
    function manuallyVerifyUserKYC(
        address user, 
        string memory nationality, 
        string memory residenceCountry
    ) external onlyOwner {
        verifiedUsers[user] = true;
        userVerification[user] = VerificationStatus({
            isVerified: true,
            ageVerified: true,
            countryVerified: true,
            ofacVerified: true,
            verificationTimestamp: block.timestamp,
            nationality: nationality,
            residenceCountry: residenceCountry
        });
        emit UserVerified(user, block.timestamp);
    }

    /**
     * @dev Revoke a user's KYC verification status (for compliance or administrative purposes)
     * @param user The address of the user to revoke verification from
     */
    function revokeUserKYC(address user) external onlyOwner {
        verifiedUsers[user] = false;
        emit VerificationRevoked(user, block.timestamp);
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