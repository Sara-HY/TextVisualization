import { BaseView } from './BaseView.js';
import { DataUtils } from "../DataUtils.js"
import { DataCenter } from "../DataCenter.js"
import { GroupCenter } from "../GroupCenter.js"
import { FilterCenter } from "../FilterCenter.js"
import { Utils } from "../Utils.js"
import viewTemplate from "../../templates/views/base-view.html!text"

import "d3-slider"
import "d3-slider-css!css"

class DendrogramView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "dendrogram-view", viewTitle, viewTemplate, layout);
        
        this._init();
        this._initInteraction();
    }

    _init() {
        var _this = this;
        this._initView();
        this.spinner.spin(this.getContainer());
        PubSub.subscribe("DocumentGalaxyView.Layout.End", async function(msg, data) {
            if (data.method != "TFIDF")
                return;
            var positions = data.positions;
            var hcluster = await DataUtils.queryToServer("/api/algorithm/hierarchicalClustering", {
                source: "points",
                vectors: JSON.stringify(positions)
            }, "POST");
            // var hcluster = await DataUtils.queryToServer("/api/algorithm/hierarchicalClustering", {
            //     source: "database",
            //     datasetID: DataCenter.datasetID,
            //     mainTextField: DataCenter.fields._MAINTIME
            // }, "POST");
            _this.spinner.stop();
            hcluster = hcluster.cluster;
            _this.hcluster = uniformCluster(hcluster);

            _this.render();

            function uniformCluster(cluster) {
                if (cluster.left || cluster.right) {
                    cluster.children = [];
                    if (cluster.left)
                        cluster.children.push(cluster.left);
                    if (cluster.right)
                        cluster.children.push(cluster.right);
                    for (var child of cluster.children)
                        uniformCluster(child);
                }
                return cluster;
            }
        });
    }

    _initView() {
        var _this = this;
        var { width, height } = this.getViewSize();
        this.height = height - 30;
        this.width = width - 90;
        var left = 40, top = 10;
        
        this.sliderWrapper = d3.select(this.getContainer()).append("div")
            .attr("class", "slider-wrapper")
            .style("margin-left", left + "px")
            .style("width", this.width + "px");
        this.slider = d3.slider();
        this.sliderWrapper.call(this.slider);

        this.svg = d3.select(this.getContainer()).append("svg")
            .attr("width", width)
            .attr("height", height - 20);
        this.clusterGroup = this.svg.append("g")
            .attr("transform", "translate(" + left + "," + top + ")");            
        this.svgGroup = this.svg.append("g")
            .attr("transform", "translate(" + left + "," + top + ")");
        this.cluster = d3.layout.cluster()
            .size([this.height, this.width]);
    }

    _initInteraction() {
        var _this = this;

        this.tip = d3.tip().attr('class', 'd3-tip dendrogram-tip');
        this.svg.call(this.tip); 

        this.svg.on("click", function() {
            FilterCenter.removeFilter(_this);
            d3.select(_this.getContainer()).selectAll(".cluster")
                .classed("selected", false);
        })

        this.slider.on("slideend", function(evt, value) {
            var maxDist = _this.hcluster.dist;
            var distThreshold = maxDist - Utils.scaling(value, 0, 100, 0, maxDist, "sqrt");
            _this.clusterGroup.html("");
            var clusters = search(_this.hcluster);

            var type = "HCluster";
            GroupCenter.removeGroupsByType(type);
            var index = 0;
            for (var cluster of clusters) {
                var group = GroupCenter.createGroup(type + "_" + index, "HCluster", null);
                group.updateData(cluster.leaves);
            }

            PubSub.publish("GroupCenter.Groups.Update")

            var padding = 4;
            for (var i = 0; i < clusters.length; i++) {
                var cluster = clusters[i];
                var node = cluster;
                var x = Utils.scaling(value, 0, 100, 0, _this.width);
                var y1 = node.area.min;
                var y2 = node.area.max;
                _this.clusterGroup.append("rect")
                    .attr("class", "cluster")
                    .attr("cluster-id", i)
                    .attr("x", x)
                    .attr("y", y1 - padding)
                    .attr("width", _this.width - x)
                    .attr("height", y2 - y1 + 2 * padding)
                    .on("click", function() {
                        d3.event.stopPropagation();
                        filterCluster(+$(this).attr("cluster-id"));
                        d3.select(_this.getContainer()).selectAll(".cluster")
                            .classed("selected", false);
                        d3.select(this).classed("selected", true);
                    })
            }

            function filterCluster(clusterID) {
                var leaves = clusters[clusterID]["leaves"];
                var data = [];
                for (var id of leaves) 
                    data.push(DataCenter.data[id]);
                FilterCenter.addFilter(_this, data);
            }

            function search(root) {
                var list = [], p = 0;
                var groups = [];
                list.push(root);
                while (p < list.length) {
                    var node = list[p];
                    if ( (node.children == null) || (node.dist && node.dist < distThreshold) ) {
                        groups.push(node);
                    } else {
                        if (node.children) {
                            for (var child of node.children)
                                list.push(child);
                        }
                    }
                    p++;
                }
                return groups;
            }
        }) 
    }


    render() {
        var _this = this;

        var nodes = this.cluster.nodes(this.hcluster);
        var links = this.cluster.links(nodes);
        
        var maxDist = this.hcluster.dist;
        for (var node of nodes) {
            if (node.children != null) {
                node.y = Utils.scaling(maxDist - node.dist, 0, maxDist, 0, this.width, "pow");
            }
            else {
                node.area = {max: node.x, min: node.x};
                node.leaves = [node.key];
                var p = node.parent;
                while (p != null) {
                    if (p.area != null) {
                        p.area.max = Math.max(p.area.max, node.x);
                        p.area.min = Math.min(p.area.min, node.x);
                        p.leaves.push(node.key);
                    } else {
                        p.area = {min: node.x, max: node.x};
                        p.leaves = [node.key];
                    }
                    p = p.parent;
                }
            }
        }

        var linkEles = this.svgGroup.selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", elbow);

        var nodeEles = this.svgGroup.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("i", function(d, index) {
                return index;
            })
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            })
            .on('mouseover', function(d, index) {
                //设置tip
                var x = d.y + 10, y = d.x + 10;
                var tip = _this.tip;
                var text = "[" + d.key + "]" + DataCenter.data[d.key]["title"];
                tip.html(text);
                tip.show();
            })
            .on('mouseout', this.tip.hide)

        nodeEles.append("circle")
            .attr("r", 2);
   
        function elbow(d, i) {
            return "M" + d.source.y + "," + d.source.x + "V" + d.target.x + "H" + d.target.y;
        }
    }
}

export { DendrogramView };
