import { ethers } from "ethers";
import { getConfigByName } from "./config";
import {
  FacetRegistryEntryMetadata,
  fetchFacetData,
  fetchGlobalFacetData,
  getFacetIdFromAddresses,
  getFacets
} from "./facets";
import { getRegistries } from "./registries";
import globalDeployed from "../config/globalDeployed.json";
import facetsDB from "../metadata/facets.json";
import { IDiamondLoupe } from "../generated/typechain/DiamondLoupeFacet";

export const getAllFacetDataFromRegistry = async (
  chainName: string,
  provider: ethers.providers.JsonRpcProvider | ethers.Signer,
  registry: string
): Promise<FacetRegistryEntryMetadata[]> => {
  const facets = await getFacets(registry, provider);
  const registryFacetAddrs = facets.map(
    (f: { facetAddress: string }) => f.facetAddress
  );

  const facetIds = await getFacetIdFromAddresses(
    registryFacetAddrs,
    registry,
    provider
  );

  const facetIdToCut: Record<string, IDiamondLoupe.FacetStructOutput> = {};
  facetIds.forEach((f: string, idx: number) => {
    if (`0x${Buffer.from(new Uint8Array(20)).toString("hex")}` !== f)
      facetIdToCut[f] = facets[idx];
  });

  const customFacets = await fetchFacetData(registry, chainName, provider);
  const allFacets = customFacets.map((f) => {
    const selectors = facetIdToCut[f.id].functionSelectors;
    // filter duplicate selectors
    const functionSelectors = selectors.filter((_, idx) => {
      return selectors.indexOf(selectors[idx]) === idx;
    });
    return {
      ...f,
      facetAddress: facetIdToCut[f.id].facetAddress,
      functionSelectors
    };
  });
  return allFacets;
};

export const getAllFacets = async (
  chainName: string,
  ownerAddr: string
): Promise<{
  facets: FacetRegistryEntryMetadata[];
  personalRegistry?: string;
}> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = getConfigByName(chainName as any);
  const provider = new ethers.providers.JsonRpcBatchProvider(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.rpcHost
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalDiamond = (globalDeployed as any)[config.chainId as any].Diamond;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let facets = await getFacets(globalDiamond, provider);
  let globalFacetAddrs = facets.map(
    (f: { facetAddress: string }) => f.facetAddress
  );

  let facetIds = await getFacetIdFromAddresses(
    globalFacetAddrs,
    globalDiamond,
    provider
  );

  const facetIdToCut: Record<string, IDiamondLoupe.FacetStructOutput> = {};
  facetIds.forEach((f: string, idx: number) => {
    if (`0x${Buffer.from(new Uint8Array(20)).toString("hex")}` !== f)
      facetIdToCut[f] = facets[idx];
  });

  const globalFacets = await fetchGlobalFacetData(chainName, provider);
  const registries = await getRegistries(
    chainName,
    ownerAddr,
    provider,
    ethers.BigNumber.from(0),
    ethers.BigNumber.from(100),
    true
  );
  let customFacets: FacetRegistryEntryMetadata[] = [];
  if (registries[0] && registries[0].length > 0) {
    // TODO extend this to work for N registries and Imports

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    facets = await getFacets(registries[0][0], provider);
    globalFacetAddrs = facets.map(
      (f: { facetAddress: string }) => f.facetAddress
    );
    facetIds = await getFacetIdFromAddresses(
      globalFacetAddrs,
      registries[0][0],
      provider
    );
    facetIds.forEach((f: string, idx: number) => {
      facetIdToCut[f] = facets[idx];
    });
    customFacets = await fetchFacetData(registries[0][0], chainName, provider);
  }

  const allFacets = globalFacets.concat(customFacets).map((f) => {
    const selectors = facetIdToCut[f.id].functionSelectors;
    // filter duplicate selectors
    const functionSelectors = selectors.filter((_, idx) => {
      return selectors.indexOf(selectors[idx]) === idx;
    });
    return {
      ...f,
      facetAddress: facetIdToCut[f.id].facetAddress,
      functionSelectors
    };
  });
  return { facets: allFacets, personalRegistry: registries[0][0] };
};

export interface FacetAddressToEntryMetadata {
  [address: string]: FacetRegistryEntryMetadata;
}

// TODO enable this to work with custom categories
export const buildFacetAddressMap = (
  facets: FacetRegistryEntryMetadata[],
  ignoreCustom = false
): FacetAddressToEntryMetadata => {
  const facetAddressToEntry: FacetAddressToEntryMetadata = {};
  facets.forEach((f) => {
    if (ignoreCustom && f.category && f.category[0] === "custom") return;
    if (f.facetAddress) facetAddressToEntry[f.facetAddress] = f;
  });
  return facetAddressToEntry;
};

export const getFacetMetadataFromAddress = (
  address: string[],
  lookup: FacetAddressToEntryMetadata
): FacetRegistryEntryMetadata[] => {
  return address.map((addr) => lookup[addr]);
};

export const getContractFacets = async (
  contractAddr: string,
  chainName: string
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = getConfigByName(chainName as any);
  const provider = new ethers.providers.JsonRpcBatchProvider(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.rpcHost
  );
  const xx = getFacets(contractAddr, provider);
  return xx;
};
// returns just the metadata from the facet db via facet addresses
export const getFacetMetadataFromContract = async (
  contractAddr: string,
  chainName: string
): Promise<FacetRegistryEntryMetadata[]> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = getConfigByName(chainName as any);
  const provider = new ethers.providers.JsonRpcBatchProvider(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.rpcHost
  );
  // NOTE we'll need versioning here
  const facets = await getContractFacets(contractAddr, chainName);
  const facetIds = await getFacetIdFromAddresses(
    facets.map((f: { facetAddress: string }) => f.facetAddress),
    globalDeployed[config.chainId].Diamond,
    provider
  );
  return (
    facetIds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((facetId: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (facetsDB as any)[facetId] ? (facetsDB as any)[facetId] : null
      )
      .filter((f: string) => f !== null)
  );
};
