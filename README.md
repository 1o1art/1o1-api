# Introduction

1o1.art is a no-code NFT creator platform that empowers artists and businesses to create, manage and upgrade NFT smart contracts. This is the developer sdk, that can be used in conjuntion with the app, to manage, mint, and update your NFTs. You can build your own platform on top of 1o1, using the sdk.

Let's discover **1o1.art sdk in less than 5 minutes**.

## Getting Started

Get started by **installing the sdk client**.

### What you'll need

- [Node.js](https://nodejs.org/en/download/) version 16.18 or above:
  - When installing Node.js, you are recommended to check all checkboxes related to dependencies.

## Install the 1o1art sdk

```bash
mkdir 1o1-first-project
cd 1o1-first-project/
npm install @1o1art/sdk
# install dotenv for convenience
npm install dotenv
```

## Add environment variables

Let's write down a few environment variables, for this example we're
using the default hardhat private key and an infura rpc url that we setup
for this example. Be sure to replace `PRIV_KEY=` with your own private key
without the 0x prefix.

```bash
touch .env
# Add the following to your environment variables

#Add your private key
PRIV_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# Any RPC URL node can be used for a supported network. Replace this with your own key/endpoint
RPC_URL=https://polygon-mumbai.infura.io/v3/0552fa11cf9f4c78afaf923bb1c9389e

#Mantle Testnet Example
# 1O1_RPC_URL=https://rpc.testnet.mantle.xyz
```

## Let's get some testnet crypto

Go here to grab some testnet matic from a faucet: https://mumbaifaucet.com/

### Example Code

```ts
// add index.ts inside the 1o1-first-project/ directory
import { ClientFactory, lib, NftTokenBuilder } from "@1o1art/sdk";
import * as dotenv from "dotenv";

dotenv.config();

// Remember to add your own private key
const PRIV_KEY = process.env.PRIV_KEY;
const RPC_URL = process.env.RPC_URL;
if (!PRIV_KEY) throw "missing private key";
if (!RPC_URL) throw "missing rpc url";

const main = async () => {
  const client = await ClientFactory.makeClient(PRIV_KEY, RPC_URL);
  console.log("made client");

  const nftContractBuilder = client.createNftContractBuilder();

  // Get the components you'd like to add to your blank smart contract
  // basic will load the bare minimum to make a contract, delegatable
  // will provide a delegatable ERC721 token
  const contractFacets = await client.getPresetFacets("delegatable");
  console.log(`retrieved facets ${contractFacets.length}`);

  console.log("deploying contract");
  // Create the contract and set a contract image
  const contractAddr = await nftContractBuilder
    .setFacets(contractFacets)
    .setImage(
      "ipfs://QmNoDT3M1FfF7d3Pd9DkBfzz8NxHueeudWBPe9owt1PnRM",
      "offchain"
    )
    .setMetadata({
      name: "My NFT",
      description: "This is my NFT",
      symbol: "API",
    })
    .deploy();

  console.log("deployed contract");

  // Prepare to create a token
  const nftTokenBuilder = new NftTokenBuilder(
    nftContractBuilder.signer,
    contractAddr
  );

  // This can be any address you'd like to mint to
  const mintToAddress = nftContractBuilder.signer.address;

  const tokenID = await nftTokenBuilder
    .setImage(
      "ipfs://QmNoDT3M1FfF7d3Pd9DkBfzz8NxHueeudWBPe9owt1PnRM",
      "offchain"
    )
    .setAnimation(
      "ipfs://QmTwnLtm7TkmaYJFrYFvsupedP3n51vu6czmVKiED5GyAX",
      "offchain"
    )
    .setDesc("This is my NFT")
    .setName("My NFT")
    .setAttributes({ key: "value", otherKey: "value" })
    .mint(mintToAddress);

  // get access to the recently launch NFT Contract
  const { nftContract } = await client.getNftContractData(contractAddr);

  // Use the contract to get the tokenURI aka the token Metadata
  const tokenURIBase64Encoded = await nftContract.tokenURI(tokenID);

  // get the token Metadata for the minted token
  let tokenMetadata: lib.token.TokenMetadata = JSON.parse(
    lib.utils.convertTokenUriData(tokenURIBase64Encoded)
  ) as lib.token.TokenMetadata;

  console.log("Minted NFT - Token ID: ", tokenID);
  console.log("Minted NFT - Contract Addr: ", contractAddr);
  console.log(
    `Minted NFT - Token Metadata: ${JSON.stringify(tokenMetadata, null, 2)}`
  );
};
try {
  main();
} catch (e) {
  console.log(e);
  console.log("Remember to replace the private key with your own");
}
```

Run the typescript example via

```bash
npx ts-node index.ts
```

JS Example

```js
// add index.ts inside the 1o1-first-project/ directory
const { ClientFactory, lib, NftTokenBuilder } = require("@1o1art/sdk");
const dotenv = require("dotenv");

dotenv.config();

// Remember to add your own private key
const PRIV_KEY = process.env.PRIV_KEY;
const RPC_URL = process.env.RPC_URL;
if (!PRIV_KEY) throw "missing private key";
if (!RPC_URL) throw "missing rpc url";


const main = async () => {
  const client = await ClientFactory.makeClient(PRIV_KEY, RPC_URL);
  console.log("made client");

  const nftContractBuilder = client.createNftContractBuilder();

  // Get the components you'd like to add to your blank smart contract
  // basic will load the bare minimum to make a contract, delegatable
  // will provide a delegatable ERC721 token
  const contractFacets = await client.getPresetFacets("delegatable");
  console.log(`retrieved facets ${contractFacets.length}`);

  console.log("deploying contract");
  // Create the contract and set a contract image
  const contractAddr = await nftContractBuilder
    .setFacets(contractFacets)
    .setImage(
      "ipfs://QmNoDT3M1FfF7d3Pd9DkBfzz8NxHueeudWBPe9owt1PnRM",
      "offchain"
    )
    .setMetadata({
      name: "My NFT",
      description: "This is my NFT",
      symbol: "API",
    })
    .deploy();

  console.log("deployed contract");

  // Prepare to create a token
  const nftTokenBuilder = new NftTokenBuilder(
    nftContractBuilder.signer,
    contractAddr
  );

  // This can be any address you'd like to mint to
  const mintToAddress = nftContractBuilder.signer.address;

  const tokenID = await nftTokenBuilder
    .setImage(
      "ipfs://QmNoDT3M1FfF7d3Pd9DkBfzz8NxHueeudWBPe9owt1PnRM",
      "offchain"
    )
    .setAnimation(
      "ipfs://QmTwnLtm7TkmaYJFrYFvsupedP3n51vu6czmVKiED5GyAX",
      "offchain"
    )
    .setDesc("This is my NFT")
    .setName("My NFT")
    .setAttributes({ key: "value", otherKey: "value" })
    .mint(mintToAddress);

  // get access to the recently launch NFT Contract
  const { nftContract } = await client.getNftContractData(contractAddr);

  // Use the contract to get the tokenURI aka the token Metadata
  const tokenURIBase64Encoded = await nftContract.tokenURI(tokenID);

  // get the token Metadata for the minted token
  let tokenMetadata: lib.token.TokenMetadata = JSON.parse(
    lib.utils.convertTokenUriData(tokenURIBase64Encoded)
  ) as lib.token.TokenMetadata;

  console.log("Minted NFT - Token ID: ", tokenID);
  console.log("Minted NFT - Contract Addr: ", contractAddr);
  console.log(
    `Minted NFT - Token Metadata: ${JSON.stringify(tokenMetadata, null, 2)}`
  );
};
try {
  main();
} catch (e) {
  console.log(e);
  console.log("Remember to replace the private key with your own")
}
```

Run the javascript example via

```bash
node index.js
```

## Learn More

Checkout our docs page to learn more about how 1o1 works. https://docs.1o1.art
