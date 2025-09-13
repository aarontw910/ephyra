// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EphyraToken
 * @dev Implementation of the ERC20 Token with additional features
 * Features:
 * - Standard ERC20 functionality
 * - Burnable tokens
 * - Owner can mint new tokens
 * - Pausable transfers (owner only)
 */
contract EphyraToken is ERC20, ERC20Burnable, Ownable {
    // Maximum supply of tokens (100 million tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    
    // Flag to pause/unpause transfers
    bool public transfersPaused;
    
    // Events
    event TransfersPaused(address account);
    event TransfersUnpaused(address account);
    event TokensMinted(address to, uint256 amount);
    
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     * @param initialSupply Initial supply of tokens to mint
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds maximum supply");
        _mint(msg.sender, initialSupply);
        transfersPaused = false;
    }
    
    /**
     * @dev Mint new tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Minting would exceed maximum supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Pause all token transfers
     */
    function pauseTransfers() public onlyOwner {
        transfersPaused = true;
        emit TransfersPaused(msg.sender);
    }
    
    /**
     * @dev Unpause all token transfers
     */
    function unpauseTransfers() public onlyOwner {
        transfersPaused = false;
        emit TransfersUnpaused(msg.sender);
    }
    
    /**
     * @dev Override transfer function to add pause functionality
     */
    function _update(address from, address to, uint256 value) internal override {
        require(!transfersPaused || from == address(0) || to == address(0), "Transfers are paused");
        super._update(from, to, value);
    }
    
    /**
     * @dev Returns the maximum supply of tokens
     */
    function maxSupply() public pure returns (uint256) {
        return MAX_SUPPLY;
    }
    
    /**
     * @dev Returns whether transfers are currently paused
     */
    function areTransfersPaused() public view returns (bool) {
        return transfersPaused;
    }
}