import {BaseView} from "./BaseView.js"
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/facets-view.html!text"

import "crossfilter";
import "dc";
import "dc-css!css";

class FacetsView extends BaseView {
	constructor(viewID, viewTitle, layout, config){
		super(viewID, "facets-view", viewTitle, viewTemplate, layout);
		window.FacetsView = this;
		this._init();
		this.render();
	}

	_init(){
		var _this = this;
		this._processData();

		PubSub.subscribe("DataCenter.TopicModel.Update", function(){
			_this.topicModel = DataCenter.topicModel;
			_this.renderTheme();
		})

		// PubSub.subscribe("FilterCenter.Changed", function(msg, data){
		// 		_this.filterData = FilterCenter.getFilteredDataByView(_this);
  //               _this.reRender();
  //       })
  		$(this.getContainer()).on("click", ".filter-btn", function() {
            var groupID = +$(this).attr("group-id");
            if ($(this).hasClass("active")) {  //取消filter
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                FilterCenter.removeFilter(_this);
            } else {
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                $(this).addClass("active");
                var type = $(this).attr("group-type"),
                	groupID = +$(this).attr("group-id");
                var selectedData = [];
                if(type == "Topic"){
                	var topic = _this.topicModel.getTopicByGroupID(groupID);
	                for (var id of topic.belongs) {
	                    selectedData.push(DataCenter.data[id]);
	                }
                }
                else{
                	var entitys = _.filter(_this.filterEntity, function(entity){
			        	return entity.type == type;
			        });
	            	selectedData = entitys[groupID].data;
                }
                FilterCenter.addFilter(_this, selectedData);        
            }
        })
	}

	_processData(){
        var _this = this;
        var docs = DataCenter.data;
        this.entityMap = {};
        this.entity = [];
        for(var doc of docs) {
            var ners = doc["_ner"];
            for(var entityType in ners) {
                for(var name of ners[entityType]){
                    if(!(name in this.entityMap)){
                        this.entityMap[name] = {
                            "word": name,
                            "count": 1,
                            "data":[],
                            "id": -1,
            				"type": entityType
                        }
                        this.entityMap[name]["data"].push(doc);
                        this.entity.push(this.entityMap[name]);
                    }
                    else{
                        this.entityMap[name]["count"]++;
                        this.entityMap[name]["data"].push(doc);
                    }
                }
            }
        }

        this.entity.sort(function(a, b){
            return b["count"] - a["count"];
        })

        var sizeList = [];
        for (var name in this.entityMap) {
            sizeList.push(this.entityMap[name]["count"]);
        }        
        sizeList.sort(function(a, b) {return b - a});

        var nodeWeightFilterThreshold = this._getSizeThreshold(sizeList);

        this.filterEntity = _.filter(this.entity, function(entity){
        	return entity.count >= nodeWeightFilterThreshold;
        });
    }

    _getSizeThreshold(sizeList) {
        var sizeThreshold = 50, sizeTolerant = 10;
        var filterThreshold = 0;
        if (sizeList.length > sizeThreshold) {
            if (sizeList.length <= sizeThreshold + sizeThreshold)
                filterThreshold = sizeList[sizeThreshold];
            else if (sizeList[sizeThreshold] == sizeList[sizeThreshold + sizeTolerant]) {
                filterThreshold = sizeList[sizeThreshold] + 1;
            } else 
                filterThreshold = sizeList[sizeThreshold];
        } 
        return filterThreshold;       
    }

	renderTheme() {
        var _this = this;
        var docs = DataCenter.data;
        var tpl = _.template($(_this.viewTemplate).find("#facets-template").html())
        var groups = _.filter(GroupCenter.groups, function(group) {
                return group.type == "Topic";
            });
        $(this.getContainer()).find("#facets-theme").html("");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var topWords = DataCenter.docTextProcessor.getTopKeywordsByTFIDF(_this, group.data, 2, true);
            var html = tpl({facet: "theme", group: group, topWords: topWords});
            $(_this.getContainer()).find("#facets-theme").append(html);
        }

        for (var i = 0; i < groups.length; i++) {
        	var group = groups[i];

        	var thumbnail = "#Topic"+group.id;
            var timeLine = dc.lineChart(thumbnail);

        	var data = [];
            if(group.data && group.data.length){
                for (var id of group.data)
                    data.push(DataCenter.data[id]);
            }
          
            var ndx = crossfilter(data),
            	timeDim = ndx.dimension(function(d) {return d["_MAINTIME"]});
            var timeInterval = d3.time["day"];
            var countGroup = timeDim.group(function(time) {
            	return timeInterval.floor(new Date(time))
            }).reduceCount();
            var startTime = timeDim.bottom(1)[0]["_MAINTIME"], 
            	endTime = timeDim.top(1)[0]["_MAINTIME"]; 

            var { width, height } = this.getViewSize(); 
            var x = d3.time.scale()
                    .domain([timeInterval.floor(startTime), timeInterval.ceil(endTime)])
                    .range([0, width/4 * 3])
                    .nice(timeInterval);

            timeLine.width(width/4)
	            .height("50")
	            .dimension(timeDim)
	            .group(countGroup)
	            .brushOn(false)
	            .elasticY(true)
	            .round(d3.time.day.round)
	            .xUnits(d3.time["days"])
	            .x(x)
	            .renderArea(true);

	        timeLine.yAxis().ticks(0);
	        timeLine.xAxis().ticks(0);
	        timeLine.render();

	    	timeLine.selectAll(".y").attr("display", "none");
	    	timeLine.selectAll(".x").attr("display", "none");
	    	timeLine.selectAll(".chart-body").attr("transform", "translate(0, 0)")
	    	$(this.getContainer()).find(thumbnail + " svg").children("g").attr("transform", "translate(5, 0)scale(3, 1.5)");
	    }
	}

    renderGroup(facet) {
        var _this = this;
        var docs = DataCenter.data;
        var id = "#facets-" + facet;
        var tpl = _.template($(_this.viewTemplate).find("#facets-template").html())
      
        $(this.getContainer()).find(id).html("");
        var entitys = _.filter(this.filterEntity, function(entity){
        	return entity.type == facet;
        });
    
        for(var i=0; i<entitys.length; i++){
        	entitys[i]["id"] = i;
        }

        for (var i = 0; i < entitys.length; i++) {
            var entity = entitys[i];
            var topWords = []
       		topWords.push(entity);
            var html = tpl({facet: facet, group: entity, topWords: topWords});
            $(_this.getContainer()).find(id).append(html);
        }

        for (var i = 0; i < entitys.length; i++) {
        	var entity = entitys[i];
        	var thumbnail = "#" + facet + i;

            var timeLine = dc.lineChart(thumbnail);

            var ndx = crossfilter(entity.data),
            	timeDim = ndx.dimension(function(d) {return d["_MAINTIME"]});
            var timeInterval = d3.time["day"];
            var countGroup = timeDim.group(function(time) {
            	return timeInterval.floor(new Date(time))
            }).reduceCount();
            var startTime = timeDim.bottom(1)[0]["_MAINTIME"], 
            	endTime = timeDim.top(1)[0]["_MAINTIME"]; 

            var { width, height } = this.getViewSize(); 
            var x = d3.time.scale()
                    .domain([timeInterval.floor(startTime), timeInterval.ceil(endTime)])
                    .range([0, width/4])
                    .nice(timeInterval);

            timeLine.width(width/4)
	            .height("50")
	            .dimension(timeDim)
	            .group(countGroup)
	            .brushOn(false)
	            .elasticY(true)
	            .round(d3.time.day.round)
	            .xUnits(d3.time["days"])
	            .x(x)
	            .renderArea(true);


	        timeLine.yAxis().ticks(0);
	        timeLine.xAxis().ticks(0);
	        timeLine.render();

	    	timeLine.selectAll(".y").attr("display", "none");
	    	timeLine.selectAll(".x").attr("display", "none");
	    	timeLine.selectAll(".chart-body").attr("transform", "translate(0, 0)")
	    	$(this.getContainer()).find(thumbnail + " svg").children("g").attr("transform", "translate(2, 0)scale(3, 1)");
	    }
	}

	render() {
		this.renderTheme();
		this.renderGroup("name");
		this.renderGroup("place");
		this.renderGroup("organization");
	}

	// reRender() {
	// 	var _this = this;
	// 	var groups = _.filter(GroupCenter.groups, function(group) {
 //                return group.type == "Topic";
 //            });
	// 	for (var i = 0; i < groups.length; i++) {
 //        	var group = groups[i];

 //        	var thumbnail = "#Topic"+group.id;
 //        	$(this.getContainer()).find(thumbnail + " svg").innerHTML = '';
 //            var timeLine = dc.lineChart(thumbnail);

 //        	var data = [];
 //            if(group.data && group.data.length){
 //                for (var id of group.data)
 //                    data.push(DataCenter.data[id]);
 //            }
 //            console.log(_this.filterData.length, _this.filterData, data);
 //            for(var j=0; j< data.length; j++){
 //            	if(_this.filterData.indexOf(data[j]) < 0)
 //            		data[j]._filter = 0;
 //            	else
 //            		data[j]._filter = 1;
 //            }

 //          	var filterData = _.filter(data, function(data){
	//         	return data._filter == 1;
	//         })
	//         console.log(filterData, filterData.length)

 //            var ndx = crossfilter(filterData),
 //            	timeDim = ndx.dimension(function(d) {return d["_MAINTIME"]});
 //            var timeInterval = d3.time["month"];
 //            var countGroup = timeDim.group(function(time) {
 //            	return timeInterval.floor(new Date(time))
 //            }).reduceCount();

 //            var startTime = timeDim.bottom(1)[0]["_MAINTIME"], 
 //            	endTime = timeDim.top(1)[0]["_MAINTIME"]; 

 //            var { width, height } = this.getViewSize(); 
 //            var x = d3.time.scale()
 //                    .domain([timeInterval.floor(startTime), timeInterval.ceil(endTime)])
 //                    .range([0, width/4 * 3])
 //                    .nice(timeInterval);

 //            console.log(this.themeLine[i])
 //            this.themeLine[i].dimension(timeDim);
	//         this.themeLine[i].group(countGroup);
	//         this.themeLine[i].x(x);
 
	//         this.themeLine[i].yAxis().ticks(0);
	//         this.themeLine[i].xAxis().ticks(0);
	//         this.themeLine[i].render();

	//     	this.themeLine[i].selectAll(".y").attr("display", "none");
	//     	this.themeLine[i].selectAll(".x").attr("display", "none");
	//     	this.themeLine[i].selectAll(".chart-body").attr("transform", "translate(0, 0)")
	//     	$(this.getContainer()).find(thumbnail + " svg").children("g").attr("transform", "translate(5, 0)scale(3, 1.5)");
	//     }
	// }
}

export { FacetsView };


