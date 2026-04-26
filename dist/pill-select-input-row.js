// Pill Select Input Row - Version 1.0.1
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class CustomSelectRow extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _unlocked: { type: Boolean },
      _open: { type: Boolean },
      _menuPos: { type: Object }
    };
  }

  constructor() {
    super();
    this._unlocked = false;
    this._open = false;
    this._menuPos = { top: 'auto', bottom: 'auto', left: 0, width: 0 };
    this._handleScroll = () => { if (this._open) this._open = false; };
  }

  updated(changedProps) {
    if (changedProps.has("_open")) {
      if (this._open) {
        window.addEventListener("scroll", this._handleScroll, true);
        window.addEventListener("resize", this._handleScroll, true);
      } else {
        window.removeEventListener("scroll", this._handleScroll, true);
        window.removeEventListener("resize", this._handleScroll, true);
      }
    }
  }

  render() {
    const entityId = this.config.entity;
    const stateObj = this.hass.states[entityId];
    
    if (!stateObj) {
      return html`<hui-error-entity-row .entity=${entityId}></hui-error-entity-row>`;
    }

    const domain = entityId.split(".")[0];
    if (domain !== "input_select") {
      return html`
        <hui-warning>
          Entity ${entityId} is not an input_select.
        </hui-warning>
      `;
    }

    const options = stateObj.attributes.options || [];
    const isLocked = this.config.locked && !this._unlocked;
    const isActive = this.config.active_options?.includes(stateObj.state);
    const customWidth = this.config.width || "50%";
    
    const iconColor = isActive 
      ? (this.config.active_color || "var(--paper-item-icon-active-color, #fdd835)") 
      : "var(--paper-item-icon-color, #44739e)";

    return html`
      <div class="container">
        <state-badge 
          .hass=${this.hass} 
          .stateObj=${stateObj} 
          .overrideIcon=${this.config.icon}
          @click=${this._handleMoreInfo}
          class="pointer main-icon"
          style="--badge-icon-color: ${iconColor}; color: ${iconColor};">
        </state-badge>
        
        <div class="info pointer" @click=${this._handleMoreInfo}>
          ${this.config.name || stateObj.attributes.friendly_name}
        </div>

        <div class="selection-wrapper">
          ${this.config.locked ? html`
            <ha-icon 
              icon="${isLocked ? 'mdi:lock' : 'mdi:lock-open-variant'}" 
              class="lock-toggle ${isLocked ? 'is-locked' : 'is-unlocked'}"
              @click=${this._toggleLock}>
            </ha-icon>
          ` : ""}
          
          <div class="menu-container" style="width: ${customWidth};">
            <div class="pill-trigger ${isLocked ? 'disabled' : ''}" 
                 id="trigger"
                 @click=${this._toggleMenu}>
               <span class="value-text">${stateObj.state}</span>
               <ha-icon icon="mdi:chevron-down"></ha-icon>
            </div>

            <div class="custom-dropdown ${this._open ? 'show' : ''}"
                 style="top: ${this._menuPos.top}; bottom: ${this._menuPos.bottom}; left: ${this._menuPos.left}px; width: ${this._menuPos.width}px;">
              ${options.map(option => html`
                <div class="dropdown-item ${option === stateObj.state ? 'active' : ''}"
                     @click=${() => this._selectOption(option)}>
                  <span class="item-text">${option}</span>
                  ${option === stateObj.state ? html`<ha-icon icon="mdi:check"></ha-icon>` : ""}
                </div>
              `)}
            </div>
          </div>
          ${this.config.suffix ? html`<span class="suffix">${this.config.suffix}</span>` : ""}
        </div>
      </div>
      ${this._open ? html`<div class="overlay" @click=${() => this._open = false}></div>` : ""}
    `;
  }

  _toggleMenu(ev) {
    if (this.config.locked && !this._unlocked) return;
    if (!this._open) {
      const rect = this.shadowRoot.getElementById("trigger").getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const dropdownHeight = 250; 

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        this._menuPos = {
          top: 'auto',
          bottom: (windowHeight - rect.top + 4) + 'px',
          left: rect.left,
          width: rect.width
        };
      } else {
        this._menuPos = {
          top: (rect.bottom + 4) + 'px',
          bottom: 'auto',
          left: rect.left,
          width: rect.width
        };
      }
    }
    this._open = !this._open;
  }

  _selectOption(option) {
    this.hass.callService("input_select", "select_option", { entity_id: this.config.entity, option: option });
    this._open = false;
    if (this.config.locked) this._unlocked = false;
  }

  _toggleLock() { this._unlocked = !this._unlocked; }

  _handleMoreInfo() {
    const event = new CustomEvent("hass-more-info", { detail: { entityId: this.config.entity }, bubbles: true, composed: true });
    this.dispatchEvent(event);
  }

  setConfig(config) { 
    if (!config.entity) throw new Error("Please define an entity");
    this.config = config; 
  }

  static get styles() {
    return css`
      .container { display: flex; align-items: center; padding: 4px 0; }
      
      .info { 
        margin-left: 16px; 
        margin-right: 16px;
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis; 
        flex: 0 1 auto; 
      }
      
      .pointer { cursor: pointer; }

      /* Force the state-badge icon color */
      .main-icon {
        --mdc-icon-size: 24px;
      }

      .selection-wrapper { 
        display: flex; 
        align-items: center; 
        justify-content: flex-end; 
        flex: 1;
        min-width: 0;
      }

      .lock-toggle { --mdc-icon-size: 18px; margin-right: 8px; cursor: pointer; flex-shrink: 0; }
      .is-locked { color: var(--warning-color); }
      .is-unlocked { color: var(--success-color); }
      
      .menu-container { 
        position: relative; 
        display: flex; 
        justify-content: flex-end;
      }

      .pill-trigger {
        display: flex; 
        align-items: center; 
        justify-content: space-between;
        background-color: rgba(155, 155, 155, 0.15); 
        color: var(--primary-text-color);
        border-radius: 12px; 
        height: 32px; 
        width: 100%;
        min-width: 60px; 
        padding: 0 12px;
        cursor: pointer; 
        font-size: 13px; 
        box-sizing: border-box;
      }

      .pill-trigger.disabled { cursor: not-allowed; opacity: 0.5; }
      .pill-trigger ha-icon { --mdc-icon-size: 16px; color: var(--secondary-text-color); margin-left: 4px; flex-shrink: 0; }

      .custom-dropdown {
        display: none; position: fixed; 
        background-color: var(--ha-card-background, var(--card-background-color, white));
        box-shadow: 0px 8px 16px rgba(0,0,0,0.4); border-radius: 8px;
        z-index: 10001; border: 1px solid var(--divider-color);
        max-height: 250px; overflow-y: auto;
      }
      .custom-dropdown.show { display: block; }
      .dropdown-item { padding: 10px 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; white-space: nowrap; }
      .dropdown-item:hover { background-color: rgba(155, 155, 155, 0.1); }
      .dropdown-item.active { color: var(--primary-color); font-weight: bold; }
      .dropdown-item ha-icon { --mdc-icon-size: 16px; margin-left: 12px; }
      .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 10000; background: transparent; }
      .suffix { margin-left: 8px; color: var(--secondary-text-color); font-size: 14px; flex-shrink: 0; }
      .value-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    `;
  }
}
customElements.define("pill-select-input-row", CustomSelectRow);