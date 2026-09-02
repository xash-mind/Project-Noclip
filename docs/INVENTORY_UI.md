# Inventory UI / Item Presentation Foundation

Dev.9.8 gives the existing Item Definition / Item Instance / Inventory domain a player-facing presentation. It does not add world Item gameplay.

## Identity boundary

```text
ItemDefinition = what kind of thing this is
ItemInstance   = this exact persistent object
Inventory      = ownership/container order
```

The UI never creates Item Instances. Item buttons and detail rows use `ItemInstance.instanceId` as their stable UI key (`data-ui-key` / `data-item-instance-id`). Two Instances of the same Definition therefore remain separately addressable.

`src/items/definitions.ts` owns presentation metadata that belongs to the Definition: compact icon label, category label, state label, name and description. Quantity, condition, charge, origin, revision and ownership remain Item Instance state.

## Runtime path

```text
SaveData.inventory
  -> GameUI.updateInventory()
       -> six-slot hotbar
       -> InventorySurface
            -> inventoryPresentation helpers
            -> Item Definition metadata + Item Instance state

UI select
  -> ProjectNoclipGame.selectItem()
  -> selectedItemId
  -> persistence

UI reorder
  -> ProjectNoclipGame.moveInventoryItem()
  -> canonical inventory.moveInstance()
  -> persistence
```

Reorder changes only container order. It does not recreate, re-seed or re-identify an Item Instance. Selection is stored by `instanceId`, so redraw and reorder do not convert it to a slot index.

## Player surface

The HUD retains the six-slot quick inventory and adds an Inventory dialog. The dialog provides:

- Item Definition name, icon placeholder, category and description;
- Item Instance quantity, condition/charge state, origin and exact Instance ID;
- selected/stored presentation state;
- button-based Move earlier / Move later reorder controls;
- explicit close flow and `I` / `Escape` keyboard flow;
- a dedicated touch Inventory control.

No hover or drag gesture is required. Intended Inventory controls have at least a 44x44 CSS-pixel target; touch gameplay controls remain at least 48px and the touch hotbar override is 46px high.

## Persistence

Opening, inspecting and closing Inventory are presentation-only. Selecting or reordering updates existing canonical state and requests persistence immediately. Continue restores `SaveData.inventory` and `selectedItemId`; rendering never invokes an Item factory.

Starter items use the same `createItemInstance()` path as every other canonical Item Instance before being placed into `SaveData.inventory`. The UI has no starter-only object shape.

## Explicitly deferred

This foundation does not add or redesign:

- Level 0 loot population;
- proximity pickup;
- world drop placement or throwing;
- world Item rendering or physics;
- new Item generation;
- crafting;
- combat equipment;
- Character/Profile -> Avatar equipment meshes.

Existing world pickup/drop behavior is not expanded by this run. Future world/equipment systems may consume the canonical inventory state without changing this identity separation.
