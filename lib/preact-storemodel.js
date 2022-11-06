/*
 * https://github.com/5orenso
 *
 * Copyright (c) 2020 Øistein Sørensen
 * Licensed under the MIT license.
 */

import { observable, configure, action, computed } from 'mobx';
import util from 'preact-util';
import { diff } from 'deep-diff';

configure({ enforceActions: 'always' });

const isDevelopment = process.env.NODE_ENV === 'development';

function consoleLog(...args) {
    if (isDevelopment) {
        console.log(...args);
    }
}

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

    @observable limit = this.opts.limit;

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
            this[this.namePlural] = this[this.namePlural]?.concat(items);
        } else {
            const newObject = JSON.stringify(items);
            const currentObject = JSON.stringify(this[this.namePlural]);
            if (newObject !== currentObject) {
                consoleLog(`preact-storemodel.update.${this.namePlural}: Updating values.`);
                this[this.namePlural] = items;
            } else {
                consoleLog(`preact-storemodel.update.${this.namePlural}: Skipping update. Values are the same.`);
            }
        }
    }

    @action
    add(val, field = 'id') {
        if (!util.isArray(this[this.namePlural])) {
            return null;
        }
        const idx = this[this.namePlural].findIndex(e => e[field] === val);
        if (idx === -1) {
            this[this.namePlural].push(val);
        }
    }

    @action
    get(val, field = 'id') {
        if (!util.isArray(this[this.namePlural])) {
            return null;
        }
        const idx = this[this.namePlural].findIndex(e => e[field] === val);
        if (idx >= 0) {
            return this[this.namePlural][idx];
        }
        return null;
    }

    @action
    deleteElement(val, field = 'id') {
        if (!util.isArray(this[this.namePlural])) {
            return null;
        }
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
    updateObjectKeyValue(obj, key, value) {
        this[obj][key] = value;
    }

    @action
    updateSaveStatus(key, value) {
        this.saveStatus[key] = value;
    }

    @action
    updateItem(item) {
        const newObject = JSON.stringify(item);
        const currentObject = JSON.stringify(this[this.name]);
        if (newObject !== currentObject) {
            if (isDevelopment) {
                const differences = diff(lhs, rhs);
                consoleLog(`preact-storemodel.updateItem.${this.name}: Diff:`, differences);
            }
            consoleLog(`preact-storemodel.updateItem.${this.name}: Updating values.`);
            this[this.name] = item;
        } else {
            consoleLog(`preact-storemodel.updateItem.${this.name}: Skipping update. Values are the same.`);
        }
    }

    @action
    updateField(id, field, value, findBy = 'id') {
        if (util.isArray(this[this.namePlural])) {
            const idx = this[this.namePlural].findIndex(e => e[findBy] === id);
            // consoleLog('updateField', id, field, value, idx, this[this.name]);
            if (idx >= 0) {
                const obj = this[this.namePlural][idx];
                util.setNestedValue(obj, field, value);
            }
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
    updateFieldByName({ namePlural = this.namePlural, name = this.name, id, field, value, findBy = 'id' }) {
        if (util.isArray(this[this.namePlural])) {
            const idx = this[namePlural].findIndex(e => e[findBy] === id);
            // consoleLog('updateField', id, field, value, idx, this[this.name]);
            if (idx >= 0) {
                const obj = this[namePlural][idx];
                util.setNestedValue(obj, field, value);
            }
        }
        // else {
        //     const obj = this[this.namePlural];
        //     util.setNestedValue(obj, field, value);
        // }
        if (this[name]) {
            util.setNestedValue(this[name], field, value);
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
        if (util.isArray(this[dataObj][field])) {
            const elIdx = this[dataObj][field].findIndex(e => parseInt(e.id, 10) === element.id);
            if (elIdx < 0) {
                this[dataObj][field].push(element);
                this.save({
                    [field]: this[dataObj][field],
                });
            }
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
        if (util.isArray(this[dataObj][field])) {
            const elIdx = this[dataObj][field].findIndex(e => parseInt(e.id, 10) === elId);
            if (elIdx >= 0) {
                this[dataObj][field] = this[dataObj][field].filter(e => parseInt(e.id, 10) != elId);
                // this[dataObj][field].splice(elIdx, 1); // Not detected by observers.
                this.save({
                    [field]: this[dataObj][field],
                });
            }
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

    @action
    handleApiLoadResponse(response, id = '', append, opt = {}) {
        if (response.status < 400) {
            if (Array.isArray(opt.addData)) {
                opt.addData.forEach((el) => {
                    if (response[el]) {
                        this.updateKeyValue(el, response[el]);
                    } else if (response.included && response.included[el]) {
                        this.updateKeyValue(el, response.included[el]);
                    }
                });
            }
            if (opt.skipUpdate) {
                return response.data;
            } else {
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
            }
            // If you want to do something useful after the load is finish.
            if (typeof this.afterLoad === 'function') {
                this.afterLoad(response, opt);
            }
            // Deprecated name. Should be named something more useful.
            if (typeof this.parseElements === 'function') {
                this.parseElements();
            }
        }
    }

    async load($id = '', append, $opt = {}) {
        // if (!append) {
        //     this.updateOffset(0);
        // }

        let opt;
        let id;
        if (util.isObject($id)) {
            opt = $id;
            id = '';
        } else {
            id = $id;
            opt = $opt;
        }
        const url = this.apiLoadUrl || util.getNestedValue(this, 'api.load.url');
        const qf = opt.skipFilter ? {} : (opt.query || this.queryFilter);
        const queryFilter = id ? {} : { ...qf };

        let addData;
        if (Array.isArray(opt.addData) && opt.addData.length > 0) {
            addData = opt.addData.join(',');
        }
        // If you want to do something useful before the load is finish.
        if (typeof this.beforeLoad === 'function' && !opt.skipUpdate && !opt.offset) {
            this.beforeLoad({ id, addData, queryFilter });
        }
        const response = await util.fetchApi(`${url}${id}`, { publish: true }, util.cleanObject({
            addData,
            extendedView: this.extendedView,
            offset: opt.offset || this.offset,
            limit: opt.limit || this.limit,
            sort: opt.sort || this.sort,
            ...queryFilter,
        }));
        return this.handleApiLoadResponse(response, id, append, opt);
    }

    async list(append, opt = {}) {
        return this.load(undefined, append, opt);
    }

    async saveField(id, field, value, updateMemory, opt = {}) {
        const url = util.getNestedValue(this, 'api.save.url');
        if (updateMemory) {
            this.updateField(id, field, value);
        }
        this.updateSaved(`${field}.${id}`, true);
        const body = {
            [field]: value,
        };
        if (opt.query) {
            body.query = opt.query;
        }

        const response = await util.fetchApi(`${url}${id}`, {
            publish: true,
            method: 'PATCH',
        }, body);
        if (response.status < 300) {
            // Remove saved
            setTimeout(() => {
                this.updateSaved(`${field}.${id}`);
            }, 2000);
        }
    }

    async insert(data) {
        const url = util.getNestedValue(this, 'api.save.url');
        const response = await util.fetchApi(`${url}`,
            { publish: true, method: 'POST' }, {
                ...data,
            });
        if (response.status < 400) {
            this.updateKeyValue('insertStatus', true);
            clearTimeout(this.insertTimer);
            this.insertTimer = setTimeout(async () => {
                this.updateKeyValue('insertStatus', false);
            }, 2000);
        }
        return response;
    }

    async save(data, id) {
        const objId = id || data.id || this[this.name].id;
        const url = util.getNestedValue(this, 'api.save.url');
        await util.fetchApi(`${url}${objId}`,
            { publish: true, method: 'PATCH' }, {
                ...data,
            });

        this.updateSaveStatus(objId, true);
        clearTimeout(this.insertTimer);
        this.insertTimer = setTimeout(async () => {
            this.updateSaveStatus(objId, false);
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

