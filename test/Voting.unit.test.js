const { ethers } = require('hardhat');
const { expect, assert } = require('chai');

describe("test Voting", function() {
    let deployedContract

    beforeEach(async function() {
        [this.owner, this.addr1, this.addr2] = await ethers.getSigners()
        let contract = await ethers.getContractFactory("Voting")
        deployedContract = await contract.deploy()
    })

    describe("Initialization", function() {
        it('should ...', async function() {

        })
    })
})