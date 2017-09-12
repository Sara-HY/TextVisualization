var spinner = new Spinner();

function renderData(fileInfo){
    var url = fileInfo.url
        size = fileInfo.size;
    console.log(url, size);
    $("#file").removeClass("hide");
    $("#file-name").html(url.substring(9, url.length));
    $("#file-size").html(size);
}

function renderSparkline(url, site){
    console.log(url, site);
    $.getJSON(url, function(data){
        $.each(data, function(index, _data){
            _data["time"] = new Date(_data["time"])
        })
        if(site == "163-com")
            site = "netease-com"
        var id = "#" + site + "-sparkline";
        console.log(id);
        spinner.spin($(id).get(0)); 
        var timeLine = dc.lineChart(id);
        var ndx = crossfilter(data),
            timeDim = ndx.dimension(function(d) {return d["time"]});
        var timeInterval = d3.time["day"];
        var countGroup = timeDim.group(function(time) {
            return timeInterval.floor(new Date(time))
        }).reduceCount();
        var startTime = timeDim.bottom(1)[0]["time"],
            endTime = timeDim.top(1)[0]["time"];

        console.log(startTime)

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

        timeLine.yAxis().ticks(0);
        timeLine.xAxis().ticks(0);
        spinner.spin(); 
        timeLine.render();

        timeLine.selectAll(".y").attr("display", "none");
        timeLine.selectAll(".x").attr("display", "none");
    })
}

$("#search").click(function(){
    $("#save").attr('disabled', false); 
    var keywords = $("#keywords").val();
    var sites = new Array();
    $('#sites-checkbox input:checkbox').each(function(){
        if($(this).prop('checked') == true) 
            sites.push($(this).val())
    })
    if(sites.length > 0 && keywords != ""){
        spinner.spin($("#content").get(0)); 
        $.each(sites, function(index, site){
            console.log(keywords, site);
            var data = {"keywords":keywords, "site":site};
            $.ajax({ 
                traditional: true,
                url: '/crawler',
                type: 'post',
                data: data
            }).done(function (data) {
                spinner.spin();   
                renderData(data);
                renderSparkline(data.url, site.replace(/\./g, '-'));
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
    $.ajax({
        url: '/crawler/file',
        type: 'post',
        data: data
    }).done(function (result) {
        console.log("Save finished");
    })
})

var options = eval({
    "list": [['傻猎豹', 10], 
        ['不如', 9], 
        ['麻花疼', 7], 
        ['麻云', 6],
        ['李眼红', 4], 
        ['雷布斯', 5],
        ['周红衣', 4],
        ['刘墙洞', 3],
        ['李国情', 3]
    ],
    "gridSize": 4,
    "weightFactor": 3,
    "fontFamily": 'Hiragino Mincho Pro, serif',
    // "color": 'random-dark',
    // "backgroundColor": '#f0f0f0',
    "rotateRatio": 0
});

WordCloud($('#wordle')[0], options); 