import {Utils} from "../Utils.js";
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {BaseView} from './BaseView.js';
import viewTemplate from "../../templates/views/entity-graph-view.html!text"

import "d3-tip"
import "d3-tip-css!css"

class EntityGraphView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "entity-graph-view", viewTitle, viewTemplate, layout);
        window.EntityGraphView = this;
        this._init();
    }

    _init() {
        var _this = this;
        this.data = DataCenter.data;
        this.filteredSet = new Set(this.data);
        this.spinner.spin(this.getContainer());
        _this.selectedNode = [];
        this._initView();
        this._processData();
        this.render();
        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            // console.log("FilterCenter.Changed");
            _this.filteredData = FilterCenter.getFilteredDataByView(_this);
            _this.filteredSet = new Set(_this.filteredData);
            // _this._updateData();
            _this.reRender();
        })  

        PubSub.subscribe("LinkDistance.Changed", function(msg, data) {
            _this.updateRender();         
        })

        $(_this.getContainer()).find("#straight").click(function(){
            _this.lineType = "straight"        
            $(_this.getContainer()).find("#curve-line").attr("class", "hide")
            $(_this.getContainer()).find("#straight-line").attr("class", "show")        
        })

        $(_this.getContainer()).find("#curve").click(function(){
            _this.lineType = "curve"        
            $(_this.getContainer()).find("#curve-line").attr("class", "show")
            $(_this.getContainer()).find("#straight-line").attr("class", "hide")      
        })

        $(_this.getContainer()).find("#refresh").click(function(){
            _this.updateRender();
        })
    }

    _initView() {
        var _this = this;
        var { width, height } = this.getViewSize();

        this.diagonal = d3.svg.diagonal()

        this.graphSize = Math.min(width, height-50);

        this.graph = d3.select("#entity-svg").append("svg")
            .attr("width", this.graphSize)
            .attr("height", this.graphSize)
            .attr("transform", "translate(" + (width-this.graphSize)/2 + ")");

        this.legend = this.graph.append("svg:g")
            .attr({width:100, height:50, x:this.graphSize-55, y:this.graphSize-5})
            
        this.legend.append("circle")
            .attr("r", 5)
            .attr({width:105, height:4, cx:this.graphSize-90, cy:this.graphSize-10, fill: "#2ca02c"})

        this.legend.append("svg:text")
            .text("Organization")
            .attr({x:this.graphSize-80, y:this.graphSize-5})

        this.legend.append("circle")
            .attr("r", 5)
            .attr({width:105, height:4, cx:this.graphSize-90, cy:this.graphSize-30, fill: "#ff7f0e"})

        this.legend.append("svg:text")
            .text("Name")
            .attr({x:this.graphSize-80, y:this.graphSize-25})

        this.legend.append("circle")
            .attr("r", 5)
            .attr({width:105, height:4, cx:this.graphSize-90, cy:this.graphSize-50, fill: "#1f77b4"})

        this.legend.append("svg:text")
            .text("Place")
            .attr({x:this.graphSize-80, y:this.graphSize-45})

        this.svg = this.graph.attr("pointer-events", "all")
                .append('svg:g')
                .attr("cursor", "pointer")
                .call(d3.behavior.zoom()
                    .scaleExtent([0.5, 3])
                    .on("zoom", function(){
                        // var scale = d3.event.scale,
                        //     currentX = (scale - 0.5) / (3 - 0.5) * parseInt(_this.scaleBarRect.attr("width")) + parseInt(_this.scaleBarRect.attr("x"));
                        // _this.scaleBarButton.attr("x", currentX);
                        // _this.scaleText.text(scale.toFixed(2));
                        // var translateY = (_this.graphSize - (_this.graphSize * _this.scaleText.text()))/ 2, 
                        //     translateX = (_this.graphSize - (_this.graphSize* _this.scaleText.text()))/ 2;
                        // _this.svg.attr("transform", "translate(" + [translateX, translateY] + ")" + "scale(" + _this.scaleText.text() + ")");
                        if(_this.scaleText.text() > 0)
                            _this.svg.attr("transform", "translate(" + d3.event.translate + ")" + "scale(" + _this.scaleText.text() + ")");

                    }))
                // .on("mousedown.zoom", null)
                .on('dblclick.zoom', null) 
            

        this.svgControll = d3.select("#controller")
            .append("svg")
            .attr("width", this.graphSize)
            .attr("height", 100)
            .attr({x:100, y:0})

        this.scaleBar = this.svgControll
            .append("svg:g")
            .attr({width:100, height:20, x:this.graphSize-5, y:0})

        this.scaleBar.append("svg:text")
            .text("Scaling")
            .attr({x:this.graphSize-300, y:12})

        this.scaleText = this.scaleBar.append("svg:text")
            .text("1.00")
            .attr({x:this.graphSize-130, y:12})

        this.scaleBarRect = this.scaleBar.append("rect")
            .attr({width:105, height:4, x:this.graphSize-240, y:7, fill: "#CCC"})

        this.scaleBarButton = this.scaleBar.append("rect")
            .attr({width:5, height:10, x:this.graphSize-220, y:4, fill: "#1c94c4", cursor: "pointer"})
            .call(d3.behavior.drag().on("drag", function(){ 
                var maxX = parseInt(_this.scaleBarRect.attr("x")) + parseInt(_this.scaleBarRect.attr("width")),
                    minX = _this.scaleBarRect.attr("x");

                var dx = (d3.event.x > maxX) ? maxX : ((d3.event.x < minX)? minX : d3.event.x);
                _this.scaleBarButton.attr("x", dx)

                var scale = (dx - minX)*(3 - 0.5)/_this.scaleBarRect.attr("width") + 0.5; 
                _this.scaleText.text(scale.toFixed(2)); 

                var translateY = (_this.graphSize - (_this.graphSize * scale))/ 2,
                    translateX = (_this.graphSize - (_this.graphSize * scale))/ 2; 
                _this.svg.attr("transform", "translate(" + [translateX, translateY] + ")scale(" + scale + ")"); 
            }))

        this.linkDistance = 30;
        this.update = 0;

        this.linkDistanceBar = this.svgControll
            .append("svg:g")
            .attr({width:100, height:20, x:this.graphSize-5, y:0})

        this.linkDistanceBar.append("svg:text")
            .text("LinkDistance")
            .attr({x:this.graphSize-330, y:32})

        this.linkDistanceText = this.linkDistanceBar.append("svg:text")
            .text(this.linkDistance)
            .attr({x:this.graphSize-125, y:32})

        this.linkDistanceBarRect = this.linkDistanceBar.append("rect")
            .attr({width:105, height:4, x:this.graphSize-240, y:27, fill: "#CCC"})

        this.linkDistanceBarButton = this.linkDistanceBar.append("rect")
            .attr({width:5, height:10, x:this.graphSize-220, y:24, fill: "#1c94c4", cursor: "pointer"})
            .call(d3.behavior.drag().on("drag", function(){
                var maxX = parseInt(_this.linkDistanceBarRect.attr("x")) + parseInt(_this.linkDistanceBarRect.attr("width")),
                    minX = _this.linkDistanceBarRect.attr("x");

                var dx = (d3.event.x > maxX) ? maxX : ((d3.event.x < minX)? minX : d3.event.x);
                _this.linkDistanceBarButton.attr("x", dx)
                _this.linkDistance = parseInt((dx - minX)*(110 - 10)/_this.linkDistanceBarRect.attr("width") + 10);
                _this.linkDistanceText.text(_this.linkDistance); 

                PubSub.publish("LinkDistance.Changed");
            }))

        this.lineType = "straight"
    }

    _processData() {
        var nerField = "_ner";
        var docs = DataCenter.data;
        var entityMap = {};
        for (var doc of docs) {
            var ners = doc[nerField];
            var nerList = [];
            for (var entityType in ners) {
                for (var name of ners[entityType]) {
                    if (!(name in entityMap)) {
                        entityMap[name] = {
                            "name": name, 
                            "type":new Set(), 
                            "weight": 0,      //用于计算当前filter出来数据中entity的weight
                            "fullWeight": 0,  //总的weight，不经过filter
                            "docs":[], 
                            "links": {}  // each link contains {size: n, docs:[]};
                        }
                    }
                    var entity = entityMap[name];
                    entity["type"].add(entityType);
                    entity["docs"].push(doc);
                    nerList.push(name);
                }
            }
            
            for (var name1 of nerList) {
                for (var name2 of nerList) {
                    if (name1 == name2) continue;
                    if (!(name2 in entityMap[name1].links))
                        entityMap[name1].links[name2] = {size: 0, docs: []};
                    entityMap[name1].links[name2].size += 1;
                    entityMap[name1].links[name2].docs.push(doc);
                }
            }
        }

        var sizeList = [];
        for (var name in entityMap) {
            var entity = entityMap[name];
            // entity["fullWeight"] = entity["weight"] = entity["docs"].length;
            entity["fullWeight"] = entity["docs"].length;
            sizeList.push(entity["fullWeight"]);
        }        
        sizeList.sort(function(a, b) {return b - a});
        // console.log("sizeList", sizeList);
        var nodeWeightFilterThreshold = this._getSizeThreshold(sizeList);

        var nodeMap = {};
        for (var name in entityMap) {
            // if (entityMap[name]["docs"].length >= nodeWeightFilterThreshold)
            // if (entityMap[name]["docs"].length > 2)
            if (entityMap[name]["docs"].length)
                nodeMap[name] = entityMap[name];
        }
        // console.log(nodeMap, Object.keys(nodeMap).length);
        // for (var name1 in entityMap) {
        //     if(nodeMap[name1])
        //         continue;
        //     for(var name2 in nodeMap){
        //         if(nodeMap[name2].links[name1]){
        //             nodeMap[name1] = entityMap[name1];
        //         }
        //     }
        // }
        // console.log(nodeMap, Object.keys(nodeMap).length);
        var nodes = _.values(nodeMap);
        // console.log("nodes", nodes)

        var edgeWeightFilterThreshold = 2;
        var edges = [];
        for (var entityName in nodeMap) {
            var neighbors = entityMap[entityName].links;
            for (var neighborEntityName in neighbors) {
                if (entityName < neighborEntityName) { //只计算无向边)
                    if (!(neighborEntityName in nodeMap))
                        continue;
                    var weight = neighbors[neighborEntityName].size;
                    // if (weight < edgeWeightFilterThreshold) continue;
                    edges.push({
                        source: entityMap[entityName],
                        target: entityMap[neighborEntityName],
                        weight: neighbors[neighborEntityName].size,
                        fullWeight: neighbors[neighborEntityName].size,
                        docs: neighbors[neighborEntityName].docs
                    })
                }
            }
        }

        this.entityMap = entityMap;
        this.nodes = nodes;
        this.edges = edges;
    }

    _updateData() {
        var data = this.filteredData;
        if (data.length == DataCenter.data.length) {
            for (var node of this.nodes) {
                node["weight"] = node["fullWeight"];
            }
            for (var edge of this.edges) {
                edge["weight"] = node["fullWeight"];
            }
        } else {
            var dataSet = new Set(data);
            for (var node of this.nodes) {
                var weight = 0;
                for (var doc of node.docs) {
                    if (dataSet.has(doc))
                        weight++;
                }
                node["weight"] = weight;
            }
            for (var edge of this.edges) {
                weight = 0;
                for (var doc of edge.docs) {
                    if (dataSet.has(doc))
                        weight++;
                }
                edge["weight"] = weight;
            }
        }
    }

    _getSizeThreshold(sizeList) {
        var sizeThreshold = 20, sizeTolerant = 10;
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

    render() {
        var _this = this;
        var width = this.graphSize, 
            height = this.graphSize;

        this.force = d3.layout.force()
            .nodes(this.nodes)
            .links(this.edges)
            .size([width, height])
            .charge(-100)
            .linkDistance(this.linkDistance)
            .alpha(0.8)
            .start();

        // var drag = this.force.drag().on("dragstart", function(d) {
        //     d3.select(this).classed("fixed", d.fixed = false);
        // })

        this.link = this.svg.append('g')
            .attr("id", "straight-line")
            .selectAll(".link")
            .data(this.edges)
            .enter().append("line")
            .attr("class", "link")

        this.path = this.svg.append('g')
            .attr("id", "curve-line")
            .selectAll(".link")
            .data(this.edges)
            .enter().append("path")
            .attr("class", "link")
          
        if(this.lineType == "straight"){
            console.log("straight");
            $(this.getContainer()).find("#curve-line").attr("class", "hide")
            $(this.getContainer()).find("#straight-line").attr("class", "show")
        }     
        else{
            console.log("curve")
            $(this.getContainer()).find("#curve-line").attr("class", "show")
            $(this.getContainer()).find("#straight-line").attr("class", "hide")
        }

        this.node = this.svg.append('g')
            .attr("id", "node")
            .selectAll(".node")
            .data(this.nodes)
            .enter().append("svg:g")
            .attr("class", function(d) {
                var baseClass = "node";
                var entityType = d.type.keys().next().value;
                if (entityType == "place")
                    return baseClass + " entity-place";
                if (entityType == "name")
                    return baseClass + " entity-name";
                if (entityType == "organization")
                    return baseClass + " entity-organization";
                return baseClass;
            })
            // .call(drag)
            .on('mouseover', function(d) {
                if(d.weight < 20){
                    $("text", this).text(d.name)
                        .attr("font-size", 10)
                        .attr("x", "-5px")
                        .attr("y", "-5px")
                        .attr("z-index", 10001) 
                        .attr("display", "block") 
                }          
            })
            .on('mouseout', function(d) {
                if(d.weight < 20){
                    $("text", this).attr("display", "none")  
                }
            })

        this.node.append("circle")

        var maxWeightEle = _.maxBy(this.nodes, "weight");
        var maxWeight = maxWeightEle.weight;

        this.node.append("svg:text")
            .text(function(d) {
                if(d.weight >= 20)
                    return d.name;
            })
            .attr("font-size", function(d) {
                if (maxWeight == 0) return 0;
                return Utils.scaling(d.weight, 20, maxWeight, 10, 15);
            })
            .attr("x", "-5px")
            .attr("y", "0px")
            .attr("z-index", 10001); 

        // this.svg.call(d3.behavior.zoom()
        //     .on("zoom", function(){
        //         _this.svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"); 
        //     })) 

        this.force.on("start", function(){
            console.log("start");
        })
        this.force.on("tick", function() {
            console.log("tick");
        });
        this.force.on("end", function(){
            _this.spinner.stop();
            _this.update = 0;
            var minX = _.minBy(_this.nodes, 'x').x,
                maxX = _.maxBy(_this.nodes, 'x').x,
                minY = _.minBy(_this.nodes, 'y').y,
                maxY = _.maxBy(_this.nodes, 'y').y;

            _this.link.attr("x1", function(d) { return Utils.scaling(d.source.x, minX, maxX, 0, width); })
                .attr("y1", function(d) { return Utils.scaling(d.source.y, minY, maxY, 0, height); })
                .attr("x2", function(d) { return Utils.scaling(d.target.x, minX, maxX, 0, width); })
                .attr("y2", function(d) { return Utils.scaling(d.target.y, minY, maxY, 0, height); });

            _this.path.attr("d", _this.diagonal.source(function(d){
                        return {"x": Utils.scaling(d.source.x, minX, maxX, 0, width), "y":Utils.scaling(d.source.y, minY, maxY, 0, height)};
                    })  
                    .target(function(d){
                        return {"x": Utils.scaling(d.target.x, minX, maxX, 0, width), "y": Utils.scaling(d.target.y, minY, maxY, 0, height)}; 
                    }))

            // 弧线
            // _this.path.attr("d", function(d) {
            //     var dx = d.target.x - d.source.x,//增量
            //         dy = d.target.y - d.source.y,
            //         dr = Math.sqrt(dx * dx + dy * dy);
            //     return "M" + d.source.x + "," + d.source.y + "A" + dr + ","
            //         + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
            // });

            // 贝塞尔曲线M x0,y0 C x2,y2 x3,y3 x1,y1
            // _this.path.attr("d", function(d){
            //     var x2 = (d.source.x + d.target.x)/2,
            //         y2 = d.source.y;
            //     var x3 = (d.source.x + d.target.x)/2,
            //         y3 = d.target.y;

            //     return "M " + d.source.x + "," + d.source.y + 
            //         " C " + x2 + "," + y2 + " "+ x3 + "," + y3 + " " + d.target.x + "," + d.target.y;
            // })
            

            _this.node.attr("transform", function(d) { 
                return "translate(" + Utils.scaling(d.x, minX, maxX, 0, width) + "," + Utils.scaling(d.y, minY, maxY, 0, height) + ")";
            })

            _this.reRender();
        })

        this.node.selectAll("circle").on("dblclick", function(d, i) {
            if (_this.selectedNode.indexOf(d) >= 0){
                _this.selectedNode = []; 
                FilterCenter.removeFilter(_this);   
            }
            else{
                _this.selectedNode = [d];
                FilterCenter.addFilter(_this, d.docs);
            }  
        })           
    }

    updateRender() {
        var _this = this;
        var width = this.graphSize, 
            height = this.graphSize;

        this.force = d3.layout.force()
            .nodes(this.nodes)
            .links(this.edges)
            .size([width, height])
            .charge(-100)
            .linkDistance(this.linkDistance)
            .alpha(0.8)
            .start();
          
        if(this.lineType == "straight"){
            console.log("straight");
            $(this.getContainer()).find("#curve-line").attr("class", "hide")
            $(this.getContainer()).find("#straight-line").attr("class", "show")
        }     
        else{
            console.log("curve")
            $(this.getContainer()).find("#curve-line").attr("class", "show")
            $(this.getContainer()).find("#straight-line").attr("class", "hide")
        } 

        this.force.on("tick", function() {
            var minX = _.minBy(_this.nodes, 'x').x,
                maxX = _.maxBy(_this.nodes, 'x').x,
                minY = _.minBy(_this.nodes, 'y').y,
                maxY = _.maxBy(_this.nodes, 'y').y;

            _this.link.attr("x1", function(d) { return Utils.scaling(d.source.x, minX, maxX, 0, width); })
                .attr("y1", function(d) { return Utils.scaling(d.source.y, minY, maxY, 0, height); })
                .attr("x2", function(d) { return Utils.scaling(d.target.x, minX, maxX, 0, width); })
                .attr("y2", function(d) { return Utils.scaling(d.target.y, minY, maxY, 0, height); });

            _this.path.attr("d", _this.diagonal.source(function(d){
                        return {"x": Utils.scaling(d.source.x, minX, maxX, 0, width), "y":Utils.scaling(d.source.y, minY, maxY, 0, height)};
                    })  
                    .target(function(d){
                        return {"x": Utils.scaling(d.target.x, minX, maxX, 0, width), "y": Utils.scaling(d.target.y, minY, maxY, 0, height)}; 
                    }))
            
            // 弧线
            // _this.path.attr("d", function(d) {
            //     var dx = d.target.x - d.source.x,//增量
            //         dy = d.target.y - d.source.y,
            //         dr = Math.sqrt(dx * dx + dy * dy);
            //     return "M" + d.source.x + "," + d.source.y + "A" + dr + ","
            //         + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
            // });

            // 贝塞尔曲线M x0,y0 C x2,y2 x3,y3 x1,y1
            // _this.path.attr("d", function(d){
            //     var x2 = (d.source.x + d.target.x)/2,
            //         y2 = d.source.y;
            //     var x3 = (d.source.x + d.target.x)/2,
            //         y3 = d.target.y;

            //     return "M " + d.source.x + "," + d.source.y + 
            //         " C " + x2 + "," + y2 + " "+ x3 + "," + y3 + " " + d.target.x + "," + d.target.y;
            // })
            

            _this.node.attr("transform", function(d) { 
                return "translate(" + Utils.scaling(d.x, minX, maxX, 0, width) + "," + Utils.scaling(d.y, minY, maxY, 0, height) + ")";
            })
        });

    }

    reRender() {
        var _this = this;
        var maxWeightEle = _.maxBy(this.nodes, "weight");
        var maxWeight = maxWeightEle.weight;
        // this.node.style("display", function(d) {
        //         return (d["docs"].length && d.weight > 0) ? "block" : "none";
        //     })
        //     .classed("not-selected", function(d) {
        //         if (_this.selectedNode.length == 0) return false;
        //         return _this.selectedNode.indexOf(d) < 0;
        //     }) 

        this.node.each(function(d, index){
            d3.select(this).style("display", function(d) {
                    return (d["docs"].length && d.weight > 0) ? "block" : "none";
                })
                .classed("filtered-out", function() {
                    return !_this.filteredSet.has(_this.data[index]);
                })
                .classed("not-selected", function() {
                    if (_this.selectedNode.length == 0) return false;
                    return _this.selectedNode.indexOf(d) < 0;
                }) 
        })


        this.node.select("circle")
            .attr("r", function(d) {
                if (maxWeight == 0) return 0;
                return Utils.scaling(d.weight, 0, maxWeight, 3, 10);
            })
            
        // this.link.style("stroke-width", function(d) { return Math.sqrt(d.weight); })
        //     .style("display", function(d) {
        //         return d.weight > 0 ? "block" : "none";
        //     }).classed("not-selected", function(d) {
        //         if (_this.selectedNode.length == 0) return false;
        //         return true;
        //     })

        this.link.each(function(d, index){
            d3.select(this).style("stroke-width", function(d) { return Math.sqrt(d.weight); })
                .classed("filtered-out", function() {
                    return !_this.filteredSet.has(_this.data[index]);
                })
                .classed("not-selected", function() {
                    if (_this.selectedNode.length == 0) return false;
                    return _this.selectedNode.indexOf(d) < 0;
                }) 
        })

        // this.path.style("stroke-width", function(d) { return Math.sqrt(d.weight); })
        //     .style("display", function(d) {
        //         return d.weight > 0 ? "block" : "none";
        //     }).classed("not-selected", function(d) {
        //         if (_this.selectedNode.length == 0) return false;
        //         return true;
        //     })

        this.path.each(function(d, index){
            d3.select(this).style("stroke-width", function(d) { return Math.sqrt(d.weight); })
                .classed("filtered-out", function() {
                    return !_this.filteredSet.has(_this.data[index]);
                })
                .classed("not-selected", function() {
                    if (_this.selectedNode.length == 0) return false;
                    return _this.selectedNode.indexOf(d) < 0;
                }) 
        })
    }
}

export { EntityGraphView };