import type { AnyModel, RenderContext } from "@anywidget/types";
import { html, css, LitElement, TemplateResult, nothing } from "lit";
import { property } from "lit/decorators.js";

import { legacyStyles } from './ipywidgets_styles';
import { materialStyles } from "./material_styles";
import { loadFonts } from "./utils";

interface LayerManagerRowModel {
    name: string;
    visible: boolean;
    opacity: number;
    is_loading: boolean;
}

export class LayerManagerRow extends LitElement {
    static get componentName() {
        return `layer-manager-row`;
    }

    static styles = [
        legacyStyles,
        materialStyles,
        css`
            .row {
                align-items: center;
                display: flex;
                gap: 4px;
                height: 30px;
            }

            .layer-name {
                flex-grow: 1;
                max-width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .settings-delete-button {
                font-size: 14px;
                height: 26px;
                width: 26px;
            }

            .layer-opacity-slider {
                width: 70px;
            }

            .layer-visibility-checkbox {
                margin: 2px;
            }

            .spinner {
                -webkit-animation: spin 2s linear infinite;
                animation: spin 2s linear infinite;
                border-radius: 50%;
                border: 4px solid var(--jp-widgets-input-border-color);
                border-top: 4px solid var(--jp-widgets-color);
                height: 12px;
                width: 12px;
            }

            @-webkit-keyframes spin {
                0% { -webkit-transform: rotate(0deg); }
                100% { -webkit-transform: rotate(360deg); }
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            button.loading .spinner,
            button.loading:hover .close-icon,
            button.done-loading .close-icon {
                display: block;
            }

            button.loading .close-icon,
            button.loading:hover .spinner,
            button.done-loading .spinner {
                display: none;
            }

            .remove-layer-text {
                flex-grow: 1;
            }

            .confirm-deny-button {
                height: 26px;
                width: 70px;
            }
        `,
    ];

    private _model: AnyModel<LayerManagerRowModel> | undefined = undefined;
    private static modelNameToViewName = new Map<keyof LayerManagerRowModel, keyof LayerManagerRow | null>([
        ["name", "name"],
        ["visible", "visible"],
        ["opacity", "opacity"],
        ["is_loading", "isLoading"],
    ]);

    set model(model: AnyModel<LayerManagerRowModel>) {
        this._model = model;
        for (const [modelKey, widgetKey] of LayerManagerRow.modelNameToViewName) {
            if (widgetKey) {
                // Get initial values from the Python model.
                (this as any)[widgetKey] = model.get(modelKey);
                // Listen for updates to the model.
                model.on(`change:${modelKey}`, () => {
                    (this as any)[widgetKey] = model.get(modelKey);
                });
            }
        }
    }

    @property()
    name: string = "";

    @property()
    visible: boolean = true;

    @property()
    opacity: number = 0;

    @property()
    isLoading: boolean = false;

    @property()
    isConfirmDialogVisible: boolean = false;

    render(): TemplateResult {
        return html`
            <div class="row">
                <input
                    type="checkbox"
                    class="layer-visibility-checkbox"
                    .checked="${this.visible}"
                    @change="${this.onLayerVisibilityChanged}"
                />
                <span class="legacy-text layer-name">${this.name}</span>
                <input
                    type="range"
                    class="legacy-slider layer-opacity-slider"
                    min="0"
                    max="1"
                    step="0.01"
                    .value="${this.opacity}"
                    @input="${this.onLayerOpacityChanged}"
                />
                <button
                    class="legacy-button settings-delete-button"
                    @click="${this.onSettingsClicked}"
                >
                    <span class="material-symbols-outlined">&#xe8b8;</span>
                </button>
                <button
                    class="legacy-button settings-delete-button ${this.isLoading ? 'loading' : 'done-loading'}"
                    @click="${this.onDeleteClicked}"
                >
                    <div class="spinner"></div>
                    <span class="close-icon material-symbols-outlined">&#xe5cd;</span>
                </button>
            </div>
            ${this.renderConfirmDialog()}
        `;
    }

    private renderConfirmDialog(): TemplateResult | void {
        if (!this.isConfirmDialogVisible) {
            return nothing;
        }
        return html`
            <div class="row">
                <span class="legacy-text remove-layer-text">Remove layer?</span>
                    <button
                        class="legacy-button primary confirm-deny-button"
                        @click="${this.confirmDeletion}"
                    >
                        Yes
                    </button>
                    <button
                        class="legacy-button primary confirm-deny-button"
                        @click="${this.cancelDeletion}"
                    >
                        No
                    </button>
            </div>
        `;
    }

    updated(changedProperties: any) {
        // Update the model properties so they're reflected in Python.
        for (const [property, _] of changedProperties) {
            this._model?.set(property, this[property as keyof LayerManagerRow]);
        }
        this._model?.save_changes();
    }

    private onLayerVisibilityChanged(event: Event) {
        const target = event.target as HTMLInputElement;
        this.visible = target.checked;
    }

    private onLayerOpacityChanged(event: Event) {
        const target = event.target as HTMLInputElement;
        this.opacity = parseFloat(target.value);
    }

    private onSettingsClicked(_: Event) {
        this._model?.send({ "type": "click", "id": "settings" });
    }

    private onDeleteClicked(_: Event) {
        this.isConfirmDialogVisible = true;
    }

    private confirmDeletion(_: Event) {
        this._model?.send({ "type": "click", "id": "delete" });
    }

    private cancelDeletion(_: Event) {
        this.isConfirmDialogVisible = false;
    }
}

if (!customElements.get(LayerManagerRow.componentName)) {
    customElements.define(LayerManagerRow.componentName, LayerManagerRow);
}

function render({ model, el }: RenderContext<LayerManagerRowModel>) {
    loadFonts();
    const row = <LayerManagerRow>document.createElement(LayerManagerRow.componentName);
    row.model = model;
    el.appendChild(row);
}

export default { render };