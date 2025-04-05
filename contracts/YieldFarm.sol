// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YieldFarm
 * @dev Contract for staking tokens and earning rewards
 */
contract YieldFarm is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Staking pool information
    struct Pool {
        address stakingToken;        // Token to be staked
        address rewardToken;         // Token given as reward
        uint256 rewardPerSecond;    // Reward rate per second
        uint256 lastUpdateTime;     // Last time rewards were updated
        uint256 accRewardPerShare;  // Accumulated rewards per share (scaled by 1e12)
        uint256 totalStaked;        // Total tokens staked in this pool
        uint256 startTime;          // Time when rewards start
        uint256 endTime;            // Time when rewards end
        bool isActive;              // Whether the pool is currently active
    }

    // User staking information
    struct UserInfo {
        uint256 amount;             // Amount of tokens staked
        uint256 rewardDebt;         // Reward debt
        uint256 pendingRewards;     // Pending rewards
        uint256 lastClaimTime;      // Last time rewards were claimed
    }

    // Constants
    uint256 private constant PRECISION_FACTOR = 1e12;
    
    // State variables
    Pool[] public pools;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo; // poolId => user => info
    
    // Events
    event PoolCreated(uint256 indexed poolId, address stakingToken, address rewardToken);
    event PoolUpdated(uint256 indexed poolId, uint256 rewardPerSecond, uint256 endTime);
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardPaid(address indexed user, uint256 indexed poolId, uint256 reward);
    event EmergencyWithdraw(address indexed user, uint256 indexed poolId, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new staking pool
     * @param _stakingToken Address of the token being staked
     * @param _rewardToken Address of the reward token
     * @param _rewardPerSecond Rewards per second (in reward token)
     * @param _startTime Start time of rewards
     * @param _endTime End time of rewards
     * @return poolId The ID of the newly created pool
     */
    function createPool(
        address _stakingToken,
        address _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner returns (uint256 poolId) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken != address(0), "Invalid reward token");
        require(_startTime >= block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");

        pools.push(
            Pool({
                stakingToken: _stakingToken,
                rewardToken: _rewardToken,
                rewardPerSecond: _rewardPerSecond,
                lastUpdateTime: _startTime,
                accRewardPerShare: 0,
                totalStaked: 0,
                startTime: _startTime,
                endTime: _endTime,
                isActive: true
            })
        );

        poolId = pools.length - 1;
        emit PoolCreated(poolId, _stakingToken, _rewardToken);
        return poolId;
    }

    /**
     * @dev Updates a pool's reward rate and end time
     * @param _poolId ID of the pool to update
     * @param _rewardPerSecond New reward rate per second
     * @param _endTime New end time for rewards
     */
    function updatePool(
        uint256 _poolId,
        uint256 _rewardPerSecond,
        uint256 _endTime
    ) external onlyOwner {
        require(_poolId < pools.length, "Pool does not exist");
        Pool storage pool = pools[_poolId];
        
        // Update accumulated rewards before changing parameters
        updatePoolRewards(_poolId);
        
        require(_endTime > block.timestamp, "End time must be in the future");
        
        pool.rewardPerSecond = _rewardPerSecond;
        pool.endTime = _endTime;
        
        emit PoolUpdated(_poolId, _rewardPerSecond, _endTime);
    }

    /**
     * @dev Updates the accumulated rewards for a pool
     * @param _poolId The pool ID to update
     */
    function updatePoolRewards(uint256 _poolId) public {
        require(_poolId < pools.length, "Pool does not exist");
        Pool storage pool = pools[_poolId];

        if (pool.totalStaked == 0 || block.timestamp <= pool.lastUpdateTime) {
            pool.lastUpdateTime = block.timestamp;
            return;
        }

        uint256 timeElapsed;
        if (block.timestamp > pool.endTime) {
            timeElapsed = pool.endTime > pool.lastUpdateTime 
                ? pool.endTime - pool.lastUpdateTime 
                : 0;
        } else {
            timeElapsed = block.timestamp - pool.lastUpdateTime;
        }

        if (timeElapsed > 0 && pool.totalStaked > 0) {
            uint256 reward = timeElapsed * pool.rewardPerSecond;
            pool.accRewardPerShare += (reward * PRECISION_FACTOR) / pool.totalStaked;
        }

        pool.lastUpdateTime = block.timestamp;
    }

    /**
     * @dev Stakes tokens into a pool
     * @param _poolId The pool ID to stake in
     * @param _amount The amount of tokens to stake
     */
    function stake(uint256 _poolId, uint256 _amount) external nonReentrant {
        require(_poolId < pools.length, "Pool does not exist");
        require(_amount > 0, "Cannot stake 0");
        
        Pool storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];
        
        require(pool.isActive, "Pool is not active");
        require(block.timestamp < pool.endTime, "Pool has ended");
        
        // Update pool rewards
        updatePoolRewards(_poolId);
        
        // Calculate pending rewards if user has existing stake
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare) / PRECISION_FACTOR - user.rewardDebt;
            user.pendingRewards += pending;
        }
        
        // Transfer staking tokens to this contract
        IERC20(pool.stakingToken).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update user info
        user.amount += _amount;
        pool.totalStaked += _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION_FACTOR;
        
        emit Staked(msg.sender, _poolId, _amount);
    }

    /**
     * @dev Unstakes tokens from a pool
     * @param _poolId The pool ID to unstake from
     * @param _amount The amount of tokens to unstake
     */
    function unstake(uint256 _poolId, uint256 _amount) external nonReentrant {
        require(_poolId < pools.length, "Pool does not exist");
        
        Pool storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];
        
        require(user.amount >= _amount, "Not enough staked tokens");
        
        // Update pool rewards
        updatePoolRewards(_poolId);
        
        // Calculate pending rewards
        uint256 pending = (user.amount * pool.accRewardPerShare) / PRECISION_FACTOR - user.rewardDebt;
        user.pendingRewards += pending;
        
        // Update user info
        user.amount -= _amount;
        pool.totalStaked -= _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION_FACTOR;
        
        // Transfer staking tokens back to user
        IERC20(pool.stakingToken).safeTransfer(msg.sender, _amount);
        
        emit Unstaked(msg.sender, _poolId, _amount);
    }

    /**
     * @dev Claims rewards from a pool
     * @param _poolId The pool ID to claim rewards from
     */
    function claimRewards(uint256 _poolId) external nonReentrant {
        require(_poolId < pools.length, "Pool does not exist");
        
        Pool storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];
        
        // Update pool rewards
        updatePoolRewards(_poolId);
        
        // Calculate pending rewards
        uint256 pending = (user.amount * pool.accRewardPerShare) / PRECISION_FACTOR - user.rewardDebt;
        uint256 totalRewards = user.pendingRewards + pending;
        
        require(totalRewards > 0, "No rewards to claim");
        
        // Reset pending rewards
        user.pendingRewards = 0;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION_FACTOR;
        user.lastClaimTime = block.timestamp;
        
        // Transfer reward tokens to user
        IERC20(pool.rewardToken).safeTransfer(msg.sender, totalRewards);
        
        emit RewardPaid(msg.sender, _poolId, totalRewards);
    }

    /**
     * @dev Emergency withdrawal without caring about rewards
     * @param _poolId The pool ID to perform emergency withdrawal from
     */
    function emergencyWithdraw(uint256 _poolId) external nonReentrant {
        require(_poolId < pools.length, "Pool does not exist");
        
        Pool storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];
        
        uint256 amount = user.amount;
        require(amount > 0, "No tokens to withdraw");
        
        // Reset user data
        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        
        // Update pool data
        pool.totalStaked -= amount;
        
        // Transfer tokens back to user
        IERC20(pool.stakingToken).safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdraw(msg.sender, _poolId, amount);
    }

    /**
     * @dev Deactivates a pool (can't stake anymore)
     * @param _poolId The pool ID to deactivate
     */
    function deactivatePool(uint256 _poolId) external onlyOwner {
        require(_poolId < pools.length, "Pool does not exist");
        pools[_poolId].isActive = false;
    }

    /**
     * @dev Activates a previously deactivated pool
     * @param _poolId The pool ID to activate
     */
    function activatePool(uint256 _poolId) external onlyOwner {
        require(_poolId < pools.length, "Pool does not exist");
        pools[_poolId].isActive = true;
    }

    /**
     * @dev Gets the pending rewards for a user in a pool
     * @param _poolId The pool ID
     * @param _user The user address
     * @return pending Pending rewards for the user
     */
    function pendingRewards(uint256 _poolId, address _user) external view returns (uint256 pending) {
        require(_poolId < pools.length, "Pool does not exist");
        
        Pool memory pool = pools[_poolId];
        UserInfo memory user = userInfo[_poolId][_user];
        
        uint256 accRewardPerShare = pool.accRewardPerShare;
        
        if (block.timestamp > pool.lastUpdateTime && pool.totalStaked > 0) {
            uint256 timeElapsed;
            
            if (block.timestamp > pool.endTime) {
                timeElapsed = pool.endTime > pool.lastUpdateTime 
                    ? pool.endTime - pool.lastUpdateTime 
                    : 0;
            } else {
                timeElapsed = block.timestamp - pool.lastUpdateTime;
            }
            
            uint256 reward = timeElapsed * pool.rewardPerSecond;
            accRewardPerShare += (reward * PRECISION_FACTOR) / pool.totalStaked;
        }
        
        // Calculate pending rewards
        pending = user.pendingRewards + (user.amount * accRewardPerShare) / PRECISION_FACTOR - user.rewardDebt;
        
        return pending;
    }

    /**
     * @dev Gets the number of pools
     * @return The total number of pools
     */
    function poolLength() external view returns (uint256) {
        return pools.length;
    }

    /**
     * @dev Allows the owner to recover wrongly sent tokens
     * @param _token The token address
     * @param _amount The amount to recover
     */
    function recoverToken(IERC20 _token, uint256 _amount) external onlyOwner {
        _token.safeTransfer(owner(), _amount);
    }
}