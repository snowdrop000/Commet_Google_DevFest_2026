import {
  ITEM_CATALOG,
  ownedEquipment,
  starCharacter,
  totalShards,
  withStarterItems,
} from "../../shared/game";
import { inventoryVersion, type AccountState } from "./state";

/** Replace the old blanket grant while preserving recorded acquisitions. */
export function migrateInventory(
  account: AccountState,
  drawnItems: readonly string[],
): AccountState {
  if (account.inventoryVersion >= inventoryVersion) return account;
  const previouslyFree = new Set(
    Object.keys(ITEM_CATALOG).filter((id) => {
      const item = ITEM_CATALOG[id];
      return item.character === starCharacter && !item.requirement;
    }),
  );
  const oldItemIds =
    typeof account.profile.gacha.shards === "number"
      ? []
      : Object.keys(account.profile.gacha.shards);
  const earned = [...drawnItems, ...oldItemIds].filter((id) => Boolean(ITEM_CATALOG[id]));
  const pet = withStarterItems({
    ...account.profile,
    unlockedItems: [
      ...new Set([
        ...account.profile.unlockedItems.filter(
          (id) => account.inventoryVersion >= 1 || !previouslyFree.has(id),
        ),
        ...(account.inventoryVersion < 1 ? earned : []),
      ]),
    ],
  });
  return {
    ...account,
    inventoryVersion,
    profile: {
      ...pet,
      gacha: { ...pet.gacha, shards: totalShards(pet.gacha.shards) },
      equippedItems: ownedEquipment(pet.characterType, pet.equippedItems, pet.unlockedItems),
    },
  };
}
