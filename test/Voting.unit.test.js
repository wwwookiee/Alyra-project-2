const { ethers } = require('hardhat');
const { expect } = require('chai');

describe("Test of Voting.sol", function() {

    let deployedContract,instancedContract, owner, addr1, addr2, proposalsArray = [];

    const WorkflowStatus = {
        RegisteringVoters: 0,
        ProposalsRegistrationStarted: 1,
        ProposalsRegistrationEnded: 2,
        VotingSessionStarted: 3,
        VotingSessionEnded: 4,
        VotesTallied: 5
      };

    beforeEach(async function() {
        // Get the hardhat's test accounts
        [owner, addr1, addr2] = await ethers.getSigners();
        // Deploy the contract Voting.sol
        let contract = await ethers.getContractFactory("Voting");
        deployedContract = await contract.deploy();
        /*
        * Register the owner & addr1 as voters.
        * as there is no function to remove a voter, I assume that the owner & addr1 are always considered as voters as they can't be reseted using after() or afterEach().
        * obviously addr2 is considered a non-registered voter by default.
        */
        await deployedContract.addVoter(owner.address);
        await deployedContract.addVoter(addr1.address);
    });

    /*
    * Test cases for the getters functions
    */

    describe("Test the revert behavior of the getters' function.", function() {

        beforeEach(async function() {
            // Set up the context using addr2 as a non-registered voter/ non-owner
            instancedContract = deployedContract.connect(addr2);
        });

        context("Test the getVoter() function", function() {

           // Test the revert behavior of the getter functions by testing the onlyVoter modifier
            it('should revert when the voter is not registered', async function() {
                await expect(instancedContract.getVoter(addr2.address)).to.be.revertedWith('You\'re not a voter');
            });

            it('should return the voter\'s information', async function() {
                /*
                * Get the voter from the getter getVoter() and check if the voter is correctly registered.
                * Addvoter(addr1.address) is called in the beforeEach statement.
                */
                const voter = await deployedContract.getVoter(addr1.address);
                expect({
                  isRegistered: voter.isRegistered,
                  hasVoted: voter.hasVoted,
                  votedProposalId: voter.votedProposalId.toNumber() // Convert BigNumber to number.
                }).to.deep.equal({
                  isRegistered: true,
                  hasVoted: false,
                  votedProposalId: 0
                });
            });
        });

        context("Test the getOneProposal() function", function() {

            // Test the revert behavior of the getter functions by testing the onlyVoter modifier.
            it('should revert when the voter is not registered', async function() {
                await expect(instancedContract.getVoter(addr1.address)).to.be.revertedWith('You\'re not a voter');
            });

            it('should return the proposal\'s informations', async function() {
                // Start the proposals registering phase.
                await deployedContract.startProposalsRegistering();
                // Register a proposal.
                await deployedContract.addProposal('this is a proposal');
                /* 
                * Get the proposal from the getter getOneProposal() and check if the proposal is correctly registered.
                * The proposal's id is 1 because the 'GENESIS' proposal is registered with the id 0  (c.f. startProposalsRegistering()).
                */
                const proposal = await deployedContract.getOneProposal(1);
                expect({
                    description: proposal.description,
                    voteCount: proposal.voteCount
                }).to.deep.equal({
                    description: 'this is a proposal',
                    voteCount: 0
                });
            });
        });
    });

    /*******************************************
    *       Voters registration session        *
    *******************************************/
    

    /*
    * Test cases for the `RegisteringVoters` phase
    */

    describe("RegisteringVoters phase", function() {

        context("Test the addVoter() function", function() {

            // Test the onlyOwner modifier (line 61)
            it('should revert if the function isn\'t called by the owner', async function() {
                // Instanced contract, connected to addr1
                instancedContract = deployedContract.connect(addr1);
                // Try to call the function from addr1, with addr2 as parameter
                await expect(instancedContract.addVoter(addr2.address)).to.be.revertedWith('Ownable: caller is not the owner');
            });

            // Test this statement : require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Voters registration is not open yet'); (line 62)
            it('should revert if the workflow status (is equal to RegisteringVoters)', async function() {
                // Set another workflow status than RegisteringVoters.
                await deployedContract.startProposalsRegistering();
                // Try to register a voter.
                await expect(deployedContract.addVoter(addr2.address)).to.be.revertedWith('Voters registration is not open yet');
            });

            // Test this satetement : require(voters[_addr].isRegistered != true, 'Already registered'); (line 63)
            it('should revert if a voter is already registered', async function() {
                // Try to register a voter twice. 
                await expect(deployedContract.addVoter(addr1.address)).to.be.revertedWith('Already registered');
            });

            // Test this statement : voters[_addr].isRegistered = true; (line 65)
            it('should test if the voter is correctly registered into the voters array', async function() {
                // Get the voter from the getter getVoter() and check if the voter is registered.
                const voter = await deployedContract.getVoter(addr1.address);
                expect(voter.isRegistered).to.be.true;
            });

            // Test this satement : emit VoterRegistered(_addr) (line 66);
            it('should emit VoterRegistered event', async function() {
                // Call the function addVoter() and check if the event VoterRegistered is emitted.
                await expect(deployedContract.addVoter(addr2.address))
                .to.emit(deployedContract, 'VoterRegistered')
                .withArgs(addr2.address);
            });
        });

        context("Test startProposalsRegistering() function", function() {

            // Test the onlyOwner modifier. (line 100)
            it('should revert if the function isn\'t called by the owner', async function() {
                // Instanced contract, connected to addr1.
                instancedContract = deployedContract.connect(addr1);
                // Try to call the function from addr1, with addr2 as parameter.
                await expect(instancedContract.startProposalsRegistering()).to.be.revertedWith('Ownable: caller is not the owner');
            });

            // Test this statement : emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted); (line 108)
            it('should emit WorkflowStatusChange event with correct arguments', async function() {
                // Try to emit te correct event with the correct arguments
                await expect(deployedContract.startProposalsRegistering())
                .to.emit(deployedContract, 'WorkflowStatusChange')
                .withArgs(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
            });

        });

        context("Test the revert of state handlers functions", function() {

            it('should not revert if the workflow status (is equal to RegisteringVoters)', async function() {
                // Try to call the startProposalsRegistering() function.
                await expect(deployedContract.startProposalsRegistering()).to.be.not.revertedWith('Registering proposals cant be started now');
            });

            it('should revert if the workflow status (is not equal to RegisteringVoters)', async function() {
                // Try to call the endProposalsRegistering() function.
                await expect(deployedContract.endProposalsRegistering()).to.be.revertedWith('Registering proposals havent started yet');
            });

            it('should revert if the workflow status (is not equal to RegisteringVoters)', async function() {
                // Try to call the startVotingSession() function.
                await expect(deployedContract.startVotingSession()).to.be.revertedWith('Registering proposals phase is not finished');
            });

            it('should revert if the workflow status (is not equal to RegisteringVoters)', async function() {
                // Try to call the endVotingSession() function.
                await expect(deployedContract.endVotingSession()).to.be.revertedWith('Voting session havent started yet');
            });

            it('should revert if the workflow status (is not equal to RegisteringVoters)', async function() {
                // Try to call the tallyVotes() function.
                await expect(deployedContract.tallyVotes()).to.be.revertedWith('Current status is not voting session ended');
            });
        });

    });

    /*
    *******************************
    *       Proposal session      *
    *******************************
    */

    /*
    * Test cases for the `ProposalsRegistrationStarted` workflow status.
    */

    describe("ProposalsRegistrationStarted phase", function() {

        beforeEach(async function() {
            //start the ProposalsRegistrationStarted phase.
            await deployedContract.startProposalsRegistering();
        });

        context("Test function addProposal()", function() {

           // test this statement : require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Proposals are not allowed yet'); (line 73)
            it('should revert if the workflow status (is equal to ProposalsRegistrationStarted)', async function() {
                await deployedContract.endProposalsRegistering();
                // Try to register a proposal
                await expect(deployedContract.addProposal('This is a proposal')).to.be.revertedWith('Proposals are not allowed yet');
            });

            // Test of the onlyVoter modifier (line 72)
            it('should revert when the proposal is not comming from a valid voter', async function() {
                // Instanced contract, connected to addr2.
                instancedContract = deployedContract.connect(addr2);
                // Try to register a proposal.
                await expect(instancedContract.addProposal('This is a proposal')).to.be.revertedWith('You\'re not a voter');
            });

            // Test this statement : require(keccak256(abi.encode(_desc)) != keccak256(abi.encode("")), 'Vous ne pouvez pas ne rien proposer'); (line 74)
            it('should revert if the proposal is empty', async function() {
                // Try to register an empty proposal.
                await expect(deployedContract.addProposal('')).to.be.revertedWith('Vous ne pouvez pas ne rien proposer');
            });

            // Test this satement : emit ProposalRegistered(proposalsArray.length-1); (line 80)
            it('should emit ProposalRegistered event', async function() {
                // Call the function addProposal().
                await deployedContract.addProposal('This is a proposal');
                // Retrieve the emitted events.
                const events = await deployedContract.queryFilter('ProposalRegistered');
                // Get the last emitted event.
                const lastEvent = events[events.length - 1];
                // Check if the event contains the expected parameters.
                expect(lastEvent.event).to.be.equal('ProposalRegistered');
            });
        });

        context("test the endProposalsRegistering() function", function() {
            
            // Test the onlyOwner modifier
            it('should revert if the function isn\'t called by the owner', async function() {
                // Instanced contract, connected to addr1.
                instancedContract = deployedContract.connect(addr1);
                // Try to call the function from addr1, with addr2 as parameter.
                await expect(instancedContract.endProposalsRegistering()).to.be.revertedWith('Ownable: caller is not the owner');
            });

            // Test this statement : emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);(line 114)
            it('should emit WorkflowStatusChange event with correct arguments', async function() {
                await expect(deployedContract.endProposalsRegistering())
                .to.emit(deployedContract, 'WorkflowStatusChange')
                .withArgs(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
            });

        });

        context("Test the revert of state handlers functions", function() {
            
            it('should revert if the workflow status (is equal to RegisteringVoters)', async function() {
                // Try to call the startProposalsRegistering() function.
                await expect(deployedContract.startProposalsRegistering()).to.be.revertedWith('Registering proposals cant be started now');
            });

            it('should not revert if the workflow status (is equal to RegisteringVoters)', async function() {
                // Try to call the endProposalsRegistering() function.
                await expect(deployedContract.endProposalsRegistering()).to.be.not.revertedWith('Registering proposals havent started yet');
            });

            it('should revert if the workflow status (is not equal to RegisteringVoters)', async function() {
                // Try to call the startVotingSession() function.
                await expect(deployedContract.startVotingSession()).to.be.revertedWith('Registering proposals phase is not finished');
            });

            it('should revert if the workflow status (is not equal to RegisteringVoters)', async function() {
                // Try to call the endVotingSession() function.
                await expect(deployedContract.endVotingSession()).to.be.revertedWith('Voting session havent started yet');
            });

            it('should revert if the workflow status (is not equal to RegisteringVoters)', async function() {
                // Try to call the tallyVotes() function.
                await expect(deployedContract.tallyVotes()).to.be.revertedWith('Current status is not voting session ended');
            });
        });
    });


    /*
    *  Test cases for the `ProposalsRegistrationEnded` phase
    */

    describe("ProposalsRegistrationEnded phase", function() {

        beforeEach(async function() {
                // start the ProposalsRegistrationStarted phase.
                await deployedContract.startProposalsRegistering();
                // add a proposal
                await deployedContract.addProposal('this is a proposal');
                // end the ProposalsRegistrationStarted phase.
                await deployedContract.endProposalsRegistering();
        });

        context("Test the startVotingSession() function", function() {
            
            // Test the onlyOwner modifier (line 117)
            it('should revert if the function isn\'t called by the owner', async function() {
                // Instanced contract, connected to addr1.
                instancedContract = deployedContract.connect(addr1);
                // Try to call the function from addr1, with addr2 as parameter.
                await expect(instancedContract.startVotingSession()).to.be.revertedWith('Ownable: caller is not the owner');
            });

            // Test this statement : emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);(line 114)
            it('should emit WorkflowStatusChange event with correct arguments', async function() {
                await expect(deployedContract.startVotingSession())
                .to.emit(deployedContract, 'WorkflowStatusChange')
                .withArgs(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
            });

        });

        context("Test the revert of state handlers functions", function() {
            
            it('should revert if the workflow status (is not equal to ProposalsRegistrationStarted)', async function() {
                // Try to call the startProposalsRegistering() function.
                await expect(deployedContract.startProposalsRegistering()).to.be.revertedWith('Registering proposals cant be started now');
            });

            it('should revert if the workflow status (is not equal to ProposalsRegistrationStarted)', async function() {
                // Try to call the endProposalsRegistering() function.
                await expect(deployedContract.endProposalsRegistering()).to.be.revertedWith('Registering proposals havent started yet');
            });

            it('should not revert if the workflow status (is equal to ProposalsRegistrationStarted)', async function() {
                // Try to call the startVotingSession() function.
                await expect(deployedContract.startVotingSession()).to.be.not.revertedWith('Registering proposals phase is not finished');
            });

            it('should revert if the workflow status (is not equal to ProposalsRegistrationStarted)', async function() {
                // Try to call the endVotingSession() function.
                await expect(deployedContract.endVotingSession()).to.be.revertedWith('Voting session havent started yet');
            });

            it('should revert if the workflow status (is not equal to ProposalsRegistrationStarted)', async function() {
                // Try to call the tallyVotes() function.
                await expect(deployedContract.tallyVotes()).to.be.revertedWith('Current status is not voting session ended');
            });
        });
    });

    /*
    *******************************
    *       VOTING session        *
    *******************************
    */

    /*
    * Test cases for the `VotingSessionStarted` workflow status
    */

    describe("startVotingSession phase", function() {
        
        beforeEach(async function() {
            // start the ProposalsRegistrationStarted phase.
            await deployedContract.startProposalsRegistering();
            // add a proposal
            await deployedContract.addProposal('this is a proposal');
            // end the ProposalsRegistrationStarted phase.
            await deployedContract.endProposalsRegistering();
            // start the VotingSessionStarted phase.
            await deployedContract.startVotingSession();
        });

        context("Test the setVote() function", function() {
            
            // Test this statement :require(voters[msg.sender].hasVoted != true, 'You have already voted'); (line 87)
            it('should revert when the proposal is not comming from a valid voter', async function() {
                // Instanced contract, connected to addr2.
                instancedContract = deployedContract.connect(addr2);
                // Try to register a proposal.
                await expect(instancedContract.setVote(0)).to.be.revertedWith('You\'re not a voter');
            });

            // Test this satement : emit Voted(msg.sender, _id); (line 94);
            it('should emit Voted event', async function() {
                // Call the function addVoter() and check if the event VoterRegistered is emitted.
                await expect(deployedContract.setVote(1))
                .to.emit(deployedContract, 'Voted')
                .withArgs(
                    owner.address,
                    1
                );
            });
        });

        context("Test the endVotingSession() function", function() {
            
            // Test the onlyOwner modifier
            it('should revert if the function isn\'t called by the owner', async function() {
                // Instanced contract, connected to addr1
                instancedContract = deployedContract.connect(addr1);
                // Try to call the function from addr1, with addr2 as parameter
                await expect(instancedContract.endVotingSession()).to.be.revertedWith('Ownable: caller is not the owner');
            });

            // Test this statement : emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded); (line 126)
            it('should emit WorkflowStatusChange event with correct arguments', async function() {
                await expect(deployedContract.endVotingSession())
                .to.emit(deployedContract, 'WorkflowStatusChange')
                .withArgs(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
            });
        });

        context("Test the revert of state handlers functions", function() {
            
            it('should revert if the workflow status (is not equal to VotingSessionStarted)', async function() {
                // Try to call the startProposalsRegistering() function.
                await expect(deployedContract.startProposalsRegistering()).to.be.revertedWith('Registering proposals cant be started now');
            });

            it('should revert if the workflow status (is not equal to VotingSessionStarted)', async function() {
                // Try to call the endProposalsRegistering() function.
                await expect(deployedContract.endProposalsRegistering()).to.be.revertedWith('Registering proposals havent started yet');
            });

            it('should revert if the workflow status (is not equal to VotingSessionStarted)', async function() {
                // Try to call the startVotingSession() function.
                await expect(deployedContract.startVotingSession()).to.be.revertedWith('Registering proposals phase is not finished');
            });

            it('should not revert if the workflow status (is equal to VotingSessionStarted)', async function() {
                // Try to call the endVotingSession() function.
                await expect(deployedContract.endVotingSession()).to.be.not.revertedWith('Voting session havent started yet');
            });

            it('should revert if the workflow status (is not equal to VotingSessionStarted)', async function() {
                // Try to call the tallyVotes() function.
                await expect(deployedContract.tallyVotes()).to.be.revertedWith('Current status is not voting session ended');
            });
        });
    });

    /*
    *  Test cases for the `VotingSessionEnded` workflow status
    */

    describe("VotingSessionEnded phase", function() {

        beforeEach(async function() {
            // start the ProposalsRegistrationStarted phase.
            await deployedContract.startProposalsRegistering();
            // add a proposal
            await deployedContract.addProposal('this is a proposal');
            // end the ProposalsRegistrationStarted phase.
            await deployedContract.endProposalsRegistering();
            // start the VotingSessionStarted phase.
            await deployedContract.startVotingSession();
            // vote for the proposal
            await deployedContract.setVote(0);
            // Start the VotingSessionEnded phase.
            await deployedContract.endVotingSession();
        });

        context("Test the revert of state handlers functions", function() {
            
            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the startProposalsRegistering() function.
                await expect(deployedContract.startProposalsRegistering()).to.be.revertedWith('Registering proposals cant be started now');
            });

            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the endProposalsRegistering() function.
                await expect(deployedContract.endProposalsRegistering()).to.be.revertedWith('Registering proposals havent started yet');
            });

            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the startVotingSession() function.
                await expect(deployedContract.startVotingSession()).to.be.revertedWith('Registering proposals phase is not finished');
            });

            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the endVotingSession() function.
                await expect(deployedContract.endVotingSession()).to.be.revertedWith('Voting session havent started yet');
            });

            it('should not revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the tallyVotes() function.
                await expect(deployedContract.tallyVotes()).to.be.not.revertedWith('Current status is not voting session ended');
            });
        });

    });

    /*
    *******************************
    *     Tally votes session     *
    *******************************
    */

    /*
    * Test cases for the `VotesTallied` workflow status
    */

    describe("tallyVotes phase", function() {

        beforeEach(async function() {
            // start the ProposalsRegistrationStarted phase.
            await deployedContract.startProposalsRegistering();
            // add a proposal
            await deployedContract.addProposal('this is a proposal');
            // add proposals to the javascript testing array declared above. 'GENESIS' is the first element of the array to fit the contract's array. 
            proposalsArray.push({ description: "GENESIS", voteCount: 0 });
            proposalsArray.push({ description: "this is a proposal", voteCount: 0 });
            // Start the ProposalsRegistrationEnded phase.
            await deployedContract.endProposalsRegistering();
            // Start the VotingSessionStarted phase.
            await deployedContract.startVotingSession();
            // Vote for a proposal.
            await deployedContract.setVote(1);
            // Vote for a proposal in the javascript testing array declared above.
            proposalsArray[1].voteCount = 1;
            //Start the VotingSessionEnded phase.
            await deployedContract.endVotingSession();
        });

        context("Test the tallyVotes() function", function() {

            // Test the onlyOwner modifier
            it('should revert if the function isn\'t called by the owner', async function() {
                // Instanced contract, connected to addr1.
                instancedContract = deployedContract.connect(addr1);
                // Try to call the function from addr1, with addr2 as parameter.
                await expect(instancedContract.tallyVotes()).to.be.revertedWith('Ownable: caller is not the owner');
            });

            // Test this statement : workflowStatus = WorkflowStatus.VotesTallied; (line 138)
            it('should store the correct winningProposalId', async function() {
                await deployedContract.tallyVotes();
                const winningProposalID = await deployedContract.winningProposalID();

                // Determine the expected value based on the vote counts of the proposals.
                let expectedProposalID = 0;
                let highestVoteCount = 0;
                for (let p = 0; p < proposalsArray.length; p++) {
                    if (proposalsArray[p].voteCount > highestVoteCount) {
                    highestVoteCount = proposalsArray[p].voteCount;
                    expectedProposalID = p;
                    }
                }

                expect(winningProposalID).to.equal(expectedProposalID);
            });

            it('should emit WorkflowStatusChange event with correct arguments', async function() {
                await expect(deployedContract.tallyVotes())
                .to.emit(deployedContract, 'WorkflowStatusChange')
                .withArgs(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
            });

        });

        context("Test the revert of state handlers functions", function() {

            beforeEach(async function() {
                // Call the tallyVotes() function.
                await deployedContract.tallyVotes();
            });

            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the startProposalsRegistering() function.
                await expect(deployedContract.startProposalsRegistering()).to.be.revertedWith('Registering proposals cant be started now');
            });

            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the endProposalsRegistering() function.
                await expect(deployedContract.endProposalsRegistering()).to.be.revertedWith('Registering proposals havent started yet');
            });

            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the startVotingSession() function.
                await expect(deployedContract.startVotingSession()).to.be.revertedWith('Registering proposals phase is not finished');
            });

            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the endVotingSession() function.
                await expect(deployedContract.endVotingSession()).to.be.revertedWith('Voting session havent started yet');
            });

            it('should revert if the workflow status (is not equal to VotingSessionEnded)', async function() {
                // Try to call the tallyVotes() function.
                await expect(deployedContract.tallyVotes()).to.be.revertedWith('Current status is not voting session ended');
            });
        });

    });
});