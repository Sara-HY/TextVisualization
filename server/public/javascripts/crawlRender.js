var spinner = new Spinner();
var length;
var fileNum;
var size;

function bytesToSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1000, // or 1024
        sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
   return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
};

function renderName(keywords){
    var d = new Date();
    var filename = keywords + '-' + d.toLocaleDateString().replace(/\//g, "-") + '+' +  d.toTimeString().substr(0, 8) + ".json";
    console.log(d, filename)
    $("#file").removeClass("hide");
    $("#file-name").val(filename);
    $("#file-name").attr("name", filename);
}

function renderSize(size){
    $("#file-size").html(size);
}

function renderLength(){
    $("#data-length").html(length);
}

function renderSparkline(filename, site){
    console.log(filename, site);
    if(site == "163-com")
        site = "netease-com"
    $('#' + site).removeClass("hide");
    $.ajax({ 
        type: "get", 
        url: filename, 
        dataType: "json", 
        success:function(data){ 
            $.each(data, function(index, _data){
                _data["time"] = new Date(_data["time"])
            })

            length = length + data.length;
            console.log("json length", length);
            renderLength();
            
            var id = "#" + site + "-sparkline";
            var timeLine = dc.lineChart(id);
            var ndx = crossfilter(data),
                timeDim = ndx.dimension(function(d) {return d["time"]});
            var timeInterval = d3.time["day"];
            var countGroup = timeDim.group(function(time) {
                return timeInterval.floor(new Date(time))
            }).reduceCount();
            var startTime = timeDim.bottom(1)[0]["time"],
                endTime = timeDim.top(1)[0]["time"];

            var x = d3.time.scale()
                    .domain([timeInterval.floor(startTime), timeInterval.ceil(endTime)])
                    .range([0, 800])
                    .nice(timeInterval);

            timeLine.width("800")
                .height("80")
                .dimension(timeDim)
                .group(countGroup)
                .brushOn(false)
                .elasticY(true)
                .round(d3.time.day.round)
                .xUnits(d3.time["days"])
                .x(x)
                .renderArea(true);

            timeLine.yAxis().ticks(2);
            // timeLine.xAxis().ticks(0);
            timeLine.render();
            console.log("sparkline success");
            // timeLine.selectAll(".y").attr("display", "none");
            // timeLine.selectAll(".x").attr("display", "none");
        } 
    }); 
}

function renderBaseline(id){
    var data = [{"time": 1511847040000}]

    $.each(data, function(index, _data){
        _data["time"] = new Date(_data["time"])
    })

    var timeLine = dc.lineChart(id);

    var ndx = crossfilter(data),
        timeDim = ndx.dimension(function(d) {return d["time"]});
    var timeInterval = d3.time["day"];
    var countGroup = timeDim.group(function(time) {
        return timeInterval.floor(new Date(time))
    }).reduceCount();
    var startTime = timeDim.bottom(1)[0]["time"],
        endTime = timeDim.top(1)[0]["time"];

    var x = d3.time.scale()
            .domain([timeInterval.floor(startTime), timeInterval.ceil(endTime)])
            .range([0, 800])
            .nice(timeInterval);

    timeLine.width("800")
        .height("80")
        .dimension(timeDim)
        .group(countGroup)
        .brushOn(false)
        .elasticY(true)
        .round(d3.time.day.round)
        .xUnits(d3.time["day"])
        .x(x)
        .renderArea(true);

    timeLine.yAxis().ticks(2);
    // timeLine.xAxis().ticks(0);
    timeLine.render();
}

function changeStatus(status) {
    if(status == null){
        console.log("Beginning Crawlering");
    } 
    else {
        console.log(status);
        if(status.status == "Partly Finished" || status.status == "Finished"){
            renderSize(bytesToSize(size));

            renderSparkline(status.data.keywords + "-" + status.data.site.replace(/\./g, '-') + ".json", status.data.site.replace(/\./g, '-'));
            if(status.status == "Finished"){
                spinner.spin();
                $("#save").attr('disabled', false);
            }  
        }
    }
}

function queryStatus(data, sitesNum){
    var keywords = data.keywords;
    var site = data.site;
    var filename = keywords + "-" + site.replace(/\./g, '-') + ".json";
     $.get($("#title").attr("serverPath") + '/crawler/file/' + filename, function(result) {
        console.log(result);
        if(result.size != 0){
            fileNum = fileNum + 1;
            size = size + result.size;
            if(sitesNum == fileNum){
                changeStatus({status: 'Finished', data: data});
                return;
            }
            else{
                changeStatus({status: 'Partly Finished', data: data});
                return;
            }
        }
        else{
            changeStatus({status: 'Unfinished'});
        }
        setTimeout(function() {
            queryStatus(data, sitesNum);
        }, 2000);
    })
}

$("#search").click(function(){
    var pageNum = $("#page-num").val();
    var keywords = $("#keywords").val();

    var sites = new Array();
    $('#sites-checkbox input:checkbox').each(function(){
        if($(this).prop('checked') == true) 
            sites.push($(this).val())
    })

    if(sites.length > 0 && keywords != ""){
        renderName(keywords);
        $.ajax({ 
            traditional: true,
            url: $("#title").attr("serverPath") + '/crawler/start',
            type: 'post'
        }).done(function(){
            fileNum = 0;
            size = 0;
            spinner.spin($("#content").get(0));
            $.each(sites, function(index, site){
                console.log(site);
                var data = {"keywords":keywords, "site":site, "pageNum":pageNum};
                $.ajax({ 
                    traditional: true,
                    url: $("#title").attr("serverPath") + '/crawler/crawling',
                    type: 'post',
                    data: data
                }).done(function () {
                    changeStatus();
                    setTimeout(queryStatus(data, sites.length), 1000);
                })
            })
        })
    }
    else if(keywords == ""){
        alert("Please fill up the keywords of the crawler!");
    }
    else{
        alert("Please choose one Craw-Website at list!");
    }
})

$("#save").click(function(){
    console.log("save");
    $("#save").attr('disabled', true); 
    var timeinfo =  $("#file-name").attr("name");
    var data = {"filename": $("#file-name").val(), "time": Date.parse(new Date(timeinfo.substring(timeinfo.indexOf('-') + 1, timeinfo.length - 5).replace('+', ' ')))};
    console.log(data)
    $.ajax({
        url: $("#title").attr("serverPath") + '/crawler/file',
        type: 'post',
        data: data
    }).done(function (result) {
        alert("Save finished");
        location.href = $("#title").attr("serverPath") + '/datasystem/upload';
    })
})

$(document).ready(function() { 
   renderBaseline("#sina-com-cn-sparkline");
   renderBaseline("#netease-com-sparkline");
   renderBaseline("#sohu-com-sparkline");
   renderBaseline("#cctv-com-sparkline");
   $("#save").attr('disabled', true); 
});



// var options = eval({
//     "list": [['傻猎豹', 10], 
//         ['不如', 9], 
//         ['麻花疼', 7], 
//         ['麻云', 6],
//         ['李眼红', 4], 
//         ['雷布斯', 5],
//         ['周红衣', 4],
//         ['刘墙洞', 3],
//         ['李国情', 3]
//     ],
//     "gridSize": 4,
//     "weightFactor": 3,
//     "fontFamily": 'Hiragino Mincho Pro, serif',
//     // "color": 'random-dark',
//     // "backgroundColor": '#f0f0f0',
//     "rotateRatio": 0
// });

// WordCloud($('#wordle')[0], options); 