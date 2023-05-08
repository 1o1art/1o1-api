import { Contract, ethers } from "ethers";

type PopulatedTransaction = ethers.PopulatedTransaction;

export function prepareCallDataWithIndex(
  contract: Contract,
  populatedTransaction: PopulatedTransaction,
  argIndexToReplace: number
): { callData: string; index: number } {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const iface = new ethers.utils.Interface(contract.interface.fragments);
  const funcFragment = iface.getFunction(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    populatedTransaction.data!.slice(0, 10)
  );

  const params = iface.decodeFunctionData(
    funcFragment,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    populatedTransaction.data!
  );

  const headTypes = funcFragment.inputs.slice(0, argIndexToReplace);
  const headData = ethers.utils.defaultAbiCoder.encode(
    headTypes,
    params.slice(0, argIndexToReplace)
  );
  const index = 4 + headData.length - 2; // 4 bytes for function selector account for the 0x prefix
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { callData: populatedTransaction.data!, index };
}

// This method is used to translate the argument types so we can be type safe about the return value
export function getDefaultForType(param: ethers.utils.ParamType): string {
  const baseType = param.baseType || param.type;
  //NOTE Does not support arbitrary length bytes or strings
  switch (baseType) {
    case "uint8":
    case "uint16":
    case "uint32":
    case "uint64":
    case "uint128":
    case "uint256":
    case "int8":
    case "int16":
    case "int32":
    case "int64":
    case "int128":
    case "int256":
      return `${ethers.utils.hexZeroPad(
        ethers.BigNumber.from(0).toHexString(),
        32
      )}`;
    case "address":
      return ethers.constants.AddressZero;
    case "bool":
      return "00";
    case "bytes1":
    case "bytes2":
    case "bytes3":
    case "bytes4":
    case "bytes5":
    case "bytes6":
    case "bytes7":
    case "bytes8":
    case "bytes9":
    case "bytes10":
    case "bytes11":
    case "bytes12":
    case "bytes13":
    case "bytes14":
    case "bytes15":
    case "bytes16":
    case "bytes17":
    case "bytes18":
    case "bytes19":
    case "bytes20":
    case "bytes21":
    case "bytes22":
    case "bytes23":
    case "bytes24":
    case "bytes25":
    case "bytes26":
    case "bytes27":
    case "bytes28":
    case "bytes29":
    case "bytes30":
    case "bytes31":
    case "bytes32":
      const size = parseInt(baseType.slice(5));
      return "00".repeat(size);
    case "tuple":
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const components = param.components!;
      return components
        .map((component) => getDefaultForType(component))
        .join("");
    default:
      throw new Error(`Unsupported type: ${baseType}`);
  }
}

export function generatePlaceholder(
  contract: Contract,
  functionName: string
): string {
  const iface = new ethers.utils.Interface(contract.interface.fragments);
  const functionFragment = iface.getFunction(functionName);

  const returnType = functionFragment.outputs;
  const defaultValues = returnType?.map((param) => getDefaultForType(param));

  return ethers.utils.defaultAbiCoder.encode(
    returnType || [],
    defaultValues || []
  );
}
