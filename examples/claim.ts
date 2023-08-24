//construct 1o1 client
import { ClientFactory, NftTokenBuilder } from "../src";
import dotenv from "dotenv";
import { ClaimRuleBuilder } from "../src/client/nftBuilder";

dotenv.config();
const PRIV_KEY = process.env.PRIV_KEY || "throw no private key set";
const RPC_URL = process.env.RPC_URL || "throw no rpc url set";
//construct nft using presets

const main = async () => {
  const client = await ClientFactory.makeClientFromKey(PRIV_KEY, RPC_URL);
  const nftContractBuilder = client.createNftContractBuilder();
  // Get the components you'd like to add to your blank smart contract
  // basic will load the bare minimum to make a contract, delegatable
  // will provide a delegatable ERC721 token
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
  const signerAddress = nftContractBuilder.signer.address;

  const startTime = new Date();
  const endTime = new Date(startTime);
  endTime.setDate(startTime.getDate() + 1);
  const claimRules = await new ClaimRuleBuilder()
    .setClaimLimit(20)
    .setStartTime(startTime)
    .setEndTime(endTime)
    .setEditionSize(100)
    .setRoyaltyBps(1000)
    .setPayoutAddress(signerAddress)
    .setRoyaltyAddress(signerAddress)
    .build();

  const claimID = await nftTokenBuilder
    .setImage(
      "ipfs://QmNoDT3M1FfF7d3Pd9DkBfzz8NxHueeudWBPe9owt1PnRM",
      "offchain"
    )
    .setAnimation(
      "ipfs://QmTwnLtm7TkmaYJFrYFvsupedP3n51vu6czmVKiED5GyAX",
      "offchain"
    )
    .setDesc("This is my Claimable NFT. The first one")
    .setName("Claimable Test NFT")
    .setAttributes({ key: "value", otherKey: "value" })
    .createClaim(claimRules);

  const contractsByOwner = await client.getContractsByOwner(
    nftContractBuilder.signer.address,
    0,
    100,
    "asc"
  );
  console.log(
    `addr: ${
      contractsByOwner.contractAddrs
    } total: ${contractsByOwner.total.toString()} count: ${contractsByOwner.count.toString()}`
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { nftContract } = await client.getNftContractData(contractAddr);

  const claimMetadata = await nftTokenBuilder.getClaimMetadata(
    parseInt(claimID)
  );

  console.log(`Token Metadata: ${JSON.stringify(claimMetadata, null, 2)}`);

  // Get the previous metadata
  const currentMetadata = nftTokenBuilder.metadata;

  // Update the name
  currentMetadata.tokenName = "New Name";

  // Set new metadata for the token
  await nftTokenBuilder.updateMetadata(parseInt(claimID), currentMetadata);
};

main();
