import ERC725, { ERC725JSONSchema } from "@erc725/erc725.js";
import { BigNumber, ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import {
  Version,
  getFacetVersionDataValue,
  getFacetVersionMetadataKey,
  getFacetVersionMetadataSchema,
  getFacetVersionMetadataSchemaDecode,
  packVersion,
  unpackVersion
} from "./facetVersion";
import {
  DiamondCutFacet__factory,
  DiamondLoupeFacet__factory,
  ERC725YFacet__factory,
  DiamondContractLauncherFacet__factory,
  RegisterDiamondCutFacet__factory
} from "@1o1art/1o1-contracts/build/typechain-types";
import { getConfigByName } from "./config";
import { facetsConfig } from "@1o1art/1o1-contracts";
import * as schemas from "./schemas";

export function getAllFacetIds() {
  return [
    "ERC721BaseFacet",
    "OwnershipFacet",
    "DiamondLoupeFacet",
    "Metadata",
    "ERC725YFacet",
    "OurDelegatableFacet"
  ].map(getGlobalFacetIdFromName);
}

export interface RegisterFacetData {
  name: string; // this is a logical name
  id?: string; // this is the facet id uint32 auto increment assigned namespaced by address
  desc?: string; // this is a logical description
  addr: string;
  abi?: string; // adds the abi to be able to cut the facet
}

export interface FacetPreset {
  name: string;
  desc: string;
  features: string;
  facets: string[];
  version?: {
    major: number;
    minor: number;
    patch: number;
  };
}

export type FacetCategory = "admin" | "utility" | "media" | "all" | "custom";

export type ContractActions =
  | "transferOwnership"
  | "onChainImageContractMetadata"
  | "delegate"
  | "royalty"
  | "facets";
export type ClaimActions = "editClaim";
export type TokenActions = "onChainImageMetadata";
export type MintActions = "onChainImageMint" | "claimImageMint";

export interface FacetRegistryEntryMetadata {
  name: string;
  desc: string;
  id: string;
  version?: Version;
  type: "essential" | "non-essential";
  category: FacetCategory[];
  contractActions?: ContractActions[];
  tokenActions?: TokenActions[];
  mintActions?: MintActions[];
  claimActions?: ClaimActions[];
  registryAddress?: string; // this is sometimes dynamically set
  facetAddress?: string; // this is sometimes dynamically set
  functionSelectors?: string[]; // this is actually all the 4bytes selectors
  hidden?: boolean;
}

export interface FacetResolutionData {
  registryAddr: string[];
  facetRegistryMetadata: FacetRegistryEntryMetadata[];
}

export interface FacetRegistryEntry {
  name: string;
  id: string;
}

// const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }
export enum FacetCutAction {
  Add = 0,
  Replace = 1,
  Remove = 2
}

export interface Cut {
  facetAddress: string;
  action: FacetCutAction;
  functionSelectors: string[];
}

export interface FacetCut {
  name: string;
  cut: Cut;
}

export interface RegisterNameCut {
  id: Uint8Array;
  name: string;
  facetCut: Cut;
}

export interface RegisterCut {
  id: Uint8Array;
  facetCut: Cut;
}

export function getFacetNames(facetIds: Set<string>): string[] {
  return Array.from(facetIds)
    .map((id) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entry = (facetsConfig as any)[id];
      return entry ? entry.name : null;
    })
    .filter((f) => f !== null);
}

export function createFacetCutFromAbi(
  name: string,
  abi: string,
  facetAddr: string,
  operation: FacetCutAction
) {
  const cut: Cut = {
    action: operation,
    functionSelectors: [],
    facetAddress: facetAddr
  };
  const abiInterface = new ethers.utils.Interface(abi);
  abiInterface.fragments.forEach((fragment) => {
    if (fragment.type === "function") {
      cut.functionSelectors.push(abiInterface.getSighash(fragment));
    }
  });
  return { name, cut };
}

export function getZeroAddressStr() {
  return `0x${Buffer.from(new Uint8Array(20)).toString("hex")}`;
}

export function getZeroAddress(): Uint8Array {
  return new Uint8Array(20);
}
export function getZeroFacetId(): Uint8Array {
  return new Uint8Array(20);
}

//assumes 0x prefix
export function convertFacetIdStringToUint8Array(id: string): Uint8Array {
  return Uint8Array.from(Buffer.from(id.slice(2), "hex")).slice(0, 20);
}
// creates a register facet cut that will 0x0 an id if one is not given
export function createRegisterFacetCutFromAbi(
  name: string,
  abi: string,
  facetAddr: string,
  operation: FacetCutAction,
  id?: string
): RegisterNameCut {
  const cut: Cut = {
    action: operation,
    functionSelectors: [],
    facetAddress: facetAddr
  };
  const abiInterface = new ethers.utils.Interface(abi);
  abiInterface.fragments.forEach((fragment) => {
    if (fragment.type === "function") {
      cut.functionSelectors.push(abiInterface.getSighash(fragment));
    }
  });
  let facetId = getZeroFacetId();
  if (id) facetId = convertFacetIdStringToUint8Array(id);
  return { name, facetCut: cut, id: facetId };
}

// Cut a diamond with specified facets
export async function simpleDiamondCut(
  diamondAddr: string,
  cuts: Cut[],
  signer: ethers.Signer
) {
  const diamondCut = await DiamondCutFacet__factory.connect(
    diamondAddr,
    signer
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zeroAddress = "0x" + Buffer.from(new Uint8Array(20)).toString("hex");
  const tx = await diamondCut.diamondCut(cuts, zeroAddress, "0x");
  // const DiamondInit = await ethers.getContractFactory('DiamondInit')
  // Cut the Diamond
  //  const tx = await diamondCut.diamondCutRegister(cuts, diamondInitAddr, functionCall)
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
}

// Cut a diamond with specified facets
export async function simpleDiamondCutRegister(
  diamondAddr: string,
  cuts: RegisterCut[],
  signer: ethers.Signer
) {
  const diamondCut = await RegisterDiamondCutFacet__factory.connect(
    diamondAddr,
    signer
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zeroAddress = "0x" + Buffer.from(new Uint8Array(20)).toString("hex");
  const tx = await diamondCut.diamondCutRegister(cuts, zeroAddress, "0x");
  // const DiamondInit = await ethers.getContractFactory('DiamondInit')
  // Cut the Diamond
  console.log("fired transaction");
  //  const tx = await diamondCut.diamondCutRegister(cuts, diamondInitAddr, functionCall)
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
}

export async function fetchFacetData(
  diamondAddr: string,
  chainName: string,
  provider: ethers.providers.JsonRpcProvider | ethers.Signer
): Promise<FacetRegistryEntryMetadata[]> {
  const facets = await fetchGlobalDiamondFacets(diamondAddr, provider);
  const facetAddrs = facets.map((f) => f.facetAddress);
  return getBaseFacetDataFrom725(diamondAddr, provider, facetAddrs);
}

export async function fetchGlobalFacetData(
  chainName: string,
  provider: ethers.providers.JsonRpcProvider | ethers.Signer
): Promise<FacetRegistryEntryMetadata[]> {
  const addr = getConfigByName(chainName).nftLauncherAddr;
  const nftLauncher = DiamondContractLauncherFacet__factory.connect(
    addr,
    provider
  );
  const globalDiamondProxies =
    await nftLauncher.getLauncherGlobalDiamondProxy();
  const globalProxy = globalDiamondProxies[0];
  const facets = await fetchGlobalDiamondFacets(
    globalProxy.diamondAddress,
    provider
  );
  const facetAddrs = facets.map((f) => f.facetAddress);
  const result = await getBaseFacetDataFrom725(
    globalProxy.diamondAddress,
    provider,
    facetAddrs
  );
  // global should have no custom categori
  return result.filter((f) => f.category != "custom");
}

export async function fetchGlobalDiamondFacets(
  diamondAddr: string,
  provider: ethers.providers.JsonRpcProvider | ethers.Signer
) {
  const diamondLoupe = DiamondLoupeFacet__factory.connect(
    diamondAddr,
    provider
  );
  return diamondLoupe.facets();
}

export function getGlobalFacetIdFromName(facetName: string): Uint8Array {
  const xx = keccak256(Buffer.from(`101.global.${facetName}`));
  return Uint8Array.from(Buffer.from(xx.slice(2), "hex")).slice(0, 20);
}

export const getFacetMetadataKey = (
  key: schemas.FACET_SCHEMA_TYPE,
  facetAddress: string
) => {
  return ERC725.encodeKeyName(key, facetAddress);
};

// Assumes 0x prefix for facetAddress
export const getFacetMetadataSchemaDecode = (
  key: schemas.FACET_SCHEMA_TYPE,
  facetAddress: string
) => {
  const keyNameSplit = key.split(":"); // LSP5ReceivedAssetsMap:<address>
  const encodedKey = ethers.utils
    .keccak256(ethers.utils.toUtf8Bytes(keyNameSplit[0]))
    .slice(0, 22);
  return {
    name: `${keyNameSplit[0]}:${facetAddress.slice(2)}`,
    // the address is ethererum adddress cameled but needs to be lowercased
    key: `${encodedKey}0000${facetAddress.slice(2).toLowerCase()}`,
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String"
  };
};

export const getFacetMetadataSchema = (key: schemas.FACET_SCHEMA_TYPE) => {
  const keyNameSplit = key.split(":"); // LSP5ReceivedAssetsMap:<address>
  const encodedKey = ethers.utils
    .keccak256(ethers.utils.toUtf8Bytes(keyNameSplit[0]))
    .slice(0, 22);
  return {
    name: key,
    key: `${encodedKey}0000<address>`,
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String"
  };
};

export const getFacetDataValue = (
  keyName: schemas.FACET_SCHEMA_TYPE,
  dynamicPart: string,
  value: string
) => {
  return {
    keyName,
    dynamicKeyParts: dynamicPart,
    value
  };
};

export interface FacetData {
  name: string;
  id: string;
  version?: Version;
}
// TODO type properly
export const encodeBaseFacetMetadata = (
  facetAddresess: string[],
  data: Partial<FacetData>[]
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schs: any = [];
  const sch = getFacetMetadataSchema(schemas.FacetMetadata);
  facetAddresess.forEach((facetAddress, i) => {
    const { name, id } = data[i];
    values.push(
      getFacetDataValue(
        schemas.FacetMetadata,
        facetAddress,
        JSON.stringify({ name, id })
      )
    );
    schs.push(sch);
  });

  const schv = getFacetVersionMetadataSchema(schemas.FacetVersionMetadata);

  facetAddresess.forEach((facetAddress, i) => {
    values.push(
      getFacetVersionDataValue(
        schemas.FacetVersionMetadata,
        facetAddress,
        data[i].version != undefined
          ? ethers.utils.hexZeroPad(
              packVersion(data[i].version).toHexString(),
              32
            )
          : "0x0"
      )
    );
    schs.push(schv);
  });
  return ERC725.encodeData(values, schs);
};

export const updateBaseFacetData = async (
  contract: string,
  facetAddress: string[],
  data: FacetData[],
  provider: ethers.Signer
) => {
  const erc725 = ERC725YFacet__factory.connect(contract, provider);
  const encoded = encodeBaseFacetMetadata(facetAddress, data);
  try {
    await (
      await erc725["setData(bytes32[],bytes[])"](encoded.keys, encoded.values)
    ).wait();
  } catch (e) {
    console.log(e);
  }
};
export const getFacetDataFrom725 = async (
  contract: string,
  provider: ethers.providers.JsonRpcProvider | ethers.Signer,
  facetAddresses: string[]
) => {
  getBaseFacetDataFrom725(contract, provider, facetAddresses);
};

export function calculate4BytePrefix(functionSignature: string) {
  const functionHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(functionSignature)
  );
  const fourBytePrefix = functionHash.slice(0, 10); // Take the first 4 bytes (8 hex characters) and the '0x' prefix
  return fourBytePrefix;
}

// Safe get facet version
export const getFacetVersion = async (
  diamondRegistryContract: string,
  contract: string,
  fourBytePrefix: string,
  provider: ethers.providers.JsonRpcProvider | ethers.Signer
): Promise<Version> => {
  const loupe = DiamondLoupeFacet__factory.connect(contract, provider);
  const facetAddr = await loupe.facetAddress(fourBytePrefix);
  try {
    const erc725 = ERC725YFacet__factory.connect(
      diamondRegistryContract,
      provider
    );
    const versionKey = getFacetVersionMetadataKey(
      schemas.FacetVersionMetadata,
      facetAddr
    );
    const versionResult = await erc725["getData(bytes32)"](versionKey);
    BigNumber.from(versionResult);
    return unpackVersion(BigNumber.from(versionResult));
  } catch (e) {
    console.log(e);
    console.log("version not found for", facetAddr);
  }
  return { major: 0, minor: 0, patch: 0 };
};

export const getBaseFacetDataFrom725 = async (
  contract: string,
  provider: ethers.providers.JsonRpcProvider | ethers.Signer,
  facetAddresses: string[]
) => {
  const erc725 = ERC725YFacet__factory.connect(contract, provider);
  const keys = facetAddresses.map((facetAddress) => {
    return getFacetMetadataKey(schemas.FacetMetadata, facetAddress);
  });
  const facetIds = await getFacetIdFromAddresses(
    facetAddresses,
    contract,
    provider
  );

  // Add all the version keys
  const versionKeys = facetAddresses.map((facetAddress) => {
    return getFacetVersionMetadataKey(
      schemas.FacetVersionMetadata,
      facetAddress
    );
  });

  const results = await erc725["getData(bytes32[])"](keys);
  const dataInputs = results.map((r, i) => ({
    keyName: keys[i],
    value: r
  }));
  const versionResults = await erc725["getData(bytes32[])"](versionKeys);
  const versionDataInputs = versionResults.map((r, i) => ({
    keyName: versionKeys[i],
    value: r
  }));

  // repeate entry in an array
  const schemae = facetAddresses.map((facetAddress) =>
    getFacetMetadataSchemaDecode(schemas.FacetMetadata, facetAddress)
  );
  const versionSchemae = facetAddresses.map((facetAddress) => {
    return getFacetVersionMetadataSchemaDecode(
      schemas.FacetVersionMetadata,
      facetAddress
    );
  });

  const decodeSchemas = schemae as ERC725JSONSchema[];
  const decodedMetadata = ERC725.decodeData(dataInputs, decodeSchemas);
  // TODO reevaluate this it seems to map facetNames to facet values the two may not be unique
  // in order to do this and may need to be changed to return an array vs an object
  const meta = decodedMetadata.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc: { [x: string]: any }, { name, value }: any) => {
      acc[name] = value;
      return acc;
    },
    {}
  );
  const decodedVersion = ERC725.decodeData(
    versionDataInputs,
    versionSchemae as ERC725JSONSchema[]
  );
  const versionMeta = decodedVersion.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc: { [x: string]: any }, { name, value }: any) => {
      acc[name] = value;
      return acc;
    }
  );
  const versionLookup = {} as Record<string, Version>;

  facetIds.forEach((f, i) => {
    const versionKey = getFacetVersionMetadataSchemaDecode(
      schemas.FacetVersionMetadata,
      facetAddresses[i]
    ).name;

    const entryValue = versionMeta[versionKey] || 0;
    versionLookup[f] = unpackVersion(BigNumber.from(entryValue));
  });
  return (
    Object.entries(meta)
      .filter(([, value]) => value !== null)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      .map(([, value]: [string, any]) => {
        const entry = JSON.parse(value) as FacetRegistryEntry;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rest = (facetsConfig as any)[entry.id]
          ? {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: (facetsConfig as any)[entry.id].category,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              desc: (facetsConfig as any)[entry.id].desc,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(facetsConfig as any)[entry.id]
            }
          : { category: ["custom"], desc: "", type: "non-essential" };
        return {
          ...entry,
          ...rest,
          version: versionLookup[entry.id],
          registryAddress: contract
        };
      })
  );
};

export const getFacets = async (
  diamondAddress: string,
  providerOrSigner: ethers.providers.JsonRpcProvider | ethers.Signer
) => {
  const diamondLoupe = DiamondLoupeFacet__factory.connect(
    diamondAddress,
    providerOrSigner
  );
  return diamondLoupe.facets();
};

export const getFacetIdFromAddresses = async (
  addresses: string[],
  diamondAddress: string,
  signerOrProvier: ethers.Signer | ethers.providers.JsonRpcProvider
) => {
  const rDiamond = DiamondLoupeFacet__factory.connect(
    diamondAddress,
    signerOrProvier
  );
  return rDiamond.facetIdsFromAddresses(addresses);
};

export type ActionKey =
  | "contractActions"
  | "tokenActions"
  | "mintActions"
  | "claimActions";
export const getActionsFromMetadata = (
  metadata: FacetRegistryEntryMetadata[],
  action: ActionKey
): string[] => {
  const allActions = metadata.reduce((acc: string[], md) => {
    const mtd = md[action] || [];
    return [...acc, ...mtd];
  }, []);
  return allActions.filter((v, i, a) => a.indexOf(v) === i);
};

export const getFacetSelectionKey = (facet: FacetRegistryEntryMetadata) =>
  `${facet.id}-${facet.registryAddress}`;
