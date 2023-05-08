export const FileToMediaType: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  png: "image/png",
  bmp: "image/bmp",
  svg: "image/svg+xml"
};

export type SupportedFileExtension = keyof typeof FileToMediaType;

export const getBase64PrefixFromExt = (extension: string): string => {
  const mediaType = FileToMediaType[extension];
  if (!mediaType) {
    throw new Error(`Unsupported file type: ${extension}`);
  }
  return `data:${mediaType};base64,`;
};
export const formatDataUri = (mediaType: string, base64Str: string) => {
  return `data:${mediaType};base64,${base64Str}`;
};
