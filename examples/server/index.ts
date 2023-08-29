//construct 1o1 client
import { ClientFactory, Client, NftTokenBuilder } from "../../src";
import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const PRIV_KEY = process.env.PRIV_KEY || "throw no private key set";
const RPC_URL = process.env.RPC_URL || "throw no rpc url set";
let nftClient: Client;
const getClient = async () => {
  if (!nftClient) {
    nftClient = await ClientFactory.makeClientFromKey(PRIV_KEY, RPC_URL);
  }
  return nftClient;
};
const getContractBuilder = async () => {
  const client = await getClient();
  const contractFacets = await client.getPresetFacets("delegatable");
  const nftContractBuilder = client.createNftContractBuilder();
  return nftContractBuilder.setFacets(contractFacets);
};
// Get the components you'd like to add to your blank smart contract
// basic will load the bare minimum to make a contract, delegatable
// will provide a delegatable ERC721 token

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/mint", async (req, res) => {
  const contractBuilder = await getContractBuilder();
  const contractAddr = await contractBuilder
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
    contractBuilder.signer,
    contractAddr
  );

  // This can be any address you'd like to mint to
  const mintToAddress = contractBuilder.signer.address;

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

  const tokenMetadata = await nftTokenBuilder.getTokenMetadata(
    parseInt(tokenID)
  );

  res.send({
    success: true,
    tokenId: tokenID,
    contractAddr: contractAddr,
    tokenMetadata
  });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
