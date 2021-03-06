import {Utils} from "../Utils.js";
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {BaseView} from './BaseView.js';
import viewTemplate from "../../templates/views/timeline-view.html!text";

import "crossfilter";
import "dc";
import "dc-css!css";

class TimelineView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "timeline-view", viewTitle, viewTemplate, layout);
        window.TimelineView = this;
        this._init();
    }

    _init() {
        var _this = this;

        this.data = DataCenter.data;
        this.filteredData = this.data;

        this.setTimelineUnit();
        this._initView();
        this.render();

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            if (data.view == _this) 
                return;
            _this.filteredData = FilterCenter.getFilteredDataByView(_this);
            _this.reRender();
        })
    }

    _initView() {
        var { width, height } = this.getViewSize();
        d3.select(this.getContainer())
            .append("div")
            .attr("class", "focus-timeline")
            .attr("width", width)
            .attr("height", height);

        d3.select(this.getContainer())
            .append("div")
            .attr("class", "overview-timeline")
            .attr("width", width)
            .attr("height", height);

        this.overviewTimelineChart = dc.barChart("#" + this.getContainerID() + " .overview-timeline"); 
        this.focusTimelineChart = dc.barChart("#" + this.getContainerID() + " .focus-timeline");
    }

    // _initControllerGUI() {
    //     var _this = this;
    //     var datGUI = DatGUI.gui;
    //     var folder = this.datGUI.addFolder(this.viewTitle);
    //     var timeUnits = ["year", "month", "day", "hour", "minute", "second"];
    //     var options =  {
    //         overviewTimeUnit: timeUnits[1],
    //         focusTimeUnit: timeUnits[2]
    //     }
    //     this.overviewTimeUnitController = folder.add(options, "overviewTimeUnit", timeUnits);
    //     this.focusTimeUnitController = folder.add(options, "focusTimeUnit", timeUnits);

    //     this.overviewTimeUnitController.onChange(timeUnitChanged);
    //     this.focusTimeUnitController.onChange(timeUnitChanged);
    //     function timeUnitChanged() {
    //         _this.setTimelineUnit(_this.overviewTimeUnitController.getValue(), _this.focusTimeUnitController.getValue());
    //         _this.render();
    //     }
    // }   

    setTimelineUnit() {
        var minTime = _.minBy(this.data, 'time').time,
            maxTime = _.maxBy(this.data, 'time').time;
        
        var timeInterval = (maxTime - minTime)/1000,
            days = timeInterval/86400,
            months = days/30,
            years = months/12;

        if(years >= 10){
            this.overviewTimeInterval = d3.time['year'];
            this.overviewTimeUnits = d3.time['years'];
        }
        else if(years >= 3){
            this.overviewTimeInterval = d3.time['month'];
            this.overviewTimeUnits = d3.time['months'];
        }else{
            this.overviewTimeInterval = d3.time['day'];
            this.overviewTimeUnits = d3.time['days'];
        }
        this.focusTimeInterval = d3.time['day'];
        this.focusTimeUnits = d3.time['days'];
        // this.focusTimeInterval = d3.time[focusUnit];
        // this.focusTimeUnits = d3.time[focusUnit + "s"];
        // this.overviewTimeInterval = d3.time[overviewUnit];
        // this.overviewTimeUnits = d3.time[overviewUnit + "s"];
    } 

    getDataCountGroup(data) {
        var _this = this;
        var ndx = crossfilter(data),
            timeDim = ndx.dimension(function(d) {return d["_MAINTIME"]});
        var focusCountGroup = timeDim.group(function(time) {
                return _this.focusTimeInterval.floor(new Date(time))
            }).reduceCount();
        var overviewCountGroup = timeDim.group(function(time) {
                return _this.overviewTimeInterval.floor(new Date(time))
            }).reduceCount();
        return {
            "focusCountGroup": focusCountGroup,
            "overviewCountGroup": overviewCountGroup,
            "timeDim": timeDim
        }
    }

    render() {
        var _this = this;
        var countGroup = this.getDataCountGroup(this.data);
        var timeDim = countGroup.timeDim;
        var focusCountGroup = countGroup.focusCountGroup;
        var overviewCountGroup = countGroup.overviewCountGroup;   

        var startTime = timeDim.bottom(1)[0]["_MAINTIME"], 
            endTime = timeDim.top(1)[0]["_MAINTIME"];

        var { width, height } = this.getViewSize();
        var focusX = d3.time.scale()
                    .domain([this.focusTimeInterval.floor(startTime), this.focusTimeInterval.ceil(endTime)])
                    .range([0, width])
                    .nice(this.focusTimeInterval);
        var overviewX = d3.time.scale()
                    .domain([this.overviewTimeInterval.floor(startTime), this.overviewTimeInterval.ceil(endTime)])
                    .range([0, width])
                    .nice(this.overviewTimeInterval);

        this.focusTimelineChart
            .width(width)
            .height(height * 0.8)
            .dimension(timeDim)
            .group(focusCountGroup)
            .elasticY(true)
            .gap(1)
            .round(this.focusTimeInterval.round)
            .alwaysUseRounding(true)
            .xUnits(this.focusTimeUnits)
            .x(focusX)
            .rangeChart(this.overviewTimelineChart)
            

        this.overviewTimelineChart
            .width(width)
            .height(height * 0.8)
            .dimension(timeDim)
            .group(overviewCountGroup)
            .elasticY(true) 
            .round(this.overviewTimeInterval.round)
            .x(overviewX)
            .xUnits(this.overviewTimeUnits)
            .alwaysUseRounding(true)
            .gap(1);


        this.focusTimelineChart.yAxis().ticks(2);
        this.overviewTimelineChart.yAxis().ticks(2);

        this.reRender();

        this.focusTimelineChart.on("filtered", function(chart, filter) {
            if (filter == null) 
                FilterCenter.removeFilter(_this);
            else {
                var start = new Date(filter[0]).getTime(), end = new Date(filter[1]).getTime();
                var filterData = _.filter(_this.data, function(doc) {
                    var time = new Date(doc["_MAINTIME"]).getTime();
                    return time >= start && time <= end;
                })
                FilterCenter.addFilter(_this, filterData);
            }
        })
    }

    reRender() {
        var _this = this;
        var countGroup = this.getDataCountGroup(this.filteredData);
        var timeDim = countGroup.timeDim;
        var focusCountGroup = countGroup.focusCountGroup;
        var overviewCountGroup = countGroup.overviewCountGroup; 

        var startTime = timeDim.bottom(1)[0]["_MAINTIME"], 
            endTime = timeDim.top(1)[0]["_MAINTIME"];

        var { width, height } = this.getViewSize();
        var focusX = d3.time.scale()
                    .domain([this.focusTimeInterval.floor(startTime), this.focusTimeInterval.ceil(endTime)])
                    .range([0, width])
                    .nice(this.focusTimeInterval);
        var overviewX = d3.time.scale()
                    .domain([this.overviewTimeInterval.floor(startTime), this.overviewTimeInterval.ceil(endTime)])
                    .range([0, width])
                    .nice(this.overviewTimeInterval);

        this.focusTimelineChart.group(focusCountGroup);
        this.focusTimelineChart.dimension(timeDim);
        this.focusTimelineChart.x(focusX);
        this.overviewTimelineChart.group(overviewCountGroup);
        this.overviewTimelineChart.dimension(timeDim);
        this.overviewTimelineChart.x(overviewX);
        this.focusTimelineChart.render();
        this.overviewTimelineChart.render();
    }

}

export { TimelineView };