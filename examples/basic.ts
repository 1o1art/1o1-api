//construct 1o1 client
import { ClientFactory } from "../src";
import dotenv from "dotenv";
import { NftTokenBuilder } from "../src/client/nftBuilder";
import { utils } from "../src";
import { TokenMetadata } from "../src/lib/token";

dotenv.config();
const PRIV_KEY = process.env.PRIV_KEY || "throw no private key set";
const RPC_URL = process.env.RPC_URL || "throw no rpc url set";
//construct nft using presets

const main = async () => {
  const client = await ClientFactory.makeClient(PRIV_KEY, RPC_URL);
  const nftContractBuilder = client.createNftContractBuilder();

  // Get the components you'd like to add to your blank smart contract
  // basic will load the bare minimum to make a contract
  const contractFacets = await client.getPresetFacets("delegatable");

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
      symbol: "API"
    })
    .deploy();

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
    .setDesc("This is my NFT")
    .setName("My NFT")
    .setAttributes({ key: "value", otherKey: "value" })
    .mint(mintToAddress);

  const contracts = await client.getContractsByOwner(
    nftContractBuilder.signer.address,
    0,
    100,
    "asc"
  );
  console.log(
    `addr: ${
      contracts.contractAddrs
    } total: ${contracts.total.toString()} count: ${contracts.count.toString()}`
  );

  const nftContract = await client.getNftContract(contractAddr);

  // Use the contract to get the tokenURI aka the token Metadata
  const tokenURIBase64Encoded = await nftContract.tokenURI(tokenID);

  // get the token Metadata for the minted token
  let tokenMetadata: TokenMetadata = JSON.parse(
    utils.convertTokenUriData(tokenURIBase64Encoded)
  ) as TokenMetadata;

  console.log(`Token Metadata: ${JSON.stringify(tokenMetadata, null, 2)}`);

  // Get the previous metadata
  const currentMetadata = nftTokenBuilder.metadata;

  // Update the name
  currentMetadata.tokenName = "New Name";

  // Set new metadata for the token
  await nftTokenBuilder.updateMetadata(parseInt(tokenID), currentMetadata);

  const updatedTokenURIResponse = await nftContract.tokenURI(tokenID);

  tokenMetadata = JSON.parse(
    utils.convertTokenUriData(updatedTokenURIResponse)
  ) as TokenMetadata;

  console.log(
    `Updated Token Metadata: ${JSON.stringify(tokenMetadata, null, 2)}`
  );
};

main();
