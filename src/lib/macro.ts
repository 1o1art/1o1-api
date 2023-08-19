import { BigNumber, ethers } from "ethers";
import { contracts } from "@1o1art/1o1-contracts";
import { LibDiamond } from "@1o1art/1o1-contracts/build/typechain-types/contracts/libraries/LibDiamond";
import { Cut, calculate4BytePrefix, getFacetVersion } from "../lib/facets";
import {
  convertTokenUriData,
  getLaunchEventFromLogs,
  getMintEventFromLogs
} from "./utils";
import { packVersion } from "./facetVersion";
import { registryDeployed as globalDeployed } from "@1o1art/1o1-contracts";
import { getConfigById } from "./config";
import { prepareCallDataWithIndex, generatePlaceholder } from "./multi";
import { TokenData, encodeTokenData } from "./token";

export const createContract = async (
  launchAddress: string,
  facetIds: Uint8Array[],
  facetCuts: Cut[],
  proxies: LibDiamond.GlobalDiamondProxyStruct[],
  signer: ethers.Signer
): Promise<string> => {
  const nftLauncher = contracts.DiamondContractLauncherFacet__factory.connect(
    launchAddress,
    signer
  );
  const signerAddr = await signer.getAddress();
  const result = await (
    await nftLauncher[
      "launch(address,bytes20[],(address,uint8,bytes4[])[],(bool,address)[],bytes)"
    ](signerAddr, facetIds, facetCuts, proxies, "0x0")
  ).wait();

  const logs = getLaunchEventFromLogs(nftLauncher, result.logs);
  return logs.contract;
};

export enum MintType {
  RAW = 0,
  RAW_LARGE = 1,
  OFFCHAIN = 2,
  HTML = 3
}

export const get721FacetVersion = async (
  signer: ethers.Signer,
  contract: string
) => {
  const config = getConfigById(await signer.getChainId());
  const tokenPrefix = calculate4BytePrefix("tokenURI(uint256)");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalDiamond = (globalDeployed as any)[config.chainId as any].Diamond;
  return getFacetVersion(globalDiamond, contract, tokenPrefix, signer);
};

// TODO fix mint type to support all variations
// onchain , offchain
// offchain, offchain
// offchain, onchain
// onchain, offchain
export const mintTokenWithResult = async (
  nftContractAddr: string,
  imageData: string,
  animationData: string,
  imageType: MintType,
  animationType: MintType,
  signer: ethers.Signer,
  tokenData: Partial<TokenData>,
  toAddress?: string
) => {
  const nftContract = contracts.ERC721TokenBaseFacet__factory.connect(
    nftContractAddr,
    signer
  );
  let result;
  const version = await get721FacetVersion(signer, nftContractAddr);

  if (packVersion(version).lte(0)) {
    throw new Error(
      "This contract is not compatible with this version of the SDK"
    );
  } else {
    switch (imageType) {
      default:
        const multi = contracts.MulticallFacet__factory.connect(
          nftContractAddr,
          signer
        );
        const callDataList = [];
        const callIndexList = [];
        let imageBoundaries = await nftContract.getTokenChunkBoundaries(
          imageData.length
        );
        imageBoundaries = imageBoundaries.length
          ? imageBoundaries
          : [BigNumber.from(0)];
        let animBoundaries = await nftContract.getTokenChunkBoundaries(
          animationData.length
        );
        animBoundaries = animBoundaries.length
          ? animBoundaries
          : [BigNumber.from(0)];

        const mintCallData = await nftContract.populateTransaction.mint(
          imageData.slice(0, imageBoundaries[0].toNumber()),
          animationData.slice(0, animBoundaries[0].toNumber()),
          imageType,
          animationType,
          toAddress || (await signer.getAddress()),
          imageData.length,
          animationData.length
        );
        callDataList.push(mintCallData.data || "");
        callIndexList.push(0);

        let start = imageBoundaries[0].toNumber();
        for (let i = 1; i < imageBoundaries.length; i++) {
          // if last chunk then end is length of string
          const end =
            i === imageBoundaries.length - 1
              ? imageData.length
              : imageBoundaries[i + 1].add(start).toNumber();

          callDataList.push(
            (await nftContract.populateTransaction.totalSupply()).data || ""
          );
          callIndexList.push(0);
          const subTempCallData = await multi.populateTransaction.sub(
            generatePlaceholder(nftContract, "totalSupply()"),
            1
          );
          const { callData, index } = prepareCallDataWithIndex(
            multi,
            subTempCallData,
            0
          );
          callDataList.push(callData);
          callIndexList.push(index);
          const subResultPlaceholder = generatePlaceholder(
            multi,
            "sub(uint256,uint256)"
          );
          const subTempChunkCallData = await nftContract.populateTransaction[
            "addTokenImageChunk(uint256,string,uint256)"
          ](subResultPlaceholder, imageData.slice(start, end), i);
          const result = prepareCallDataWithIndex(
            nftContract,
            subTempChunkCallData,
            0
          );
          callDataList.push(result.callData);
          callIndexList.push(result.index);
          start = end;
        }
        callDataList.push(
          (await nftContract.populateTransaction.totalSupply()).data || ""
        );
        callIndexList.push(0);
        const subTempCallData = await multi.populateTransaction.sub(
          generatePlaceholder(nftContract, "totalSupply()"),
          1
        );
        const { callData, index } = prepareCallDataWithIndex(
          multi,
          subTempCallData,
          0
        );
        callDataList.push(callData);
        callIndexList.push(index);

        const subResultPlaceholder = generatePlaceholder(
          multi,
          "sub(uint256,uint256)"
        );

        const encodedData = encodeTokenData(99, tokenData);
        const subTempChunkCallData =
          await nftContract.populateTransaction.setTokenMetadata(
            subResultPlaceholder,
            encodedData.keys,
            encodedData.values
          );
        result = prepareCallDataWithIndex(nftContract, subTempChunkCallData, 0);
        callDataList.push(result.callData);
        callIndexList.push(result.index);

        result = await (
          await multi.multicallThen(callDataList, callIndexList)
        ).wait();
    }
  }
  const val = await getMintEventFromLogs(nftContract, result.logs);
  const rawMd = await nftContract.tokenURI(val.tokenId);
  const md = convertTokenUriData(rawMd);
  return { tokenId: val.tokenId, metadata: md };
};
