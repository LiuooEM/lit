/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// tslint:disable:no-new-decorators
import {customElement, html} from 'lit-element';
import {classMap} from 'lit-html/directives/class-map';
import {computed, observable} from 'mobx';

import {app} from '../core/lit_app';
import {LitModule} from '../core/lit_module';
import {ModelsMap, Spec} from '../lib/types';
import {handleEnterKey} from '../lib/utils';
import {GroupService} from '../services/group_service';
import {SliceService} from '../services/services';
import {FAVORITES_SLICE_NAME} from '../services/slice_service';


import {styles as sharedStyles} from './shared_styles.css';
import {styles} from './slice_module.css';

/**
 * The slice controls module
 */
@customElement('lit-slice-module')
export class SliceModule extends LitModule {
  static get styles() {
    return [sharedStyles, styles];
  }

  static title = 'Slice Editor';
  static numCols = 2;
  static collapseByDefault = true;
  static duplicateForModelComparison = false;

  static template = () => {
    return html`<lit-slice-module></lit-slice-module>`;
  };

  private readonly sliceService = app.getService(SliceService);
  private readonly groupService = app.getService(GroupService);

  @observable private sliceByFeatures: string[] = [];

  @observable private sliceName: string = '';

  @computed
  private get createButtonEnabled() {
    const sliceFromFilters =
        (this.selectionService.selectedIds.length === 0 &&
         this.anyCheckboxChecked);
    return (
        // Making a slice from filters (name generated based on filters).
        sliceFromFilters ||
        // Making a slice from selected points (must give a name)
        (this.sliceName !== '') &&
            (this.selectionService.selectedIds.length > 0));
  }

  @computed
  private get deleteButtonEnabled() {
    return this.sliceService.selectedSliceName !== '' &&
        this.sliceService.selectedSliceName !== FAVORITES_SLICE_NAME;
  }

  @computed
  private get anyCheckboxChecked() {
    return this.sliceByFeatures.length;
  }


  @computed
  private get sliceNameInputEditable() {
    return (this.selectionService.selectedIds.length > 0) ||
        this.anyCheckboxChecked;
  }

  private lastCreatedSlice() {
    const allSlices = this.sliceService.sliceNames;
    return allSlices[allSlices.length - 1];
  }

  private handleClickCreate() {
    if (this.anyCheckboxChecked) {
      this.makeSlicesFromAllLabelCombos();
      this.selectSlice(this.lastCreatedSlice());
    } else {
      const selectedIds = this.selectionService.selectedIds;
      const createSliceName = this.sliceName;
      this.sliceService.addNamedSlice(createSliceName, selectedIds);
      this.selectSlice(createSliceName);
    }
    this.sliceName = '';
    this.sliceByFeatures = [];
  }

  /**
   * Make slices from all combinations of the selected features.
   */
  private makeSlicesFromAllLabelCombos() {
    const data = this.selectionService.selectedOrAllInputData;
    const namedSlices =
        this.groupService.groupExamplesByFeatures(data, this.sliceByFeatures);

    // Make a slice per combination.
    const sliceNamePrefix = this.sliceName;
    Object.keys(namedSlices).forEach(sliceName => {
      const createSlicename = `${sliceNamePrefix}  ${sliceName}`;
      const ids = namedSlices[sliceName].data.map(d => d.id);
      this.sliceService.addNamedSlice(createSlicename, ids);
    });
  }

  private selectSlice(sliceName: string) {
    this.sliceService.selectNamedSlice(sliceName, this);
  }

  private deleteSlice() {
    this.sliceService.deleteNamedSlice(this.sliceService.selectedSliceName);
    this.selectSlice('');
  }

  renderCreate() {
    const onClickCreate = () => {
      this.handleClickCreate();
    };
    const onInputChange = (e: Event) => {
      // tslint:disable-next-line:no-any
      this.sliceName = (e as any).target.value;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      handleEnterKey(e, onClickCreate);
    };
    // clang-format off
    return html`
      <div class="container" id="create-container">
        <input type="text" id="input-box" .value=${this.sliceName}
          placeholder="Enter name" @input=${onInputChange}
          ?readonly="${!this.sliceNameInputEditable}"
          @keyup=${(e: KeyboardEvent) => {onKeyUp(e);}}/>
        <button ?disabled="${!this.createButtonEnabled}" id="create"
          @click=${onClickCreate}>Create slice
        </button>
      </div>
    `;
    // clang-format on
  }

  renderSliceSelector() {
    const selectedSliceName = this.sliceService.selectedSliceName;

    // clang-format off
    return html`
      <div id="select-container">
        <label>Select slice</label>
        <div id="slice-selector">
          ${this.sliceService.sliceNames.map(sliceName => {
            const itemClass =
                classMap({'selector-item': true,
                          'selected': sliceName === selectedSliceName});
            const itemClicked = () => {
                this.selectSlice(selectedSliceName === sliceName ? '': sliceName);
            };
            return html`
              <div class=${itemClass} @click=${itemClicked}>
                ${sliceName}
              </div>`;
          })}
        </div>
      </div>
    `;
    // clang-format on
  }

  /**
   * Create checkboxes for each value of each categorical feature.
   */
  renderFilters() {
    // Update the filterdict to match the checkboxes.
    const onChange = (e: Event, key: string) => {
      if ((e.target as HTMLInputElement).checked) {
        this.sliceByFeatures.push(key);
      } else {
        const index = this.sliceByFeatures.indexOf(key);
        this.sliceByFeatures.splice(index, 1);
      }
    };

    const renderFeatureCheckbox = (key: string) => {
      // clang-format off
      return html`
        <div>
          <div class='checkbox-holder'>
            <lit-checkbox
              ?checked=${this.sliceByFeatures.includes(key)}
              @change='${(e: Event) => {onChange(e, key);}}'
              label=${key}>
            </lit-checkbox>
          </div>
        </div>
      `;
      // clang-format on
    };
    return html`${
        this.groupService.categoricalAndNumericalFeatureNames.map(
            key => renderFeatureCheckbox(key))}`;
  }

  private renderNumSlices() {
    if (this.anyCheckboxChecked) {
      return html`
        <div class="dropdown-label">
          (${
          this.groupService.numIntersectionsLabel(this.sliceByFeatures)} slices)
        </div>
      `;
    }
    return '';
  }

  render() {
    const onClickDelete = () => {
      this.deleteSlice();
    };

    return html`
      ${this.renderCreate()}
      <div class="container" >
        <label>Slice by feature</label>
        ${this.renderFilters()}
        ${this.renderNumSlices()}
      </div>
      <div class="container" id="selector-container">
        ${this.renderSliceSelector()}
      </div>
      <div class="container">
        <button ?disabled=${!this.deleteButtonEnabled} id="delete"
          @click=${onClickDelete}>Delete slice
        </button>
      </div>
    `;
  }

  static shouldDisplayModule(modelSpecs: ModelsMap, datasetSpec: Spec) {
    return true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-slice-module': SliceModule;
  }
}
