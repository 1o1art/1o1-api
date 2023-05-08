import { ONCHAIN_IMAGE, OFFCHAIN_IMAGE } from "./constants";

export interface TypedImageData {
  imageType: string;
  onChainImage?: string;
  offChainImage?: string;
  image?: string;
  scale?: boolean;
}

export const convertImageStringToTypedImage = (
  image: string
): TypedImageData => {
  let offChainImage = "";
  let onChainImage = "";
  let imageType = ONCHAIN_IMAGE;
  let scale = false;
  if (image && image.includes("ipfs://")) {
    offChainImage = image;
    imageType = OFFCHAIN_IMAGE;
  } else {
    onChainImage = image;
    if (image && image.includes('preserveAspectRatio="xMinYMin')) scale = true;
  }
  return {
    offChainImage,
    onChainImage,
    imageType,
    scale,
    image
  };
};
