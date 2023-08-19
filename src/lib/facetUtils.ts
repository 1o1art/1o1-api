import { ethers } from "ethers";
import { Cut, FacetCutAction, simpleDiamondCut } from "./facets";
import { contracts } from "@1o1art/1o1-contracts";

export async function updateFacets(
  contractAddr: string,
  signer: ethers.Signer,
  facetCuts: Cut[]
) {
  const loupeFacet = await contracts.DiamondLoupeFacet__factory.connect(
    contractAddr,
    signer
  );

  const existingFacets = await loupeFacet.facets();

  const newFacetCuts: Cut[] = [];
  const existFacetLookup: Record<string, Cut> = {};
  existingFacets.forEach((f) => {
    existFacetLookup[f.facetAddress] = { action: FacetCutAction.Remove, ...f };
  });
  // facets to remove
  facetCuts.forEach((facet) => {
    const existingFacet = existFacetLookup[facet.facetAddress];
    if (existingFacet) {
      newFacetCuts.push({
        action: FacetCutAction.Remove,
        functionSelectors: existingFacet.functionSelectors,
        facetAddress: "0x0000000000000000000000000000000000000000"
      });
    } else {
      newFacetCuts.push(facet);
    }
  });
  return simpleDiamondCut(contractAddr, newFacetCuts, signer);
}
