const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EphyraToken", function () {
    let EphyraToken;
    let ephyraToken;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    
    const TOKEN_NAME = "Ephyra Token";
    const TOKEN_SYMBOL = "EPH";
    const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1 million tokens
    const MAX_SUPPLY = ethers.parseEther("100000000"); // 100 million tokens
    
    beforeEach(async function () {
        // Get the ContractFactory and Signers
        EphyraToken = await ethers.getContractFactory("EphyraToken");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        
        // Deploy the contract
        ephyraToken = await EphyraToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY);
    });
    
    describe("Deployment", function () {
        it("Should set the right name and symbol", async function () {
            expect(await ephyraToken.name()).to.equal(TOKEN_NAME);
            expect(await ephyraToken.symbol()).to.equal(TOKEN_SYMBOL);
        });
        
        it("Should set the right decimals", async function () {
            expect(await ephyraToken.decimals()).to.equal(18);
        });
        
        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await ephyraToken.balanceOf(owner.address);
            expect(await ephyraToken.totalSupply()).to.equal(ownerBalance);
            expect(ownerBalance).to.equal(INITIAL_SUPPLY);
        });
        
        it("Should set the right owner", async function () {
            expect(await ephyraToken.owner()).to.equal(owner.address);
        });
        
        it("Should set the correct max supply", async function () {
            expect(await ephyraToken.maxSupply()).to.equal(MAX_SUPPLY);
        });
        
        it("Should not pause transfers initially", async function () {
            expect(await ephyraToken.areTransfersPaused()).to.equal(false);
        });
        
        it("Should revert if initial supply exceeds max supply", async function () {
            const excessiveSupply = ethers.parseEther("200000000"); // 200 million tokens
            await expect(
                EphyraToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, excessiveSupply)
            ).to.be.revertedWith("Initial supply exceeds maximum supply");
        });
    });
    
    describe("Transfers", function () {
        it("Should transfer tokens between accounts", async function () {
            const transferAmount = ethers.parseEther("50");
            
            // Transfer 50 tokens from owner to addr1
            await ephyraToken.transfer(addr1.address, transferAmount);
            const addr1Balance = await ephyraToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(transferAmount);
            
            // Transfer 50 tokens from addr1 to addr2
            await ephyraToken.connect(addr1).transfer(addr2.address, transferAmount);
            const addr2Balance = await ephyraToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(transferAmount);
        });
        
        it("Should fail if sender doesn't have enough tokens", async function () {
            const initialOwnerBalance = await ephyraToken.balanceOf(owner.address);
            const excessiveAmount = initialOwnerBalance + ethers.parseEther("1");
            
            await expect(
                ephyraToken.connect(addr1).transfer(owner.address, excessiveAmount)
            ).to.be.revertedWithCustomError(ephyraToken, "ERC20InsufficientBalance");
        });
        
        it("Should update balances after transfers", async function () {
            const initialOwnerBalance = await ephyraToken.balanceOf(owner.address);
            const transferAmount = ethers.parseEther("100");
            
            await ephyraToken.transfer(addr1.address, transferAmount);
            await ephyraToken.transfer(addr2.address, transferAmount);
            
            const finalOwnerBalance = await ephyraToken.balanceOf(owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance - (transferAmount * 2n));
            
            const addr1Balance = await ephyraToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(transferAmount);
            
            const addr2Balance = await ephyraToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(transferAmount);
        });
    });
    
    describe("Allowances", function () {
        it("Should approve tokens for delegated transfer", async function () {
            const approveAmount = ethers.parseEther("100");
            
            await ephyraToken.approve(addr1.address, approveAmount);
            expect(await ephyraToken.allowance(owner.address, addr1.address)).to.equal(approveAmount);
        });
        
        it("Should allow delegated transfers", async function () {
            const approveAmount = ethers.parseEther("100");
            const transferAmount = ethers.parseEther("50");
            
            await ephyraToken.approve(addr1.address, approveAmount);
            await ephyraToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
            
            expect(await ephyraToken.balanceOf(addr2.address)).to.equal(transferAmount);
            expect(await ephyraToken.allowance(owner.address, addr1.address)).to.equal(approveAmount - transferAmount);
        });
        
        it("Should fail delegated transfer if allowance is insufficient", async function () {
            const approveAmount = ethers.parseEther("50");
            const transferAmount = ethers.parseEther("100");
            
            await ephyraToken.approve(addr1.address, approveAmount);
            
            await expect(
                ephyraToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
            ).to.be.revertedWithCustomError(ephyraToken, "ERC20InsufficientAllowance");
        });
    });
    
    describe("Minting", function () {
        it("Should allow owner to mint new tokens", async function () {
            const mintAmount = ethers.parseEther("1000");
            const initialSupply = await ephyraToken.totalSupply();
            
            await expect(ephyraToken.mint(addr1.address, mintAmount))
                .to.emit(ephyraToken, "TokensMinted")
                .withArgs(addr1.address, mintAmount);
            
            expect(await ephyraToken.balanceOf(addr1.address)).to.equal(mintAmount);
            expect(await ephyraToken.totalSupply()).to.equal(initialSupply + mintAmount);
        });
        
        it("Should not allow non-owner to mint tokens", async function () {
            const mintAmount = ethers.parseEther("1000");
            
            await expect(
                ephyraToken.connect(addr1).mint(addr2.address, mintAmount)
            ).to.be.revertedWithCustomError(ephyraToken, "OwnableUnauthorizedAccount");
        });
        
        it("Should not allow minting to zero address", async function () {
            const mintAmount = ethers.parseEther("1000");
            
            await expect(
                ephyraToken.mint(ethers.ZeroAddress, mintAmount)
            ).to.be.revertedWith("Cannot mint to zero address");
        });
        
        it("Should not allow minting beyond max supply", async function () {
            const excessiveMintAmount = MAX_SUPPLY; // This would exceed max supply since initial supply already exists
            
            await expect(
                ephyraToken.mint(addr1.address, excessiveMintAmount)
            ).to.be.revertedWith("Minting would exceed maximum supply");
        });
    });
    
    describe("Burning", function () {
        it("Should allow token holders to burn their tokens", async function () {
            const burnAmount = ethers.parseEther("100");
            const initialBalance = await ephyraToken.balanceOf(owner.address);
            const initialSupply = await ephyraToken.totalSupply();
            
            await ephyraToken.burn(burnAmount);
            
            expect(await ephyraToken.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
            expect(await ephyraToken.totalSupply()).to.equal(initialSupply - burnAmount);
        });
        
        it("Should allow burning from allowance", async function () {
            const approveAmount = ethers.parseEther("100");
            const burnAmount = ethers.parseEther("50");
            
            await ephyraToken.approve(addr1.address, approveAmount);
            await ephyraToken.connect(addr1).burnFrom(owner.address, burnAmount);
            
            expect(await ephyraToken.allowance(owner.address, addr1.address)).to.equal(approveAmount - burnAmount);
        });
        
        it("Should fail if trying to burn more than balance", async function () {
            const excessiveBurnAmount = (await ephyraToken.balanceOf(owner.address)) + ethers.parseEther("1");
            
            await expect(
                ephyraToken.burn(excessiveBurnAmount)
            ).to.be.revertedWithCustomError(ephyraToken, "ERC20InsufficientBalance");
        });
    });
    
    describe("Pause Functionality", function () {
        it("Should allow owner to pause transfers", async function () {
            await expect(ephyraToken.pauseTransfers())
                .to.emit(ephyraToken, "TransfersPaused")
                .withArgs(owner.address);
            
            expect(await ephyraToken.areTransfersPaused()).to.equal(true);
        });
        
        it("Should allow owner to unpause transfers", async function () {
            await ephyraToken.pauseTransfers();
            
            await expect(ephyraToken.unpauseTransfers())
                .to.emit(ephyraToken, "TransfersUnpaused")
                .withArgs(owner.address);
            
            expect(await ephyraToken.areTransfersPaused()).to.equal(false);
        });
        
        it("Should prevent transfers when paused", async function () {
            await ephyraToken.pauseTransfers();
            
            await expect(
                ephyraToken.transfer(addr1.address, ethers.parseEther("100"))
            ).to.be.revertedWith("Transfers are paused");
        });
        
        it("Should allow minting when transfers are paused", async function () {
            await ephyraToken.pauseTransfers();
            const mintAmount = ethers.parseEther("1000");
            
            await expect(ephyraToken.mint(addr1.address, mintAmount))
                .to.emit(ephyraToken, "TokensMinted")
                .withArgs(addr1.address, mintAmount);
        });
        
        it("Should allow burning when transfers are paused", async function () {
            await ephyraToken.pauseTransfers();
            const burnAmount = ethers.parseEther("100");
            
            await expect(ephyraToken.burn(burnAmount)).to.not.be.reverted;
        });
        
        it("Should not allow non-owner to pause/unpause transfers", async function () {
            await expect(
                ephyraToken.connect(addr1).pauseTransfers()
            ).to.be.revertedWithCustomError(ephyraToken, "OwnableUnauthorizedAccount");
            
            await expect(
                ephyraToken.connect(addr1).unpauseTransfers()
            ).to.be.revertedWithCustomError(ephyraToken, "OwnableUnauthorizedAccount");
        });
    });
    
    describe("Edge Cases", function () {
        it("Should handle zero transfers", async function () {
            await expect(ephyraToken.transfer(addr1.address, 0)).to.not.be.reverted;
            expect(await ephyraToken.balanceOf(addr1.address)).to.equal(0);
        });
        
        it("Should handle self transfers", async function () {
            const initialBalance = await ephyraToken.balanceOf(owner.address);
            const transferAmount = ethers.parseEther("100");
            
            await ephyraToken.transfer(owner.address, transferAmount);
            expect(await ephyraToken.balanceOf(owner.address)).to.equal(initialBalance);
        });
        
        it("Should handle maximum uint256 approval", async function () {
            const maxApproval = ethers.MaxUint256;
            
            await ephyraToken.approve(addr1.address, maxApproval);
            expect(await ephyraToken.allowance(owner.address, addr1.address)).to.equal(maxApproval);
        });
    });
});