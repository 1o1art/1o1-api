import { ethers } from "ethers";
import { ImageType } from "../types";
import { createSingleTxNFTContract } from "../lib/contract";
import * as config from "../config";
import { TokenData, updateTokenData } from "../lib/token";
import { Cut } from "../lib/facets";
import { mintTokenWithResult } from "../lib/macro";

export interface ContractMetadata {
  name: string;
  symbol: string;
  description: string;
}

export class NftContractBuilder {
  metadata = {};
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

  async deploy() {
    return createSingleTxNFTContract(this.signer, this.facets, this.metadata);
    // const addr = await createSingleTxNFTContract(signer,[],metadata);
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
  async updateMetadata(tokenId: number, metadata: Partial<TokenData>) {
    //NOTE this sets the data, missing fields are considered empty
    await updateTokenData(tokenId, this.addr, metadata, this.signer);
    this.metadata = metadata;
    return this.metadata;
  }
}
