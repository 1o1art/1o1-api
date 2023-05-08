import { ERC725JSONSchema } from "@erc725/erc725.js";
import { ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";

export const CollectionDescription = "CollectionDescription";
export const CollectionName = "CollectionName";
export const CollectionSymbol = "CollectionSymbol";
export const CollectionImage = "CollectionImage";
export const CollectionExternalLink = "CollectionExternalLink";
export const CollectionFeeBasisPoints = "CollectionFeeBasisPoints";
export const CollectionFeeRecipient = "CollectionFeeRecipient";
export const ContractOpenSea = "ContractOpenSea";

export const TokenName = "TokenName:<uint32>";
export const TokenDescription = "TokenDescription:<uint32>";
export const TokenAttributes = "TokenAttributes:<uint32>";
export const TokenImage = "TokenImage:<uint32>";

export const ClaimName = "ClaimName:<uint32>";
export const ClaimDescription = "ClaimDescription:<uint32>";
export const ClaimAttributes = "ClaimAttributes:<uint32>";

// FacetId Schema to store facet address to facetId and
// facetName. This will allow us to display information about
// what facet is installed
export const FacetMetadata = "FacetMetadata:<address>";
export const FacetVersionMetadata = "FacetVersionMetadata:<address>";

export type FACET_SCHEMA_TYPE = typeof FacetMetadata;
export type FACET_VERSION_SCHEMA_TYPE = typeof FacetVersionMetadata;

export type TOKEN_SCHEMA_TYPE =
  | typeof TokenName
  | typeof TokenDescription
  | typeof TokenAttributes
  | typeof TokenImage;

export type CLAIM_SCHEMA_TYPE =
  | typeof ClaimName
  | typeof ClaimDescription
  | typeof ClaimAttributes;

export type SCHEMA_TYPE =
  | typeof CollectionDescription
  | typeof CollectionName
  | typeof CollectionSymbol
  | typeof CollectionImage
  | typeof CollectionExternalLink
  | typeof CollectionFeeBasisPoints
  | typeof CollectionFeeRecipient
  | typeof ContractOpenSea;

export const CLAIM_SCHEMAS_BY_NAME: Record<
  CLAIM_SCHEMA_TYPE,
  ERC725JSONSchema
> = {
  "ClaimName:<uint32>": {
    name: ClaimName,
    key: keccak256(ethers.utils.toUtf8Bytes(ClaimName)),
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String"
  },
  "ClaimDescription:<uint32>": {
    name: ClaimDescription,
    key: keccak256(ethers.utils.toUtf8Bytes(ClaimDescription)),
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String"
  },
  "ClaimAttributes:<uint32>": {
    name: ClaimAttributes,
    key: keccak256(ethers.utils.toUtf8Bytes(ClaimAttributes)),
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String"
  }
};

export const SCHEMAS_BY_NAME: Record<SCHEMA_TYPE, ERC725JSONSchema> = {
  CollectionDescription: {
    name: CollectionDescription,
    key: keccak256(ethers.utils.toUtf8Bytes(CollectionDescription)),
    keyType: "Singleton",
    valueType: "string",
    valueContent: "String"
  },
  CollectionName: {
    name: CollectionName,
    key: keccak256(ethers.utils.toUtf8Bytes(CollectionName)),
    keyType: "Singleton",
    valueType: "string",
    valueContent: "String"
  },
  CollectionImage: {
    name: CollectionImage,
    key: keccak256(ethers.utils.toUtf8Bytes(CollectionImage)),
    keyType: "Singleton",
    valueType: "string",
    valueContent: "String"
  },
  CollectionExternalLink: {
    name: CollectionExternalLink,
    key: keccak256(ethers.utils.toUtf8Bytes(CollectionExternalLink)),
    keyType: "Singleton",
    valueType: "string",
    valueContent: "String"
  },
  // erc725 earlier versions don't support bool type
  // 0 is used as false and everything else is true
  ContractOpenSea: {
    name: ContractOpenSea,
    key: keccak256(ethers.utils.toUtf8Bytes(ContractOpenSea)),
    keyType: "Singleton",
    valueType: "uint256",
    valueContent: "Number"
  },
  CollectionSymbol: {
    name: CollectionSymbol,
    key: keccak256(ethers.utils.toUtf8Bytes(CollectionSymbol)),
    keyType: "Singleton",
    valueType: "string",
    valueContent: "String"
  },
  CollectionFeeBasisPoints: {
    name: CollectionFeeBasisPoints,
    key: keccak256(ethers.utils.toUtf8Bytes(CollectionFeeBasisPoints)),
    keyType: "Singleton",
    valueType: "uint256",
    valueContent: "Number"
  },
  CollectionFeeRecipient: {
    name: CollectionFeeRecipient,
    key: keccak256(ethers.utils.toUtf8Bytes(CollectionFeeRecipient)),
    keyType: "Singleton",
    valueType: "address",
    valueContent: "Address"
  }
};

export const SCHEMAS: ERC725JSONSchema[] = [
  SCHEMAS_BY_NAME.CollectionDescription,
  SCHEMAS_BY_NAME.CollectionName,
  SCHEMAS_BY_NAME.CollectionImage,
  SCHEMAS_BY_NAME.CollectionExternalLink,
  SCHEMAS_BY_NAME.CollectionFeeBasisPoints,
  SCHEMAS_BY_NAME.CollectionFeeRecipient,
  SCHEMAS_BY_NAME.CollectionSymbol,
  SCHEMAS_BY_NAME.ContractOpenSea
];
