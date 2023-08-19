import { launcherDeployed as deployedContracts } from "@1o1art/1o1-contracts";

// Entries for different networks go here
export enum NetworkChainId {
  "localhost" = 31337,
  "mumbai" = 80001,
  "goerli" = 5,
  "arb-goerli" = 421613,
  "mantle-testnet" = 5001,
  "telos-testnet" = 41
}

const networkIsDeployed = (chainId: NetworkChainId): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (deployedContracts as any)[chainId] !== undefined;
};

const DEFAULT_NETWORK_CHAIN_ID = networkIsDeployed(
  NetworkChainId.mumbai.valueOf()
)
  ? NetworkChainId.mumbai.valueOf()
  : NetworkChainId.localhost.valueOf();

// Entries for different networks go here for rpc addresses if we need them
export const chainIdToRpcHost: Record<NetworkChainId, string> = {
  31337: "http://127.0.0.1:8545",
  80001: "https://polygon-testnet.public.blastapi.io",
  421613: "https://goerli-rollup.arbitrum.io/rpc",
  5: "https://goerli.infura.io/v3/70a47534d2014f05b7de2607d7862814",
  // TODO this may not be a trust worthy source
  41: "https://telos-evm-testnet.rpc.thirdweb.com",
  5001: "https://rpc.testnet.mantle.xyz/"
};

type LogicalNameToChainID = Record<keyof NetworkChainId, NetworkChainId> &
  Record<string, number | null>;
type ChainIDToLogicalName = Record<NetworkChainId, keyof NetworkChainId> &
  Record<number, string | null>;

export interface Config {
  nftLauncherAddr: string;
  rpcHost: string;
  name: keyof NetworkChainId;
  chainId: NetworkChainId;
}

export const getLaunchAddr = (chainId: NetworkChainId): string => {
  const launchAddr = process.env[`LAUNCH_CONTRACT_${chainId}`.toUpperCase()];
  if (launchAddr) return launchAddr;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const launchedContract = (deployedContracts as any)[chainId] as any;
  if (!launchedContract)
    throw new Error("Cannot connect to unknown network" + chainId);

  return launchedContract.Diamond;
};

const CHAIN_ID_MAPPING: LogicalNameToChainID = ((): LogicalNameToChainID => {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {};
  for (const network of Object.values(NetworkChainId)) {
    res[network] = NetworkChainId[network as number];
  }
  return res as LogicalNameToChainID;
})();

const NAME_CHAIN_ID_MAPPING: ChainIDToLogicalName =
  ((): ChainIDToLogicalName => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = {};
    for (const network of Object.values(NetworkChainId)) {
      res[NetworkChainId[network as number]] = network;
    }
    return res as ChainIDToLogicalName;
  })();

export const getConfigByName = (name: keyof LogicalNameToChainID): Config => {
  let chainId = CHAIN_ID_MAPPING[name];
  if (!chainId) chainId = DEFAULT_NETWORK_CHAIN_ID;
  return getConfigById(chainId);
};

export const getConfigById = (chainId: number): Config => {
  let chain = DEFAULT_NETWORK_CHAIN_ID;
  const chainName = NAME_CHAIN_ID_MAPPING[chainId];
  if (chainName) chain = chainId;

  return {
    name: NAME_CHAIN_ID_MAPPING[chain] as keyof NetworkChainId,
    rpcHost: chainIdToRpcHost[chain as NetworkChainId],
    nftLauncherAddr: getLaunchAddr(chain),
    chainId: chain as NetworkChainId
  };
};

export const getNetworks = (): Config[] => {
  const availableHosts = Object.keys(chainIdToRpcHost).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key) => (deployedContracts as any)[key] !== undefined
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return availableHosts.map((chainId: any) => {
    return {
      name: NAME_CHAIN_ID_MAPPING[chainId] as keyof NetworkChainId,
      rpcHost: chainIdToRpcHost[chainId as NetworkChainId],
      nftLauncherAddr: getLaunchAddr(chainId as NetworkChainId),
      chainId: chainId as NetworkChainId
    };
  });
};
