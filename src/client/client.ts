import * as config from "../config";
import { BigNumber } from "ethers";
import { ethers } from "ethers";
import { NftContractBuilder } from "./nftBuilder";
import { getAllFacets } from "../lib/coreFacets";
import presets from "../metadata/presets.json";
import { Cut, FacetCutAction } from "../lib/facets";
import * as contracts from "../generated/typechain";

type PresetName = "delegatable" | "basic";

export interface ContractsByOwner {
  contractAddrs: string[];
  count: BigNumber;
  total: BigNumber;
}

export class ClientFactory {
  static async makeClient(privateKey: string, rpcUrl: string): Promise<Client> {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const chainId = await signer.getChainId();
    const cfg = config.getConfigById(chainId);
    return {
      getContractsByOwner: async (
        owner: string,
        offset: number,
        limit: number,
        sortOrder: "desc" | "asc"
      ) => {
        const diamondContract =
          contracts.DiamondContractLauncherFacet__factory.connect(
            cfg.nftLauncherAddr,
            signer
          );
        const sort = sortOrder === "desc";
        const [contractAddrs, count, total] =
          await diamondContract.getContractsByOwner(owner, offset, limit, sort);
        return {
          contractAddrs,
          count,
          total
        };
      },
      getNftContract: async (
        address: string
      ): Promise<contracts.ERC721TokenBaseFacet> => {
        const erc721 = contracts.ERC721TokenBaseFacet__factory.connect(
          address,
          signer
        );
        return erc721;
      },
      createNftContractBuilder: (): NftContractBuilder => {
        return new NftContractBuilder(signer, cfg);
      },
      getPresetFacets: async (presetName: PresetName): Promise<Cut[]> => {
        const { facets } = await getAllFacets(
          cfg.name,
          await signer.getAddress()
        );
        const preset = presets.find((p) =>
          p.name.toLowerCase().includes(presetName.toLowerCase())
        );
        return facets
          .filter((f) => preset?.facets.includes(f.id))
          .map((f) => {
            if (!f.facetAddress || !f.functionSelectors)
              throw new Error("no facet address or function selectors");
            return {
              action: FacetCutAction.Add,
              facetAddress: f.facetAddress,
              functionSelectors: f.functionSelectors
            };
          });
      }
    };
  }
}

export interface Client {
  getContractsByOwner(
    owner: string,
    offset: number,
    limit: number,
    sortOrder: string
  ): Promise<ContractsByOwner>;
  getNftContract(address: string): Promise<contracts.ERC721TokenBaseFacet>;
  createNftContractBuilder(): NftContractBuilder;
  getPresetFacets(presetName: string): Promise<Cut[]>;
}
