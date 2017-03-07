var BubbleSets = function() {
    var cell_size = 10;
    var isolevel = 0.0015; //0.0008  0.002
    var epsilon = 0.00000001;
    var allCells = [];
    var grid = {
        width: 800,
        height: 800,
    };

    var set = []; //the current set for the bubble

    var edge_table = [
        0x0, //0000,
        0x9, //1001,
        0x3, //0011
        0xa, //1010
        0x6, //0110, 
        0xf, //1111,
        0x5, //0101
        0xc, //1100
        0xc, //1100
        0x5, //0101
        0xf, //1111,
        0x6, //0110,
        0xa, //1010
        0x3, //0011
        0x9, //1001,
        0x0, //0000
    ];

    var segment_table = [
        [-1, -1, -1, -1, -1],
        [0, 3, -1, -1, -1],
        [1, 0, -1, -1, -1],
        [1, 3, -1, -1, -1],
        [2, 1, -1, -1, -1],
        [2, 1, 0, 3, -1],
        [2, 0, -1, -1, -1],
        [2, 3, -1, -1, -1],
        [3, 2, -1, -1, -1],
        [0, 2, -1, -1, -1],
        [1, 0, 3, 2, -1],
        [1, 2, -1, -1, -1],
        [3, 1, -1, -1, -1],
        [0, 1, -1, -1, -1],
        [3, 0, -1, -1, -1],
        [-1, -1, -1, -1, -1]
    ];


    function vertex_interp(isolevel, p1, p2, valp1, valp2) {
        if (Math.abs(isolevel - valp1) < epsilon) {
            return p1;
        }
        if (Math.abs(isolevel - valp2) < epsilon) {
            return p2;
        }
        if (Math.abs(valp1 - valp2) < epsilon) {
            return p2;
        }
        var mu = (isolevel - valp1) / (valp2 - valp1);
        var p = {
            x: p1.x + mu * (p2.x - p1.x),
            y: p1.y + mu * (p2.y - p1.y),
        };
        return p;
    }

    function get_grid_cell(x, y) {
        var cell = {
            x: x,
            y: y,
            v: [{
                x: x,
                y: y
            }, {
                x: x + cell_size,
                y: y
            }, {
                x: x + cell_size,
                y: y + cell_size
            }, {
                x: x,
                y: y + cell_size
            }, ],
            val: [
                threshold(x, y),
                threshold(x + cell_size, y),
                threshold(x + cell_size, y + cell_size),
                threshold(x, y + cell_size),
            ],
            status: false
        }

        if (
            cell.val[0] < isolevel ||
            cell.val[1] < isolevel ||
            cell.val[2] < isolevel ||
            cell.val[3] < isolevel
        ) {
            cell.status = true;
        }


        return cell;

    }

    function polygonize(cell, isolevel) {
        var index = 0;
        if (cell.val[0] < isolevel) {
            index |= 1;
        }
        if (cell.val[1] < isolevel) {
            index |= 2;
        }
        if (cell.val[2] < isolevel) {
            index |= 4;
        }
        if (cell.val[3] < isolevel) {
            index |= 8;
        }

        if (edge_table[index] == 0) {
            return []; // no segments here!
        }

        var vertlist = [{
            x: 0,
            y: 0
        }, {
            x: 0,
            y: 0
        }, {
            x: 0,
            y: 0
        }, {
            x: 0,
            y: 0
        }, ];

        if (edge_table[index] & 1) {
            vertlist[0] = vertex_interp(isolevel, cell.v[0], cell.v[1], cell.val[0], cell.val[1]);
        }
        if (edge_table[index] & 2) {
            vertlist[1] = vertex_interp(isolevel, cell.v[1], cell.v[2], cell.val[1], cell.val[2]);
        }
        if (edge_table[index] & 4) {
            vertlist[2] = vertex_interp(isolevel, cell.v[2], cell.v[3], cell.val[2], cell.val[3]);
        }
        if (edge_table[index] & 8) {
            vertlist[3] = vertex_interp(isolevel, cell.v[3], cell.v[0], cell.val[3], cell.val[0]);
        }

        var segments = [];
        for (var i = 0; segment_table[index][i] != -1; i += 2) {
            segments.push({
                a: vertlist[segment_table[index][i]],
                b: vertlist[segment_table[index][i + 1]],
            });
        }

        return segments;
    }

    //nodes dependence
    function threshold(x, y) {
        var f = 0;
        for (var i = 0; i < set.length; i++) {
            d = Math.sqrt(Math.pow(set[i].x - x, 2) + Math.pow(set[i].y - y, 2));
            g_force = 1 / Math.pow(d, 2);
            f += g_force;
        }
        return f;
    }

    var curve = d3.svg.line()
        .interpolate("cardinal-closed")
        .x(function(d) {
            return d.x;
        })
        .y(function(d) {
            return d.y;
        })

    var iterationOfMarchingSquares = 0;
    var selectTetrisCells = null;
    var bubblePoints = [];
    var prevArrayOfArraysLength = [];
    var groups = [];
    var groupFillOpacity = 0.5;

    var tetrisOpacityMap = null;

    var minTestrisOpacity = 0.25,
        maxTestrisOpacity = 1;
    var tetrisOpacityRange = [minTestrisOpacity, maxTestrisOpacity];

    function draw_marching_squares(groups, svg) {

        bubbledEdges = [];
        subGroupAverages = []
            // d3.select(".marchingRectGroup").selectAll(".tetriscells").remove();
            //get the groups to iterate through
            // groups = _.uniq(nodes.map(function(d){return d.group}));

        for (g in groups) {

            set = groups[g].data;
            group = groups[g];
            groupID = group.id;


            // set = nodes.filter(function(x){return x.group==g;});

            bubblePoints = [];
            var tetriscells = [];
            for (var i = 0; i < grid.width / cell_size; i += 1) {
                for (var j = 0; j < grid.height / cell_size; j += 1) {

                    cell = get_grid_cell(i * cell_size, j * cell_size);

                    if (cell.status) {

                        segments = polygonize(cell, isolevel);

                        if (segments.length == 0) {} else {
                            tetriscells.push({
                                x: cell.x,
                                y: cell.y,
                                val: d3.median(cell.val)
                            });
                        }

                        for (var k = 0; k < segments.length; k++) {

                            bubblePoints.push({
                                x: segments[k].b.x,
                                y: segments[k].b.y,
                                id: "i" + i + "j" + j + "k" + k + "g" + groupID,
                                group: groupID
                            });
                            bubblePoints.push({
                                x: segments[k].a.x,
                                y: segments[k].a.y,
                                id: "i" + i + "j" + j + "k" + k + "g" + g,
                                group: groupID
                            });
                        }
                    } //if(cell)
                    else {
                        tetriscells.push({
                            x: cell.x,
                            y: cell.y,
                            val: d3.median(cell.val)
                        });
                    }
                } // j
            } // i

            // var opacityExtent = d3.extent(tetriscells.map(function(d) {return d.val;}));

            groupFillOpacity = 0.5;
            tetrisOpacityRange = [0, 0];

            // console.log("before filter", bubblePoints);
            bubblePoints = bubblePoints.filter(function(x) {
                return x.group == groupID;
            });
            // console.log("after filter", bubblePoints);

            var sortedBubblePoints = sortBubblePoints(bubblePoints);
            var arrayOfArrays = splitSortedBubblePoints(sortedBubblePoints);
            // console.log("arrayOfArrays", arrayOfArrays)

            if (typeof prevArrayOfArraysLength[groupID] != 'undefined') {
                for (var i = 0; i < prevArrayOfArraysLength[g]; i++) {
                    svg.select(".marching-path-group").selectAll(".bubble" + groupID + i).remove();
                }
            }

            for (var i = 0; i < arrayOfArrays.length; i++) {
                var points = arrayOfArrays[i];
                svg.selectAll(".bubble" + groupID + i).remove();
                var cardinalPath = svg
                    .selectAll(".bubble" + groupID + i)
                    .data([points])
                    .enter()
                    .append("path")
                    .attr("class", "bubble" + groupID + i)
                    .attr("d", function(d) {
                        return curve(d);
                    })
                    .attr("fill", function(d) {
                        return group.color;
                    })
                    .attr("opacity", groupFillOpacity);
            }

            prevArrayOfArraysLength[g] = arrayOfArrays.length;

            //if there is only one bubble subgroup then i don't need virtual edges
            if (arrayOfArrays.length == 1) continue;

            var averages = [];
            for (var i = 0; i < arrayOfArrays.length; i++) {
                var points = arrayOfArrays[i];
                var x_bar = d3.mean(points.map(function(x) {
                    return x.x;
                }));
                var y_bar = d3.mean(points.map(function(x) {
                    return x.y;
                }));
                averages.push({
                    name: groupID + "-" + i,
                    x: x_bar,
                    y: y_bar
                });
            }

            var thisBubbleGroupEdges = getBubbleEdges(averages, groupID);

            var subdividedBubbleGroupEdges = subdivideEdges(thisBubbleGroupEdges);

            bubbledEdges = bubbledEdges.concat(subdividedBubbleGroupEdges[1]); //the divided edges

            subGroupAverages = subGroupAverages.concat(averages); //the endpoints
            subGroupAverages = subGroupAverages.concat(subdividedBubbleGroupEdges[0]); //the midpoints

        } // g
    }

    function getBubbleEdges(subGroupAverages, group) {
        var returnedEdges = [];
        for (var j = 0; j < subGroupAverages.length - 1; j++) {
            var edge = {
                source: subGroupAverages[j],
                target: subGroupAverages[j + 1],
                group: g
            };
            returnedEdges.push(edge);

        }

        return returnedEdges;

    }

    function sortBubblePoints(bubblePoints) {

        var bubblePointsCopy = bubblePoints;
        var sortedBubblePoints = [];
        sortedBubblePoints.push(bubblePointsCopy[0]);
        bubblePointsCopy = bubblePointsCopy.slice(1, bubblePoints.length);
        var id = bubblePointsCopy[0].id;

        for (var i = 0; i < bubblePoints.length - 1; i++) {

            var shortestDistance = Infinity,
                shortestIndex = null;
            for (var j = 0; j < bubblePointsCopy.length; j++) {
                //calculate distance 
                var dist = computeDistance(sortedBubblePoints[i], bubblePointsCopy[j]);
                if (dist < shortestDistance) {
                    shortestIndex = j;
                    shortestDistance = dist;
                }
            }
            //console.log('sd:'+shortestDistance);
            var id = bubblePointsCopy[shortestIndex].id;

            sortedBubblePoints.push(bubblePointsCopy[shortestIndex]);
            bubblePointsCopy.splice(shortestIndex, 1); //remove the element
        }

        //or just take the evens to approximate the bubble
        sortedBubblePoints = sortedBubblePoints.filter(function(x, i) {
            return (i % 2 == 0);
        })

        return sortedBubblePoints;
    }

    function splitSortedBubblePoints(sortedBubblePoints) {
        subSets = [];
        var lastSplit = 0;
        var thresholdDist = computeDistance({
            x: cell_size,
            y: cell_size
        }, {
            x: 0,
            y: 0
        });
        for (var i = 0; i < sortedBubblePoints.length - 1; i++) {

            if (computeDistance(sortedBubblePoints[i], sortedBubblePoints[i + 1]) > thresholdDist) {
                subSets.push(sortedBubblePoints.slice(lastSplit, i));
                lastSplit = i + 1;
            }
        }
        if (lastSplit != sortedBubblePoints.length) {
            subSets.push(sortedBubblePoints.slice(lastSplit, sortedBubblePoints.length));
        }
        return subSets;
    }

    function squared(a) {
        return Math.pow(a, 2);
    }

    function computeDistance(a, b) {
        return Math.sqrt(squared(a.x - b.x) + squared(a.y - b.y));
    }


    function midPointBetweenPoints(p1, p2) {
        var Pm = {
            x: 0,
            y: 0
        };

        if (p1.x < p2.x) {
            Pm.x = (p1.x + 0.5 * (p2.x - p1.x));
        } else if (p1.x >= p2.x) {
            Pm.x = (p2.x + 0.5 * (p1.x - p2.x));
        }

        if (p1.y < p2.y) {
            Pm.y = (p1.y + 0.5 * (p2.y - p1.y));
        } else if (p1.y >= p2.y) {
            Pm.y = (p2.y + 0.5 * (p1.y - p2.y));
        }

        return Pm;

    }

    var subDivPointsPerEdge = 1;

    function subdivideEdges(edges) {

        var returnEdges = [];
        var additionalPoints = [];
        for (var edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {

            var e = edges[edgeIndex];

            var src = e.source;
            var trg = e.target;
            src.fixed = true;
            trg.fixed = true;
            var midpoint = midPointBetweenPoints(src, trg);

            var edge1 = {
                source: src,
                target: midpoint,
                group: e.group
            };
            var edge2 = {
                source: midpoint,
                target: trg,
                group: e.group
            };

            returnEdges.push(edge1);
            returnEdges.push(edge2);

            midpoint.name = e.source.name + "-" + e.target.name;
            midpoint.isMidpoint = true;
            additionalPoints.push(midpoint);

        }

        return [additionalPoints, returnEdges];

    }

    function collide(node) {
        var radius = 10; //node.radius + collisionBuffer,
        nx1 = node.x - radius,
            nx2 = node.x + radius,
            ny1 = node.y - radius,
            ny2 = node.y + radius;
        return function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== node)) {
                var x = node.x - quad.point.x,
                    y = node.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    radius = 10; //node.radius + node.radius;
                if (l < radius) {
                    l = (l - radius) / l * .5;
                    node.x -= x *= l;
                    node.y -= y *= l;
                    //quad.point.x += x;
                    //quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
    }

    this.groupFillOpacity = groupFillOpacity;
    this.draw_marching_squares = draw_marching_squares;
    return this;
}
