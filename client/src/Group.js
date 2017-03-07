import { Config } from './Config.js';
import { DataUtils } from "./DataUtils.js"


class Group {
    constructor(id, name, color, type) {
        this._id = id;
        this._data = [];
        this._set = new Map(); //a set to save data.
        this._name = name;
        this._color = color;
        this._mode = "new";  //"new", "unite", "intersect", "remove"
        this._type = type;
        this._lastModified = new Date();
    }


    updateData(list) {
        if (this._mode == "new") {
            this._data = list;
            this.updateSet();
        }
        if (this._mode  == "unite") {
            this._data = _.union(this._data, list);
            this.updateSet();
        }
        if (this._mode  == "intersect") {
            this._data = _.intersection(this._data, list);
            this.updateSet();
        }
        if (this._mode  == "remove") {
            this._data = _.difference(this._data, list);
            this.updateSet();
        }
        this.lastModified = new Date();
        return this._data;
    }

    updateSet() {
        this._set = new Set(this._data);
    }

    removeData(list) {
        console.log("remove", list)
        this._data = _.difference(this._data, list);
        this.updateSet();
    }

    addData(list) {
        console.log("add", list);
        if (list == [-1])
            console.log("warning!");
        this._data = _.union(this._data, list);
        this.updateSet();
    }

    containsDoc(docID) {
        return this._set.has(docID);
    }

    get id() {
        return this._id;
    }

    get data() {
        return this._data;
    }

    get name() {
        return this._name;
    }

    set name(name) {
        this._name = name;
    }

    get mode() {
        return this._mode;
    }

    set mode(mode) {
        this._mode = mode;
        this._lastModified = new Date();
    }

    get lastModified() {
        return this._lastModified;
    }

    set lastModified(time) {
        this._lastModified = time;
    }

    get color() {
        return this._color;
    }

    set color(color) {
        this._color = color;
    }

    get set() {
        return this._set;
    }

    get type() {
        return this._type;
    }

    set type(type) {
        this._type = type;
    }
}


export { Group };
