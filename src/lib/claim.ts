import { base64 } from "ethers/lib/utils";
import { ERC725, ERC725JSONSchema } from "@erc725/erc725.js";
import { BigNumber, ethers } from "ethers";
import * as schemas from "../../src/lib/schemas";
import {
  addDays,
  convertLocaleDateToYYMMDD,
  getCurrentCurrency,
  getCurrentLocaleDate,
  getResolvedImage,
  scaleImage
} from "./utils";
import { OFFCHAIN_IMAGE, ONCHAIN_IMAGE } from "./constants";
import { convertImageStringToTypedImage } from "./image";
import { getConfigByName } from "./config";
import { contracts } from "@1o1art/1o1-contracts";
import { LibClaims } from "@1o1art/1o1-contracts/build/typechain-types/contracts/facets/ClaimsFacet";

export const getClaimUxDefaults = () => {
  return {
    claimLimt: 10,
    unlimitedClaim: false,
    unlimitedEdition: false,
    editionSize: 10,
    unlimitedTime: false,
    startDate: convertLocaleDateToYYMMDD(new Date(new Date().toLocaleString())),
    endDate: convertLocaleDateToYYMMDD(addDays(getCurrentLocaleDate(), 1)),
    scale: false
  };
};
export const getClaimKey = (
  key: schemas.CLAIM_SCHEMA_TYPE,
  claimId: string
) => {
  return ERC725.encodeKeyName(key, claimId);
};

export interface FormattedClaimData {
  claimLimit: number;
  editionSize: number;
  creator: string;
  name: string;
  description: string;
  unlimitedClaim: boolean;
  unlimitedEdition: boolean;
  unlimitedTime: boolean;
  price: string;
  startDate: string;
  endDate: string;
  attributes: TraitType[];
  image: string;
  mimeType: string;
  width: number;
  height: number;
  payoutAddress: string;
  currency: string;
  totalMinted: number;
  fee: string;
  creatorAddress: string;
}

export interface TraitType {
  trait_type: string;
  value: string | number;
}

export interface ClaimMetadata {
  name: string;
  description: string;
  image: string;
  attributes: TraitType[];
}

export const convertLocaleTimeToUnixUTC = (dateString: string) => {
  const date = new Date(Date.parse(dateString));
  const unixTimestampSeconds =
    Math.floor(date.getTime() / 1000) - date.getTimezoneOffset() * 60;
  return unixTimestampSeconds;
};

export const parseClaimUriData = (data: string) => {
  const splitter = "data:application/json;base64,";
  const res = JSON.parse(
    Buffer.from(base64.decode(data.split(splitter)[1])).toString("utf-8")
  );
  return res as ClaimMetadata;
};

export const getClaimDataSchema = (key: schemas.CLAIM_SCHEMA_TYPE) => {
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

export const getClaimDataValue = (
  keyName: schemas.CLAIM_SCHEMA_TYPE,
  dynamicPart: number,
  value: string
) => {
  return {
    keyName,
    dynamicKeyParts: `${dynamicPart}`,
    value
  };
};

export interface ClaimData {
  claimName: string;
  claimDescription: string;
  claimAttributes: TraitType[];
}

const getClaimDecodeKey = (key: schemas.CLAIM_SCHEMA_TYPE, claimId: string) => {
  return ERC725.encodeKeyName(key, claimId);
};
export const getClaimData725 = async (
  claimId: number,
  contract: string,
  provider: ethers.providers.JsonRpcBatchProvider | ethers.Signer
): Promise<ClaimData> => {
  const erc725 = contracts.ERC725YFacet__factory.connect(contract, provider);
  const results = await erc725["getData(bytes32[])"](
    (
      Object.keys(schemas.CLAIM_SCHEMAS_BY_NAME) as schemas.CLAIM_SCHEMA_TYPE[]
    ).map((key) => getClaimKey(key, claimId.toString()))
  );
  const dataInputs = results.map((r, i) => ({
    keyName: ERC725.encodeKeyName(
      Object.keys(schemas.CLAIM_SCHEMAS_BY_NAME)[i],
      `${claimId}`
    ),
    value: r
  }));
  const decodeSchemas = Object.values(schemas.CLAIM_SCHEMAS_BY_NAME).map(
    (s) => ({
      ...s,
      key: getClaimDecodeKey(s.name as schemas.CLAIM_SCHEMA_TYPE, `${claimId}`)
    })
  );
  // decodeSchemas = decodeSchemas.map((s)=>{...s, keyName: s.})
  const decodedData = ERC725.decodeData(dataInputs, decodeSchemas);
  const meta = decodedData.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc: { [x: string]: any }, { name, value }: any) => {
      acc[name] = value;
      return acc;
    },
    {}
  );
  const cdata: ClaimData = {
    claimName: meta["ClaimName:<uint32>"] || "Untitled",
    claimAttributes: JSON.parse(meta["ClaimAttributes:<uint32>"]) || [],
    claimDescription: meta["ClaimDescription:<uint32>"] || ""
  };
  return cdata;
};

export const encodeClaimData = (claimId: number, data: Partial<ClaimData>) => {
  const values = [
    getClaimDataValue(schemas.ClaimName, claimId, data.claimName || ""),
    getClaimDataValue(
      schemas.ClaimDescription,
      claimId,
      data.claimDescription || ""
    ),
    getClaimDataValue(
      schemas.ClaimAttributes,
      claimId,
      JSON.stringify(data.claimAttributes) || "[]"
    )
  ];
  const schs = [
    getClaimDataSchema(schemas.ClaimName),
    getClaimDataSchema(schemas.ClaimDescription),
    getClaimDataSchema(schemas.ClaimAttributes)
  ] as ERC725JSONSchema[];
  return ERC725.encodeData(values, schs);
};
export const updateClaimData = async (
  claimId: number,
  contract: string,
  data: Partial<ClaimData>,
  provider: ethers.Signer
) => {
  const erc725 = contracts.ERC725YFacet__factory.connect(contract, provider);
  const encoded = encodeClaimData(claimId, data);
  await (
    await erc725["setData(bytes32[],bytes[])"](encoded.keys, encoded.values)
  ).wait();
};

export const convertClaimChainDataIntoUxData = (
  creator: string,
  image: string,
  claimData: ClaimData,
  claimRule: LibClaims.ClaimRuleStructOutput
) => {
  const claimLimit = claimRule.claimLimit;
  const unlimitedClaim = claimLimit === 0;
  const name = claimData.claimName;
  const description = claimData.claimDescription;
  const payoutAddress =
    ethers.constants.AddressZero === claimRule.payoutAddress
      ? ""
      : claimRule.payoutAddress;
  const price = ethers.utils.formatEther(claimRule.price.toString());
  const editionSize = claimRule.maxEditionSize;
  const unlimitedEdition = editionSize === 0;
  const startDate = convertLocaleDateToYYMMDD(
    new Date(
      new Date(claimRule.startTime.mul(1000).toNumber()).toLocaleString()
    )
  );
  const endDate = convertLocaleDateToYYMMDD(
    new Date(
      !claimRule.endTime.isZero()
        ? new Date(claimRule.endTime.mul(1000).toNumber()).toLocaleString()
        : new Date().toLocaleString()
    )
  );
  const unlimitedTime = claimRule.endTime.isZero();
  const attributes = claimData.claimAttributes;
  const imageData = convertImageStringToTypedImage(image);

  return {
    claimLimit,
    editionSize,
    creator,
    name,
    description,
    unlimitedClaim,
    unlimitedEdition,
    unlimitedTime,
    price,
    startDate,
    endDate,
    attributes,
    image,
    ...imageData,
    payoutAddress
  };
};

export const getAllClaimDataFormatted = async (
  claimId: string,
  chainName: string,
  contract: string,
  providerOrSigner: ethers.Signer | ethers.providers.JsonRpcBatchProvider
) => {
  const claims = contracts.ClaimsFacet__factory.connect(
    contract,
    providerOrSigner
  );

  // await claims.getClaimFee(context.claimId);

  const { image, claimRule } = await claims.getClaim(claimId);
  const claimData = await getClaimData725(
    parseInt(claimId),
    contract,
    providerOrSigner
  );
  const creatorAddress = await claims.getClaimCreator(claimId);
  let creator = "";
  try {
    const ensProvider = new ethers.providers.CloudflareProvider();
    creator =
      (await ensProvider.lookupAddress(creatorAddress)) || creatorAddress;
  } catch (e) {
    console.warn("ens resolution", e);
  }
  const cData = convertClaimChainDataIntoUxData(
    creator,
    image,
    claimData,
    claimRule
  );

  const currency = getCurrentCurrency(getConfigByName(chainName).chainId);

  const totalMinted = await claims.getTokensMintedFromClaim(claimId);

  const feePrice = await claims.getClaimFee();

  const data = {
    ...cData,
    currency,
    totalMinted: totalMinted.toNumber(),
    fee: ethers.utils.formatEther(feePrice),
    creatorAddress
  };
  return { ...data };
};

export interface ClaimPreviewImage {
  imageType?: string;
  onChainImage?: string;
  offChainImage?: File | string;
  scale?: boolean;
}

export const getPreviewImage = (preview: ClaimPreviewImage): string => {
  const imageType =
    preview.imageType === ONCHAIN_IMAGE || !preview.imageType
      ? ONCHAIN_IMAGE
      : OFFCHAIN_IMAGE;

  if (imageType === ONCHAIN_IMAGE) {
    if (preview.scale) return scaleImage(preview.onChainImage || "");
    return preview.onChainImage || "";
  }
  if (preview.offChainImage && preview.offChainImage !== "") {
    if (typeof preview.offChainImage === "string")
      return getResolvedImage(preview.offChainImage);

    return window.URL.createObjectURL(preview.offChainImage as File);
  }
  return "";
};
