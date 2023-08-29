import { ClientFactory, NftTokenBuilder, lib } from "/dist/index.mjs";
import { ethers } from "/examples/web/ethers-5.6.esm.min.js";

export const getNetworks = async () => {
  return lib.config.getNetworks();
};
export const mintExample = async (tokenName, tokenDesc, mintStatusCallback) => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  // MetaMask requires requesting permission to connect users accounts
  await provider.send("eth_requestAccounts", []);

  // The MetaMask plugin also allows signing transactions to
  // send ether and pay to change state within the blockchain.
  // For this, you need the account signer...
  const signer = await provider.getSigner();
  const client = await ClientFactory.makeClientFromWallet(signer);
  const chainId = await signer.getChainId();
  const config = lib.config.getConfigById(chainId);
  const chainName = config.name;

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
      name: "My Test NFT",
      description: "This is my Test NFT",
      symbol: "API"
    })
    .deploy();

  mintStatusCallback(`Deployed contract to ${contractAddr}`);

  const nftTokenBuilder = new NftTokenBuilder(
    nftContractBuilder.signer,
    contractAddr
  );

  // This can be any address you'd like to mint to
  const mintToAddress = await nftContractBuilder.signer.getAddress();

  mintStatusCallback(`Minting Token - ${contractAddr}`);
  const tokenID = await nftTokenBuilder
    .setImage(
      "ipfs://QmNoDT3M1FfF7d3Pd9DkBfzz8NxHueeudWBPe9owt1PnRM",
      "offchain"
    )
    .setAnimation(
      "ipfs://QmTwnLtm7TkmaYJFrYFvsupedP3n51vu6czmVKiED5GyAX",
      "offchain"
    )
    .setDesc(tokenDesc)
    .setName(tokenName)
    .setAttributes({ key: "value", otherKey: "value" })
    .mint(mintToAddress);

  console.log(`Minted token ${tokenID} to ${mintToAddress}`);

  const contractsByOwner = await client.getContractsByOwner(
    await nftContractBuilder.signer.getAddress(),
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

  let tokenMetadata = await nftTokenBuilder.getTokenMetadata(parseInt(tokenID));

  console.log(`Token Metadata: ${JSON.stringify(tokenMetadata, null, 2)}`);
  console.log(await nftContract.contractURI());

  return `https://1o1.art/${chainName}/token/${contractAddr}/${tokenID}`;
};
