import { BigNumber } from "ethers";
import * as schemas from "./schemas";
import ERC725 from "@erc725/erc725.js";
import { facetsConfig } from "@1o1art/1o1-contracts";
import * as ethers from "ethers";

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export function packVersion(version?: Version): BigNumber {
  if (!version) return BigNumber.from(0);
  const major = BigNumber.from(version.major).shl(160);
  const minor = BigNumber.from(version.minor).shl(80);
  const patch = BigNumber.from(version.patch);
  return major.or(minor).or(patch);
}

export function unpackVersion(versionPacked: BigNumber): Version {
  const major = versionPacked.shr(160).toNumber();
  const minor = versionPacked
    .shr(80)
    .and(BigNumber.from("0xFFFFFFFFFFFF"))
    .toNumber();
  const patch = versionPacked.and(BigNumber.from("0xFFFFFFFFFFFF")).toNumber();
  return { major, minor, patch };
}

export const getFacetVersionMetadataSchema = (
  key: schemas.FACET_VERSION_SCHEMA_TYPE
) => {
  const keyNameSplit = key.split(":"); // LSP5ReceivedAssetsMap:<address>
  const encodedKey = ethers.utils
    .keccak256(ethers.utils.toUtf8Bytes(keyNameSplit[0]))
    .slice(0, 22);
  return {
    name: key,
    key: `${encodedKey}0000<address>`,
    keyType: "Mapping",
    valueType: "bytes32",
    valueContent: "Bytes32"
  };
};

export const getFacetVersionMetadataKey = (
  key: schemas.FACET_VERSION_SCHEMA_TYPE,
  facetAddress: string
) => {
  return ERC725.encodeKeyName(key, facetAddress);
};

export const getFacetVersionMetadataSchemaDecode = (
  key: schemas.FACET_VERSION_SCHEMA_TYPE,
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
    valueType: "bytes32",
    valueContent: "Bytes32"
  };
};

export const getLatestFacetVersion = (id: string): Version => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const humanReadableVersion = (facetsConfig as any)[id]?.version;
  if (!humanReadableVersion) {
    return {
      major: 0,
      minor: 0,
      patch: 0
    };
  }
  const [major, minor, patch] = humanReadableVersion
    .split(".")
    .map((v: string) => parseInt(v, 10));
  return { major, minor, patch };
};

export const getFacetVersionDataValue = (
  keyName: schemas.FACET_VERSION_SCHEMA_TYPE,
  dynamicPart: string,
  value: string
) => {
  return {
    keyName,
    dynamicKeyParts: dynamicPart,
    value
  };
};
