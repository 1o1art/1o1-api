import { ethers } from "ethers";
import { SCHEMAS, SCHEMAS_BY_NAME, SCHEMA_TYPE } from "./schemas";
import { ERC725, ERC725JSONSchema } from "@erc725/erc725.js";
import {contracts} from "@1o1art/1o1-contracts";

export interface ContractRoyaltyData {
  royaltyReceiver: string;
  royaltyAmount: number;
  openseaEnabled: boolean;
}

export interface CollectionMetadata {
  description?: string;
  name?: string;
  symbol?: string;
  image?: string;
  externalLink?: string;
  collectionFeeBasisPoints?: string;
  collectionFeeRecipient?: string;
}

export interface CollectionData {
  CollectionName: string;
  CollectionImage: string;
  CollectionSymbol: string;
  CollectionDescription: string;
  CollectionExternalLink: string;
  CollectionFeeBasisPoints: string;
  CollectionFeeRecipient: string;
  CollectionAddr: string;
}

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
  console.log("results schema: ", SCHEMAS);
  const dataInputs = results.map((r, i) => ({
    keyName: SCHEMAS[i].key,
    value: r
  }));
  const decodedRes = ERC725.decodeData(dataInputs, SCHEMAS);
  const result: Partial<CollectionData> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodedRes.forEach((res: any) => {
    result[res.name as keyof CollectionData] = res.value;
  });
  result["CollectionAddr"] = collectionAddr;
  return result;
};

const createCollectionData = (
  md: CollectionMetadata
): Partial<CollectionData> => {
  return {
    CollectionFeeBasisPoints: md.collectionFeeBasisPoints,
    CollectionFeeRecipient: md.collectionFeeRecipient,
    CollectionName: md.name,
    CollectionImage: md.image,
    CollectionSymbol: md.symbol,
    CollectionDescription: md.description,
    CollectionExternalLink: md.externalLink
  };
};
export const updateCollectionData = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddr: string,
  original: CollectionMetadata,
  newData: CollectionMetadata
) => {
  const nuData = createCollectionData(newData);
  const entries: { keyName: string; value: string }[] = [];
  Object.keys(nuData).forEach((nd) => {
    // TODO technically Collection Metadta and Data need intersecting keys
    if (
      nuData[nd as keyof CollectionData] !==
      original[nd as keyof CollectionMetadata]
    )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entries.push({
        keyName: SCHEMAS_BY_NAME[nd as SCHEMA_TYPE].key,
        value: nuData[nd as keyof CollectionData] || ""
      });
  });
  const signer = provider?.getSigner();
  const erc725contract = contracts.ERC725YFacet__factory.connect(
    contractAddr,
    signer
  );
  const IPFS_GATEWAY = "https://2eff.lukso.dev/ipfs/";
  const config = { ipfsGateway: IPFS_GATEWAY };
  const profile = new ERC725(SCHEMAS, contractAddr, provider, config);

  const encodedData = profile.encodeData(entries);
  return (
    await erc725contract["setData(bytes32[],bytes[])"](
      encodedData.keys,
      encodedData.values
    )
  ).wait();
};

export const setCollectionData = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddr: string,
  md: CollectionMetadata
) => {
  const signer = provider?.getSigner();
  const erc725contract = contracts.ERC725YFacet__factory.connect(
    contractAddr,
    signer
  );
  try {
    const IPFS_GATEWAY = "https://2eff.lukso.dev/ipfs/";
    const config = { ipfsGateway: IPFS_GATEWAY };
    const profile = new ERC725(SCHEMAS, contractAddr, provider, config);
    // TODO this needs more efficient storage we need to figure out how to map this
    // to contract code storage to 3x reduce the gas cost of a launch

    const encodedData = profile.encodeData([
      {
        keyName: SCHEMAS_BY_NAME.CollectionDescription.key,
        value: md.description || ""
      },
      {
        keyName: SCHEMAS_BY_NAME.CollectionName.key,
        value: md.name || "untitled"
      },
      {
        keyName: SCHEMAS_BY_NAME.CollectionImage.key,
        value: md.image ? "" + md.image : ""
      },
      {
        keyName: SCHEMAS_BY_NAME.CollectionExternalLink.key,
        value: ""
      },
      {
        keyName: SCHEMAS_BY_NAME.CollectionFeeBasisPoints.key,
        value: "0"
      },
      {
        keyName: SCHEMAS_BY_NAME.CollectionFeeRecipient.key,
        value: ""
      },
      {
        keyName: SCHEMAS_BY_NAME.CollectionSymbol.key,
        value: md.symbol || "untitled"
      }
    ]);
    return (
      await erc725contract["setData(bytes32[],bytes[])"](
        encodedData.keys,
        encodedData.values
      )
    ).wait();
  } catch (e) {
    console.log("error", e);
  }
  // use context.contract
};

export const getContractRoyaltyData = async (
  contractAddr: string,
  providerOrSigner: ethers.Signer | ethers.providers.Provider
): Promise<ContractRoyaltyData> => {
  const royaltyFactory = contracts.RoyaltyFacet__factory.connect(
    contractAddr,
    providerOrSigner
  );
  const erc725 = contracts.ERC725YFacet__factory.connect(
    contractAddr,
    providerOrSigner
  );

  const [royaltyAmount, royaltyReceiver] =
    await royaltyFactory.getDefaultRoyalty();
  const result = await erc725["getData(bytes32)"](
    SCHEMAS_BY_NAME.ContractOpenSea.key
  );

  const dataInputs = [
    { keyName: SCHEMAS_BY_NAME.ContractOpenSea.key, value: result }
  ];
  const decodedRes = ERC725.decodeData(dataInputs, SCHEMAS);
  const openseaEnabled =
    decodedRes[0].value === null || decodedRes[0].value === "0" ? false : true;

  return {
    royaltyAmount,
    royaltyReceiver,
    openseaEnabled
  };
};

export const setContractRoyaltyData = async (
  royaltyData: ContractRoyaltyData,
  contractAddr: string,
  providerOrSigner: ethers.Signer | ethers.providers.Provider
) => {
  const zeroValue = "0x" + Buffer.from(new Uint8Array(32)).toString("hex");
  const oneValue = ethers.utils.zeroPad(ethers.utils.hexlify(1), 32);
  const openseaEnabled = royaltyData.openseaEnabled ? oneValue : zeroValue;

  const multiCall = contracts.MulticallFacet__factory.connect(
    contractAddr,
    providerOrSigner
  );

  let ABI = ["function setDefaultRoyalty(uint16,address)"];
  let iface = new ethers.utils.Interface(ABI);
  const royaltyCallData = iface.encodeFunctionData(
    "setDefaultRoyalty(uint16,address)",
    [royaltyData.royaltyAmount, royaltyData.royaltyReceiver]
  );
  ABI = ["function setData(bytes32,bytes)"];
  iface = new ethers.utils.Interface(ABI);
  const openseaCallData = iface.encodeFunctionData("setData(bytes32,bytes)", [
    SCHEMAS_BY_NAME.ContractOpenSea.key,
    openseaEnabled
  ]);
  await (await multiCall.multicall([royaltyCallData, openseaCallData])).wait();
};

export const getContractEncodedSchemaValue = (schema: ERC725JSONSchema) => {
  return { ...schema, key: ethers.utils.keccak256(schema.key) };
};

export const getContractDataValue = (keyName: string, value: string) => {
  return {
    keyName,
    value
  };
};
export const getEncodedContractMetadta = async (md: CollectionMetadata) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schemas: any = [];
  values.push(
    getContractDataValue(
      SCHEMAS_BY_NAME.CollectionDescription.key,
      md.description || ""
    )
  );
  schemas.push(SCHEMAS_BY_NAME.CollectionDescription);

  values.push(
    getContractDataValue(
      SCHEMAS_BY_NAME.CollectionName.key,
      md.name || "untitled"
    )
  );
  schemas.push(SCHEMAS_BY_NAME.CollectionName);

  values.push(
    getContractDataValue(
      SCHEMAS_BY_NAME.CollectionImage.key,
      md.image ? "" + md.image : ""
    )
  );
  schemas.push(SCHEMAS_BY_NAME.CollectionImage);
  values.push(
    getContractDataValue(SCHEMAS_BY_NAME.CollectionExternalLink.key, "")
  );
  schemas.push(SCHEMAS_BY_NAME.CollectionExternalLink);

  values.push(
    getContractDataValue(
      SCHEMAS_BY_NAME.CollectionSymbol.key,
      md.symbol || "untitled"
    )
  );
  schemas.push(SCHEMAS_BY_NAME.CollectionSymbol);
  return ERC725.encodeData(values, schemas);
};

export const setContractMetadata = async (
  signer: ethers.Signer,
  contractAddr: string,
  md: CollectionMetadata
) => {
  const erc725 = contracts.ERC725YFacet__factory.connect(contractAddr, signer);
  const encodedData = await getEncodedContractMetadta(md);
  return (
    await erc725["setData(bytes32[],bytes[])"](
      encodedData.keys,
      encodedData.values
    )
  ).wait();
};
