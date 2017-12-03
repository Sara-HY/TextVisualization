import { Config } from './Config.js';
import { DataUtils } from "./DataUtils.js"
import { DataCenter} from "./DataCenter.js"

class FilterCenter {
    constructor() {
        FilterCenter._filters = new Map();
        FilterCenter._filteredData = new Map();
    }

    static addFilter(view, data) {
        FilterCenter._filters.set(view, data);
        this._filterChanged(view);
    }

    static removeFilter(view) {
        if (FilterCenter._filters.has(view) != false) {
            FilterCenter._filters.delete(view);    
            this._filterChanged(view);
        }
    }

    static _filterChanged(view) {
        var _this = this;
        this.lastFilterChangedView = view;
        if (!this._filterChangedDebounce) {
            this._filterChangedDebounce = _.debounce(function() {
                PubSub.publish("FilterCenter.Changed", {view: _this.lastFilterChangedView});
            }, 100, {"maxWait": 300});
        }
        FilterCenter._filteredData = new Map();
        this._filterChangedDebounce();
        
        this.spinner = new Spinner().spin($("body")[0]);
        setTimeout(function(){_this.spinner.stop();}, 5000);
    } 

    static getGroupByID(id) {
        return GroupCenter._groupMap[id];
    }

    static getFilteredDataByView(view) {
        var data = null;
        for (var tmpView of FilterCenter._filters.keys()) {
            // console.log(tmpView, view)
            // if (tmpView == view && view.viewID != "document-galaxy-view") 
            //     continue;
            if (data == null) {
                data = FilterCenter._filters.get(tmpView);
                continue;
            }
            data = _.intersection(data, FilterCenter._filters.get(tmpView));
        }
        if (data == null) {
            data = DataCenter.data;
        }
        FilterCenter._filteredData.set(view, data);
        return data;
    }

    static getFilterByView(view) {
        return FilterCenter._filters.get(view);
    }

    static get filters() {
        return FilterCenter._filters;
    }
}

//For testing
window.FilterCenter = FilterCenter;

export { FilterCenter };
