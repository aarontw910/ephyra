const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
    
    // Token configuration
    const TOKEN_NAME = "Ephyra Token";
    const TOKEN_SYMBOL = "EPH";
    const INITIAL_SUPPLY = ethers.parseEther("10000000"); // 10 million tokens
    
    // Deploy the contract
    const EphyraToken = await ethers.getContractFactory("EphyraToken");
    const ephyraToken = await EphyraToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY);
    
    await ephyraToken.waitForDeployment();
    
    console.log("EphyraToken deployed to:", await ephyraToken.getAddress());
    console.log("Token Name:", await ephyraToken.name());
    console.log("Token Symbol:", await ephyraToken.symbol());
    console.log("Initial Supply:", ethers.formatEther(await ephyraToken.totalSupply()), "EPH");
    console.log("Max Supply:", ethers.formatEther(await ephyraToken.maxSupply()), "EPH");
    console.log("Owner:", await ephyraToken.owner());
    
    // Verify deployment
    const deployedCode = await ethers.provider.getCode(await ephyraToken.getAddress());
    if (deployedCode === "0x") {
        console.error("❌ Contract deployment failed!");
    } else {
        console.log("✅ Contract deployed successfully!");
    }
}

// Handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });