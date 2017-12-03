function loadMetaInfo() {
    var datasetID = $("data").attr("dataset-id");
    var url = $("#title").attr("serverPath") + "/api/data/" + datasetID + "/meta";
    $.get(url, function(data) {
        if (data && data.fields) {
            for (var key in data.fields) {
                $("#field-list .value select[field=" + key + "]").val(data.fields[key]);
            }
        }
        if (data && data.preprocess) {
            for (var i = 0; i < data.preprocess.length; i++) {
                console.log("#nlp-process-list input[name=" + data.preprocess[i] + "]")
                $("#nlp-process-list input[name=" + data.preprocess[i] + "]").attr("checked", true)
            }
        }
    })
}

$(document).ready(function() { 
    $(".step").hide();
    $(".step[step=0]").show();
    loadMetaInfo();
    $("#save-field-btn").click(function() {
        var fields = {};
        $("#field-list .field-pair").each(function() {
            var name = $(this).find(".key").attr("field");
            var value = $(this).find(".value select").val();
            fields[name] = value;
        })
        var datasetID = $("data").attr("dataset-id");
        var url =  $("#title").attr("serverPath") + "/api/datasystem/process/" + datasetID;
        console.log(url);
        var data = {fields: fields};
        $.ajax({
            url: url,
            data: {"data": JSON.stringify(data)},
            type: "put",
        }).done(function(d) {
            console.log(d);
            // alert("保存成功");
        })
    })

    $("#save-nlp-process-btn").click(function() {
        var preprocess = [];
        $("#nlp-process-list input[type=checkbox]").each(function() {
            if ($(this)[0].checked == true) {
                console.log($(this).attr("name"));
                preprocess.push($(this).attr("name"));
            }
        })

        var data = {preprocess: preprocess};
        var datasetID = $("data").attr("dataset-id");
        var url =  $("#title").attr("serverPath") + "/api/datasystem/process/" + datasetID;
        $.ajax({
            url: url,
            data: {"data": JSON.stringify(data)},
            type: "put",
        }).done(function(d) {
            // alert("保存成功");
        })
    })

    $("#start-process-btn").click(function() {
        var datasetID = $("data").attr("dataset-id");
        var url =  $("#title").attr("serverPath") + "/api/datasystem/process/start/" + datasetID;
        $.ajax({
            url: url,
            type: "get"
        }).done(function(d) {
            $("#process-status-modal").modal(); 
            changeStatus();
            setTimeout(queryStatus(), 1000);
        })
    })

    $(".next-btn").click(function() {
        var step = +$(this).attr("step") + 1;
        console.log("step", step);
        $(".step[step=" + step + "]").show();
    })
})

function queryStatus() {
    var datasetID = $("data").attr("dataset-id");
    $.get( $("#title").attr("serverPath") + "/api/datasystem/process/status/" + datasetID, function(data) {
        console.log(data.data)
        changeStatus(data.data)
        if (data.data == null || data.data.status != "Processing") {
            return;
        }
        setTimeout(function() {
            queryStatus();
        }, 2000);
    })
}

function changeStatus(status) {
    if (status == null) {
        $("#Status").html("Start processing");
    } else {
        console.log(status)
        if(status.status == "Processing" && status.message== "Process:chinese")
            $("#progressBar")[0].value = 30;
        else if(status.status == "Processing" && status.message== "Process:english")
            $("#progressBar")[0].value = 30;
        else if(status.status == "Processed")
            $("#progressBar")[0].value = 100;

        $("#Status").html(status.status + "</p><p>" +status.message);
        if (status.status == "Processed") {
            $("#Analyze").removeClass("hide");
        }
    }
}
