#Project 2 - Unit testing

Project 2 @Alyraschool - unit testing using hardhat

## Table of Contents
- [Table of Contents](#table-of-contents)
- [Foreword](#foreword)
- [Installation](#installation)
- [Usage](#usage)

## Foreword

This project is a part of the [Alyra](https://alyra.fr/) blockchain training. It is a simple smart contract that allows to vote for proposals and elect a winner proposal. The goal of this project is to write unit tests for the Voting.sol smart contract using [hardhat](https://hardhat.org/).

Philosophy behind the test file is to go trought each stages of the contract lifecycle (workflowStatus). Code is orginized to test the getters then all the differents phases of the workflowStatus. At each stage, the test file is testing the different revert of state handlers functions. The onlyOwner modifiers and emitters are tested separately when the handlers can be called by the owner.

code coverage is the following :

File         |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------|----------|----------|----------|----------|----------------|
 contracts   |      100 |    91.67 |      100 |      100 |                |
  Voting.sol |      100 |    91.67 |      100 |      100 |                |
  All files  |      100 |    91.67 |      100 |      100 |                |



## Installation

using *yarn*
```bash
git clone https://github.com/wwwookiee/Alyra-project-2.git
cd Alyra-project-2
yarn install
```
OR using *npm*
```bash
git clone https://github.com/wwwookiee/Alyra-project-2.git
cd Alyra-project-2
npm install
```

## Usage
using *yarn*
```bash
yarn hardhat compile
yarn hardhat test
```
OR using *npm*
```bash
npx hardhat compile
npx hardhat test
```