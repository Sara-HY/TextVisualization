importScripts("../libs/tsne/tsne.js")

var opt = {epsilon: 10};
var tSNE = new tsnejs.tSNE(opt);
var distanceMatrix;

var iterTimer;

onmessage = function(event) {
    var distanceMatrix = event.data.distance;
    clearInterval(iterTimer);
    if (event.data.cmd == "init") {
        tSNE.setDataDist(distanceMatrix, true);
        start(distanceMatrix, 500);
    } else if (event.data.cmd == "update") {
        tSNE.setDataDist(distanceMatrix, false);
        start(distanceMatrix, 500);
    }
};

function start(distanceMatrix, iter) {
    var count = 0;
    iterTimer = setInterval(function() {
        count++;
        if (count > iter) {
            postMessage({message:"end"});
            clearInterval(iterTimer);
        }
        tSNE.step();
        if (count > 200 && count % 10 == 0)
            postMessage({message:"running", positions:tSNE.getSolution()});
    }, 10)
    // for (var i = 0; i < iter; i++) {
    //  if (workTimestamp != messageTimestamp) {
    //      console.log("break");
    //      break;
    //  }
    //  tSNE.step();
    //  postMessage(tSNE.getSolution());    
    // }
    // postMessage(tSNE.getSolution());
}