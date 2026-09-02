import { INVENTORY_CAPACITY } from '../inventory/inventory.js';
import type { ItemInstance, ItemInstanceId } from '../items/types.js';
import { inventoryItemKey, presentInventoryItem, selectedInventoryItem } from './inventoryPresentation.js';

export interface InventorySurfaceHandlers {
  onSelect(instanceId: ItemInstanceId): void;
  onMove(instanceId: ItemInstanceId, targetIndex: number): void;
  onVisibilityChange(open: boolean): void;
}

export class InventorySurface {
  private readonly overlay: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly count: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly moveEarlier: HTMLButtonElement;
  private readonly moveLater: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private items: readonly ItemInstance[] = [];
  private selectedItemId?: ItemInstanceId;

  constructor(private readonly root: HTMLElement, private readonly handlers: InventorySurfaceHandlers) {
    const hud = this.required('[data-ui="hud"]');
    const hotbar = this.required('[data-ui="inventory"]');
    hotbar.insertAdjacentHTML('beforebegin', '<button class="inventory-open-button" data-action="open-inventory" aria-haspopup="dialog">Inventory<span data-ui="inventory-count">0 / 6</span></button>');
    const touchActions = this.required('.touch-actions');
    touchActions.insertAdjacentHTML('beforeend', '<button class="touch-action touch-inventory" data-action="touch-inventory" aria-label="Open Inventory">Inventory</button>');
    hud.insertAdjacentHTML('afterend', `
      <section class="inventory-overlay" data-ui="inventory-overlay" role="dialog" aria-modal="true" aria-labelledby="inventory-title">
        <article class="inventory-card ui-panel">
          <header class="inventory-header">
            <div><p class="eyebrow">Character inventory</p><h2 id="inventory-title">Inventory</h2><p>Exact Item Instances owned by this character.</p></div>
            <button class="inventory-close" data-action="close-inventory" aria-label="Close Inventory">Close</button>
          </header>
          <div class="inventory-layout">
            <section class="inventory-grid-panel" aria-label="Inventory slots"><h3>Slots</h3><div class="inventory-grid-full" data-ui="inventory-grid"></div></section>
            <section class="inventory-detail" data-ui="inventory-detail" aria-live="polite"><h3>Selected item</h3></section>
          </div>
        </article>
      </section>`);
    this.overlay = this.required('[data-ui="inventory-overlay"]');
    this.grid = this.required('[data-ui="inventory-grid"]');
    this.count = this.required('[data-ui="inventory-count"]');
    this.detail = this.required('[data-ui="inventory-detail"]');
    this.closeButton = this.required<HTMLButtonElement>('[data-action="close-inventory"]');
    this.moveEarlier = document.createElement('button');
    this.moveEarlier.type = 'button';
    this.moveEarlier.textContent = 'Move earlier';
    this.moveEarlier.dataset.action = 'inventory-move-earlier';
    this.moveLater = document.createElement('button');
    this.moveLater.type = 'button';
    this.moveLater.textContent = 'Move later';
    this.moveLater.dataset.action = 'inventory-move-later';

    this.required('[data-action="open-inventory"]').addEventListener('click', () => this.open());
    this.required('[data-action="touch-inventory"]').addEventListener('click', () => this.open());
    this.closeButton.addEventListener('click', () => this.close());
    this.overlay.addEventListener('pointerdown', (event) => { if (event.target === this.overlay) this.close(); });
    this.moveEarlier.addEventListener('click', () => this.moveSelected(-1));
    this.moveLater.addEventListener('click', () => this.moveSelected(1));
  }

  private required<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing Inventory UI element: ${selector}`);
    return element;
  }

  update(items: readonly ItemInstance[], selectedItemId?: ItemInstanceId): void {
    this.items = items;
    this.selectedItemId = selectedItemId;
    this.count.textContent = `${items.length} / ${INVENTORY_CAPACITY}`;
    this.renderGrid();
    this.renderDetail();
  }

  open(): void {
    if (this.isOpen()) return;
    this.overlay.classList.add('visible');
    this.root.classList.add('inventory-open');
    this.handlers.onVisibilityChange(true);
    this.closeButton.focus();
  }

  close(): void {
    if (!this.isOpen()) return;
    this.overlay.classList.remove('visible');
    this.root.classList.remove('inventory-open');
    this.handlers.onVisibilityChange(false);
  }

  toggle(): boolean {
    if (this.isOpen()) this.close(); else this.open();
    return this.isOpen();
  }

  isOpen(): boolean {
    return this.overlay.classList.contains('visible');
  }

  private renderGrid(): void {
    this.grid.replaceChildren();
    for (let index = 0; index < INVENTORY_CAPACITY; index += 1) {
      const item = this.items[index];
      if (!item) {
        const empty = document.createElement('button');
        empty.type = 'button';
        empty.className = 'inventory-grid-slot empty';
        empty.disabled = true;
        empty.textContent = `${index + 1}. Empty`;
        empty.dataset.uiKey = `empty:${index}`;
        this.grid.appendChild(empty);
        continue;
      }
      const presentation = presentInventoryItem(item, this.selectedItemId);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `inventory-grid-slot${presentation.selectionLabel === 'Selected' ? ' selected' : ''}`;
      button.dataset.itemInstanceId = inventoryItemKey(item);
      button.dataset.uiKey = inventoryItemKey(item);
      button.setAttribute('aria-pressed', String(presentation.selectionLabel === 'Selected'));
      button.setAttribute('aria-label', `${index + 1}. ${presentation.definition.name}, ${presentation.quantityLabel}, ${presentation.primaryState}`);
      const icon = document.createElement('span'); icon.className = 'inventory-icon'; icon.textContent = presentation.definition.presentation.iconLabel;
      const name = document.createElement('strong'); name.textContent = `${index + 1}. ${presentation.definition.name}`;
      const state = document.createElement('small'); state.textContent = presentation.primaryState;
      button.append(icon, name, state);
      if (item.quantity > 1) { const quantity = document.createElement('span'); quantity.className = 'inventory-quantity'; quantity.textContent = presentation.quantityLabel; button.appendChild(quantity); }
      button.addEventListener('click', () => this.handlers.onSelect(item.instanceId));
      this.grid.appendChild(button);
    }
  }

  private renderDetail(): void {
    const selected = selectedInventoryItem(this.items, this.selectedItemId);
    this.detail.replaceChildren();
    const heading = document.createElement('h3'); heading.textContent = 'Selected item'; this.detail.appendChild(heading);
    if (!selected) {
      const empty = document.createElement('p'); empty.className = 'inventory-empty-detail'; empty.textContent = this.items.length ? 'Select an Item Instance to inspect it.' : 'This inventory is empty.'; this.detail.appendChild(empty); return;
    }
    const presentation = presentInventoryItem(selected, this.selectedItemId);
    const head = document.createElement('div'); head.className = 'inventory-detail-head';
    const icon = document.createElement('div'); icon.className = 'inventory-detail-icon'; icon.textContent = presentation.definition.presentation.iconLabel;
    const title = document.createElement('div');
    const name = document.createElement('div'); name.className = 'inventory-detail-name'; name.textContent = presentation.definition.name;
    const category = document.createElement('div'); category.className = 'inventory-detail-category'; category.textContent = `${presentation.definition.presentation.categoryLabel} · ${presentation.selectionLabel}`;
    const state = document.createElement('div'); state.className = 'inventory-detail-state'; state.textContent = `${presentation.primaryState} · ${presentation.conditionLabel}`;
    title.append(name, category, state); head.append(icon, title);
    const description = document.createElement('p'); description.className = 'inventory-detail-description'; description.textContent = presentation.definition.description;
    const meta = document.createElement('div'); meta.className = 'inventory-detail-meta';
    const quantity = document.createElement('span'); quantity.textContent = `Quantity ${selected.quantity} / ${presentation.definition.maxStackQuantity}`;
    const origin = document.createElement('span'); origin.textContent = presentation.originLabel;
    const identity = document.createElement('span'); identity.textContent = `Instance ${selected.instanceId}`;
    meta.append(quantity, origin, identity);
    const actions = document.createElement('div'); actions.className = 'inventory-detail-actions';
    const index = this.items.findIndex((item) => item.instanceId === selected.instanceId);
    this.moveEarlier.disabled = index <= 0;
    this.moveLater.disabled = index < 0 || index >= this.items.length - 1;
    actions.append(this.moveEarlier, this.moveLater);
    this.detail.append(head, description, meta, actions);
  }

  private moveSelected(direction: -1 | 1): void {
    if (!this.selectedItemId) return;
    const index = this.items.findIndex((item) => item.instanceId === this.selectedItemId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= this.items.length) return;
    this.handlers.onMove(this.selectedItemId, targetIndex);
  }
}
