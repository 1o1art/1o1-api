import { BigNumber, ethers } from "ethers";
import * as contracts from "../generated/typechain";
// Registries are diamond contracts that are used to group together and label/package facets,
// There can be multiple registries, which can be useful for sharing, but initially, there will
// only be one registry. Users can use this to add facets to to be able to use them in
// all their projects. The registry will be deployed like a regular diamond, but support
// 725Y and Ownership. This acts as a store for updating facets, etc... .

import { getConfigByName } from "./config";
import { getSingleEventFromTxLog } from "./utils";

export const getRegistries = async (
  chainName: string,
  ownerAddr: string,
  providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer,
  offset: BigNumber,
  limit: BigNumber,
  asc: boolean
): Promise<[string[], BigNumber, BigNumber]> => {
  const config = getConfigByName(chainName);
  const launcherFacet = contracts.DiamondContractLauncherFacet__factory.connect(
    config.nftLauncherAddr,
    providerOrSigner
  );
  return launcherFacet.getRegistriesByOwner(ownerAddr, offset, limit, asc);
};

interface LaunchRegistry {
  contract: string;
  owner: string;
}

export function getLaunchRegistryEventFromLogs(
  nftLauncherFacet: contracts.DiamondContractLauncherFacet,
  logs: ethers.providers.Log[]
): LaunchRegistry {
  const eventDesc =
    nftLauncherFacet.interface.events["LaunchRegistry(address,address)"];
  const result = getSingleEventFromTxLog(
    eventDesc,
    logs,
    nftLauncherFacet.interface
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { addr, owner } = result.args as any;
  return { contract: addr, owner };
}

// TODO allow this to be local only as well.
// TODO improve the linkage here for the registry it's hard to find the set
// of facets that are in the registry. that in by default
// the registy also is the one that auto updates for the core facets
// so it's a bit of a special case.
export const launchRegistry = async (
  chainName: string,
  providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer
): Promise<LaunchRegistry> => {
  const config = getConfigByName(chainName);
  const launcherFacet = contracts.DiamondContractLauncherFacet__factory.connect(
    config.nftLauncherAddr,
    providerOrSigner
  );
  const launchFacets = [
    "0x0399ea5ce51a43c87c904a74023c21dd745d33e2", // 725YFacet
    "0xea467363461e9f3976505e66bb39099237360286", // OwnershipFacet
    "0x07427ab8ea58e3aeeae569651f26ad6c6b8436c8", // Diamond Loupe Facet
    "0xfc70768cd1027e789fa09436c075573d30763d81" // Diamond Cut Register Facet
  ];

  const registryLogs = await (
    await launcherFacet.launchRegistry(launchFacets)
  ).wait();
  return getLaunchRegistryEventFromLogs(launcherFacet, registryLogs.logs);
};
