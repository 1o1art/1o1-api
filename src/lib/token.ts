import { base64 } from "ethers/lib/utils";
import { ERC725, ERC725JSONSchema } from "@erc725/erc725.js";
import { ethers } from "ethers";
import * as schemas from "./schemas";
import { contracts } from "@1o1art/1o1-contracts";

const ERC725YFacet__factory = contracts.ERC725YFacet__factory;

export const getTokenKey = (
  key: schemas.TOKEN_SCHEMA_TYPE,
  tokenId: string
) => {
  return ERC725.encodeKeyName(key, tokenId);
};
export interface TraitType {
  trait_type: string;
  value: string | number;
}

export interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  attributes: TraitType[];
}

export const parseTokenUriData = (data: string) => {
  const splitter = "data:application/json;base64,";
  const res = JSON.parse(
    Buffer.from(base64.decode(data.split(splitter)[1])).toString("utf-8")
  );
  return res as TokenMetadata;
};

export const getTokenDataSchema = (key: schemas.TOKEN_SCHEMA_TYPE) => {
  const keyNameSplit = key.split(":"); // LSP5ReceivedAssetsMap:<address>
  const encodedKey = ethers.utils
    .keccak256(ethers.utils.toUtf8Bytes(keyNameSplit[0]))
    .slice(0, 22);
  return {
    name: key,
    key: `${encodedKey}0000<uint32>`,
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String"
  };
};

export const getTokenDataValue = (
  keyName: schemas.TOKEN_SCHEMA_TYPE,
  dynamicPart: number,
  value: string
) => {
  return {
    keyName,
    dynamicKeyParts: `${dynamicPart}`,
    value
  };
};

export interface TokenData {
  tokenName: string;
  tokenDescription: string;
  tokenAttributes: TraitType[];
}

export const encodeTokenData = (tokenId: number, data: Partial<TokenData>) => {
  const values = [
    getTokenDataValue(schemas.TokenName, tokenId, data.tokenName || ""),
    getTokenDataValue(
      schemas.TokenDescription,
      tokenId,
      data.tokenDescription || ""
    ),
    getTokenDataValue(
      schemas.TokenAttributes,
      tokenId,
      JSON.stringify(data.tokenAttributes) || "[]"
    )
  ];
  const schs = [
    getTokenDataSchema(schemas.TokenName),
    getTokenDataSchema(schemas.TokenDescription),
    getTokenDataSchema(schemas.TokenAttributes)
  ] as ERC725JSONSchema[];
  return ERC725.encodeData(values, schs);
};
export const updateTokenData = async (
  tokenId: number,
  contract: string,
  data: Partial<TokenData>,
  provider: ethers.Signer
) => {
  const erc725 = ERC725YFacet__factory.connect(contract, provider);
  const encoded = encodeTokenData(tokenId, data);
  await (
    await erc725["setData(bytes32[],bytes[])"](encoded.keys, encoded.values)
  ).wait();
};
