import "jquery-dataTables"
import "jquery-dataTables-css!css"

onmessage = function(event) {
	var data = event.data,
		table = event.table;

	for(var i=0; i<data.length; i++){
        var index = table.column(0).data().indexOf(data[i]["_index"]);
        table.$('tr:eq(' + index + ')').css('backgroundColor', '#1f77b4');
    }

    postMessage({table: table});

}
