var spinner = new Spinner();
var length;

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
    $("#file-name").html(filename);
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
            // timeLine.selectAll(".y").attr("display", "none");
            // timeLine.selectAll(".x").attr("display", "none");
        } 
    }); 
}

$("#search").click(function(){
    $("#save").attr('disabled', false); 
    pageNum = $("#page-num").val();
    var keywords = $("#keywords").val();
    var sites = new Array();
    var size = 0;
    var length = 0;
    $('#sites-checkbox input:checkbox').each(function(){
        if($(this).prop('checked') == true) 
            sites.push($(this).val())
    })
    if(sites.length > 0 && keywords != ""){
        renderName(keywords);
        var data = {"keywords": keywords, "site":"", "pageNum":0};
        $.ajax({ 
            traditional: true,
            url: $("#title").attr("serverPath") + '/crawler',
            type: 'post',
            data: data
        }).done(function(){
            $.each(sites, function(index, site){
                spinner.spin($("#content").get(0));
                var data = {"keywords":keywords, "site":site, "pageNum":pageNum};
                $.ajax({ 
                    traditional: true,
                    url: $("#title").attr("serverPath") + '/crawler',
                    type: 'post',
                    data: data
                }).done(function (data) {
                    spinner.spin();
                    size = size + data.size;
                    renderSize(bytesToSize(size));
                    renderSparkline(data.filename, site.replace(/\./g, '-'));
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
    var data = {"filename": $("#file-name").text()};
    console.log(data)
    $.ajax({
        url: $("#title").attr("serverPath") + '/crawler/file',
        type: 'post',
        data: data
    }).done(function (result) {
        alert("Save finished");
    })
})

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