
class Utils {

    static getUrlParam(name) {
        let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)","i"); 
        let r = window.location.search.substr(1).match(reg);
        if (r != null)
            return unescape(r[2]); 
        return null;        
    }

    static ajaxSync(settings) {
        return new Promise((resolve) => {
            $.ajax(settings).done(function(d) {
                resolve(d);
                return d;
            })
        })
    }

    static timeout(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    static scaling(value, vMin, vMax, tMin, tMax, scale) {
        scale = scale || "linear";
        value = value < vMin ? vMin : value;
        value = value > vMax ? vMax : value;
        var result = 0;
        if (scale == "linear")
            result = (value - vMin) / (vMax - vMin) * (tMax - tMin) + tMin;
        else if (scale == "log")
            result = Math.log(value - vMin) / Math.log(vMax - vMin) * (tMax - tMin) + tMin;
        else if (scale == "pow") 
            result = Math.pow(value - vMin, 2) / Math.pow(vMax - vMin, 2) * (tMax - tMin) + tMin;
        else if (scale == "sqrt") 
            result = Math.sqrt(value - vMin) / Math.sqrt(vMax - vMin) * (tMax - tMin) + tMin;
        return result;
    }

    static getTipDirection(x, y, eleWidth, eleHeight, containerWidth, containerHeight) {
        if (y > containerHeight / 2)
            return 'n';
        if (y < containerHeight / 2)
            return 's';
        return 'n';
    }

    static wrapTemplate(html) {
        return "<div>" + html + "</div>";
    }

    static randomString(len) {
        len = len || 32;
        var charList = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
        var maxPos = charList.length;
        var pwd = '';
        for (var i = 0; i < len; i++) {
            pwd += charList.charAt(Math.floor(Math.random() * maxPos));
        }
        return pwd;
    }

    static createPie(container, config) {
        if (config.data == null) {
            console.error("Settings of pie chart are incomplete");
        }
        if (config.r != null) {
            config.outerRadius = config.r;
        }
        if (config.innerRadius == null) {
            config.innerRadius = 0;
        }
        var n = config.data.length;
        var props = [];
        var sumProp = 0;
        if (config.proportion == null) {
            for (var i = 0; i < n; i++) {
                props.push(1);
                sumProp += 1;
            }
        } else {
            for (var i = 0; i < n; i++) {
                var p = config.proportion(config.data[i]);
                props.push(p);
                sumProp += p;
            }
        }
        var currPropSum = 0;
        for (var i = 0; i < n; i++) {
            var d = config.data[i];
            var startAngle = 2 * Math.PI / sumProp * currPropSum;
            var endAngle = 2 * Math.PI / sumProp * (currPropSum + props[i]);
            currPropSum += props[i];
            var arc = d3.svg.arc()
                        .innerRadius(config.innerRadius)
                        .outerRadius(config.outerRadius)
                        .startAngle(startAngle)
                        .endAngle(endAngle);
            var path = d3.select(container).append("path").attr("d", arc);
            if (config.attrs == null)
                return;
            for (var attrName in config.attrs ) {
                var attrValue = config.attrs[attrName];
                if (_.isFunction(attrValue)) {
                    path.attr(attrName, attrValue(d, i));
                } else {
                    path.attr(attrName, attrValue);
                }
            }
        }
        if (n == 0) {
            var arc = d3.svg.arc()
                        .innerRadius(config.innerRadius)
                        .outerRadius(config.outerRadius)
                        .startAngle(0)
                        .endAngle(2 * Math.PI);

            var path = d3.select(container)
                        .append("path")
                        .attr("d", arc)
                        .attr("stroke", "#888")
                        .attr("fill", "transparent");
        }
    }

    //point: [x, y]
    //path: path string of SVG
    static isPointInPath(point, path) {
        console.log("path", path)
        var vs = [];
        path = path.replace("M", "").replace("z", "");
        var pathPoints = path.split("L");
        for (var p of pathPoints) {
            var ps = p.split(",");
            vs.push([+ps[0], +ps[1]]);
        }
        return this.isPointInPolygon(point, vs);        
    }

    //point: [x, y]
    //vs: points of polygon
    static isPointInPolygon(point, vs) {
        var xi, xj, yi, yj, i, intersect,
            x = point[0],
            y = point[1],
            inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            xi = vs[i][0],
            yi = vs[i][1],
            xj = vs[j][0],
            yj = vs[j][1],
            intersect = ((yi > y) != (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }    
}


export { Utils };