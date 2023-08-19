import { ERC725 } from "@erc725/erc725.js";
import { ethers } from "ethers";
import { base64, EventFragment } from "ethers/lib/utils";
import { contracts } from "@1o1art/1o1-contracts";
import { SCHEMAS } from "./schemas";
import mime from "mime-types";
import chainList from "../metadata/chains.json";

export type ListResults = [string[], ethers.BigNumber];

export function parseListResult(result: ListResults): string[] {
  const [values, size] = result;
  const parsedList: string[] = [];
  const len = size.toNumber();
  for (let i = 0; i < len; i++) {
    parsedList.push(values[i]);
  }
  return parsedList;
}

export function getSingleEventFromTxLog(
  event: EventFragment,
  logs: ethers.providers.Log[],
  abiInterface: ethers.utils.Interface
): ethers.utils.LogDescription {
  for (const log of logs) {
    try {
      const logDesc = abiInterface.parseLog(log);
      if (event.name === logDesc.name) {
        return logDesc;
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
  throw new Error("Could not find event");
}

interface Mint {
  from: string;
  to: string;
  tokenId: string;
}

interface Launch {
  contract: string;
  owner: string;
}
interface ClaimCreate {
  creator: string;
  claimId: string;
}

export const sortByOrder = (arr: string[], order: string[]): string[] => {
  const sorted = [];
  for (const o of order) {
    if (arr.includes(o)) {
      sorted.push(o);
    }
  }
  return sorted;
};
export function getClaimEventFromLogs(
  claimFacet: contracts.ClaimsFacet,
  logs: ethers.providers.Log[]
): ClaimCreate {
  const eventDesc =
    claimFacet.interface.events["ClaimCreated(address,uint256)"];
  const result = getSingleEventFromTxLog(eventDesc, logs, claimFacet.interface);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { creator, claimId } = result.args as any;
  // TODO not javascript restriction of 2^54
  return { creator, claimId: claimId.toString() };
}

export function getMintEventFromLogs(
  customTokenFacet: contracts.ERC721TokenBaseFacet,
  logs: ethers.providers.Log[]
): Mint {
  const eventDesc =
    customTokenFacet.interface.events["Transfer(address,address,uint256)"];
  const result = getSingleEventFromTxLog(
    eventDesc,
    logs,
    customTokenFacet.interface
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { from, to, tokenId } = result.args as any;
  // TODO not javascript restriction of 2^54
  return { from, to, tokenId: tokenId.toString() };
}

export function getLaunchEventFromLogs(
  nftLauncherFacet: contracts.DiamondContractLauncherFacet,
  logs: ethers.providers.Log[]
): Launch {
  const eventDesc =
    nftLauncherFacet.interface.events["Launch(address,address)"];
  const result = getSingleEventFromTxLog(
    eventDesc,
    logs,
    nftLauncherFacet.interface
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { addr, owner } = result.args as any;
  return { contract: addr, owner };
}

export interface CollectionData {
  CollectionName: string;
  CollectionImage: string;
  CollectionSymbol: string;
  CollectionDescription: string;
  CollectionFeeBasisPoints: string;
  CollectionFeeRecipient: string;
  CollectionExternalLink: string;
  CollectionAddr: string;
}

export const fetchOwner = async (
  contractAddr: string,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
) => {
  const ownership = contracts.OwnershipFacet__factory.connect(
    contractAddr,
    signerOrProvider
  );
  const owner = await ownership.owner();
  return owner;
};

// TODO refactor to strongly type across software boundaries contract/vs json file vs 725 storage
export const getAllCollectionData = async (
  collectionAddr: string,
  providerOrSigner: ethers.Signer | ethers.providers.Provider
): Promise<Partial<CollectionData>> => {
  const storageFactory = contracts.ERC725YFacet__factory.connect(
    collectionAddr,
    providerOrSigner
  );
  const results = await storageFactory["getData(bytes32[])"](
    SCHEMAS.map((s) => s.key)
  );

  const dataInputs = results.map((r, i) => ({
    keyName: SCHEMAS[i].key,
    value: r
  }));
  const decodedRes = ERC725.decodeData(dataInputs, SCHEMAS);
  const result: Partial<CollectionData> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodedRes.forEach((res: { name: string | number; value: any }) => {
    result[res.name as keyof CollectionData] = res.value;
  });
  result["CollectionAddr"] = collectionAddr;
  return result;
};

export const convertTokenUriData = (tokenUriData: string): string => {
  const splitter = "data:application/json;base64,";
  return Buffer.from(base64.decode(tokenUriData.split(splitter)[1])).toString();
};

export const encodeDataURL = (data: Uint8Array, fileName: string) => {
  const contentPrefix = mime.contentType(fileName);
  const base64Data = base64.encode(data);
  return `data:${contentPrefix};base64,${base64Data}`;
};

export const getResolvedImage = (image?: string): string => {
  return image && image.startsWith("ipfs://")
    ? image.replace("ipfs://", "https://storage.swapp.land/ipfs/")
    : image ||
        "https://user-images.githubusercontent.com/173187/195733918-88800674-15c8-4ddd-9fd9-65d33c166b16.png";
};

export const scaleImage = (base64Image: string) => {
  const scaled =
    '<svg id="svg" xmlns="http://www.w3.org/2000/svg" ' +
    'preserveAspectRatio="xMinYMin meet" viewBox="0 0 1560 1560" width="1600" height="1600" ' +
    'style="image-rendering:-webkit-optimize-contrast;-ms-interpolation-mode:nearest-neighbor;image-rendering:-moz-crisp-edges;image-rendering:pixelated;' +
    "background-repeat:no-repeat;background-position:center;background-size:contain;" +
    `background-image:url(${base64Image})"/>`;
  const result = `data:image/svg+xml;base64,${Buffer.from(scaled).toString(
    "base64"
  )}`;
  return result;
};

export const convertLocaleDateToYYMMDD = (localDate: Date) => {
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  const hours = String(localDate.getHours()).padStart(2, "0");
  const minutes = String(localDate.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const getCurrentLocaleDate = (): Date => {
  return new Date(new Date().toLocaleString());
};
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Chain {
  name: string;
  chain: string;
  icon: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  chainId: number;
  explorers: [
    {
      name: string;
      url: string;
      standard: string;
    }
  ];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chainMap = {} as any;
const buildChainMap = () => {
  chainList.forEach((chain) => {
    chainMap[chain.chainId] = chain;
  });
};
buildChainMap();
export const getCurrentCurrency = (chainId: number) => {
  if (chainMap[chainId] === undefined) return "unknown";
  return chainMap[chainId].nativeCurrency.symbol;
};
