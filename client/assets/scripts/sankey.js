var Sankey = function() {
  
  var sankey = {},
      nodePadding = 8,
      size = [100, 100],
      nodeList = [],
      nodesByLayer = [];
  window.sankey = sankey

  sankey.nodePadding = function(_nodePadding) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_nodePadding;
    return sankey;
  };

  // sankey.nodes = function(_nodes) {
  //   if (!arguments.length) return nodes;
  //   nodeList = _nodes;
  //   var groups = _.groupBy(nodeList, function(node) {
  //       return node.layer;
  //   })
  //   var layers = _.keys(groups).sort(function(a, b) {
  //       return (+a) - (+b)
  //   });
  //   nodesByLayer = [];
  //   for (var i = 0; i < layers.length; i++) {
  //       nodesByLayer.push(groups[layers[i]]);
  //   }
  //   return sankey;
  // };

  sankey.nodesByLayer = function(_nodesByLayer) {
    if (!arguments.length) return nodesByLayer;
    nodesByLayer = _nodesByLayer;
    // nodes = _.flatten(nodesByLayer);
    for (var i = 0; i < nodesByLayer.length; i++)
        for (var j = 0; j < nodesByLayer[i].length; j++)
            nodeList.push(nodesByLayer[i][j])
    return sankey;    
  }

  sankey.size = function(_size) {
    if (!arguments.length) return size;
    size = _size;
    return sankey;
  };

  sankey.width = function(_width) {
    if (!arguments.length) return size[0];
    size[0] = _width;
    return sankey;
  };

  sankey.height = function(_height) {
    if (!arguments.length) return size[1];
    size[1] = _height;
    return sankey;
  };  

  sankey.layout = function(iterations) {
    computeLayout(iterations);
    return sankey;
  };


  function computeLayout(iterations) {
    initializeNodePosition();
    resolveCollisions();
    for (var i = 0; i < nodesByLayer.length; i++) {
        // console.log("init_positions", i, _.map(nodesByLayer[i], "y"))
    }    
    for (var alpha = 1; iterations > 0; --iterations) {
      // console.log("=========", iterations)
      alpha *= 0.99
      relaxRightToLeft(alpha);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
      
      for (var i = 0; i < nodesByLayer.length; i++) {
        // console.log("_positions", i, _.map(nodesByLayer[i], "y"))
      }
    }

    function initializeNodePosition() {
      nodesByLayer.forEach(function(nodes) {
        var y = 0;
        nodes.forEach(function(node, i) {
          node.y = y;
          y += node.dy + nodePadding;
        });
      });
    }

    function relaxLeftToRight(alpha) {
      nodesByLayer.forEach(function(nodes, i) {
        nodes.forEach(function(node, j) {
          if (node.rights.length) {
            var y = 0;
            for (var n = 0; n < node.rights.length; n++)
                y += node.rights[n].y;
            y /= node.rights.length;
            var mid = center(node);
            node.y += (y - mid) * alpha;
            // console.log("node,i,j,y", i, j, y, mid, node.y, _.map(node.rights, function(d) {return d.y}))
          }
        });
      });
    }

    function relaxRightToLeft(alpha) {
      nodesByLayer.forEach(function(nodes, i) {
        nodes.forEach(function(node) {
          if (node.lefts.length) {
            var y = 0;
            for (var n = 0; n < node.lefts.length; n++)
                y += node.lefts[n].y;
            y /= node.lefts.length;
            var mid = center(node);
            node.y += (y - mid) * alpha;
          }
        });
      });
    }

    function resolveCollisions() {
      // var minPosition = _.minBy(nodeList, function(n) { return n.y }).y;
      // // console.log("minPosition", minPosition)
      // for (var i = 0; i < nodeList.length; i++) {
      //   nodeList[i].y -= minPosition;
      // }

      nodesByLayer.forEach(function(nodes) {
        var node,
            dy,
            y0 = 0,
            n = nodes.length,
            i;

        // Push any overlapping nodes down.
        var sortedNodes = _.sortBy(nodes, function(n) {
            return n.y;
        });

        for (i = 0; i < n; ++i) {
          node = sortedNodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          if (dy < - nodePadding) node.y = y0 + nodePadding;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = sortedNodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });

      nodesByLayer.forEach(function(nodes) {
        var minPosition = _.minBy(nodes, function(n) {return n.y}).y;
        for (var node of nodes)
          node.y -= minPosition;
      })      
    }
  }


  function center(node) {
    return node.y + node.dy / 2;
  }

  return sankey;
};