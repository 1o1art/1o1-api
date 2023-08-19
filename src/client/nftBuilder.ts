import { ethers } from "ethers";
import { ImageType } from "../types";
import { createSingleTxNFTContract } from "../lib/contract";
import { TokenData, TokenMetadata, updateTokenData } from "../lib/token";
import { Cut, FacetCutAction, getFacets } from "../lib/facets";
import { mintTokenWithResult } from "../lib/macro";
import { updateFacets } from "../lib/facetUtils";
import { setContractMetadata } from "../lib/collection";
import { contracts, config } from "@1o1art/1o1-contracts";
import { convertTokenUriData } from "../lib/utils";
import { token } from "../lib";

export interface ContractMetadata {
  name: string;
  symbol: string;
  description: string;
}

export class NftContractBuilder {
  metadata: ContractMetadata = {
    name: "",
    symbol: "",
    description: ""
  };
  facets: Cut[] = [];
  image = "";
  imageType?: ImageType;
  signer: ethers.Wallet;
  cfg: config.Config;

  constructor(signer: ethers.Wallet, cfg: config.Config) {
    this.signer = signer;
    this.cfg = cfg;
  }

  setMetadata(metadata: ContractMetadata) {
    this.metadata = metadata;
    return this;
  }

  setFacets(facets: Cut[]) {
    this.facets = facets;
    return this;
  }

  setImage(imageStr: string, imageType: ImageType) {
    this.image = imageStr;
    this.imageType = imageType;
    return this;
  }

  // update the facets
  async updateFacets(contractAddr: string, facetCuts: Cut[]) {
    await updateFacets(contractAddr, this.signer, facetCuts);
    const facets = await getFacets(contractAddr, this.signer);
    facets[0].facetAddress;
    this.facets = facets.map((f) => ({ ...f, action: FacetCutAction.Add }));
  }

  async updateMetadata(contractAddr: string, metadata: ContractMetadata) {
    await setContractMetadata(this.signer, contractAddr, metadata);
    this.metadata = metadata;
  }

  async deploy() {
    return createSingleTxNFTContract(this.signer, this.facets, this.metadata);
  }
}

export class NftTokenBuilder {
  signer: ethers.Wallet;
  addr: string;
  animation = "";
  animationType?: ImageType;
  image = "";
  imageType?: ImageType;
  metadata: Partial<TokenData> = {};

  constructor(signer: ethers.Wallet, addr: string) {
    this.signer = signer;
    this.addr = addr;
  }

  setAnimation(animation: string, imageType: ImageType) {
    this.animation = animation;
    this.animationType = imageType;
    return this;
  }
  setImage(imageStr: string, imageType: ImageType) {
    this.image = imageStr;
    this.imageType = imageType;
    return this;
  }
  setName(name: string) {
    this.metadata.tokenName = name;
    return this;
  }
  setDesc(description: string) {
    this.metadata.tokenDescription = description;
    return this;
  }

  setAttributes(attributes: Record<string, string>) {
    const attrs = Object.keys(attributes).map((key) => {
      return { trait_type: key, value: attributes[key] };
    });
    this.metadata.tokenAttributes = attrs;
    return this;
  }

  async mint(toAddr: string) {
    const imageMethod = this.imageType === "offchain" ? 2 : 1;
    const animMethod = this.imageType === "offchain" ? 2 : 1;
    const result = await mintTokenWithResult(
      this.addr,
      this.image,
      this.animation,
      imageMethod,
      animMethod,
      this.signer,
      this.metadata,
      toAddr
    );
    return result.tokenId;
  }

  async getTokenMetadata(tokenId: number): Promise<Partial<TokenMetadata>> {
    const nftContract = contracts.ERC721TokenBaseFacet__factory.connect(
      this.addr,
      this.signer
    );
    const tokenURIBase64Encoded = await nftContract.tokenURI(tokenId);
    const tokenMetadata = JSON.parse(
      convertTokenUriData(tokenURIBase64Encoded)
    ) as token.TokenMetadata;

    return tokenMetadata;
  }

  async updateMetadata(tokenId: number, metadata: Partial<TokenData>) {
    await updateTokenData(tokenId, this.addr, metadata, this.signer);
    this.metadata = metadata;
    return this.metadata;
  }
}
