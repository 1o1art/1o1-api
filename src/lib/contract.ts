import * as contracts from "../generated/typechain";
import { ethers } from "ethers";
import * as launcherConfig from "../config/deployed.json";
import { getLaunchEventFromLogs } from "./utils";
import { Cut, getZeroAddressStr } from "./facets";
import { getConfigById } from "./config";
import { CollectionMetadata, getEncodedContractMetadta } from "./collection";
export interface ContractMetadata {
  name?: string;
  symbol?: string;
  description?: string;
}

export const createSingleTxNFTContract = async (
  signer: ethers.Signer,
  cuts: Cut[],
  metadata: CollectionMetadata
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = getConfigById((await signer.getChainId()) as any);
  const LAUNCHER_CONTRACT_ADDRESS = launcherConfig[cfg.chainId].Diamond;
  const launcher = contracts.DiamondContractLauncherFacet__factory.connect(
    LAUNCHER_CONTRACT_ADDRESS,
    signer
  );

  const erc725 = contracts.ERC725YFacet__factory.connect(
    getZeroAddressStr(),
    signer
  );
  const encodedData = await getEncodedContractMetadta(metadata);

  const ownerAddr = await signer.getAddress();
  const nftAttr = await erc725.populateTransaction[
    "setData(bytes32[],bytes[])"
  ](encodedData.keys, encodedData.values);
  try {
    const result = await (
      await launcher[
        "launch(address,bytes20[],(address,uint8,bytes4[])[],(bool,address)[],bytes)"
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ](ownerAddr, [], cuts, [], nftAttr.data!)
    ).wait();

    const logs = getLaunchEventFromLogs(launcher, result.logs);
    return logs.contract;
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(e);
    throw e;
  }
};
