/*
 * https://github.com/5orenso
 *
 * Copyright (c) 2020 Øistein Sørensen
 * Licensed under the MIT license.
 */

import { observable, configure, action, computed } from 'mobx';
import util from 'preact-util';

configure({ enforceActions: 'always' });

class StoreModel {
    constructor(name, opts) {
        this.name = name;
        this.namePlural = opts.namePlural;
        this.api = opts.api;
        this.opts = opts;
    }

    @observable queryFilter = util.getObject(`${this.name}QueryFilter`) || this.opts.queryFilter || {};

    @observable sort = this.opts.sort;

    @observable extendedView = this.opts.extendedView;

    @observable limit = this.opts.limit || 25;

    @observable offset = 0;

    @observable searchResults = [];

    @observable totalSearch = 0;

    @observable searchSelectId = 0;

    @observable searchSelectIdx = 0;

    @observable total = 0;

    @observable totalAppend = 0;

    @observable saved = {};

    @observable view = {};

    @observable insertStatus = false;

    @observable saveStatus = {};

    @action
    update(items, append) {
        if (append) {
            this[this.namePlural] = this[this.namePlural].concat(items);
        } else {
            this[this.namePlural] = items;
        }
    }

    @action
    deleteElement(val, field = 'id') {
        const idx = this[this.namePlural].findIndex(e => e[field] === val);
        if (idx >= 0) {
            this[this.namePlural] = this[this.namePlural].filter(e => e[field] !== val);
        }
    }

    @action
    updateKeyValue(key, value) {
        this[key] = value;
    }

    @action
    updateSaveStatus(key, value) {
        this.saveStatus[key] = value;
    }

    @action
    updateItem(item) {
        this[this.name] = item;
    }

    @action
    updateField(id, field, value, findBy = 'id') {
        const idx = this[this.namePlural].findIndex(e => e[findBy] === id);
        if (idx >= 0) {
            const obj = this[this.namePlural][idx];
            util.setNestedValue(obj, field, value);
        }
        // else {
        //     const obj = this[this.namePlural];
        //     util.setNestedValue(obj, field, value);
        // }
        if (this[this.name]) {
            util.setNestedValue(this[this.name], field, value);
        }
    }

    @action
    updateQueryFilter(queryFilter) {
        this.queryFilter = queryFilter;
        util.setObject(`${this.name}QueryFilter`, this.queryFilter);
    }

    @action
    updateSort(sort) {
        this.sort = sort;
    }

    @action
    updateOffset(offset) {
        this.offset = offset;
    }

    @action
    updateTotal(total) {
        this.total = total;
    }

    @action
    updateTotalAppend(total) {
        this.totalAppend = total;
    }

    @action
    updateSaved(key, val) {
        if (val) {
            this.saved[key] = val;
        } else {
            delete this.saved[key];
        }
    }

    @action
    toggleView(element, value) {
        this.view[element] = value || !this.view[element];
    }

    @action
    resetQueryFilter() {
        this.updateQueryFilter({});
    }

    @action
    toggleQueryfilter = (filter, value = 1, opt = {}) => {
        const finalFilter = { ...this.queryFilter };
        if (opt.setValue) {
            finalFilter[filter] = value;
        } else {
            finalFilter[filter] = finalFilter[filter] ? null : value;
        }
        if (!finalFilter[filter] && finalFilter[filter] !== 0) {
            delete finalFilter[filter];
        }
        this.updateQueryFilter(finalFilter);
        if (!opt.skipUpdate) {
            this.list();
            if (typeof this.tree === 'function') {
                this.tree();
            }
        }
        if (opt.viewElement) {
            opt.toggleView(opt.viewElement);
        }
        if (opt.setTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(async () => {
                this.list();
                if (typeof this.tree === 'function') {
                    this.tree();
                }
            }, 750);
        }
        if (typeof opt.toggle === 'function') {
            opt.toggle(value);
        }
    }

    @action
    updateSearchSelectId(id) {
        this.searchSelectId = id;
    }

    @action
    updateSearchResults(items) {
        this.searchResults = items;
    }

    @action
    updateSearchTotal(total) {
        this.totalSearch = total;
    }

    @action
    incSearchSelectIdx() {
        this.searchSelectIdx += 1;
        if (this.searchSelectIdx >= this.totalSearch) {
            this.searchSelectIdx = this.totalSearch - 1;
        }
        const item = { ...this.searchResults[this.searchSelectIdx] };
        this.updateSearchSelectId(item.id);
    }

    @action
    decSearchSelectIdx() {
        this.searchSelectIdx -= 1;
        if (this.searchSelectIdx < 0) {
            this.searchSelectIdx = 0;
        }
        const item = { ...this.searchResults[this.searchSelectIdx] };
        this.updateSearchSelectId(item.id);
    }

    @action
    resetSearch() {
        this.updateSearchResults([]);
        this.updateSearchTotal(0);
        this.updateSearchSelectId(0);
        this.searchSelectIdx = 0;
    }

    @action
    addElement(idx, dataObj, field) {
        let element = {};
        if (typeof idx === 'object') {
            element = { ...idx };
        } else {
            element = this.getElement(idx);
        }
        if (typeof this[dataObj][field] === 'undefined') {
            this[dataObj][field] = [];
        }
        const elIdx = this[dataObj][field].findIndex(e => parseInt(e.id, 10) === element.id);
        if (elIdx < 0) {
            this[dataObj][field].push(element);
            this.save({
                [field]: this[dataObj][field],
            });
        }
    }

    getElement(idx) {
        const index = idx || this.searchSelectIdx;
        return {
            id: this.searchResults[index].id,
            title: this.searchResults[index].title,
        };
    }

    @action
    removeElement(id, dataObj, field) {
        const elId = parseInt(id, 10);
        const elIdx = this[dataObj][field].findIndex(e => parseInt(e.id, 10) === elId);
        if (elIdx >= 0) {
            this[dataObj][field] = this[dataObj][field].filter(e => parseInt(e.id, 10) != elId);
            // this[dataObj][field].splice(elIdx, 1); // Not detected by observers.
            this.save({
                [field]: this[dataObj][field],
            });
        }
    }

    async search(searchText = '') {
        if (searchText === '') {
            this.updateSearchSelectId(0);
            this.updateSearchResults([]);
            this.updateSearchTotal(0);
            return false;
        }
        const url = util.getNestedValue(this, 'api.search.url');
        const apiParams = util.getNestedValue(this, 'api.search.params');
        const response = await util.fetchApi(url, { publish: true }, {
            sort: this.sort,
            limit: this.limit,
            ...apiParams,
            search: searchText,
        });
        if (response.data) {
            this.updateSearchSelectId(0);
            this.updateSearchResults(response.data);
            this.updateSearchTotal(response.data.length);
        }
    }

    async load(id = '', append, opt = {}) {
        // if (!append) {
        //     this.updateOffset(0);
        // }
        const url = util.getNestedValue(this, 'api.load.url');
        const qf = opt.skipFilter ? {} : this.queryFilter;
        const queryFilter = id ? {} : { ...qf };
        const response = await util.fetchApi(`${url}${id}`, { publish: true }, util.cleanObject({
            extendedView: this.extendedView,
            offset: this.offset,
            limit: this.limit,
            sort: this.sort,
            ...queryFilter,
        }));
        if (response.status < 400) {
            if (Array.isArray(opt.addData)) {
                opt.addData.forEach((el) => {
                    if (response[el]) {
                        this.updateKeyValue(el, response[el]);
                    }
                });
            }
            if (id) {
                if (Array.isArray(response.data)) {
                    this.updateItem(response.data[0]);
                } else {
                    this.updateItem(response.data);
                }
            } else {
                this.update(response.data, append);
                if (append) {
                    this.updateTotalAppend(response.data.length);
                } else {
                    this.updateTotal(response.total);
                    window.scrollTo(0, 0);
                }
            }
            if (typeof this.parseElements === 'function') {
                this.parseElements();
            }
        }
    }

    async list(append, opt = {}) {
        return this.load(undefined, append, opt);
    }

    async saveField(id, field, value, updateMemory) {
        const url = util.getNestedValue(this, 'api.save.url');
        if (updateMemory) {
            this.updateField(id, field, value);
        }
        this.updateSaved(`${field}.${id}`, true);
        const response = await util.fetchApi(`${url}${id}`, {
            publish: true,
            method: 'PATCH',
        }, {
            [field]: value,
        });
        if (response.status < 300) {
            // Remove saved
            setTimeout(() => {
                this.updateSaved(`${field}.${id}`);
            }, 2000);
        }
    }

    async insert(data) {
        const url = util.getNestedValue(this, 'api.save.url');
        await util.fetchApi(`${url}`,
            { publish: true, method: 'POST' }, {
                ...data,
            });

        this.updateKeyValue('insertStatus', true);
        clearTimeout(this.insertTimer);
        this.insertTimer = setTimeout(async () => {
            this.updateKeyValue('insertStatus', false);
        }, 2000);
    }

    async save(data) {
        const url = util.getNestedValue(this, 'api.save.url');
        await util.fetchApi(`${url}${this[this.name].id}`,
            { publish: true, method: 'PATCH' }, {
                ...data,
            });

        this.updateSaveStatus(data.id, true);
        clearTimeout(this.insertTimer);
        this.insertTimer = setTimeout(async () => {
            this.updateSaveStatus(data.id, false);
        }, 2000);
    }

    async delete(id, field = 'id', data = {}) {
        this.deleteElement(id, field);
        const url = util.getNestedValue(this, 'api.delete.url');
        await util.fetchApi(`${url}${id}`,
            { publish: true, method: 'DELETE' }, {
                ...data,
            });
    }
}

export default StoreModel;

