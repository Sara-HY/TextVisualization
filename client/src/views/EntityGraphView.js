import {Utils} from "../Utils.js";
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {BaseView} from './BaseView.js';
import viewTemplate from "../../templates/views/base-view.html!text"

class EntityGraphView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "entity-graph-view", viewTitle, viewTemplate, layout);
        window.EntityGraphView = this;
        this._init();
    }

    _init() {
        var _this = this;
        _this.selectedNode = [];
        this._initView();
        this._processData();
        this.render();
        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            console.log("FilterCenter.Changed");
            _this.filteredData = FilterCenter.getFilteredDataByView(_this);
            _this._updateData();
            _this.reRender();
        })        

    }

    _initView() {
        var { width, height } = this.getViewSize();

        this.svg = d3.select(this.getContainer()).append("svg")
            .attr("width", width)
            .attr("height", height);
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
            entity["fullWeight"] = entity["weight"] = entity["docs"].length;
            sizeList.push(entity["fullWeight"]);
        }        
        sizeList.sort(function(a, b) {return b - a});
        console.log("sizeList", sizeList);
        var nodeWeightFilterThreshold = this._getSizeThreshold(sizeList);

        var nodeMap = {};
        for (var name in entityMap) {
            if (entityMap[name]["docs"].length >= nodeWeightFilterThreshold)
                nodeMap[name] = entityMap[name];
        }
        var nodes = _.values(nodeMap);
        console.log("nodes", nodes)

        var edgeWeightFilterThreshold = 2;
        var edges = [];
        for (var entityName in nodeMap) {
            var neighbors = entityMap[entityName].links;
            for (var neighborEntityName in neighbors) {
                if (entityName < neighborEntityName) { //只计算无向边)
                    if (!(neighborEntityName in nodeMap))
                        continue;
                    var weight = neighbors[neighborEntityName].size;
                    if (weight < edgeWeightFilterThreshold) continue;
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
        var { width, height } = this.getViewSize();

        this.force = d3.layout.force()
            .charge(-100)
            .linkDistance(100)
            .size([width, height])
            .nodes(this.nodes)
            .links(this.edges)
            .alpha(0.8)

        this.force.start();

        var drag = this.force.drag().on("dragstart", function(d) {
            d3.select(this).classed("fixed", d.fixed = true);
        })

        this.link = this.svg.selectAll(".link")
            .data(this.edges)
            .enter().append("line")
            .attr("class", "link");
            

        this.node = this.svg.selectAll("g.node")
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
            .call(drag)

        this.node.append("circle")
        this.node.append("svg:text")
            .text(function(d) {
                return d.name;
            })
            .attr("x", "10px")
            .attr("y", "10px");  
        this.force.on("tick", function() {
            _this.link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });
            _this.node.attr("transform", function(d) { 
                    return "translate(" + d.x + "," + d.y + ")";
                })
        });

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

        this.reRender();       
    }

    reRender() {
        var _this = this;
        var maxWeightEle = _.maxBy(this.nodes, "weight");
        var maxWeight = maxWeightEle.weight;
        this.node.style("display", function(d) {
                return d.weight > 0 ? "block" : "none";
            }).classed("not-selected", function(d) {
                if (_this.selectedNode.length == 0) return false;
                return _this.selectedNode.indexOf(d) < 0;
            })        
        this.node.select("circle")
            .attr("r", function(d) {
                if (maxWeight == 0) return 0;
                return Utils.scaling(d.weight, 0, maxWeight, 3, 10);
            })
            
        this.link.style("stroke-width", function(d) { return Math.sqrt(d.weight); })
            .style("display", function(d) {
                return d.weight > 0 ? "block" : "none";
            }).classed("not-selected", function(d) {
                if (_this.selectedNode.length == 0) return false;
                return true;
            })
    }



}

export { EntityGraphView };